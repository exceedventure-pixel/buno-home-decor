import { inventoryStockGuard } from "../inventory-stock-guard"
import { clearSystemModeCache } from "../../lib/store/system-mode"

/**
 * The guard blocks hand-typed stock. These tests exist mostly to prove what it must NOT block:
 * attaching/detaching a stock location, and anything that isn't a quantity. Getting that wrong
 * would break product setup and multi-location management.
 */

/** Defaults to ADVANCED: that is the mode this guard exists to protect. */
const run = async (path: string, body: any, mode: "basic" | "advanced" = "advanced") => {
  const req: any = {
    originalUrl: path,
    method: "POST",
    body,
    scope: { resolve: () => ({ listStoreSettings: async () => [{ system_mode: mode }] }) },
  }
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  const next = jest.fn()

  await inventoryStockGuard(req, res, next)

  return {
    blocked: res.status.mock.calls.length > 0,
    status: res.status.mock.calls[0]?.[0],
    passed: next.mock.calls.length > 0,
  }
}

const ITEM = "/admin/inventory-items/iitem_1"
const UPDATE = `${ITEM}/location-levels/sloc_1`
const CREATE = `${ITEM}/location-levels`
const BATCH_ITEM = `${ITEM}/location-levels/batch`
const BATCH_ALL = "/admin/inventory-items/location-levels/batch"

describe("inventoryStockGuard", () => {
  beforeEach(() => clearSystemModeCache())
  afterEach(() => {
    delete process.env.INVENTORY_GUARD
  })

  describe("blocks hand-typed quantity", () => {
    it("rejects editing an existing level's quantity (the 'In Stock' box)", async () => {
      const r = await run(UPDATE, { stocked_quantity: 25 })
      expect(r.blocked).toBe(true)
      expect(r.status).toBe(403)
      expect(r.passed).toBe(false)
    })

    it("rejects even a zero quantity on an update (still a hand-edit)", async () => {
      expect((await run(UPDATE, { stocked_quantity: 0 })).blocked).toBe(true)
    })

    it("rejects creating a level pre-loaded with stock", async () => {
      expect((await run(CREATE, { location_id: "sloc_1", stocked_quantity: 10 })).blocked).toBe(true)
    })

    it("rejects the product Stock grid's batch update", async () => {
      const r = await run(BATCH_ALL, {
        update: [{ inventory_item_id: "iitem_1", location_id: "sloc_1", stocked_quantity: 7 }],
      })
      expect(r.blocked).toBe(true)
      expect(r.status).toBe(403)
    })

    it("rejects a batch create carrying stock", async () => {
      const r = await run(BATCH_ITEM, {
        create: [{ location_id: "sloc_1", stocked_quantity: 5 }],
      })
      expect(r.blocked).toBe(true)
    })
  })

  describe("does NOT block legitimate location management", () => {
    it("allows attaching a location at quantity 0", async () => {
      const r = await run(CREATE, { location_id: "sloc_2", stocked_quantity: 0 })
      expect(r.passed).toBe(true)
      expect(r.blocked).toBe(false)
    })

    it("allows attaching a location with no quantity at all", async () => {
      expect((await run(CREATE, { location_id: "sloc_2" })).passed).toBe(true)
    })

    it("allows a batch that only attaches (qty 0) and detaches", async () => {
      const r = await run(BATCH_ITEM, {
        create: [{ location_id: "sloc_2", stocked_quantity: 0 }],
        delete: ["sloc_3"],
      })
      expect(r.passed).toBe(true)
      expect(r.blocked).toBe(false)
    })

    it("allows a batch that only detaches", async () => {
      expect((await run(BATCH_ALL, { delete: ["sloc_3"] })).passed).toBe(true)
    })

    it("allows updating a level field that is not the quantity", async () => {
      expect((await run(UPDATE, { incoming_quantity: 12 })).passed).toBe(true)
    })

    it("allows an empty body", async () => {
      expect((await run(UPDATE, {})).passed).toBe(true)
    })
  })

  it("honours the INVENTORY_GUARD=false kill-switch", async () => {
    process.env.INVENTORY_GUARD = "false"
    const r = await run(UPDATE, { stocked_quantity: 999 })
    expect(r.passed).toBe(true)
    expect(r.blocked).toBe(false)
  })

  /**
   * BASIC mode has no FIFO batches, so there is nothing for this guard to protect and stock is
   * edited the plain Medusa way. If these ever start failing, a basic-mode store has silently
   * lost the ability to change its stock.
   */
  describe("stands aside in basic mode", () => {
    it("allows typing a quantity straight into an existing level", async () => {
      const r = await run(UPDATE, { stocked_quantity: 25 }, "basic")
      expect(r.passed).toBe(true)
      expect(r.blocked).toBe(false)
    })

    it("allows creating a level pre-loaded with stock", async () => {
      const r = await run(CREATE, { location_id: "sloc_1", stocked_quantity: 10 }, "basic")
      expect(r.passed).toBe(true)
    })

    it("allows the product Stock grid's batch update", async () => {
      const r = await run(
        BATCH_ALL,
        { update: [{ inventory_item_id: "iitem_1", location_id: "sloc_1", stocked_quantity: 7 }] },
        "basic"
      )
      expect(r.passed).toBe(true)
    })
  })

  /**
   * Fail OPEN: the only realistic way the settings read fails is the database being unreachable,
   * in which case the write this guard protects would fail on its own anyway. Blocking instead
   * would make stock uneditable during an unrelated blip.
   */
  it("allows the write when the mode can't be read", async () => {
    const req: any = {
      originalUrl: UPDATE,
      method: "POST",
      body: { stocked_quantity: 25 },
      scope: {
        resolve: () => ({
          listStoreSettings: async () => {
            throw new Error("db down")
          },
        }),
      },
    }
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    const next = jest.fn()

    await inventoryStockGuard(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})
