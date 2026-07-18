import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { getCourierAdapter } from "../../modules/courierConfig/adapters"
import { COURIER_CONFIG_MODULE } from "../../modules/courierConfig"
import { ORDER_PROCESSING_MODULE } from "../../modules/orderProcessing"
import { getCourierCreds } from "../integration-env"
import { computeOrderEconomics } from "./order-economics"

/**
 * BOOK A PARCEL WITH THE ACTIVE COURIER — the real work behind "Send to Steadfast".
 *
 * This runs BEFORE dispatch: it registers the consignment with the courier and stores the
 * tracking identity on the order_workflow row. No Medusa fulfilment is created here, so no stock
 * moves — that happens later at dispatch, which the courier's pickup status triggers.
 *
 * The COD amount is the exact figure the courier should collect: the caller's override when given,
 * otherwise the order's `outstanding` (total minus any captured advance, delivery included).
 */
export type BookCourierResult = {
  courier_id: string
  consignment_id: string
  tracking_id: string
  cod_amount: number
  delivery_charge?: number
}

export async function bookCourierParcel(
  container: MedusaContainer,
  orderId: string,
  opts?: { cod_amount?: number; note?: string }
): Promise<BookCourierResult> {
  const courierSvc: any = container.resolve(COURIER_CONFIG_MODULE)
  const [configs] = await courierSvc.listAndCountCourierConfigs({ is_active: true })
  if (!configs?.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "No courier is active. Set one active in Store Settings → Couriers, or ship this order manually."
    )
  }

  const config = configs[0]
  const adapter = getCourierAdapter(config.courier_id)
  if (!adapter) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `No adapter is registered for courier "${config.courier_id}".`
    )
  }

  const credentials = getCourierCreds(config.courier_id)
  if (!credentials) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${config.courier_id} credentials are not set in the environment.`
    )
  }

  // COD to collect: explicit override, else the order's outstanding balance.
  let cod = opts?.cod_amount
  if (cod == null) {
    const [econ] = await computeOrderEconomics(container, { order_id: orderId })
    cod = Math.max(0, Number(econ?.outstanding ?? 0))
  }
  cod = Math.max(0, Number(cod) || 0)

  const orderModule: any = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["shipping_address", "items"],
  })

  const result = await adapter.createParcel(order, credentials, {
    cod_amount: cod,
    note: opts?.note,
  })

  if (!result.consignment_id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${config.courier_id} did not return a consignment id for order ${orderId}.`
    )
  }

  // Store the shipment identity on the order_workflow (the parcel exists before any fulfilment).
  const opSvc: any = container.resolve(ORDER_PROCESSING_MODULE)
  let [wf] = await opSvc.listOrderWorkflows({ order_id: orderId })
  if (!wf) [wf] = await opSvc.createOrderWorkflows([{ order_id: orderId }])

  await opSvc.updateOrderWorkflows([
    {
      id: wf.id,
      courier_id: config.courier_id,
      consignment_id: result.consignment_id,
      tracking_id: result.tracking_id,
      courier_status: "pending",
      cod_amount: cod,
      ...(result.delivery_charge != null
        ? { actual_delivery_charge: result.delivery_charge }
        : {}),
    },
  ])

  return {
    courier_id: config.courier_id,
    consignment_id: result.consignment_id,
    tracking_id: result.tracking_id,
    cod_amount: cod,
    delivery_charge: result.delivery_charge,
  }
}

export type RebookCourierResult = BookCourierResult & {
  old_consignment_id: string
  old_courier_id: string | null
  /** Whether the OLD parcel was cancelled via the courier's API. Steadfast has none, so usually
   *  false — the old consignment must then be cancelled in the courier's portal by hand. */
  old_cancelled: boolean
}

/**
 * REBOOK A PARCEL — the courier never picked it up, or a delivery attempt failed, and we need a
 * fresh consignment.
 *
 * It cancels the OLD parcel with its courier when the adapter supports it (Steadfast's public API
 * does not, so that stays a portal action — see `old_cancelled`), then books a brand-new
 * consignment for the same order, overwriting the tracking identity on the workflow.
 *
 * The order's STAGE is untouched: a booked-but-not-picked order stays `courier_booked` and will
 * auto-dispatch on the NEW parcel's pickup; a dispatched order stays dispatched with fresh tracking.
 */
export async function rebookCourierParcel(
  container: MedusaContainer,
  orderId: string,
  opts?: { cod_amount?: number; note?: string }
): Promise<RebookCourierResult> {
  const logger = container.resolve("logger") as { warn: (m: string) => void }
  const opSvc: any = container.resolve(ORDER_PROCESSING_MODULE)
  const [wf] = await opSvc.listOrderWorkflows({ order_id: orderId })

  if (!wf?.consignment_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This order isn't booked with a courier, so there's nothing to rebook."
    )
  }

  const oldConsignment: string = wf.consignment_id
  const oldCourierId: string | null = wf.courier_id ?? null

  // Best-effort cancel of the OLD parcel with its own courier. When the courier exposes no cancel
  // (Steadfast), this is a no-op and the caller is told to cancel it in the portal.
  let oldCancelled = false
  try {
    const adapter = oldCourierId ? getCourierAdapter(oldCourierId) : undefined
    const creds = oldCourierId ? getCourierCreds(oldCourierId) : null
    if (adapter?.cancelParcel && creds) {
      await adapter.cancelParcel(oldConsignment, creds)
      oldCancelled = true
    }
  } catch (err: any) {
    logger.warn(
      `[courier:rebook] Could not cancel old consignment ${oldConsignment} for ${orderId}: ${err.message}`
    )
  }

  // Book a fresh parcel with the active courier. bookCourierParcel overwrites the workflow's
  // consignment / tracking and resets courier_status to "pending".
  const result = await bookCourierParcel(container, orderId, opts)

  return {
    ...result,
    old_consignment_id: oldConsignment,
    old_courier_id: oldCourierId,
    old_cancelled: oldCancelled,
  }
}
