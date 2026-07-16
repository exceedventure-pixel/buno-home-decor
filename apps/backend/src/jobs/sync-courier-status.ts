import type { MedusaContainer } from "@medusajs/framework/types"
import { COURIER_CONFIG_MODULE } from "../modules/courierConfig"
import { getCourierCreds } from "../lib/integration-env"
import { getCourierAdapter } from "../modules/courierConfig/adapters"
import { applyCourierStatus } from "../lib/orders/courier-status"
import { ORDER_PROCESSING_MODULE } from "../modules/orderProcessing"
import type { NormalizedStatus } from "../modules/courierConfig/adapters/interface"

/**
 * Poll fallback for courier status. The webhook is the primary path; this catches anything it
 * missed. It walks order_workflow rows (not fulfilments) because a parcel is booked before any
 * fulfilment exists — a booked-but-not-yet-dispatched order must still be polled so its pickup
 * auto-dispatches it. All the real work (status record + auto-dispatch) lives in applyCourierStatus.
 */

// Booked/awaiting-pickup/in-transit — still open and worth polling.
const OPEN_STATUSES = new Set(["pending", "in_transit"])

export default async function syncCourierStatus({ container }: { container: MedusaContainer }) {
  const logger = container.resolve("logger") as {
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void
  }

  const courierConfigService = container.resolve(COURIER_CONFIG_MODULE) as any
  const [configs] = await courierConfigService.listAndCountCourierConfigs({ is_active: true })
  if (!configs?.length) return

  const config = configs[0]
  const adapter = getCourierAdapter(config.courier_id)
  if (!adapter) {
    logger.warn(`[courier:sync] No adapter for courier "${config.courier_id}"`)
    return
  }

  const credentials = getCourierCreds(config.courier_id)
  if (!credentials) {
    logger.warn(`[courier:sync] Active courier "${config.courier_id}" credentials not set`)
    return
  }

  const opSvc = container.resolve(ORDER_PROCESSING_MODULE) as any
  const workflows: any[] = await opSvc.listOrderWorkflows(
    { courier_id: config.courier_id },
    { take: 1000 }
  )

  const toSync = workflows.filter(
    (wf) => wf.consignment_id && OPEN_STATUSES.has(wf.courier_status ?? "")
  )
  if (!toSync.length) return

  logger.info(`[courier:sync] Polling ${toSync.length} open parcel(s) via ${config.courier_id}`)

  for (const wf of toSync) {
    let status: NormalizedStatus = "unknown"
    try {
      status = await adapter.getStatus(wf.consignment_id, credentials)
    } catch (err: any) {
      logger.warn(`[courier:sync] getStatus failed for ${wf.consignment_id}: ${err.message}`)
      continue
    }
    if (status === "unknown" || status === wf.courier_status) continue

    logger.info(`[courier:sync] ${wf.consignment_id}: ${wf.courier_status} → ${status}`)
    try {
      await applyCourierStatus(container, wf.order_id, status)
    } catch (err: any) {
      logger.error(`[courier:sync] applyCourierStatus failed for order ${wf.order_id}: ${err.message}`)
    }
  }
}

export const config = {
  name: "sync-courier-status",
  schedule: "*/10 * * * *", // every 10 minutes — the webhook is the primary, real-time path
}
