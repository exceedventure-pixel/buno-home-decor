import {
  allowedTransitions,
  type IssueStatus,
  type OrderPaymentStatus,
  type OrderStatus,
  type OrderType,
  type StoredStage,
} from "../../modules/orderProcessing/constants"

/**
 * THE SYNC GUARANTEE, as two pure functions.
 *
 * Neither of these reads or writes anything — they take facts and return a status. That's the
 * whole point: a status we DERIVE cannot drift from reality, whereas a status we STORE drifts
 * the moment someone fulfils an order or captures a payment in Medusa's own screens.
 *
 * If you are ever tempted to add a `payment_status` column, re-read this file first.
 */

/* --------------------------------- payment status ---------------------------------- */

export type PaymentFacts = {
  /** What the order is worth. */
  total: number
  /** Money Medusa actually took: Σ payments.captured_amount. */
  captured: number
  /** Money Medusa actually gave back: Σ payments.refunded_amount. */
  refunded: number
  /** Cash on delivery: decides whether "nothing captured yet" reads as COD or as Unpaid. */
  is_cod: boolean
}

/**
 * Payment status, entirely from the money that actually moved.
 *
 * The distinction between "Advance Paid" and "Partially Paid" is not about the maths — both are
 * a part payment. It's about intent: taking a deposit up front on a cash-on-delivery order is a
 * deliberate, common thing here, and it deserves its own name so the team can spot the orders
 * where a customer has already put money down.
 */
export function derivePaymentStatus(f: PaymentFacts): OrderPaymentStatus {
  const total = Number(f.total) || 0
  const captured = Number(f.captured) || 0
  const refunded = Number(f.refunded) || 0

  /**
   * Money went back to the customer — but "some of it" and "all of it" are different facts.
   *
   * A ৳300 goodwill refund on a ৳3,000 order used to report the same status as handing the whole
   * lot back, which made a part-refunded order impossible to tell from a fully reversed one.
   */
  if (refunded > 0) {
    return captured > 0 && refunded < captured ? "partially_refunded" : "refunded"
  }

  if (captured <= 0) return f.is_cod ? "cod" : "unpaid"

  // Nothing left owing (>= guards against rounding and over-capture).
  if (total > 0 && captured >= total) return "paid"
  if (total <= 0) return "paid"

  return f.is_cod ? "advance_paid" : "partially_paid"
}

/* ---------------------------------- order status ----------------------------------- */

/**
 * What Medusa knows about an order, independent of anything we stored.
 * `delivered` comes from the courier (the only party that actually knows).
 */
export type OrderFacts = {
  canceled: boolean
  /** Σ items.detail.fulfilled_quantity — units that physically left the shelf. */
  fulfilled_qty: number
  /** Σ items.detail.delivered_quantity, or the courier reporting delivery. */
  delivered: boolean
  /**
   * Units the customer is sending back — Σ return_requested_quantity, or received where a return
   * was taken in one step. Deliberately counts REQUESTED, not just received: the moment a parcel
   * turns around the order is a return, even while it's still in the courier's van.
   */
  returned_qty: number
  refunded_amount: number
  /**
   * Cash captured on the order. Needed to tell a PARTIAL refund from a full one — without it any
   * refund at all reads as "Refunded".
   */
  captured_amount?: number
}

/**
 * The effective order status: Medusa's truth first, our stored stage only as a fallback.
 *
 * The precedence is deliberate and it is the thing that keeps us honest. If Medusa says the
 * order was cancelled, it does not matter that someone left the stage on "In Production" — it
 * is Cancelled. Our stage only gets to speak about the part of the journey Medusa has no
 * opinion on: the workshop.
 */
export function resolveOrderStatus(stage: StoredStage, facts: OrderFacts): OrderStatus {
  /**
   * ONLY A FULL REFUND IS "REFUNDED".
   *
   * This used to fire on any refunded_amount > 0, so giving ৳300 back on a ৳3,000 order as
   * goodwill relabelled the whole order Refunded — hiding whether it had actually been delivered
   * or returned. A partial refund is a fact about the MONEY, not about where the order got to, so
   * it belongs in payment status and leaves the journey alone.
   */
  const refunded = Number(facts.refunded_amount) || 0
  const captured = Number(facts.captured_amount ?? 0) || 0
  const fullyRefunded = refunded > 0 && (captured <= 0 || refunded >= captured)
  if (fullyRefunded) return "refunded"

  if (facts.canceled) return "cancelled"
  if ((Number(facts.returned_qty) || 0) > 0) return "returned"
  if (facts.delivered) return "delivered"
  if ((Number(facts.fulfilled_qty) || 0) > 0) return "dispatched"

  // Nothing has physically happened yet, so the business stage is the truth.
  return stage
}

/* ------------------------------------- guards -------------------------------------- */

export type TransitionCheck = { ok: boolean; reason?: string }

/**
 * May this order move to `to`? Guards exist so a stray click can't corrupt the books — you
 * cannot deliver an order that never shipped, and you cannot dispatch one nobody confirmed.
 *
 * The type matters: a ready-stock order has no production stages, so "in production" is not a
 * legal move for it, while "confirmed → dispatched" is.
 */
export function canTransition(
  type: OrderType,
  from: OrderStatus,
  to: OrderStatus
): TransitionCheck {
  if (from === to) return { ok: false, reason: `The order is already ${to.replace(/_/g, " ")}.` }

  const allowed = allowedTransitions(type, from)
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason:
        `An order that is "${from.replace(/_/g, " ")}" can't go straight to ` +
        `"${to.replace(/_/g, " ")}". Allowed next: ${
          allowed.length ? allowed.map((s) => s.replace(/_/g, " ")).join(", ") : "nothing — this is final"
        }.`,
    }
  }
  return { ok: true }
}

/**
 * Damaged goods must NOT go back on the shelf — they no longer exist. Everything else that comes
 * back does. Getting this backwards either invents stock that isn't there, or hides a real loss.
 */
export function issueRestocksGoods(issue: IssueStatus): boolean {
  return issue === "returned" || issue === "wrong_product" || issue === "exchange_requested"
}

export function issueWritesOffGoods(issue: IssueStatus): boolean {
  return issue === "damaged"
}
