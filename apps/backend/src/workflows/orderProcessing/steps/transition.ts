import {
  cancelOrderWorkflow,
  createOrderFulfillmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
  refundPaymentWorkflow,
} from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { requireSellableLocation } from "../../../lib/inventory/stock-location"
import { bookCourierParcel } from "../../../lib/orders/courier-booking"
import { computeOrderEconomics } from "../../../lib/orders/order-economics"
import { reserveOrderItems } from "../../../lib/orders/reserve"
import { canTransition, issueWritesOffGoods } from "../../../lib/orders/status"
import { returnAndRestockOrder } from "../../../lib/returns"
import {
  STORED_STAGES,
  type IssueStatus,
  type OrderStatus,
  type StoredStage,
} from "../../../modules/orderProcessing/constants"
import { ORDER_PROCESSING_MODULE } from "../../../modules/orderProcessing"
import { PRODUCT_COST_MODULE } from "../../../modules/productCost"

/**
 * A STATUS CHANGE PERFORMS THE REAL ACTION.
 *
 * "Dispatched" doesn't mean someone typed dispatched — it CREATES the fulfilment, so stock
 * leaves, FIFO books the COGS and the packaging is drawn. "Delivered" CAPTURES the cash.
 * "Returned" RESTOCKS. This is the only way the label can't lie: there's nothing to keep in
 * sync, because setting the status IS the thing happening.
 *
 * The stages before dispatch (Confirmed, In Production…) have no Medusa counterpart, so those
 * are simply recorded.
 */

export type TransitionInput = {
  order_id: string
  to: OrderStatus
  actor_id?: string | null
  note?: string | null
  source?: string
  /** Only used when `to` is "courier_booked": the COD to collect (defaults to outstanding). */
  cod_amount?: number
}

const isStoredStage = (s: OrderStatus): s is StoredStage =>
  (STORED_STAGES as readonly string[]).includes(s)

/** Get the order's workflow row, creating it if this order predates the module. */
async function ensureWorkflow(container: MedusaContainer, orderId: string) {
  const svc: any = container.resolve(ORDER_PROCESSING_MODULE)
  const [existing] = await svc.listOrderWorkflows({ order_id: orderId })
  if (existing) return existing
  const [created] = await svc.createOrderWorkflows([{ order_id: orderId }])
  return created
}

