import { hasPermission } from "../permissions"
import { resolvePermission } from "../policy"

/**
 * Erasing an order wipes it out of the books. The whole point of giving it its own high-risk
 * action is that `orders:manage` — which Store Managers hold — must NOT let you do it.
 */
describe("delete-order permission", () => {
  it("maps the delete-order route to the high-risk action, not write", () => {
    const p = resolvePermission("/admin/orders/order_123/delete-order", "POST")
    expect(p).toEqual({ resource: "orders", action: "delete-order" })
  })

  it("does NOT fall through to orders:write", () => {
    const p = resolvePermission("/admin/orders/order_123/delete-order", "POST")
    expect(p?.action).not.toBe("write")
  })

  it("refuses someone with orders:manage (a Store Manager)", () => {
    expect(hasPermission(["orders:manage"], "orders", "delete-order")).toBe(false)
  })

  it("refuses someone with orders:delete (ordinary delete is not enough)", () => {
    expect(hasPermission(["orders:delete"], "orders", "delete-order")).toBe(false)
  })

  it("allows it when granted explicitly", () => {
    expect(hasPermission(["orders:delete-order"], "orders", "delete-order")).toBe(true)
  })

  it("allows the owner (*)", () => {
    expect(hasPermission(["*"], "orders", "delete-order")).toBe(true)
  })

  it("still lets orders:manage do ordinary things", () => {
    expect(hasPermission(["orders:manage"], "orders", "write")).toBe(true)
    expect(hasPermission(["orders:manage"], "orders", "delete")).toBe(true)
  })
})
