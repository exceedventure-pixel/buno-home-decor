import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { reserveOrderItems } from "../../../../lib/orders/reserve"
import { ORDER_PROCESSING_MODULE } from "../../../../modules/orderProcessing"

/**
 * POST /admin/order-processing/allocate-bulk
 *
 * Allocates restocked inventory to multiple backorders at once.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actorId = req.auth_context?.actor_id ?? null
  const { order_ids } = (req.body ?? {}) as { order_ids: string[] }

  if (!Array.isArray(order_ids) || !order_ids.length) {
    return res.status(400).json({ error: "order_ids array is required." })
  }

  const orderSvc: any = req.scope.resolve(Modules.ORDER)
  const opSvc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const allocated: string[] = []
  const failed: Array<{ order_id: string; reason: string }> = []

  for (const orderId of order_ids) {
    try {
      const reserveResult = await reserveOrderItems(req.scope, orderId)
      if (reserveResult.shortages.length > 0) {
        failed.push({
          order_id: orderId,
          reason: `Insufficient stock for ${reserveResult.shortages
            .map((s) => `${s.title} (${s.requested} needed, ${s.available} available)`)
            .join("; ")}`,
        })
        continue
      }

      const { data: ords } = await query.graph({
        entity: "order",
        fields: ["id", "metadata"],
        filters: { id: orderId },
      })
      const curMeta = (ords?.[0] as any)?.metadata ?? {}

      await orderSvc.updateOrders([
        {
          id: orderId,
          metadata: {
            ...curMeta,
            is_backorder: false,
            backorder_shortages: null,
            allocated_at: new Date().toISOString(),
          },
        },
      ])

      await opSvc.createOrderStatusEvents([
        {
          order_id: orderId,
          field: "order",
          from_value: "backorder",
          to_value: "new_order",
          actor_id: actorId,
          source: "admin",
          note: "Stock allocated in bulk from warehouse restock. Order moved to New Orders.",
        },
      ])

      allocated.push(orderId)
    } catch (e: any) {
      failed.push({ order_id: orderId, reason: e.message ?? "Allocation failed" })
    }
  }

  res.json({
    allocated_count: allocated.length,
    allocated,
    failed_count: failed.length,
    failed,
    message: `${allocated.length} order(s) allocated and moved to New Orders.`,
  })
}
