import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { reserveOrderItems } from "../../../../../lib/orders/reserve"
import { computeOrderEconomics } from "../../../../../lib/orders/order-economics"
import { ORDER_PROCESSING_MODULE } from "../../../../../modules/orderProcessing"

/**
 * POST /admin/order-processing/:id/allocate
 *
 * Allocates restocked inventory to an order waiting in Backorders.
 * Once all shortages are reserved, moves the order to New Orders.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const actorId = req.auth_context?.actor_id ?? null

  const reserveResult = await reserveOrderItems(req.scope, orderId)

  if (reserveResult.shortages.length > 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cannot allocate yet: stock is still insufficient for ${reserveResult.shortages
        .map((s) => `${s.title} (needed ${s.requested}, only ${s.available} in warehouse)`)
        .join("; ")}`
    )
  }

  // Clear is_backorder flag on the order
  const orderSvc: any = req.scope.resolve(Modules.ORDER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
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

  const opSvc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)
  await opSvc.createOrderStatusEvents([
    {
      order_id: orderId,
      field: "order",
      from_value: "backorder",
      to_value: "new_order",
      actor_id: actorId,
      source: "admin",
      note: "Stock allocated from warehouse restock. Order moved to New Orders.",
    },
  ])

  const [econ] = await computeOrderEconomics(req.scope, { order_id: orderId })

  res.json({
    success: true,
    order_id: orderId,
    order: econ,
    message: "Stock successfully allocated! Order moved to New Orders.",
  })
}
