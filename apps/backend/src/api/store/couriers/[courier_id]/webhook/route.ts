import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"

import { getCourierAdapter } from "../../../../../modules/courierConfig/adapters"
import { getCourierCreds } from "../../../../../lib/integration-env"
import { applyCourierStatus } from "../../../../../lib/orders/courier-status"
import { ORDER_PROCESSING_MODULE } from "../../../../../modules/orderProcessing"

/**
 * Courier delivery-status webhook.
 *
 * PUBLIC endpoint, so it is gated by a shared secret (STEADFAST_WEBHOOK_SECRET) sent as the
 * `x-webhook-secret` header or `?secret=` — courier webhooks are unsigned. It does NOT trust the
 * status in the payload: it takes the consignment id, looks the order up, then RE-FETCHES the
 * authoritative status from the courier's API and hands it to applyCourierStatus (which records
 * it and auto-dispatches / delivers / restocks as needed). A missing/blank secret env disables
 * the endpoint entirely rather than leaving it open.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve("logger") as {
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void
  }
  const { courier_id } = req.params
  const body = (req.body ?? {}) as Record<string, any>
  const query = req.query as Record<string, string>

  const expected = process.env.STEADFAST_WEBHOOK_SECRET
  if (!expected) {
    logger.warn("[courier:webhook] STEADFAST_WEBHOOK_SECRET not set — rejecting")
    return res.status(503).json({ error: "Webhook not configured" })
  }
  const provided = (req.headers["x-webhook-secret"] as string) || query.secret || ""
  if (provided !== expected) {
    return res.status(401).json({ error: "Invalid secret" })
  }

  const consignmentId = String(
    body.consignment_id ?? body.consignmentId ?? body.cid ?? query.consignment_id ?? ""
  )
  if (!consignmentId) {
    return res.status(400).json({ error: "Missing consignment_id" })
  }

  const opSvc = req.scope.resolve(ORDER_PROCESSING_MODULE) as any
  const [wf] = await opSvc.listOrderWorkflows({ consignment_id: consignmentId })
  if (!wf) {
    logger.warn(`[courier:webhook] No order for consignment ${consignmentId}`)
    // 200 so the courier doesn't retry forever on an unknown consignment.
    return res.json({ received: true, matched: false })
  }

  const adapter = getCourierAdapter(wf.courier_id ?? courier_id)
  const credentials = getCourierCreds(wf.courier_id ?? courier_id)
  if (!adapter || !credentials) {
    logger.warn(`[courier:webhook] No adapter/creds for "${wf.courier_id ?? courier_id}"`)
    return res.json({ received: true, matched: true, synced: false })
  }

  try {
    // Re-fetch the real status rather than trusting the payload.
    const status = await adapter.getStatus(consignmentId, credentials)

    // Opportunistically capture a delivery charge if the courier pushed one.
    const rawCharge = Number(body.delivery_charge ?? body.charge ?? body.delivery_fee)
    const delivery_charge = Number.isFinite(rawCharge) && rawCharge > 0 ? rawCharge : undefined

    await applyCourierStatus(req.scope, wf.order_id, status, { delivery_charge })
    logger.info(`[courier:webhook] ${consignmentId} → ${status} (order ${wf.order_id})`)
    return res.json({ received: true, matched: true, status })
  } catch (err: any) {
    logger.error(`[courier:webhook] Failed for consignment ${consignmentId}: ${err.message}`)
    return res.status(500).json({ error: "Processing failed" })
  }
}
