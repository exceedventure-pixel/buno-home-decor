import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createAndCompleteReturnOrderWorkflow } from "@medusajs/core-flows"

export type ReturnRestockResult = {
  created: boolean
  items: number
  reason?: string
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
  orderId: string
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

  await createAndCompleteReturnOrderWorkflow(container).run({
    input: { order_id: orderId, items },
  })

  return { created: true, items: items.length }
}
