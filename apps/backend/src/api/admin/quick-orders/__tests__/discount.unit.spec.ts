/**
 * SPREADING AN ORDER DISCOUNT ACROSS LINES.
 *
 * Mirrors the logic in the quick-orders route. The property that matters is exactness: the total
 * discount actually applied must equal the amount asked for, to the taka. Proportional shares
 * round individually, so without pushing the remainder somewhere the customer is quietly charged
 * a taka more or less than the discount they were promised.
 */

type Line = { unit_price: number; quantity: number }

function spreadDiscount(lines: Line[], requested: number) {
  const subtotal = lines.reduce((s, it) => s + it.unit_price * it.quantity, 0)
  const discount = Math.min(Math.max(0, requested), subtotal)

  const byIndex = new Array(lines.length).fill(0)
  if (discount > 0 && subtotal > 0) {
    let assigned = 0
    let largest = 0
    lines.forEach((it, i) => {
      const lineTotal = it.unit_price * it.quantity
      const share = Math.round((discount * lineTotal) / subtotal)
      byIndex[i] = share
      assigned += share
      if (lineTotal > lines[largest].unit_price * lines[largest].quantity) largest = i
    })
    byIndex[largest] += discount - assigned
  }

  const priced = lines.map((it, i) => {
    const d = byIndex[i]
    return d > 0 ? Math.max(0, (it.unit_price * it.quantity - d) / it.quantity) : it.unit_price
  })

  const newSubtotal = priced.reduce((s, p, i) => s + p * lines[i].quantity, 0)
  return { byIndex, priced, subtotal, newSubtotal, discount }
}

describe("order discount spreading", () => {
  it("applies exactly the discount asked for", () => {
    const lines = [
      { unit_price: 1400, quantity: 2 },
      { unit_price: 350, quantity: 1 },
    ]
    const r = spreadDiscount(lines, 200)
    expect(r.byIndex.reduce((a, b) => a + b, 0)).toBe(200)
    expect(r.newSubtotal).toBeCloseTo(r.subtotal - 200, 6)
  })

  it("survives an amount that doesn't divide evenly (remainder goes to the largest line)", () => {
    const lines = [
      { unit_price: 333, quantity: 1 },
      { unit_price: 333, quantity: 1 },
      { unit_price: 334, quantity: 1 },
    ]
    const r = spreadDiscount(lines, 100)
    expect(r.byIndex.reduce((a, b) => a + b, 0)).toBe(100)
    expect(r.newSubtotal).toBeCloseTo(r.subtotal - 100, 6)
  })

  it("never lets a discount exceed the subtotal or drive a price negative", () => {
    const lines = [{ unit_price: 500, quantity: 1 }]
    const r = spreadDiscount(lines, 9999)
    expect(r.discount).toBe(500)
    expect(r.priced[0]).toBe(0)
    expect(r.newSubtotal).toBe(0)
  })

  it("leaves prices untouched when there is no discount", () => {
    const lines = [
      { unit_price: 1400, quantity: 2 },
      { unit_price: 350, quantity: 1 },
    ]
    const r = spreadDiscount(lines, 0)
    expect(r.priced).toEqual([1400, 350])
    expect(r.newSubtotal).toBe(r.subtotal)
  })

  it("spreads proportionally, not evenly — a bigger line absorbs more", () => {
    const lines = [
      { unit_price: 900, quantity: 1 },
      { unit_price: 100, quantity: 1 },
    ]
    const r = spreadDiscount(lines, 100)
    expect(r.byIndex[0]).toBe(90)
    expect(r.byIndex[1]).toBe(10)
  })

  it("handles a multi-unit line by discounting per unit", () => {
    const lines = [{ unit_price: 100, quantity: 4 }]
    const r = spreadDiscount(lines, 40)
    // 400 − 40 = 360 over 4 units = 90 each
    expect(r.priced[0]).toBe(90)
    expect(r.newSubtotal).toBe(360)
  })
})
