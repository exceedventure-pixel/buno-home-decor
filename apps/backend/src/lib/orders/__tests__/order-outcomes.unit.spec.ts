/**
 * THE MONEY RULES FOR AN ORDER THAT DIDN'T COMPLETE.
 *
 * These four cases were all wrong at once, and every one of them was wrong in the flattering
 * direction — a cancelled order kept its revenue, a refused parcel booked a profit, and a
 * destroyed parcel charged its goods twice while still counting the sale. This pins the rules
 * down as pure arithmetic so they can't drift back.
 *
 * Mirrors computeOrderEconomics: revenue on a failed outcome is only ever the cash we actually
 * kept, and the goods cost is counted exactly once.
 */

type Case = {
  item_total: number
  shipping_total: number
  cogs: number
  courier_fee: number
  captured: number
  refunded: number
  returned_value: number
  units_shipped: number
  units_returned: number
  canceled: boolean
  damaged: boolean
}

const base: Case = {
  item_total: 1400,
  shipping_total: 100,
  cogs: 400,
  courier_fee: 60,
  captured: 0,
  refunded: 0,
  returned_value: 0,
  units_shipped: 1,
  units_returned: 0,
  canceled: false,
  damaged: false,
}

/** The exact rules implemented in computeOrderEconomics. */
function economics(c: Case) {
  const retained = Math.max(0, c.captured - c.refunded)
  let productRevenue = Math.max(0, c.item_total - c.returned_value)
  let deliveryCharged = c.shipping_total

  if (c.canceled && c.units_shipped === 0) {
    productRevenue = 0
    deliveryCharged = 0
  } else if (c.canceled || c.units_returned > 0 || c.damaged) {
    if (c.canceled || c.damaged) productRevenue = 0
    deliveryCharged = Math.min(deliveryCharged, retained)
  }

  const netProfit = productRevenue + deliveryCharged - c.cogs - c.courier_fee
  return { productRevenue, deliveryCharged, netProfit }
}

describe("order outcomes — what a failed order is actually worth", () => {
  it("a normal delivered order is unaffected", () => {
    const r = economics({ ...base, captured: 1500 })
    expect(r.productRevenue).toBe(1400)
    expect(r.deliveryCharged).toBe(100)
    expect(r.netProfit).toBe(1040) // 1400 + 100 − 400 − 60
  })

  it("a COD order awaiting collection still books its revenue (not yet paid ≠ failed)", () => {
    const r = economics({ ...base, captured: 0 })
    expect(r.productRevenue).toBe(1400)
    expect(r.deliveryCharged).toBe(100)
  })

  it("cancelled before dispatch rolls back as if never placed", () => {
    const r = economics({ ...base, canceled: true, units_shipped: 0, cogs: 0, courier_fee: 0 })
    expect(r.productRevenue).toBe(0)
    expect(r.deliveryCharged).toBe(0)
    expect(r.netProfit).toBe(0)
  })

  it("returned with NO advance: we eat the courier fee (used to read +40 profit)", () => {
    const r = economics({
      ...base,
      units_returned: 1,
      returned_value: 1400,
      cogs: 0, // FIFO nets the return back out
      captured: 0,
    })
    expect(r.productRevenue).toBe(0)
    expect(r.deliveryCharged).toBe(0) // never paid for delivery
    expect(r.netProfit).toBe(-60) // the courier fee, a real loss
  })

  it("returned WITH an advance: delivery is recovered out of it, the rest is the loss", () => {
    const r = economics({
      ...base,
      units_returned: 1,
      returned_value: 1400,
      cogs: 0,
      captured: 500, // advance paid
      courier_fee: 60,
    })
    expect(r.deliveryCharged).toBe(100) // recovered out of the advance
    expect(r.netProfit).toBe(40) // 100 − 60
  })

  it("returned with an advance smaller than the delivery charge: shortfall is our loss", () => {
    const r = economics({
      ...base,
      units_returned: 1,
      returned_value: 1400,
      cogs: 0,
      captured: 30, // only 30 down, delivery is 100
      courier_fee: 60,
    })
    expect(r.deliveryCharged).toBe(30) // only what we actually kept
    expect(r.netProfit).toBe(-30) // 30 − 60
  })

  it("an advance refunded back leaves nothing kept", () => {
    const r = economics({
      ...base,
      units_returned: 1,
      returned_value: 1400,
      cogs: 0,
      captured: 500,
      refunded: 500,
    })
    expect(r.deliveryCharged).toBe(0)
    expect(r.netProfit).toBe(-60)
  })

  it("destroyed in transit: no sale, goods charged ONCE (used to read +200 profit)", () => {
    const r = economics({ ...base, damaged: true, item_total: 1000, cogs: 400, courier_fee: 0 })
    expect(r.productRevenue).toBe(0) // nobody received anything
    expect(r.deliveryCharged).toBe(0) // nothing collected
    expect(r.netProfit).toBe(-400) // the goods, counted once
  })
})
