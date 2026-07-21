import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import {
  clearAllReservations,
  collectIds,
  purgeAccounting,
  purgeStockLayers,
  purgeSuppliers,
  restartOrderNumbering,
  setAllStockLevels,
} from "../../../../lib/store/reset"
import { clearSystemModeCache, getSystemMode, type SystemMode } from "../../../../lib/store/system-mode"
import { ORDER_PROCESSING_MODULE } from "../../../../modules/orderProcessing"
import { STORE_SETTINGS_MODULE } from "../../../../modules/storeSettings"

/**
 * POST /admin/system-mode/roll — switch the store between `basic` and `advanced`.
 *
 * A roll RESETS the store and starts the new mode clean. That is the whole point: the alternative
 * — flipping a flag over live data — leaves stock with no cost layer behind it, a Cash Book with a
 * hole in it, and cost of goods that means one thing before the switch and another after. Wiping
 * removes that class of problem entirely.
 *
 * KEPT:   products, categories, prices, customers, settings, RBAC.
 * WIPED:  orders (+ numbering restarted), Cash Book, FIFO batches and movements, stock quantities,
 *         suppliers, order workflow rows and status history.
 *
 * Order of operations is deliberate: the mode is flipped LAST, only once the reset has succeeded.
 * A store labelled "basic" that still holds advanced data would be worse than either mode.
 */

const PHRASE: Record<SystemMode, string> = {
  basic: "roll to basic",
  advanced: "roll to advanced",
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") as any
  const body = (req.body ?? {}) as { to?: string; confirm?: string }

  const to = body.to as SystemMode
  if (to !== "basic" && to !== "advanced") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Unknown mode "${body.to}".`)
  }

  const current = await getSystemMode(req.scope)
  if (current === to) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `This store is already running the ${to} system.`
    )
  }

  if ((body.confirm ?? "").trim().toLowerCase() !== PHRASE[to]) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Type "${PHRASE[to]}" to confirm. This deletes orders, the Cash Book and stock history.`
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderModule: any = req.scope.resolve(Modules.ORDER)
  const cartModule: any = req.scope.resolve(Modules.CART)
  const opSvc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)
  const settingsSvc: any = req.scope.resolve(STORE_SETTINGS_MODULE)

  const summary = {
    orders: 0,
    carts: 0,
    ledger_rows: 0,
    fixed_assets: 0,
    marketing_spends: 0,
    partners: 0,
    batches: 0,
    movements: 0,
    suppliers: 0,
    reservations_released: 0,
    stock_levels_zeroed: 0,
    numbering_restarted: false,
  }

  try {
    /* 1. Reservations first — they must go before the orders that own them, or the reserved
          counter on each level stays high against orders that no longer exist. */
    summary.reservations_released = await clearAllReservations(req.scope)

    /* 2. Orders, and everything of ours that hangs off them. */
    const { data: orders } = await query.graph({ entity: "order", fields: ["id"] })
    const orderIds = (orders ?? []).map((o: any) => o.id)
    if (orderIds.length) {
      await orderModule.softDeleteOrders(orderIds)
      summary.orders = orderIds.length
    }

    const wfs = await opSvc.listOrderWorkflows({}, { take: 200000, select: ["id"] })
    if (wfs?.length) await opSvc.deleteOrderWorkflows(wfs.map((w: any) => w.id))
    const events = await opSvc.listOrderStatusEvents({}, { take: 200000, select: ["id"] })
    if (events?.length) await opSvc.deleteOrderStatusEvents(events.map((e: any) => e.id))

    const cartIds = await collectIds((skip, take) =>
      cartModule.listCarts({}, { skip, take, select: ["id"] })
    )
    if (cartIds.length) {
      await cartModule.deleteCarts(cartIds)
      summary.carts = cartIds.length
    }

    summary.numbering_restarted = await restartOrderNumbering(req.scope)

    /* 3. The books — ledger AND the fixed assets / marketing spends / partners that reference it,
          or the new mode inherits partners showing ৳0 invested and assets with no cash trail. */
    const books = await purgeAccounting(req.scope)
    summary.ledger_rows = books.ledger_entries
    summary.fixed_assets = books.fixed_assets
    summary.marketing_spends = books.marketing_spends
    summary.partners = books.partners

    /* 4. Stock and its cost layers — always together, or shelf and books disagree instantly. */
    summary.stock_levels_zeroed = await setAllStockLevels(req.scope, 0)
    const purged = await purgeStockLayers(req.scope)
    summary.batches = purged.batches
    summary.movements = purged.movements
    summary.suppliers = await purgeSuppliers(req.scope)
  } catch (err: any) {
    // The mode is NOT flipped — the store stays honestly labelled as what it still contains.
    logger?.error(`[system-mode] Roll to ${to} failed mid-reset: ${err.message}`)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `The reset failed partway (${err.message}). The store is still in ${current} mode — ` +
        `re-run the roll to finish clearing it.`
    )
  }

  /* 5. Only now is it true. */
  const [existing] = await settingsSvc.listStoreSettings({}, { take: 1 })
  if (existing) await settingsSvc.updateStoreSettings([{ id: existing.id, system_mode: to }])
  else await settingsSvc.createStoreSettings([{ system_mode: to }])
  clearSystemModeCache()

  logger?.info(
    `[system-mode] Rolled ${current} → ${to} by ${req.auth_context?.actor_id ?? "unknown"} — ` +
      `${summary.orders} order(s), ${summary.ledger_rows} ledger row(s), ${summary.batches} batch(es) cleared`
  )

  res.json({ success: true, mode: to, summary })
}
