import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createAndCompleteReturnOrderWorkflow,
  createShippingOptionsWorkflow,
  receiveAndCompleteReturnOrderWorkflow,
} from "@medusajs/core-flows"

import { requireSellableLocation } from "./inventory/stock-location"

export type ReturnRestockResult = {
  created: boolean
  items: number
  reason?: string
}

/**
 * Find — or CREATE — the store's internal return shipping option (is_return = true).
 *
 * Medusa's return workflow always creates a return fulfillment, which needs a return shipping
 * option — without one it throws the cryptic "shippingOption - id must be defined". Rather than
 * depend on someone remembering to run a setup script, this provisions the ৳0 option on first use:
 * it looks for one (by its is_return rule, then by name) and, if none exists, creates it by
 * borrowing the service zone / profile / provider from an existing outbound option. Idempotent and
 * self-healing, so returns simply work after deploy with no manual step.
 */
async function ensureReturnShippingOption(container: any): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "provider_id",
      "service_zone_id",
      "shipping_profile_id",
      "rules.attribute",
      "rules.value",
    ],
  })

  const byRule = (options ?? []).find((o: any) =>
    (o.rules ?? []).some((r: any) => r.attribute === "is_return" && String(r.value) === "true")
  )
  const existing = byRule ?? (options ?? []).find((o: any) => o.name === "Return Delivery")
  if (existing) return existing.id

  // None yet — create it, borrowing the zone/profile/provider from an existing outbound option so
  // returns land in the one canonical warehouse (same fulfillment set the store ships from).
  const template = (options ?? []).find(
    (o: any) => o.service_zone_id && o.shipping_profile_id && o.provider_id
  )
  if (!template) {
    throw new Error(
      "Cannot record a return: no delivery shipping option exists to base the return option on. Set up delivery first."
    )
  }

  const { result } = await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Return Delivery",
        price_type: "flat",
        provider_id: template.provider_id,
        service_zone_id: template.service_zone_id,
        shipping_profile_id: template.shipping_profile_id,
        type: {
          label: "Return",
          description: "Internal option for recording returns. Never shown at checkout.",
          code: "return-delivery",
        },
        prices: [{ currency_code: "bdt", amount: 0 }],
        rules: [
          { attribute: "is_return", value: "true", operator: "eq" },
          { attribute: "enabled_in_store", value: "false", operator: "eq" },
        ],
      },
    ] as any,
  })

  const created = Array.isArray(result) ? result[0] : result
  return (created as any).id
}

/**
 * Creates AND receives a native Medusa return for the whole order, which
 * restocks the returned items' inventory. No refund is issued (restock only).
 *
 * Idempotent: if the order is canceled, has no items, or already has a return,
 * it does nothing (prevents double-restock when called from both the courier
 * sync job and the manual button).
 */
