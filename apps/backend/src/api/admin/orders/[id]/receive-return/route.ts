import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { receiveReturnedGoods } from "../../../../../lib/returns"

/**
 * POST /admin/orders/:id/receive-return — the goods are physically back.
 *
 * This is the moment stock returns to the shelf and cost of goods reverses. Marking an order
 * returned only says the parcel turned around; until it is received, those units are still in a
 * courier's van and must not be sellable.
 *
 * Returns 200 with `created:false` + a reason for the expected refusals (nothing to receive,
 * already received) so the message reaches the operator instead of a bare status code.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any

  try {
    const result = await receiveReturnedGoods(req.scope, orderId)
    return res.json({
      success: result.created,
      created: result.created,
      items: result.items,
      message: result.reason,
    })
  } catch (err: any) {
    logger?.error(`[orders:receive-return] ${orderId} failed: ${err.message}`)
    return res.status(200).json({ success: false, created: false, message: err.message })
  }
}
