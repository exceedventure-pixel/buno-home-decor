import { allowedTransitions } from "../constants"

/**
 * Courier booking must be available to EVERY order type now — website/ready-stock orders included,
 * not just made-to-order ones. This guards the constants change that opened `courier_booked` up.
 */
describe("allowedTransitions — courier_booked availability", () => {
  it("offers courier_booked to a ready-stock order at ready_to_dispatch", () => {
    expect(allowedTransitions("ready_stock", "ready_to_dispatch")).toContain("courier_booked")
  })

  it("offers courier_booked to a ready-stock order straight from confirmed", () => {
    expect(allowedTransitions("ready_stock", "confirmed")).toContain("courier_booked")
  })

  it("still offers it to pre-order/custom", () => {
    expect(allowedTransitions("custom", "ready_to_dispatch")).toContain("courier_booked")
  })

  it("lets a booked order move to dispatched", () => {
    expect(allowedTransitions("ready_stock", "courier_booked")).toContain("dispatched")
  })

  it("keeps production stages out of ready-stock", () => {
    expect(allowedTransitions("ready_stock", "confirmed")).not.toContain("in_production")
  })
})
