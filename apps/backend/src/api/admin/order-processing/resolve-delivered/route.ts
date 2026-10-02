import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createOrderFulfillmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
} from "@medusajs/core-flows"
import { ORDER_PROCESSING_MODULE } from "../../../../modules/orderProcessing"
import { requireSellableLocation } from "../../../../lib/inventory/stock-location"
import { computeOrderEconomics } from "../../../../lib/orders/order-economics"
import { captureOutstandingCod } from "../../../../lib/orders/capture"

/**
 * POST /admin/order-processing/resolve-delivered
 *
 * Resolves orders that were already physically delivered by courier (e.g. #418 and #406)
 * but were stuck in backorder or pending status due to outdated stock derivation.
 *
 * It:
 * 1. Clears is_backorder flag and backorder shortages from order metadata.
 * 2. Updates order_workflow to stage: delivered, courier_status: delivered.
 * 3. Creates the Medusa fulfillment if unfulfilled so stock and COGS are honestly accounted for.
 * 4. Marks the fulfillment delivered.
 * 5. Automatically captures outstanding COD payment.
 * 6. Emits status audit event.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { order_ids, display_ids } = (req.body ?? {}) as {
    order_ids?: string[]
    display_ids?: number[]
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderSvc: any = req.scope.resolve(Modules.ORDER)
  const opSvc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)

  // Find target orders
  const filters: Record<string, unknown> = {}
  if (Array.isArray(order_ids) && order_ids.length > 0) {
    filters.id = order_ids
  } else if (Array.isArray(display_ids) && display_ids.length > 0) {
    filters.display_id = display_ids
  } else {
    // Default to fixing #418 and #406 if no args provided
    filters.display_id = [418, 406]
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "metadata",
      "items.id",
      "items.quantity",
      "items.detail.quantity",
      "items.detail.fulfilled_quantity",
      "items.detail.delivered_quantity",
      "fulfillments.id",
      "fulfillments.data",
      "fulfillments.delivered_at",
      "fulfillments.canceled_at",
    ],
    filters,
  })

  if (!orders?.length) {
    return res.status(404).json({ error: "No matching orders found." })
  }

  const resolved: any[] = []
  const errors: any[] = []

  for (const o of orders) {
    try {
      // 1. Clear is_backorder on metadata
      const curMeta = (o as any).metadata ?? {}
      await orderSvc.updateOrders([
        {
          id: o.id,
          metadata: {
            ...curMeta,
            is_backorder: false,
            backorder_shortages: null,
            allocated_at: curMeta.allocated_at || new Date().toISOString(),
            resolved_delivered_at: new Date().toISOString(),
          },
        },
      ])

      // 2. Update workflow row to stage: delivered, courier_status: delivered
      const [wf] = await opSvc.listOrderWorkflows({ order_id: o.id })
      const consignmentId = wf?.consignment_id ?? null

      if (wf) {
        await opSvc.updateOrderWorkflows([
          {
            id: wf.id,
            stage: "delivered",
            courier_status: "delivered",
          },
        ])
      } else {
        await opSvc.createOrderWorkflows([
          {
            order_id: o.id,
            stage: "delivered",
            courier_status: "delivered",
          },
        ])
      }

      // 3. Fulfill items if unfulfilled
      const location = await requireSellableLocation(req.scope)
      const unfulfilledItems = ((o as any).items ?? [])
        .map((it: any) => ({
          id: it.id,
          quantity: Number(it.detail?.quantity ?? it.quantity ?? 1) - Number(it.detail?.fulfilled_quantity ?? 0),
        }))
        .filter((i: any) => i.quantity > 0)

      let fulfillmentId: string | null = null
      const existingFulfillment = ((o as any).fulfillments ?? []).find(
        (f: any) => !f.canceled_at && !f.delivered_at
      )

      if (existingFulfillment) {
        fulfillmentId = existingFulfillment.id
      } else if (unfulfilledItems.length > 0) {
        const { result: fulfillment } = await createOrderFulfillmentWorkflow(req.scope).run({
          input: {
            order_id: o.id,
            items: unfulfilledItems,
            location_id: location.id,
            data: {
              courier_status: "delivered",
              consignment_id: consignmentId,
            },
          } as any,
        })
        fulfillmentId = (fulfillment as any)?.id
      }

      // 4. Mark fulfillment as delivered if not already delivered
      if (fulfillmentId) {
        try {
          await markOrderFulfillmentAsDeliveredWorkflow(req.scope).run({
            input: {
              orderId: o.id,
              fulfillmentId,
            },
          })
        } catch {
          // If already delivered in Medusa, ignore
        }
      }

      // 5. Capture COD payment
      try {
        await captureOutstandingCod(req.scope, o.id)
      } catch {
        // Non-fatal if payment is already collected
      }

      // 6. Record audit event
      await opSvc.createOrderStatusEvents([
        {
          order_id: o.id,
          field: "order",
          from_value: "backorder",
          to_value: "delivered",
          actor_id: req.auth_context?.actor_id ?? null,
          source: "admin",
          note: `Resolved delivered order with consignment ${consignmentId ?? "recorded"}. Marked delivered and cleared backorder.`,
        },
      ])

      const [econ] = await computeOrderEconomics(req.scope, { order_id: o.id })
      resolved.push({
        display_id: o.display_id,
        order_id: o.id,
        consignment_id: consignmentId,
        status: econ?.order_status,
      })
    } catch (err: any) {
      errors.push({
        display_id: o.display_id,
        order_id: o.id,
        error: err.message,
      })
    }
  }

  res.json({
    success: errors.length === 0,
    resolved,
    errors,
    message: `Resolved ${resolved.length} order(s) as Delivered.`,
  })
}
