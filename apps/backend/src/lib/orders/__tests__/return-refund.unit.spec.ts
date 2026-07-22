import { derivePaymentStatus, resolveOrderStatus } from "../status"

/**
 * RETURN, REFUND AND EXCHANGE ARE THREE DIFFERENT EVENTS.
 *
 *   return — goods come back; on a refused COD there is no money to move at all
 *   refund — money goes back; the goods may or may not
 *   exchange — the wrong item comes back and a replacement ships as its own order
 *
 * These tests pin the two rules that used to conflate them: an order is only "Refunded" when ALL
 * the money went back, and it counts as returned the moment the parcel turns around rather than
 * only once it lands.
 */

const facts = (over: Partial<Parameters<typeof resolveOrderStatus>[1]> = {}) => ({
  canceled: false,
  fulfilled_qty: 2,
  delivered: true,
  returned_qty: 0,
  refunded_amount: 0,
  captured_amount: 0,
  ...over,
})

describe("resolveOrderStatus — refunds", () => {
  it("a PARTIAL refund does not relabel the order as Refunded", () => {
    // ৳300 goodwill on a ৳3,000 order: the order is still Delivered, the money is a payment fact.
    const status = resolveOrderStatus(
      "confirmed",
      facts({ captured_amount: 3000, refunded_amount: 300 })
    )
    expect(status).toBe("delivered")
  })

  it("a FULL refund does", () => {
    const status = resolveOrderStatus(
      "confirmed",
      facts({ captured_amount: 3000, refunded_amount: 3000 })
    )
    expect(status).toBe("refunded")
  })

  it("treats an over-refund as full", () => {
    const status = resolveOrderStatus(
      "confirmed",
      facts({ captured_amount: 3000, refunded_amount: 3200 })
    )
    expect(status).toBe("refunded")
  })

  it("a refund with nothing captured still reads as refunded", () => {
    // No capture recorded but money went back — don't silently ignore it.
    const status = resolveOrderStatus("confirmed", facts({ refunded_amount: 500 }))
    expect(status).toBe("refunded")
  })
})

describe("resolveOrderStatus — returns", () => {
  it("counts as returned the moment the parcel turns around, before it lands", () => {
    // returned_qty is fed from requested-or-received, so a parcel still in the van shows Returned.
    expect(resolveOrderStatus("confirmed", facts({ returned_qty: 2 }))).toBe("returned")
  })

  it("a returned order that was never paid for is not 'refunded'", () => {
    // The COD case: goods back, no money ever taken, so nothing to give back.
    const status = resolveOrderStatus(
      "confirmed",
      facts({ returned_qty: 2, captured_amount: 0, refunded_amount: 0 })
    )
    expect(status).toBe("returned")
  })

  it("cancellation still outranks a return", () => {
    expect(resolveOrderStatus("confirmed", facts({ canceled: true, returned_qty: 2 }))).toBe(
      "cancelled"
    )
  })
})

describe("derivePaymentStatus — partial vs full refund", () => {
  const pay = (over: Record<string, unknown> = {}) =>
    derivePaymentStatus({ total: 3000, captured: 3000, refunded: 0, is_cod: true, ...over } as any)

  it("reports a partial refund distinctly", () => {
    expect(pay({ refunded: 300 })).toBe("partially_refunded")
  })

  it("reports a full refund as refunded", () => {
    expect(pay({ refunded: 3000 })).toBe("refunded")
  })

  it("is unaffected when no money went back", () => {
    expect(pay()).toBe("paid")
  })

  it("a refused COD parcel — nothing captured, nothing refunded — stays COD", () => {
    expect(pay({ captured: 0, refunded: 0 })).toBe("cod")
  })
})