export async function returnAndRestockOrder(
  container: any,
  orderId: string,
  opts?: { receiveNow?: boolean }
): Promise<ReturnRestockResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "status",
      "items.id",
      // Quantities live on the line item's DETAIL, not on the item itself. Reading `items.quantity`
      // returned undefined, so every line was filtered out and a perfectly returnable parcel
      // reported "no returnable items" — the whole reason returns appeared broken.
      "items.detail.quantity",
      "items.detail.fulfilled_quantity",
      "items.detail.return_received_quantity",
      "returns.id",
    ],
    filters: { id: orderId },
  })
  const order = orders?.[0]

  if (!order) return { created: false, items: 0, reason: "Order not found" }
  if (order.status === "canceled") return { created: false, items: 0, reason: "Order is canceled" }
  if ((order.returns ?? []).length > 0) return { created: false, items: 0, reason: "Order already has a return" }

  /**
   * Return what actually SHIPPED and hasn't come back yet.
   *
   * Ordered quantity is the wrong basis: a part-shipped order would try to return units that never
   * left the shelf, and restocking those would invent stock. Fulfilled-minus-already-returned is
   * the true figure, and it works the same whether the parcel is merely dispatched or delivered —
   * both have units out with the customer or the courier.
   */
  const items = (order.items ?? [])
    .map((i: any) => {
      const fulfilled = Number(i.detail?.fulfilled_quantity ?? 0)
      const alreadyBack = Number(i.detail?.return_received_quantity ?? 0)
      return { id: i.id, quantity: Math.max(0, fulfilled - alreadyBack) }
    })
    .filter((i: any) => i.quantity > 0)

  if (items.length === 0) {
    return {
      created: false,
      items: 0,
      reason: "Nothing has shipped on this order yet, so there is nothing to return.",
    }
  }

  /**
   * TELL MEDUSA WHERE THE GOODS COME BACK TO.
   *
   * `location_id` is optional in the DTO, but only because Medusa will otherwise fall back to
   * `returnShippingOption.service_zone.fulfillment_set.location` — and we don't create a return
   * shipping option, so that read blew up with "shippingOption - id must be defined" and no return
   * could ever be made.
   *
   * It also has to be THIS location specifically: stock is shipped from the one canonical
   * warehouse, so returning into a different one would credit stock somewhere the sales channel
   * can't sell from — the same split-location trap that once had quantities reading negative.
   */
  const location = await requireSellableLocation(container)

  /**
   * TELL MEDUSA WHICH RETURN OPTION TO USE.
   *
   * The workflow unconditionally builds a return fulfillment from `return_shipping.option_id`.
   * Passing it (with `price: 0`) both sets the return method to ৳0 AND avoids the
   * `calculated_price` dereference that would otherwise blow up — the real fix for the old
   * "shippingOption - id must be defined" error, which `location_id` alone never solved.
   */
  const returnOptionId = await ensureReturnShippingOption(container)

  /**
   * RECEIVING IS A SEPARATE MOMENT FROM RETURNING.
   *
   * `receive_now: false` records that the parcel is coming back WITHOUT putting the units on the
   * shelf — which is the truth while it's still in a courier's van. Restocking then would let you
   * sell a unit nobody has yet. Call `receiveReturnedGoods` when it physically arrives.
   *
   * Pass `receiveNow: true` for the common case where the parcel is already in your hands.
   */
  const receiveNow = opts?.receiveNow ?? false

  await createAndCompleteReturnOrderWorkflow(container).run({
    input: {
      order_id: orderId,
      items,
      location_id: location.id,
      return_shipping: { option_id: returnOptionId, price: 0 },
      receive_now: receiveNow,
    },
  })

  return { created: true, items: items.length }
}

/**
 * RECEIVE THE GOODS — the second half of a return, when the parcel is physically back.
 *
 * This is what actually puts the units on the shelf and reverses their cost of goods (FIFO counts
 * `fulfilled − return_received_quantity`, so nothing else has to be told). Splitting it from
 * "returned" is the difference between stock you can sell and stock that is still in transit.
 *
 * Idempotent: a return with nothing left outstanding is reported, not re-received, so pressing the
 * button twice can't restock the same units twice.
 */
export async function receiveReturnedGoods(
  container: any,
  orderId: string
): Promise<ReturnRestockResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "returns.id",
      "returns.canceled_at",
      "returns.items.id",
      "returns.items.item_id",
      "returns.items.quantity",
      "returns.items.received_quantity",
    ],
    filters: { id: orderId },
  })
  const order = orders?.[0]
  if (!order) return { created: false, items: 0, reason: "Order not found" }

  const open = (order.returns ?? []).find((r: any) => !r.canceled_at)
  if (!open) {
    return {
      created: false,
      items: 0,
      reason: "This order has no return to receive — mark it returned first.",
    }
  }

  // Only what is still outstanding on the return.
  const items = (open.items ?? [])
    .map((ri: any) => ({
      id: ri.item_id ?? ri.id,
      quantity: Math.max(0, Number(ri.quantity ?? 0) - Number(ri.received_quantity ?? 0)),
    }))
    .filter((i: any) => i.quantity > 0)

  if (items.length === 0) {
    return { created: false, items: 0, reason: "These goods have already been received." }
  }

  await receiveAndCompleteReturnOrderWorkflow(container).run({
    input: { return_id: open.id, items },
  })

  return { created: true, items: items.length }
}
