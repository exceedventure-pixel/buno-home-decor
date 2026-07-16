import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import type { NormalizedStatus } from "../../modules/courierConfig/adapters/interface"
import { ORDER_PROCESSING_MODULE } from "../../modules/orderProcessing"
import {
  setCourierFeeWorkflow,
  transitionOrderWorkflow,
} from "../../workflows/orderProcessing"
import { computeOrderEconomics } from "./order-economics"

/**
 * APPLY A COURIER STATUS TO AN ORDER — the single place the webhook and the poll both go through.
 *
 * This is the auto-dispatch driver. A courier status doesn't just get recorded; it moves the
 * order the way physical reality moved:
 *   - picked up / in transit  → dispatch the order (creates the fulfilment, stock leaves, COGS books)
 *   - delivered               → dispatch if needed, then mark delivered (captures the COD)
 *   - returned                → return + restock (no refund)
 *   - cancelled               → RTO / cancel
 *   - pending                 → still awaiting pickup; just record it
 *
 * Every transition is guarded and wrapped: a reservation or guard failure is logged and the order
 * is left where it was for a human to sort out. A status update must never throw or half-move an
 * order. Transitions are sourced as "courier-sync" so the audit log shows the courier drove them.
 */
export async function applyCourierStatus(
  container: MedusaContainer,
  orderId: string,
  status: NormalizedStatus,
  opts?: { delivery_charge?: number }
): Promise<void> {
  const logger = container.resolve("logger") as {
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void
  }

  const opSvc: any = container.resolve(ORDER_PROCESSING_MODULE)
  const [wf] = await opSvc.listOrderWorkflows({ order_id: orderId })

  // Record the status on the workflow row (the source of truth before/after a fulfilment exists).
  if (wf && wf.courier_status !== status && status !== "unknown") {
    await opSvc.updateOrderWorkflows([{ id: wf.id, courier_status: status }])
  }

  // If the courier reports a delivery charge, capture it into the courier fee (and the Cash Book).
  if (opts?.delivery_charge != null && Number.isFinite(opts.delivery_charge)) {
    if (wf) {
      await opSvc.updateOrderWorkflows([
        { id: wf.id, actual_delivery_charge: opts.delivery_charge },
      ])
    }
    try {
      await setCourierFeeWorkflow(container).run({
        input: { order_id: orderId, fee: Number(opts.delivery_charge) },
      })
    } catch (err: any) {
      logger.warn(`[courier:status] Could not set courier fee for ${orderId}: ${err.message}`)
    }
  }

  await mirrorStatusToFulfillments(container, orderId, status)

  if (status === "pending" || status === "unknown") return

  const [econ] = await computeOrderEconomics(container, { order_id: orderId })
  if (!econ) return

  const run = (to: string) =>
    transitionOrderWorkflow(container).run({
      input: { order_id: orderId, to: to as any, source: "courier-sync" },
    })

  const currentStatus = async (): Promise<string | null> => {
    const [e] = await computeOrderEconomics(container, { order_id: orderId })
    return e?.order_status ?? null
  }

  try {
    if (status === "in_transit") {
      if (econ.order_status === "courier_booked") await run("dispatched")
    } else if (status === "delivered") {
      if (econ.order_status === "courier_booked") await run("dispatched")
      if ((await currentStatus()) === "dispatched") await run("delivered")
    } else if (status === "returned") {
      if (econ.order_status === "courier_booked") await run("dispatched")
      const s = await currentStatus()
      if (s === "dispatched" || s === "delivered") await run("returned")
    } else if (status === "cancelled") {
      if (econ.order_status === "courier_booked" || econ.order_status === "dispatched") {
        await run("cancelled")
      }
    }
  } catch (err: any) {
    logger.warn(
      `[courier:status] Auto-transition for order ${orderId} → ${status} failed: ${err.message}. Left for manual handling.`
    )
  }
}

/** Mirror the courier status onto any courier fulfilment on the order, for the native widget. */
async function mirrorStatusToFulfillments(
  container: MedusaContainer,
  orderId: string,
  status: NormalizedStatus
): Promise<void> {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "fulfillments.id", "fulfillments.data"],
      filters: { id: orderId },
    })
    const fulfillments = (data?.[0] as any)?.fulfillments ?? []
    const fulfillmentModule: any = container.resolve(Modules.FULFILLMENT)
    for (const f of fulfillments) {
      if (!f?.data?.consignment_id) continue
      if (f.data.courier_status === status) continue
      await fulfillmentModule.updateFulfillment(f.id, {
        data: { ...f.data, courier_status: status },
      })
    }
  } catch {
    // Non-fatal: the workflow row already carries the status.
  }
}
