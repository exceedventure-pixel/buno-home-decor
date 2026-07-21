import type { MedusaContainer } from "@medusajs/framework/types"

import { STORE_SETTINGS_MODULE } from "../../modules/storeSettings"

/**
 * WHICH SHAPE OF THE SYSTEM THIS STORE RUNS — the single reader every gate goes through.
 *
 *   basic    — default Medusa: quantity typed up and down, one cost price per variant.
 *   advanced — Cash Book, FIFO cost layers, suppliers, restocking.
 *
 * Reads are cached for a few seconds: the stock guard consults this on every inventory write, and
 * a settings query per request would be a pointless tax on a value that changes about once in the
 * lifetime of a store.
 */
export type SystemMode = "basic" | "advanced"

let cached: { value: SystemMode; at: number } | null = null
const TTL_MS = 5_000

/** Drop the cache so a roll takes effect immediately rather than up to TTL later. */
export function clearSystemModeCache(): void {
  cached = null
}

/**
 * The current mode, or `fallback` when it can't be read.
 *
 * Callers that GATE something destructive must pass the permissive fallback: a settings outage
 * must never, say, make stock uneditable. See inventory-stock-guard.
 */
export async function getSystemMode(
  container: MedusaContainer,
  fallback: SystemMode = "advanced"
): Promise<SystemMode> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value

  try {
    const svc: any = container.resolve(STORE_SETTINGS_MODULE)
    const [row] = await svc.listStoreSettings({}, { take: 1 })
    // No row at all = a store that has never saved settings = fresh install = basic.
    const value: SystemMode = row?.system_mode === "advanced" ? "advanced" : "basic"
    cached = { value, at: Date.now() }
    return value
  } catch {
    return fallback
  }
}

export const isAdvanced = async (container: MedusaContainer): Promise<boolean> =>
  (await getSystemMode(container)) === "advanced"

/**
 * Refuse an advanced-only action when the store is running basic.
 *
 * The admin hides these flows in basic mode, but hiding a button is not a guard: anything that
 * creates a FIFO batch or an inventory_purchase ledger row would put a basic store into exactly
 * the half-and-half state the two modes exist to prevent. Returns true when it has answered the
 * request, so the caller returns immediately.
 *
 * Fails CLOSED (falls back to "basic" = refuse): if the mode can't be read we decline to create
 * cost layers, which is recoverable, rather than create ones that may not belong, which is not.
 */
export async function refuseIfBasic(
  container: MedusaContainer,
  res: { status: (n: number) => any },
  action = "This action"
): Promise<boolean> {
  if ((await getSystemMode(container, "basic")) === "advanced") return false

  res.status(400).json({
    type: "not_allowed",
    message:
      `${action} is part of the advanced system, and this store is running the basic one. ` +
      `Stock quantity is edited directly, and cost is a single price per variant. ` +
      `To switch, use Store Settings → System Mode.`,
  })
  return true
}
