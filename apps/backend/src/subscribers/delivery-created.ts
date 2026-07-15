import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { captureOutstandingCod } from "../lib/orders/capture"

/**
 * DELIVERED MEANS THE MONEY CAME IN. This is where that becomes true.
 *
 * ---------------------------------------------------------------------------------
 * Why this lives on an event and not in our own status workflow.
 * ---------------------------------------------------------------------------------
 *
 * There are two ways to say a parcel arrived: our Order Processing panel, and Medusa's own
 * "Mark as delivered" on the fulfilment. Both are legitimate, and staff will use both.
 *
 * If our panel collected the cash itself, then delivering through Medusa's button — the one
 * sitting right next to the fulfilment, the obvious one to press — would mark the order Delivered
 * and collect nothing. The order reads paid-on-delivery, the cash is real, and the books still
 * say it is owed. That is exactly the bug this fixes.
 *
 * So neither panel collects. Both merely mark the fulfilment delivered, Medusa emits
 * `delivery.created`, and the collecting happens HERE — once, in one place, no matter which
 * button was pressed. There is nothing to keep in sync because there is only one path.
 *
 * `captureOutstandingCod` is idempotent (it derives what's owed from the payments that actually
 * exist), so a second delivery event on the same order collects nothing extra.
 */
export default async function deliveryCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  // The event carries the FULFILLMENT id, not the order's. The link table is the direct way
  // back — filtering orders by a fulfilment field would be a cross-module filter, which
  // query.graph can't do.
  const query = container.resolve("query") as any

  try {
    const { data: links } = await query.graph({
      entity: "order_fulfillment",
      fields: ["order_id"],
      filters: { fulfillment_id: data.id },
    })

    const orderId = links?.[0]?.order_id
    if (!orderId) {
      logger.warn(`[cod-capture] fulfillment ${data.id} has no order — nothing to collect`)
      return
    }

    const { captured } = await captureOutstandingCod(container, orderId)

    if (captured > 0) {
      logger.info(`[cod-capture] collected ${captured} on order ${orderId} (delivered)`)
    }
  } catch (err: any) {
    /**
     * Loud, because this is money. The parcel is delivered either way — that part is already
     * true and must not be rolled back — but the cash has NOT been recorded, so the order will
     * keep showing an outstanding balance until someone looks. Which is the correct, visible
     * failure: the books say what is actually true.
     */
    logger.error(
      `[cod-capture] FAILED to collect on delivery of fulfillment ${data.id}: ${err.message}. ` +
        `The order will still show its balance outstanding — collect it manually.`
    )
  }
}

export const config: SubscriberConfig = { event: "delivery.created" }
