import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import {
  ensureLevel,
  loadVariantStockAt,
  requireSellableLocation,
} from "../../../../../lib/inventory/stock-location"
import { computeOrderEconomics } from "../../../../../lib/orders/order-economics"
import { purgeOrphanOrderFootprints } from "../../../../../lib/orders/orphan-footprints"
import { ACCOUNTING_MODULE } from "../../../../../modules/accounting"
import { ORDER_PROCESSING_MODULE } from "../../../../../modules/orderProcessing"

/**
 * Erase a mistaken order from the books.
 *
 *   GET  /admin/orders/:id/delete-order — what deleting it would erase (drives the confirm).
 *   POST /admin/orders/:id/delete-order — do it. Requires the typed phrase.
 *
 * Gated by RBAC on `orders:delete` (admin-only by default) AND by a typed phrase, the same way
 * store-reset is: a click can be a slip, typing "delete order" cannot. POST rather than DELETE so
 * the phrase can travel in a body.
 *
 * The order is SOFT-deleted, and that is what makes this clean: every figure here is derived from
 * live orders, so a soft-deleted order simply stops existing for the FIFO replay, Sales Insights
 * and the Accounting dashboard — there are no totals to unwind by hand. The row is still
 * physically present if it ever has to be recovered.
 *
 * Four things do NOT clean themselves up, so they're handled here:
 *   1. Reservations — they live in the inventory module with no cascade, so a deleted order
 *      otherwise leaves its units stuck as "reserved" forever (store-reset hit the same trap).
 *   2. Shipped stock — soft-deleting the order auto-corrects the FIFO cost replay (the order
 *      vanishes from the derived COGS), but Medusa's physical `stocked_quantity` was decremented
 *      at fulfilment and is NOT restored. So when the caller says the goods are still in hand
 *      (`restock: true`), we bump the shelf back up by the units currently out (fulfilled, not
 *      yet returned). When the goods are genuinely gone (delivered to the customer, lost), the
 *      caller says so and we leave the shelf alone.
 *   3. Ledger rows the order owns (courier fee, production cost) — real Cash Book entries that
 *      would otherwise be an expense for an order that no longer exists.
 *   4. Our order_workflow + status-event rows.
 *
 * What it still does NOT do is refund the customer: captured cash simply stops being counted.
 * This is for orders that should never have existed — the pre-check spells out the cash and the
 * courier consignment so the human can settle those by hand.
 */

const CONFIRM_PHRASE = "delete order"

type RestockLine = { variant_id: string; title: string; qty: number }

/**
 * What deleting this order would touch. The load-bearing figure is `restockLines`: the units
 * currently OFF the shelf because of this order — fulfilled quantity of each variant-backed line,
 * unless the order already has a return (which restocked them). pre-order/custom lines carry no
 * variant, so Medusa never moved inventory for them and they never appear here.
 */
