import { clearSystemModeCache, getSystemMode, refuseIfBasic } from "../system-mode"

/**
 * The mode decides where cost of goods comes from and whether stock can be typed in directly, so
 * the two behaviours worth pinning are: a store that has never saved settings is BASIC (a fresh
 * install must not land in accounting mode), and an unreadable settings row falls back to whatever
 * the CALLER says is safe — the stock guard passes "basic" so a settings outage can never make
 * stock uneditable.
 */

const containerWith = (impl: () => any) => ({ resolve: () => ({ listStoreSettings: impl }) }) as any

describe("getSystemMode", () => {
  beforeEach(() => clearSystemModeCache())

  it("reads advanced from the settings row", async () => {
    const c = containerWith(async () => [{ system_mode: "advanced" }])
    await expect(getSystemMode(c)).resolves.toBe("advanced")
  })

  it("treats a store with no settings row as a fresh install (basic)", async () => {
    const c = containerWith(async () => [])
    await expect(getSystemMode(c)).resolves.toBe("basic")
  })

  it("treats any unrecognised value as basic rather than guessing advanced", async () => {
    const c = containerWith(async () => [{ system_mode: "" }])
    await expect(getSystemMode(c)).resolves.toBe("basic")
  })

  it("uses the caller's fallback when settings can't be read", async () => {
    const c = containerWith(async () => {
      throw new Error("db down")
    })
    // The stock guard's call: fail OPEN, so a settings outage doesn't block stock editing.
    await expect(getSystemMode(c, "basic")).resolves.toBe("basic")
    clearSystemModeCache()
    await expect(getSystemMode(c, "advanced")).resolves.toBe("advanced")
  })

  it("caches, so the per-write guard doesn't re-query settings every time", async () => {
    let calls = 0
    const c = containerWith(async () => {
      calls++
      return [{ system_mode: "advanced" }]
    })
    await getSystemMode(c)
    await getSystemMode(c)
    await getSystemMode(c)
    expect(calls).toBe(1)
  })

  it("clearSystemModeCache makes a roll take effect immediately", async () => {
    let mode = "advanced"
    const c = containerWith(async () => [{ system_mode: mode }])
    await expect(getSystemMode(c)).resolves.toBe("advanced")

    mode = "basic"
    // Without the explicit clear the roll would not be visible until the TTL expired.
    clearSystemModeCache()
    await expect(getSystemMode(c)).resolves.toBe("basic")
  })
})

/**
 * Hiding a button is not a guard. Anything that creates a FIFO batch or an inventory_purchase
 * ledger row must be refused server-side in basic mode, or a basic store ends up in the exact
 * half-and-half state the two modes exist to prevent.
 */
describe("refuseIfBasic", () => {
  beforeEach(() => clearSystemModeCache())

  const resSpy = () => {
    const res: any = {}
    res.json = jest.fn().mockReturnValue(res)
    res.status = jest.fn().mockReturnValue(res)
    return res
  }

  it("lets the request through in advanced mode", async () => {
    const res = resSpy()
    const c = containerWith(async () => [{ system_mode: "advanced" }])
    await expect(refuseIfBasic(c, res)).resolves.toBe(false)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("refuses in basic mode and explains where to switch", async () => {
    const res = resSpy()
    const c = containerWith(async () => [{ system_mode: "basic" }])

    await expect(refuseIfBasic(c, res, "Restocking")).resolves.toBe(true)
    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0][0]
    expect(body.message).toContain("Restocking")
    expect(body.message).toContain("System Mode")
  })

  it("fails CLOSED when the mode can't be read", async () => {
    const res = resSpy()
    const c = containerWith(async () => {
      throw new Error("db down")
    })
    // Declining to create cost layers is recoverable; creating ones that may not belong is not.
    await expect(refuseIfBasic(c, res)).resolves.toBe(true)
  })
})
