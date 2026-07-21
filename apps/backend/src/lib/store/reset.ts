import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { ACCOUNTING_MODULE } from "../../modules/accounting"
import { PRODUCT_COST_MODULE } from "../../modules/productCost"

/**
 * THE PRIMITIVES BEHIND A STORE RESET.
 *
 * Lifted out of `api/admin/store-reset/route.ts` so the Danger Zone reset and the system-mode
 * "roll" run the SAME code. Two implementations of "wipe the store" would inevitably drift, and
 * the subtleties below (reservation counters, the display_id sequence, batches tracking stock)
 * are exactly the kind that get lost in a re-implementation.
 */

export const PAGE = 500

/** Collect every id from a paginated list method: listFn(skip, take) -> rows[] */
export async function collectIds(
  listFn: (skip: number, take: number) => Promise<any[]>
): Promise<string[]> {
  const ids: string[] = []
  let skip = 0
  for (;;) {
    const rows = await listFn(skip, PAGE)
    if (!rows?.length) break
    ids.push(...rows.map((r) => r.id))
    if (rows.length < PAGE) break
    skip += rows.length
  }
  return ids
}

/**
 * Release every stock reservation.
 *
 * Soft-deleting orders does NOT touch reservations — they live in the inventory module, linked
 * to line items by a loose id with no cascade. So after a reset the reservation rows survive,
 * and the `reserved_quantity` COUNTER on each level stays high: new stock then shows "2
 * reserved" for orders that no longer exist. Deleting the reservations through the inventory
 * module is the only thing that decrements that counter (it isn't settable directly).
 */
export async function clearAllReservations(scope: any): Promise<number> {
  const inventory = scope.resolve(Modules.INVENTORY) as any
  let deleted = 0
  for (;;) {
    const items = await inventory.listReservationItems({}, { take: PAGE, select: ["id"] })
    if (!items?.length) break
    await inventory.deleteReservationItems(items.map((r: any) => r.id))
    deleted += items.length
    if (items.length < PAGE) break
  }
  return deleted
}

/**
 * Send order numbering back to #1.
 *
 * `display_id` is a Postgres SERIAL, and a sequence knows nothing about the rows in the table.
 * Deleting every order leaves it exactly where it stopped, so the first order after a "reset the
 * store" arrives as #48 — which reads as though the reset silently failed.
 *
 * Two things make this safe rather than reckless:
 *
 *   The sequence is resolved, not guessed. SERIAL makes the sequence OWNED BY the column, so
 *   pg_get_serial_sequence finds whatever it is actually called — no name to drift out of date.
 *
 *   Reusing numbers cannot collide. The reset only SOFT-deletes orders, so the old #1 is still
 *   physically in the table. That's fine: IDX_order_display_id is deliberately `unique: false`
 *   and scoped to `deleted_at IS NULL`, so a live #1 and a deleted #1 coexist happily. If that
 *   index ever becomes unique, this has to become a hard delete instead.
 */
export async function restartOrderNumbering(scope: any): Promise<boolean> {
  const pg = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  const found = await pg.raw(`select pg_get_serial_sequence('"order"', 'display_id') as seq`)
  const seq = found?.rows?.[0]?.seq
  if (!seq) return false

  // is_called=false, so the next nextval() hands out 1 itself rather than starting at 2.
  await pg.raw(`select setval(?, 1, false)`, [seq])
  return true
}

/** Force every stock level to a fixed quantity. */
export async function setAllStockLevels(scope: any, value: number): Promise<number> {
  const inventory = scope.resolve(Modules.INVENTORY) as any
  let skip = 0
  let updated = 0
  for (;;) {
    const levels = await inventory.listInventoryLevels(
      {},
      { take: PAGE, skip, select: ["id", "inventory_item_id", "location_id"] }
    )
    if (!levels?.length) break
    await inventory.updateInventoryLevels(
      levels.map((l: any) => ({
        inventory_item_id: l.inventory_item_id,
        location_id: l.location_id,
        stocked_quantity: value,
      }))
    )
    updated += levels.length
    if (levels.length < PAGE) break
    skip += levels.length
  }
  return updated
}

/**
 * Drop every FIFO cost layer and write-off, and zero the cached "latest cost".
 *
 * This ALWAYS runs alongside a forced stock quantity. Physical stock and cost batches are two
 * views of the same units — force one without the other and the books instantly disagree with
 * the shelf (the drift warning would light up on every product).
 */
export async function purgeStockLayers(
  scope: any
): Promise<{ batches: number; movements: number }> {
  const costSvc = scope.resolve(PRODUCT_COST_MODULE) as any

  const batches = await costSvc.listStockBatches({}, { take: 200000, select: ["id"] })
  if (batches.length) await costSvc.deleteStockBatches(batches.map((b: any) => b.id))

  const movements = await costSvc.listStockMovements({}, { take: 200000, select: ["id"] })
  if (movements.length) await costSvc.deleteStockMovements(movements.map((m: any) => m.id))

  const costs = await costSvc.listVariantCosts({}, { take: 200000 })
  if (costs.length) {
    await costSvc.updateVariantCosts(costs.map((c: any) => ({ id: c.id, cost: 0 })))
  }

  return { batches: batches.length, movements: movements.length }
}

/**
 * Wipe the books — ALL FOUR accounting records, not just the ledger.
 *
 * Fixed assets, marketing spends and partners are their own tables that merely REFERENCE ledger
 * rows. Deleting only the ledger leaves a partner showing ৳0 invested, and assets and campaigns
 * with no cash trail behind them — which reads as corruption rather than a clean slate. Every
 * caller that clears accounting must clear all four, which is why this lives here rather than
 * being spelled out at each call site.
 */
export async function purgeAccounting(scope: any): Promise<{
  ledger_entries: number
  fixed_assets: number
  marketing_spends: number
  partners: number
}> {
  const acct = scope.resolve(ACCOUNTING_MODULE) as any

  const ledger = await acct.listLedgerEntries({}, { take: 200000, select: ["id"] })
  if (ledger.length) await acct.deleteLedgerEntries(ledger.map((r: any) => r.id))

  const assets = await acct.listFixedAssets({}, { take: 200000, select: ["id"] })
  if (assets.length) await acct.deleteFixedAssets(assets.map((r: any) => r.id))

  const marketing = await acct.listMarketingSpends({}, { take: 200000, select: ["id"] })
  if (marketing.length) await acct.deleteMarketingSpends(marketing.map((r: any) => r.id))

  const partners = await acct.listPartners({}, { take: 200000, select: ["id"] })
  if (partners.length) await acct.deletePartners(partners.map((r: any) => r.id))

  return {
    ledger_entries: ledger.length,
    fixed_assets: assets.length,
    marketing_spends: marketing.length,
    partners: partners.length,
  }
}

/** Remove every supplier. Suppliers only exist to be picked when restocking (advanced mode). */
export async function purgeSuppliers(scope: any): Promise<number> {
  const costSvc = scope.resolve(PRODUCT_COST_MODULE) as any
  const rows = await costSvc.listSuppliers({}, { take: 200000, select: ["id"] })
  if (rows.length) await costSvc.deleteSuppliers(rows.map((s: any) => s.id))
  return rows.length
}
