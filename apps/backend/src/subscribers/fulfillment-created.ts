import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ORDER_PROCESSING_MODULE } from "../modules/orderProcessing"

/**
 * When a fulfilment is created, mirror the courier shipment onto it — never book here.
 *
 * Booking is an explicit action ("Send to Steadfast"), which happens BEFORE dispatch and stores
 * the consignment on the order_workflow. By the time a fulfilment exists the parcel is already
 * booked, so all this does is copy the tracking identity onto `fulfillment.data` for the native
 * order-page widget. If the order was NEVER booked with a courier, this does nothing — that
 * fulfilment is a MANUAL shipment, and manual shipments must not silently create a consignment.
 */
export default async function fulfillmentCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ order_id: string; fulfillment_id: string; no_notification?: boolean }>) {
  const logger = container.resolve("logger") as {
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void
  }
  const { fulfillment_id, order_id } = event.data

  const opSvc = container.resolve(ORDER_PROCESSING_MODULE) as any
  const [wf] = await opSvc.listOrderWorkflows({ order_id })

  if (!wf?.consignment_id) {
    // Manual shipment — no courier booking. Nothing to mirror.
    return
  }

  try {
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any
    await fulfillmentModule.updateFulfillment(fulfillment_id, {
      data: {
        courier_status: wf.courier_status ?? "pending",
        courier_id: wf.courier_id,
        consignment_id: wf.consignment_id,
        tracking_id: wf.tracking_id,
      },
    })
    logger.info(
      `[courier:subscriber] Mirrored consignment ${wf.consignment_id} onto fulfilment ${fulfillment_id}`
    )
  } catch (err: any) {
    logger.error(
      `[courier:subscriber] Failed to mirror tracking onto fulfilment ${fulfillment_id}: ${err.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
