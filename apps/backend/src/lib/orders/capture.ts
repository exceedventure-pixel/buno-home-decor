import {
  capturePaymentWorkflow,
  createOrderPaymentCollectionWorkflow,
} from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { computeOrderEconomics } from "./order-economics"

/**
 * COLLECTING CASH THAT NOBODY EVER AUTHORISED.
 *
 * ---------------------------------------------------------------------------------
 * The thing that makes COD different.
 * ---------------------------------------------------------------------------------
 *
 * A card order arrives with a payment already sitting there, authorised and waiting — collecting
 * it is just "capture the payment that exists". Cash on delivery has no such thing. Nobody
 * authorised anything; a courier simply handed over money. Until we write that down there is no
 * payment on the order at all.
 *
 * That is why "capture every uncaptured payment" silently collects NOTHING on a COD order: there
 * are zero payments to loop over. The order reads Delivered, the cash is in the office, and the
 * books still say it is owed.
 *
 * So for the balance we CREATE the payment — collection, session, authorise, capture — and that
 * record is what makes the money real to Medusa.
 */

/**
 * Record `amount` of cash taken on an order, end to end.
 *
 * Every step is needed: Medusa will only capture a payment, a payment only exists inside a
 * collection, and a session only becomes a payment once authorised. Returns the payment id.
 */
export async function chargeOrder(
  container: MedusaContainer,
  orderId: string,
  amount: number
): Promise<string> {
  const { result } = await createOrderPaymentCollectionWorkflow(container).run({
    input: { order_id: orderId, amount },
  })

  // The workflow returns an ARRAY of collections, not the one it just made.
  const collection = (result as any)?.[0]
  if (!collection?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Could not create a payment collection for order ${orderId}`
    )
  }

  const paymentModule: any = container.resolve(Modules.PAYMENT)

  /**
   * A manual session we authorise and capture in the same breath, because the cash is already
   * in hand — there is nothing to wait for.
   *
   * The currency comes from the collection, which the workflow above derived from the ORDER.
   * Naming a currency here instead would let the session disagree with the collection it
   * belongs to the moment a store sells in anything else.
   */
  const session = await paymentModule.createPaymentSession(collection.id, {
    provider_id: "pp_system_default",
    amount,
    currency_code: collection.currency_code,
    data: {},
  })

  const payment = await paymentModule.authorizePaymentSession(session.id, {})
  // Null means the provider went async and is still pending — pp_system_default never does, so
  // treat it as a real failure rather than capturing against an undefined id.
  if (!payment?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Payment session ${session.id} did not authorize`
    )
  }

  await paymentModule.capturePayment({ payment_id: payment.id, amount })
  return payment.id
}

/**
 * Collect everything still owed on an order — the moment the parcel is delivered.
 *
 * Two different debts, in order:
 *   1. payments that exist but were never captured (an authorised card, say);
 *   2. whatever is STILL owed after that, which is COD — cash with no payment behind it.
 *
 * IDEMPOTENT ON PURPOSE. `outstanding` is derived from the payments that actually exist, so once
 * the money is recorded this function has nothing left to find and does nothing. That is what
 * lets it be called from anywhere a delivery is reported without ever double-charging.
 */
export async function captureOutstandingCod(
  container: MedusaContainer,
  orderId: string
): Promise<{ captured: number }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "payment_collections.payments.id",
      "payment_collections.payments.captured_at",
      "payment_collections.payments.canceled_at",
    ],
    filters: { id: orderId },
  })

  const payments = ((data?.[0] as any)?.payment_collections ?? []).flatMap(
    (pc: any) => pc.payments ?? []
  )

  for (const p of payments.filter((p: any) => !p.captured_at && !p.canceled_at)) {
    await capturePaymentWorkflow(container).run({ input: { payment_id: p.id } })
  }

  // Recomputed AFTER the loop above, so it counts what we just collected and can't charge twice.
  const [econ] = await computeOrderEconomics(container, { order_id: orderId })
  const owed = Math.max(0, Number(econ?.outstanding ?? 0))

  // Not an error: a prepaid order is fully paid and is still legitimately Delivered. There is
  // simply nothing left to collect.
  if (owed <= 0) return { captured: 0 }

  await chargeOrder(container, orderId, owed)
  return { captured: owed }
}
