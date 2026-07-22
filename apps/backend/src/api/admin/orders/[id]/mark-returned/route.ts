import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { returnAndRestockOrder } from "../../../../../lib/returns"

/**
 * POST /admin/orders/:id/mark-returned — the parcel is coming back.
 *
 * `receive_now: true` also puts the goods on the shelf in the same step, for a parcel already in
 * hand. Left false, this only records that the parcel turned around: revenue reverses (the customer
 * isn't paying) but the stock stays out until it physically arrives — see receive-return.
 *
 * No refund is issued either way. Money is a separate action, because a refused COD parcel has no
 * money to give back. Idempotent.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any

  try {
    const body = (req.body ?? {}) as { receive_now?: boolean }
    const result = await returnAndRestockOrder(req.scope, orderId, {
      receiveNow: Boolean(body.receive_now),
    })
    if (!result.created) {
      return res.status(200).json({ success: false, created: false, message: result.reason })
    }
    return res.status(200).json({ success: true, created: true, items: result.items })
  } catch (err: any) {
    logger?.error(`[orders:mark-returned] ${orderId} failed: ${err.message}`)
    return res.status(500).json({ success: false, error: err.message })
  }
}
