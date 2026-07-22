import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { refundPaymentWorkflow } from "@medusajs/core-flows"

/**
 * GIVING MONEY BACK — and nothing else.
 *
 * A refund is not a return. A return is about GOODS (they come back, stock rises, COGS reverses);
 * a refund is about CASH. They often happen together, but they are recorded separately because
 * either can happen without the other: a COD parcel refused at the door comes back with no money
 * to refund, and a goodwill payment for a scratched item moves cash with nothing coming back.
 *
 * Partial amounts matter: "we gave ৳300 back on a ৳3,000 order" is a normal outcome, and treating
 * it as a full reversal misstates both the order's status and the day's takings.
 */

export type RefundResult = {
  refunded: number
  /** Cash still held on the order after this refund. */
  remaining: number
  payments: number
}

export async function refundOrder(
  container: MedusaContainer,
  orderId: string,
  opts?: { amount?: number; note?: string | null }
): Promise<RefundResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "payment_collections.payments.id",
      "payment_collections.payments.amount",
      "payment_collections.payments.captured_at",
      "payment_collections.payments.refunds.amount",
    ],
    filters: { id: orderId },
  })

  const payments = ((data?.[0] as any)?.payment_collections ?? []).flatMap(
    (pc: any) => pc.payments ?? []
  )

  /** What each captured payment still holds, after anything already given back. */
  const refundable = payments
    .filter((p: any) => p.captured_at)
    .map((p: any) => {
      const already = (p.refunds ?? []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0)
      return { id: p.id, left: Math.max(0, (Number(p.amount) || 0) - already) }
    })
    .filter((p: any) => p.left > 0)

  const totalLeft = refundable.reduce((s: number, p: any) => s + p.left, 0)

  if (totalLeft <= 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "There is no captured payment left to refund on this order."
    )
  }

  // No amount given = give back everything still held.
  const asked = opts?.amount == null ? totalLeft : Math.max(0, Number(opts.amount) || 0)
  if (asked <= 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enter an amount greater than zero.")
  }
  if (asked > totalLeft) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `You can refund at most ${totalLeft} — that is what is still held on this order.`
    )
  }

  /**
   * Spread the amount across payments, oldest first, taking what each can still give.
   *
   * An order can hold several captured payments (an advance plus the COD balance), and a refund
   * larger than any single one would fail if it were sent to just the first.
   */
  let outstanding = asked
  let usedPayments = 0
  for (const p of refundable) {
    if (outstanding <= 0) break
    const take = Math.min(outstanding, p.left)
    await refundPaymentWorkflow(container).run({
      input: { payment_id: p.id, amount: take, note: opts?.note ?? undefined } as any,
    })
    outstanding -= take
    usedPayments++
  }

  return { refunded: asked, remaining: totalLeft - asked, payments: usedPayments }
}
