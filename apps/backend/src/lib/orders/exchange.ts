import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/core-flows"

import { ORDER_PROCESSING_MODULE } from "../../modules/orderProcessing"
import { reserveOrderItems } from "./reserve"
import { returnAndRestockOrder } from "../returns"

/**
 * EXCHANGE — we shipped the wrong thing.
 *
 * The wrong item comes back on the original order, and the correct one goes out as its OWN order.
 * Two orders rather than one edited order, deliberately: each parcel then carries its own courier
 * cost and its own P&L, so the real price of the mistake — a delivery paid for twice — is visible
 * instead of blended into a single average that hides it.
 *
 * The FIRST courier fee stays on the original order, where it reads as the loss it is. The
 * replacement is a normal order: its delivery is charged to the customer as usual.
 *
 * Deliberately NOT Medusa's native exchange workflow, which mutates the original order into a
 * blended one and needs return shipping options configured.
 */

export type ReplacementItem = {
  variant_id?: string
  product_id?: string
  title: string
  quantity: number
  unit_price: number
}

export type ExchangeResult = {
  original_order_id: string
  replacement_order_id: string
  returned: boolean
  return_reason?: string
}

export async function createExchange(
  container: MedusaContainer,
  originalOrderId: string,
  opts: {
    items: ReplacementItem[]
    /** What the customer pays for the replacement's delivery. */
    delivery_charged?: number
    /** Take the wrong item back in one step (it's already in hand). */
    receive_now?: boolean
    note?: string | null
  }
): Promise<ExchangeResult> {
  if (!opts.items?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Choose at least one item to send as the replacement."
    )
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const opSvc: any = container.resolve(ORDER_PROCESSING_MODULE)

  /**
   * Copy the original's identity. Scalars and the address only — asking query.graph for TOTALS
   * alongside a relation silently zeroes them (see order-economics), and we need none here.
   */
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "currency_code",
      "region_id",
      "sales_channel_id",
      "customer_id",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.phone",
      "shipping_address.address_1",
      "shipping_address.address_2",
      "shipping_address.city",
      "shipping_address.postal_code",
      "shipping_address.country_code",
      "shipping_methods.name",
      "shipping_methods.shipping_option_id",
    ],
    filters: { id: originalOrderId },
  })

  const original = data?.[0] as any
  if (!original) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order "${originalOrderId}" not found.`)
  }

  const [originalWf] = await opSvc.listOrderWorkflows({ order_id: originalOrderId })
  const orderType = originalWf?.order_type ?? "ready_stock"
  const isReadyStock = orderType === "ready_stock"

  /* 1. The wrong item goes back. Non-fatal: the replacement must still go out even if the original
        can't be returned (already returned, nothing shipped) — the reason is reported instead. */
  const back = await returnAndRestockOrder(container, originalOrderId, {
    receiveNow: opts.receive_now ?? false,
  })

  /* 2. The correct item ships as its own order. */
  const addr = original.shipping_address ?? {}
  const address = {
    first_name: addr.first_name ?? "",
    last_name: addr.last_name ?? "",
    phone: addr.phone ?? "",
    address_1: addr.address_1 ?? "",
    address_2: addr.address_2 ?? undefined,
    city: addr.city ?? undefined,
    postal_code: addr.postal_code ?? undefined,
    country_code: (addr.country_code || "bd").toLowerCase(),
  }

  const items = opts.items.map((it) => {
    const base = {
      title: it.title,
      quantity: Math.max(1, Number(it.quantity) || 1),
      unit_price: Math.max(0, Number(it.unit_price) || 0),
    }
    // Pre-order/custom items carry no variant, which is what keeps Medusa from reserving stock
    // for goods that don't exist yet — same rule as a normal manual order.
    return isReadyStock ? { ...base, variant_id: it.variant_id, product_id: it.product_id } : base
  })

  const deliveryCharged = Math.max(0, Number(opts.delivery_charged) || 0)
  const firstMethod = (original.shipping_methods ?? [])[0]

  const { result: created } = await createOrderWorkflow(container).run({
    input: {
      region_id: original.region_id,
      sales_channel_id: original.sales_channel_id,
      customer_id: original.customer_id ?? undefined,
      email: original.email,
      currency_code: (original.currency_code || "bdt").toLowerCase(),
      status: "pending",
      no_notification: true,
      shipping_address: address,
      billing_address: address,
      items,
      shipping_methods: [
        {
          name: firstMethod?.name || "Delivery",
          amount: deliveryCharged,
          shipping_option_id: firstMethod?.shipping_option_id,
        },
      ],
      metadata: {
        replaces_order_id: originalOrderId,
        ...(opts.note ? { manual_note: opts.note } : {}),
      },
    } as any,
  })

  const replacementId = (created as any)?.id

  /* 3. Link the two, both ways, so neither is an orphan. */
  const [replacementWf] = await opSvc.listOrderWorkflows({ order_id: replacementId })
  if (replacementWf) {
    await opSvc.updateOrderWorkflows([
      { id: replacementWf.id, order_type: orderType, replaces_order_id: originalOrderId },
    ])
  } else {
    await opSvc.createOrderWorkflows([
      { order_id: replacementId, order_type: orderType, replaces_order_id: originalOrderId },
    ])
  }
  if (originalWf) {
    await opSvc.updateOrderWorkflows([
      { id: originalWf.id, replaced_by_order_id: replacementId },
    ])
  }

  /* 4. Hold the stock for the replacement. createOrderWorkflow does NOT reserve, and without this
        the goods can be sold twice — the same gap manual orders had. */
  if (isReadyStock) {
    try {
      await reserveOrderItems(container, replacementId)
    } catch (err: any) {
      const logger = container.resolve("logger") as any
      logger?.warn(`[exchange] Could not reserve stock for ${replacementId}: ${err.message}`)
    }
  }

  return {
    original_order_id: originalOrderId,
    replacement_order_id: replacementId,
    returned: back.created,
    return_reason: back.created ? undefined : back.reason,
  }
}
