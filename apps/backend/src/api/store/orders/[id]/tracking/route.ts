import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ORDER_PROCESSING_MODULE } from "../../../../../modules/orderProcessing"

/**
 * GET /store/orders/:id/tracking — courier delivery status for the customer's own order.
 *
 * Customer-safe: returns only status + tracking code + a public track link. No COD, no costs, no
 * internal fields. Ownership is enforced by matching the order's customer to the authenticated
 * caller; anything else 404s so the endpoint can't be used to probe other people's orders.
 */

const COURIER_NAMES: Record<string, string> = {
  steadfast: "Steadfast Courier",
  redx: "RedX",
  pathao: "Pathao",
}

// Public tracking-link builders. Verify these formats against each courier's current site.
const TRACK_URL: Record<string, (code: string) => string | null> = {
  steadfast: (code) => (code ? `https://steadfast.com.bd/t/${encodeURIComponent(code)}` : null),
  redx: (code) => (code ? `https://redx.com.bd/track-global-parcel/?trackingId=${encodeURIComponent(code)}` : null),
  pathao: () => null,
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: orderId },
  })

  const order = data?.[0] as { id: string; customer_id?: string } | undefined
  if (!order || order.customer_id !== customerId) {
    // Don't reveal whether the order exists.
    return res.status(404).json({ message: "Order not found" })
  }

  const opSvc = req.scope.resolve(ORDER_PROCESSING_MODULE) as any
  const [wf] = await opSvc.listOrderWorkflows({ order_id: orderId })

  if (!wf?.consignment_id) {
    // No courier shipment (manual, or not yet booked).
    return res.json({ tracking: null })
  }

  const courierId: string = wf.courier_id ?? ""
  const trackingCode: string = wf.tracking_id ?? ""

  res.json({
    tracking: {
      courier_id: courierId,
      courier_name: COURIER_NAMES[courierId] ?? "Courier",
      status: wf.courier_status ?? "pending",
      tracking_id: trackingCode || null,
      tracking_url: TRACK_URL[courierId]?.(trackingCode) ?? null,
    },
  })
}
