import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { createExchange, type ReplacementItem } from "../../../../../lib/orders/exchange"

/**
 * POST /admin/orders/:id/exchange — we sent the wrong product.
 *
 * Takes the wrong item back on this order and ships the correct one as a NEW, linked order, so
 * each parcel keeps its own courier cost. The first delivery is our loss; the replacement's
 * delivery is charged to the customer as normal.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any
  const body = (req.body ?? {}) as {
    items?: ReplacementItem[]
    delivery_charged?: number
    receive_now?: boolean
    note?: string | null
  }

  try {
    const result = await createExchange(req.scope, orderId, {
      items: body.items ?? [],
      delivery_charged: body.delivery_charged,
      receive_now: body.receive_now,
      note: body.note ?? null,
    })
    logger?.info(
      `[orders:exchange] ${orderId} → replacement ${result.replacement_order_id} by ` +
        `${req.auth_context?.actor_id ?? "unknown"}`
    )
    return res.json({ success: true, ...result })
  } catch (err: any) {
    logger?.warn(`[orders:exchange] ${orderId} refused: ${err.message}`)
    return res.status(200).json({ success: false, message: err.message })
  }
}
