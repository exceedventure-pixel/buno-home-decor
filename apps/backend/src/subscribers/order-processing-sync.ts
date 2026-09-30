import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { ORDER_PROCESSING_MODULE } from "../modules/orderProcessing"
import { checkShortages } from "../lib/orders/reserve"

/**
 * The other half of "in sync".
 *
 * Setting a status in Order Processing performs the real action. This is the reverse: when
 * someone acts NATIVELY in Medusa — fulfils from the order page, cancels, captures a payment —
 * the pipeline must not be left claiming the parcel is still "In Production".
 *
 * Most of that is free: order status from Dispatched onwards, and payment status entirely, are
 * DERIVED, so they update themselves the instant Medusa's data changes. Nothing to listen for.
 *
 * What this subscriber is actually for is the one thing that ISN'T derived — making sure every
 * order HAS a workflow row (so it shows up in the queue at all), and leaving an audit trail of
 * the system's own moves alongside the humans'.
 */
export default async function orderProcessingSync({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id
  if (!orderId) return

  const svc: any = container.resolve(ORDER_PROCESSING_MODULE)
  const logger: any = container.resolve("logger")

  try {
    const [existing] = await svc.listOrderWorkflows({ order_id: orderId })
    if (!existing) {
      await svc.createOrderWorkflows([{ order_id: orderId, stage: "new_order" }])
    }

    if (event.name === "order.placed") {
      // Check if this website order was placed with items that have inventory shortages (backorders)
      try {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: ords } = await query.graph({
          entity: "order",
          fields: ["id", "metadata", "items.variant_id", "items.quantity", "items.title"],
          filters: { id: orderId },
        })
        const ord = (ords?.[0] as any)
        if (ord && !ord.metadata?.is_backorder) {
          const lines = (ord.items ?? [])
            .filter((i: any) => i.variant_id)
            .map((i: any) => ({ variant_id: i.variant_id, quantity: Number(i.quantity) || 1, title: i.title }))
          if (lines.length) {
            const shortages = await checkShortages(container, lines)
            if (shortages.length > 0) {
              const orderSvc: any = container.resolve(Modules.ORDER)
              await orderSvc.updateOrders([
                {
                  id: orderId,
                  metadata: {
                    ...(ord.metadata ?? {}),
                    is_backorder: true,
                    backorder_shortages: shortages,
                  },
                },
              ])
              await svc.createOrderStatusEvents([
                {
                  order_id: orderId,
                  field: "order",
                  from_value: null,
                  to_value: "backorder",
                  actor_id: null,
                  source: "website",
                  note: `Placed on backorder from website (${shortages.map((s) => `${s.title}: ${s.requested} needed, ${s.available} in stock`).join(", ")}) — awaiting restock.`,
                },
              ])
            }
          }
        }
      } catch (err: any) {
        logger?.warn(`[order-processing-sync] checkShortages on order.placed: ${err.message}`)
      }
    } else {
      // A native action is still an event worth recording — "who dispatched this?" must have an
      // answer even when the answer is "someone used Medusa's own button".
      await svc.createOrderStatusEvents([
        {
          order_id: orderId,
          field: "order",
          from_value: null,
          to_value: event.name.replace("order.", ""),
          actor_id: null,
          source: "medusa",
          note: "Done natively in Medusa — status re-derived from the order.",
        },
      ])
    }
  } catch (e: any) {
    logger?.error(`[order-processing-sync] ${event.name} ${orderId}: ${e.message}`)
  }
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.fulfillment_created",
    "order.return_received",
    "order.canceled",
  ],
}
