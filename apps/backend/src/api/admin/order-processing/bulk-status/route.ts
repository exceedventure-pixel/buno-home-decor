import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { clearOrderEconomicsCache } from "../../../../lib/orders/order-economics"
import { clearFifoCostingCache } from "../../../../lib/insights/fifo-costing"
import { ORDER_STATUSES, type OrderStatus } from "../../../../modules/orderProcessing/constants"
import { transitionOrderWorkflow } from "../../../../workflows/orderProcessing"

/**
 * POST /admin/order-processing/bulk-status
 *
 * Bulk transition multiple orders to a new status in a single request.
 * Transitions each order using transitionOrderWorkflow, recording history,
 * and clears caches once at the end.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actorId = req.auth_context?.actor_id ?? null
  const { order_ids, to, note } = (req.body ?? {}) as {
    order_ids?: string[]
    to?: OrderStatus
    note?: string | null
  }

  if (!Array.isArray(order_ids) || !order_ids.length) {
    return res.status(400).json({ error: "order_ids array is required." })
  }
  if (!to || !ORDER_STATUSES.includes(to)) {
    return res.status(400).json({ error: `Valid target status 'to' is required. Got: ${to}` })
  }

  const moved: string[] = []
  const failed: Array<{ order_id: string; message: string }> = []

  for (const orderId of order_ids) {
    try {
      await transitionOrderWorkflow(req.scope).run({
        input: {
          order_id: orderId,
          to,
          actor_id: actorId,
          note: note ?? null,
        },
      })
      moved.push(orderId)
    } catch (e: any) {
      failed.push({
        order_id: orderId,
        message: e?.message ?? "Transition failed",
      })
    }
  }

  clearOrderEconomicsCache()
  clearFifoCostingCache()

  res.json({
    moved_count: moved.length,
    moved,
    failed_count: failed.length,
    failed,
    message: `${moved.length} order(s) updated to ${to}.`,
  })
}
