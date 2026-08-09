import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { createExchange, type ReplacementItem } from "../../../lib/orders/exchange"
import { rebookCourierParcel } from "../../../lib/orders/courier-booking"
import { refundOrder } from "../../../lib/orders/refund"
import { returnAndRestockOrder } from "../../../lib/returns"
import { adjustStockWorkflow } from "../../accounting"
import { ORDER_PROCESSING_MODULE } from "../../../modules/orderProcessing"
import {
  issueForResolution,
  type Fault,
  type IssueStatus,
  type ResolutionType,
} from "../../../modules/orderProcessing/constants"

/**
 * RESOLVE AN ORDER ISSUE — the single control surface for after-sales.
 *
 * Each resolution performs the REAL action (restock, refund, exchange, write-off, rebook) by
 * reusing the existing libs, and then records what happened: issue_status is set as a BYPRODUCT of
 * the resolution (never a bare label), alongside resolution_type, fault and any customer_return_paid.
 *
 * This replaces the old split where an "issue" dropdown wrote a label that did nothing while the
 * real actions lived in a separate widget.
 */

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export type ResolveIssueInput = {
  order_id: string
  resolution: ResolutionType
  fault?: Fault | null
  actor_id?: string | null
  note?: string | null
  /** Return/exchange/damaged-on-return: take the goods back in one step (already in hand). */
  receive_now?: boolean
  /** What the customer paid toward the return/exchange — offsets the courier loss in P&L. */
  customer_return_paid?: number
  /** return_refund only: how much advance to give back (defaults to the captured advance). */
  refund_amount?: number
  /** exchange only: the replacement's items. */
  items?: ReplacementItem[]
  /** exchange only: delivery charged for the replacement (forced to 0 when it's our fault). */
  replacement_delivery_charged?: number
}

async function ensureWorkflow(container: MedusaContainer, orderId: string) {
  const svc: any = container.resolve(ORDER_PROCESSING_MODULE)
  const [existing] = await svc.listOrderWorkflows({ order_id: orderId })
  if (existing) return existing
  const [created] = await svc.createOrderWorkflows([{ order_id: orderId }])
  return created
}

/** Variant + quantity of what shipped and hasn't already come back — what a damaged return writes off. */
async function returnableVariantQuantities(
  container: MedusaContainer,
  orderId: string
): Promise<{ variant_id: string; quantity: number }[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "items.variant_id",
      "items.detail.fulfilled_quantity",
      "items.detail.return_received_quantity",
    ],
    filters: { id: orderId },
  })
  const items = (data?.[0] as any)?.items ?? []
  return items
    .map((it: any) => ({
      variant_id: it.variant_id as string,
      quantity: Math.max(
        0,
        num(it.detail?.fulfilled_quantity) - num(it.detail?.return_received_quantity)
      ),
    }))
    // Custom/pre-order lines carry no variant and never touched inventory — nothing to write off.
    .filter((i: any) => i.variant_id && i.quantity > 0)
}

export const resolveOrderIssueStep = createStep(
  "resolve-order-issue",
  async (input: ResolveIssueInput, { container }: { container: MedusaContainer }) => {
    const svc: any = container.resolve(ORDER_PROCESSING_MODULE)
    const wf = await ensureWorkflow(container, input.order_id)

    const prev = {
      issue_status: wf.issue_status as IssueStatus,
      resolution_type: (wf.resolution_type ?? null) as ResolutionType | null,
      fault: (wf.fault ?? null) as Fault | null,
      customer_return_paid: num(wf.customer_return_paid),
    }

    const fault: Fault | null = input.fault ?? null
    const receiveNow = input.receive_now ?? false

    /* ---------------------------------- the real work ---------------------------------- */

    switch (input.resolution) {
      case "rebook_courier":
        await rebookCourierParcel(container, input.order_id, { note: input.note ?? undefined })
        break

      case "return_only":
      case "rto_refused": {
        const r = await returnAndRestockOrder(container, input.order_id, { receiveNow })
        if (!r.created && r.reason && !/already has a return/i.test(r.reason)) {
          throw new MedusaError(MedusaError.Types.NOT_ALLOWED, r.reason)
        }
        break
      }

      case "return_refund": {
        const r = await returnAndRestockOrder(container, input.order_id, { receiveNow })
        if (!r.created && r.reason && !/already has a return/i.test(r.reason)) {
          throw new MedusaError(MedusaError.Types.NOT_ALLOWED, r.reason)
        }
        await refundOrder(container, input.order_id, {
          amount: input.refund_amount,
          note: input.note ?? null,
        })
        break
      }

      case "exchange": {
        if (!input.items?.length) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Choose at least one item to send as the replacement."
          )
        }
        // Our mistake → free reship; customer's choice → they pay the replacement's delivery.
        const deliveryCharged =
          fault === "our_fault" ? 0 : Math.max(0, num(input.replacement_delivery_charged))
        await createExchange(container, input.order_id, {
          items: input.items,
          delivery_charged: deliveryCharged,
          receive_now: receiveNow,
          note: input.note ?? null,
        })
        break
      }

      case "damaged_in_transit":
        // Destroyed on the way — NO goods movement (the fulfilment already removed them). The loss
        // is booked by order-economics: revenue zeroed + cogs written off. Just record it.
        break

      case "damaged_on_return": {
        // Compute what came back BEFORE receiving it, then take it onto the shelf and write it off
        // as damage — so the loss shows as real shrinkage instead of a phantom restock.
        const toWriteOff = await returnableVariantQuantities(container, input.order_id)
        const r = await returnAndRestockOrder(container, input.order_id, { receiveNow: true })
        if (!r.created && r.reason && !/already has a return/i.test(r.reason)) {
          throw new MedusaError(MedusaError.Types.NOT_ALLOWED, r.reason)
        }
        for (const { variant_id, quantity } of toWriteOff) {
          await adjustStockWorkflow(container).run({
            input: {
              variant_id,
              direction: "shrinkage",
              quantity,
              reason: "damage",
              note: input.note ?? "Came back damaged",
            },
          })
        }
        break
      }

      case "wrong_slip_correction":
        // Right goods shipped with wrong paperwork — nothing moves in stock or cash. Just recorded.
        break
    }

    /* ------------------------------- record the resolution ----------------------------- */

    const issue = issueForResolution(input.resolution, fault)
    const customerReturnPaid = Math.max(0, num(input.customer_return_paid))

    await svc.updateOrderWorkflows([
      {
        id: wf.id,
        issue_status: issue,
        resolution_type: input.resolution,
        fault,
        customer_return_paid: customerReturnPaid,
      },
    ])

    await svc.createOrderStatusEvents([
      {
        order_id: input.order_id,
        field: "resolution",
        from_value: prev.resolution_type,
        to_value: input.resolution,
        actor_id: input.actor_id ?? null,
        source: "admin",
        note: input.note ?? null,
      },
    ])

    return new StepResponse(
      { order_id: input.order_id, resolution: input.resolution, issue },
      { wf_id: wf.id, prev }
    )
  },
  // Restore the recorded fields. The libs' own Medusa workflows self-compensate on their own throw;
  // once they've succeeded a later failure here doesn't undo them (same contract as transition.ts).
  async (comp: { wf_id: string; prev: any } | undefined, { container }) => {
    if (!comp) return
    const svc: any = container.resolve(ORDER_PROCESSING_MODULE)
    await svc.updateOrderWorkflows([{ id: comp.wf_id, ...comp.prev }])
  }
)