async function assess(scope: any, orderId: string) {
  const opSvc: any = scope.resolve(ORDER_PROCESSING_MODULE)
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const [econ] = await computeOrderEconomics(scope, { order_id: orderId })
  const [wf] = await opSvc.listOrderWorkflows({ order_id: orderId })

  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "returns.id",
      "items.variant_id",
      "items.product_title",
      "items.title",
      "items.detail.fulfilled_quantity",
    ],
    filters: { id: orderId },
  })
  const o = data?.[0] as any

  // A return (RTO or manual) has already put its units back — nothing left to restock.
  const hasReturn = ((o?.returns ?? []) as any[]).length > 0

  // Aggregate the still-out quantity per variant (two lines of the same variant collapse to one
  // level write).
  const byVariant = new Map<string, RestockLine>()
  if (!hasReturn) {
    for (const it of (o?.items ?? []) as any[]) {
      const variantId = it.variant_id
      const qty = Number(it.detail?.fulfilled_quantity) || 0
      if (!variantId || qty <= 0) continue
      const row = byVariant.get(variantId)
      if (row) row.qty += qty
      else byVariant.set(variantId, { variant_id: variantId, title: it.product_title || it.title || "Item", qty })
    }
  }
  const restockLines = [...byVariant.values()]
  const unitsOut = restockLines.reduce((s, r) => s + r.qty, 0)

  return { econ, wf, restockLines, unitsOut }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { econ, wf, restockLines, unitsOut } = await assess(req.scope, req.params.id)
  if (!econ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order "${req.params.id}" not found.`)
  }
  res.json({
    order_id: econ.order_id,
    display_id: econ.display_id,
    order_status: econ.order_status,
    // Units currently off the shelf because of this order — the restock choice only appears when
    // this is > 0.
    units_out: unitsOut,
    restock_lines: restockLines.map((r) => ({ title: r.title, qty: r.qty })),
    // Smart default: goods that were DELIVERED are with the customer (don't restock); anything not
    // yet delivered was probably a mistake with the goods still in hand (restock).
    default_restock: econ.order_status !== "delivered",
    captured: econ.captured,
    courier: wf?.consignment_id
      ? { courier_id: wf.courier_id ?? null, consignment_id: wf.consignment_id }
      : null,
    confirm_phrase: CONFIRM_PHRASE,
  })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any
  const body = (req.body ?? {}) as { confirm?: string; restock?: boolean }

  if ((body.confirm ?? "").trim().toLowerCase() !== CONFIRM_PHRASE) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Type "${CONFIRM_PHRASE}" to confirm deleting this order.`
    )
  }

  const { econ, wf, restockLines, unitsOut } = await assess(req.scope, orderId)
  if (!econ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order "${orderId}" not found.`)
  }

  const orderModule: any = req.scope.resolve(Modules.ORDER)
  const inventory: any = req.scope.resolve(Modules.INVENTORY)
  const acct: any = req.scope.resolve(ACCOUNTING_MODULE)
  const opSvc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)

  // 0. Put shipped stock back on the shelf, IF asked and there is any out. This runs FIRST and,
  //    unlike the cleanup below, is NOT best-effort: if the caller wanted the goods restocked and
  //    we can't, we abort rather than delete the order with the shelf still short. A single
  //    updateInventoryLevels call means there's no half-restocked state to reconcile on retry.
  let unitsRestocked = 0
  if (body.restock && unitsOut > 0) {
    try {
      const location = await requireSellableLocation(req.scope)
      const updates: {
        inventory_item_id: string
        location_id: string
        stocked_quantity: number
      }[] = []
      for (const line of restockLines) {
        const target = await loadVariantStockAt(req.scope, line.variant_id, location)
        await ensureLevel(req.scope, target)
        updates.push({
          inventory_item_id: target.itemId,
          location_id: target.locationId,
          stocked_quantity: target.onShelf + line.qty,
        })
        unitsRestocked += line.qty
      }
      if (updates.length) await inventory.updateInventoryLevels(updates)
    } catch (err: any) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Could not put the stock back (${err.message}). Nothing was deleted — try again, or delete without restocking.`
      )
    }
  }

  // 1. Release this order's reservations, or its units stay reserved against a ghost.
  //    Line items come from query.graph (the same way reserve.ts reads them) rather than a
  //    module list method, so this can't break on an API that isn't exposed.
  let reservationsReleased = 0
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "items.id"],
      filters: { id: orderId },
    })
    const itemIds = (((data?.[0] as any)?.items ?? []) as any[]).map((i) => i.id).filter(Boolean)
    if (itemIds.length) {
      const reservations = await inventory.listReservationItems({ line_item_id: itemIds })
      if (reservations?.length) {
        await inventory.deleteReservationItems(reservations.map((r: any) => r.id))
        reservationsReleased = reservations.length
      }
    }
  } catch (err: any) {
    logger?.warn(`[orders:delete] Could not release reservations for ${orderId}: ${err.message}`)
  }

  /**
   * 2. Remove the Cash Book rows this order owns (courier fee + production cost).
   *
   * NOT best-effort. These are real ledger entries: if they survive, the P&L keeps charging for an
   * order that no longer exists — which is exactly how deleted orders went on counting their
   * production cost. Failing here aborts the delete so the books can never be left half-erased.
   */
  let ledgerRemoved = 0
  try {
    for (const sourceType of ["order", "production"]) {
      const rows = await acct.listLedgerEntries({ source_type: sourceType, source_id: orderId })
      if (rows?.length) {
        await acct.deleteLedgerEntries(rows.map((r: any) => r.id))
        ledgerRemoved += rows.length
      }
    }
  } catch (err: any) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Could not remove this order's Cash Book rows (${err.message}). Nothing was deleted — the ` +
        `books would otherwise keep counting it.`
    )
  }

  // 3. Our own rows.
  try {
    if (wf?.id) await opSvc.deleteOrderWorkflows([wf.id])
    const events = await opSvc.listOrderStatusEvents({ order_id: orderId }, { take: 1000 })
    if (events?.length) await opSvc.deleteOrderStatusEvents(events.map((e: any) => e.id))
  } catch (err: any) {
    logger?.warn(`[orders:delete] Could not remove workflow rows for ${orderId}: ${err.message}`)
  }

  // 4. The order itself. Soft — everything derived stops seeing it immediately.
  await orderModule.softDeleteOrders([orderId])

  // 5. Sweep any footprints stranded by an earlier delete (or by an order removed outside this
  //    endpoint). Cheap, and it keeps the books self-correcting rather than drifting.
  let strays = { ledger_rows: 0, workflows: 0, status_events: 0 }
  try {
    const swept = await purgeOrphanOrderFootprints(req.scope)
    strays = {
      ledger_rows: swept.ledger_rows,
      workflows: swept.workflows,
      status_events: swept.status_events,
    }
  } catch (err: any) {
    logger?.warn(`[orders:delete] Orphan sweep failed: ${err.message}`)
  }

  logger?.info(
    `[orders:delete] Order ${orderId} (#${econ.display_id}) deleted by ` +
      `${req.auth_context?.actor_id ?? "unknown"} — ${unitsRestocked} unit(s) restocked, ` +
      `${reservationsReleased} reservation(s) released, ${ledgerRemoved} ledger row(s) removed`
  )

  res.json({
    success: true,
    order_id: orderId,
    display_id: econ.display_id,
    units_restocked: unitsRestocked,
    reservations_released: reservationsReleased,
    ledger_rows_removed: ledgerRemoved,
    strays_swept: strays,
  })
}
