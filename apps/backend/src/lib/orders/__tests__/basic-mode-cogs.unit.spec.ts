import { basicModeCogs } from "../order-economics"

/**
 * BASIC-MODE COST OF GOODS — and specifically, what a RETURN does to it.
 *
 * The bug this pins down: basic mode costed `fulfilled_quantity × cost` and never subtracted what
 * came back, while FIFO (advanced mode) had always consumed `fulfilled − return_received`. So the
 * two modes disagreed about the same order. On a basic-mode store a returned parcel restocked the
 * goods but kept charging their cost against the dead sale — the stock was paid for twice, and the
 * order showed a permanent cost-of-goods loss that no amount of receiving would clear.
 *
 * These assert the real exported function, not a mirrored copy of the arithmetic — a mirror is
 * exactly what let basic mode drift away from FIFO unnoticed.
 */

const COST = new Map<string, number>([
  ["variant_mug", 100],
  ["variant_lamp", 250],
])

const line = (
  variant_id: string | null,
  fulfilled: number,
  returnReceived = 0,
  returnRequested = 0
) => ({
  variant_id,
  detail: {
    fulfilled_quantity: fulfilled,
    return_received_quantity: returnReceived,
    return_requested_quantity: returnRequested,
  },
})

describe("basic-mode COGS — returns must reverse the cost", () => {
  it("costs a plain delivered order at fulfilled × cost", () => {
    expect(basicModeCogs([line("variant_mug", 2)], COST)).toBe(200)
  })

  it("charges nothing once the whole order has come back and been received", () => {
    // The regression: this used to stay at 200 forever, so a clean return read as a total loss.
    expect(basicModeCogs([line("variant_mug", 2, 2)], COST)).toBe(0)
  })

  it("charges only the units that stayed sold on a partial return", () => {
    expect(basicModeCogs([line("variant_mug", 3, 1)], COST)).toBe(200)
  })

  it("keeps charging while the goods are only REQUESTED, not yet received", () => {
    // Goods still with the courier are not back on the shelf, so their cost is still this sale's.
    // This is what makes "not received yet" a meaningful distinction on a refused parcel.
    expect(basicModeCogs([line("variant_mug", 2, 0, 2)], COST)).toBe(200)
  })

  it("nets each line independently across a mixed order", () => {
    // mug: 3 shipped, 1 back → 2 × 100. lamp: 2 shipped, 2 back → 0.
    expect(basicModeCogs([line("variant_mug", 3, 1), line("variant_lamp", 2, 2)], COST)).toBe(200)
  })

  it("never goes negative if more is received than was ever fulfilled", () => {
    expect(basicModeCogs([line("variant_mug", 1, 5)], COST)).toBe(0)
  })

  it("ignores lines with no variant — custom/pre-order never touched inventory", () => {
    // These are costed from the workflow's production_cost instead; counting them here would
    // double-charge a made-to-order item.
    expect(basicModeCogs([line(null, 4)], COST)).toBe(0)
  })

  it("treats a variant with no cost price on file as zero rather than NaN", () => {
    expect(basicModeCogs([line("variant_unknown", 2)], COST)).toBe(0)
  })

  it("handles BigNumber-ish and string quantities from query.graph", () => {
    const bn = (v: number) => ({ valueOf: () => v }) as unknown as number
    expect(basicModeCogs([line("variant_mug", bn(3), "1" as unknown as number)], COST)).toBe(200)
  })

  it("is 0 for an empty or missing item list", () => {
    expect(basicModeCogs([], COST)).toBe(0)
    expect(basicModeCogs(undefined, COST)).toBe(0)
    expect(basicModeCogs(null, COST)).toBe(0)
  })
})
