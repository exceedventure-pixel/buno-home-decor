import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { rebookCourierParcel } from "../../../../../lib/orders/courier-booking"

/**
 * POST /admin/orders/:id/rebook-courier — the parcel failed (no pickup / failed delivery). Cancel
 * the old consignment where the courier's API allows it, then book a fresh one for the same order.
 *
 * Returns 200 with `success:false` + a human message for expected refusals (not booked, no active
 * courier, courier API error) so the admin sees WHY — adminFetch surfaces only the status otherwise.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any

  try {
    const result = await rebookCourierParcel(req.scope, orderId)
    return res.json({
      success: true,
      courier_id: result.courier_id,
      old_consignment_id: result.old_consignment_id,
      new_consignment_id: result.consignment_id,
      tracking_id: result.tracking_id,
      // False for Steadfast (no API cancel) → the old parcel must be cancelled in their portal.
      old_cancelled: result.old_cancelled,
    })
  } catch (err: any) {
    logger?.warn(`[orders:rebook-courier] ${orderId} failed: ${err.message}`)
    return res.status(200).json({ success: false, message: err.message })
  }
}