export const transitionOrderStep = createStep(
  "transition-order",
  async (input: TransitionInput, { container }: { container: MedusaContainer }) => {
    const svc: any = container.resolve(ORDER_PROCESSING_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const wf = await ensureWorkflow(container, input.order_id)

    // The CURRENT status is derived, never read from a column — so the guard is judging what is
    // actually true of this order, not what someone last typed.
    const [econ] = await computeOrderEconomics(container, { order_id: input.order_id })
    if (!econ) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order "${input.order_id}" not found.`)
    }

    const from = econ.order_status
    const check = canTransition(econ.order_type, from, input.to)
    if (!check.ok) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, check.reason!)
    }

    const prevStage: StoredStage = wf.stage

    /* ---------------------------------- the real work ---------------------------------- */

    if (input.to === "courier_booked") {
      // Book the parcel with the active courier — no fulfilment, no stock movement. The tracking
      // identity lands on the order_workflow; dispatch (and the stock move) follows automatically
      // when the courier reports pickup. Idempotent: re-booking an already-booked order is refused
      // so a double click can't create a second consignment.
      if (wf.consignment_id) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "This order is already booked with a courier."
        )
      }
      await bookCourierParcel(container, input.order_id, {
        cod_amount: input.cod_amount,
        note: input.note ?? undefined,
      })
    }

    if (input.to === "dispatched") {
      // Ship everything not yet shipped. This is what takes stock off the shelf.
      const { data } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "items.id",
          "items.detail.quantity",
          "items.detail.fulfilled_quantity",
        ],
        filters: { id: input.order_id },
      })
      const items = ((data?.[0] as any)?.items ?? [])
        .map((it: any) => ({
          id: it.id,
          quantity: Number(it.detail?.quantity ?? 0) - Number(it.detail?.fulfilled_quantity ?? 0),
        }))
        .filter((i: any) => i.quantity > 0)

      if (!items.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Every item on this order has already shipped."
        )
      }

      /**
       * Make sure the stock is actually reserved before it ships.
       *
       * An order created in the admin never got a reservation (createOrderWorkflow doesn't make
       * one), so nothing had verified the goods existed. Fulfilling it then drove the quantity
       * straight through zero. Reserving here both allocates it and forces that check.
       */
      await reserveOrderItems(container, input.order_id)

      // Ship from the ONE warehouse we stock. Without this, Medusa may deduct from a different
      // location than the restock credited — which is how stock read −49 while the batches said 1.
      const location = await requireSellableLocation(container)

      await createOrderFulfillmentWorkflow(container).run({
        input: { order_id: input.order_id, items, location_id: location.id } as any,
      })
    }

    if (input.to === "delivered") {
      // Tell Medusa the parcel arrived. That is the whole action — marking it delivered emits
      // `delivery.created`, and the subscriber on that event collects the cash. See markDelivered.
      await markDelivered(container, input.order_id)
    }

    if (input.to === "returned") {
      // Reuses the existing return+restock flow: goods go back, COGS reverses.
      const r = await returnAndRestockOrder(container, input.order_id)
      if (!r.created && r.reason) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, r.reason)
      }
    }

    if (input.to === "cancelled") {
      if (econ.units_shipped > 0) {
        /**
         * RTO — the parcel already left, so this is not a simple cancel. The goods come back to
         * the shelf, but the courier still charged us and the box is spent. Those costs stay on
         * the order, which is exactly why an RTO shows up as a loss rather than a wash.
         */
        const r = await returnAndRestockOrder(container, input.order_id)
        if (!r.created && r.reason && !/already has a return/i.test(r.reason)) {
          throw new MedusaError(MedusaError.Types.NOT_ALLOWED, r.reason)
        }
      } else {
        // Nothing shipped: a clean cancel releases the reservation.
        await cancelOrderWorkflow(container).run({ input: { order_id: input.order_id } })
      }
    }

    if (input.to === "refunded") {
      await refundAllCaptured(container, input.order_id)
    }

    /* ------------------------------- record what happened ------------------------------ */

    // Only the pre-dispatch stages are ours to store. Everything else is derived from Medusa,
    // so writing it into `stage` would be creating exactly the stale copy we're avoiding.
    if (isStoredStage(input.to)) {
      await svc.updateOrderWorkflows([{ id: wf.id, stage: input.to }])
    }

    await svc.createOrderStatusEvents([
      {
        order_id: input.order_id,
        field: "order",
        from_value: from,
        to_value: input.to,
        actor_id: input.actor_id ?? null,
        source: input.source ?? "admin",
        note: input.note ?? null,
      },
    ])

    return new StepResponse(
      { order_id: input.order_id, from, to: input.to },
      { wf_id: wf.id, prevStage }
    )
  },
  // Compensation restores our stage. The Medusa actions (fulfilment, capture, return) each
  // compensate themselves inside their own workflow.
  async (comp: { wf_id: string; prevStage: StoredStage } | undefined, { container }) => {
    if (!comp) return
    const svc: any = container.resolve(ORDER_PROCESSING_MODULE)
    await svc.updateOrderWorkflows([{ id: comp.wf_id, stage: comp.prevStage }])
  }
)

/* --------------------------------- payment helpers --------------------------------- */

/**
 * Mark the parcel delivered IN MEDUSA — which is the only place "delivered" is true.
 *
 * Our status is derived from Medusa's `delivered_quantity`, so this is not bookkeeping on the
 * side: without it, moving to Delivered here would leave Medusa thinking the parcel is still out,
 * the derived status would fall straight back to Dispatched, and the two screens would disagree.
 *
 * Doing it through Medusa's own workflow is also what puts the two buttons in sync. This one and
 * Medusa's native "Mark as delivered" now run the SAME code and emit the SAME `delivery.created`
 * event — so the cash gets collected once, whichever one you press.
 */
async function markDelivered(container: MedusaContainer, orderId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "fulfillments.id", "fulfillments.delivered_at", "fulfillments.canceled_at"],
    filters: { id: orderId },
  })

  const pending = ((data?.[0] as any)?.fulfillments ?? []).filter(
    (f: any) => !f.delivered_at && !f.canceled_at
  )

  if (!pending.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Nothing on this order is out for delivery — every parcel is already delivered or cancelled."
    )
  }

  for (const f of pending) {
    await markOrderFulfillmentAsDeliveredWorkflow(container).run({
      input: { orderId, fulfillmentId: f.id },
    })
  }
}

/** Give back everything we took. */
async function refundAllCaptured(container: MedusaContainer, orderId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "payment_collections.payments.id",
      "payment_collections.payments.amount",
      "payment_collections.payments.captured_at",
      "payment_collections.payments.refunds.amount",
    ],
    filters: { id: orderId },
  })

  const payments = ((data?.[0] as any)?.payment_collections ?? []).flatMap(
    (pc: any) => pc.payments ?? []
  )

  let refundedAny = false
  for (const p of payments) {
    if (!p.captured_at) continue
    const already = (p.refunds ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const left = Number(p.amount || 0) - already
    if (left <= 0) continue
    await refundPaymentWorkflow(container).run({
      input: { payment_id: p.id, amount: left },
    })
    refundedAny = true
  }

  if (!refundedAny) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "There is no captured payment to refund on this order."
    )
  }
}

/* ------------------------------------ issue status --------------------------------- */

export type SetIssueInput = {
  order_id: string
  issue: IssueStatus
  actor_id?: string | null
  note?: string | null
}

/**
 * Set the issue. Recording it is the whole job — the goods need no further movement.
 *
 * DAMAGED USED TO WRITE THE STOCK OFF HERE, AND THAT DEDUCTED IT TWICE.
 *
 * The units it wrote off were the ones that shipped and never came back — but shipping is exactly
 * what already took them off the shelf. The FIFO engine counts an order's draw AND a stock
 * movement as two separate reductions, so a damaged parcel removed its units from inventory a
 * second time and charged their cost a second time. Inventory read low and the loss read double.
 *
 * A parcel destroyed in transit needs no stock event at all: the fulfilment already removed the
 * goods. What makes it a loss is that no money comes in for them, which order-economics handles by
 * zeroing the revenue on a damaged order (see `goodsDestroyed` there).
 *
 * Goods that come BACK broken are a different story and already work: the return restocks them,
 * and they're written off from the product page like any other shrinkage.
 */
export const setOrderIssueStep = createStep(
  "set-order-issue",
  async (input: SetIssueInput, { container }: { container: MedusaContainer }) => {
    const svc: any = container.resolve(ORDER_PROCESSING_MODULE)

    const wf = await ensureWorkflow(container, input.order_id)
    const from: IssueStatus = wf.issue_status

    await svc.updateOrderWorkflows([{ id: wf.id, issue_status: input.issue }])
    await svc.createOrderStatusEvents([
      {
        order_id: input.order_id,
        field: "issue",
        from_value: from,
        to_value: input.issue,
        actor_id: input.actor_id ?? null,
        source: "admin",
        note: input.note ?? null,
      },
    ])

    return new StepResponse(
      { order_id: input.order_id, issue: input.issue },
      { wf_id: wf.id, from }
    )
  },
  async (comp: { wf_id: string; from: IssueStatus } | undefined, { container }) => {
    if (!comp) return
    const svc: any = container.resolve(ORDER_PROCESSING_MODULE)
    await svc.updateOrderWorkflows([{ id: comp.wf_id, issue_status: comp.from }])
  }
)
