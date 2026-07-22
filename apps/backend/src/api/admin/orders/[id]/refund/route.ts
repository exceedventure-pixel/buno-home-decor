import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { refundOrder } from "../../../../../lib/orders/refund"

/**
 * POST /admin/orders/:id/refund — give money back. Goods are not touched.
 *
 * `amount` is optional: omit it to refund everything still held, or pass a figure for a partial
 * ("we gave ৳300 back"). Refunding does NOT restock — that is what a return is for, and the two
 * are recorded separately because either can happen without the other.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any
  const body = (req.body ?? {}) as { amount?: number; note?: string | null }

  try {
    const result = await refundOrder(req.scope, orderId, {
      amount: body.amount,
      note: body.note ?? null,
    })
    logger?.info(
      `[orders:refund] ${orderId} refunded ${result.refunded} by ` +
        `${req.auth_context?.actor_id ?? "unknown"} (${result.remaining} still held)`
    )
    return res.json({ success: true, ...result })
  } catch (err: any) {
    logger?.warn(`[orders:refund] ${orderId} refused: ${err.message}`)
    return res.status(200).json({ success: false, message: err.message })
  }
}
