import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getSystemMode } from "../lib/store/system-mode"

/**
 * Closes the last way stock could drift away from the books.
 *
 * Stock quantity is owned by the FIFO batch system: every unit on the shelf is backed by a
 * `stock_batch` that knows what it cost. Medusa's native editors, though, write
 * `stocked_quantity` straight through the core admin API, which would create units no batch
 * backs — uncosted stock that silently understates COGS and net worth. Three native UIs do
 * this: the "Manage location quantity" editor, the product Stock grid, and Inventory → Create.
 *
 * So we reject the QUANTITY, and only the quantity:
 *   - updating an existing level's stocked_quantity  -> blocked
 *   - creating a level with a non-zero quantity      -> blocked
 *   - attaching a location at 0, or detaching one    -> ALLOWED (location management is fine)
 *
 * This is safe because nothing legitimate goes through these HTTP routes: our restock/adjust
 * workflows AND Medusa's own reservation / fulfillment / return flows all move stock through
 * the inventory MODULE SERVICE inside workflows, never this API. Product creation doesn't post
 * a quantity either. The only caller left is a human typing into a box — which is exactly what
 * we want to send through "Hard adjust" instead, so the correction lands as a costed layer or
 * a write-off.
 *
 * `INVENTORY_GUARD=false` bypasses it entirely, mirroring the RBAC_ENFORCED kill-switch.
 */

const MESSAGE =
  "Stock quantity is managed by batches (FIFO), so it can't be typed in directly. " +
  "Restock from the product page or Accounting → Restock. " +
  'To force a correction, use "Hard adjust" on the variant\'s Stock panel.'

function deny(res: MedusaResponse) {
  return res.status(403).json({ type: "not_allowed", message: MESSAGE })
}

/** Present and meaningful — `undefined`/`null` means "not being set". */
const sets = (o: any, key: string): boolean =>
  !!o && typeof o === "object" && o[key] !== undefined && o[key] !== null

const nonZero = (v: unknown): boolean => Number(v) !== 0

export async function inventoryStockGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    if (process.env.INVENTORY_GUARD === "false") return next()

    /**
     * BASIC mode has no batches to protect, so stock is edited the plain Medusa way — this guard
     * only exists to defend FIFO cost layers, and there are none.
     *
     * Fails OPEN (falls back to "basic" = allow) on a settings read error. That's safe rather than
     * lax: the only realistic failure is the database being unreachable, in which case the
     * inventory write this guard is protecting would fail on its own anyway.
     */
    if ((await getSystemMode(req.scope, "basic")) === "basic") return next()

    const path = ((req as any).originalUrl || req.url || req.path).split("?")[0]
    const body: any = req.body ?? {}

    // .../location-levels/batch   (both the per-item and the cross-item variants)
    const isBatch = /\/location-levels\/batch\/?$/.test(path)
    // .../location-levels         (create a level)
    const isCreate = /\/location-levels\/?$/.test(path)
    // .../location-levels/:location_id  (update one level's quantity)
    const isUpdate = !isBatch && /\/location-levels\/[^/]+\/?$/.test(path)

    if (isBatch) {
      const creates: any[] = Array.isArray(body.create) ? body.create : []
      const updates: any[] = Array.isArray(body.update) ? body.update : []
      // Any quantity on an update is a hand-edit; on a create, only a non-zero one is.
      if (updates.some((u) => sets(u, "stocked_quantity"))) return deny(res)
      if (creates.some((c) => sets(c, "stocked_quantity") && nonZero(c.stocked_quantity))) {
        return deny(res)
      }
      return next()
    }

    if (isUpdate) {
      if (sets(body, "stocked_quantity")) return deny(res)
      return next()
    }

    if (isCreate) {
      if (sets(body, "stocked_quantity") && nonZero(body.stocked_quantity)) return deny(res)
      return next()
    }

    return next()
  } catch (e) {
    return next(e)
  }
}
