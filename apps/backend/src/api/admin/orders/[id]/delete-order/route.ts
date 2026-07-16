import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { computeOrderEconomics } from "../../../../../lib/orders/order-economics"
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
 * Three things do NOT clean themselves up, so they're handled here:
 *   1. Reservations — they live in the inventory module with no cascade, so a deleted order
 *      otherwise leaves its units stuck as "reserved" forever (store-reset hit the same trap).
 *   2. Ledger rows the order owns (courier fee, production cost) — real Cash Book entries that
 *      would otherwise be an expense for an order that no longer exists.
 *   3. Our order_workflow + status-event rows.
 *
 * What it does NOT do is undo reality: stock that already shipped stays gone and captured cash
 * stays captured. This is for orders that should never have existed — not a way to reverse a real
 * shipment. The pre-check spells that out before anyone confirms.
 */

const CONFIRM_PHRASE = "delete order"

async function assess(scope: any, orderId: string) {
  const opSvc: any = scope.resolve(ORDER_PROCESSING_MODULE)
  const [econ] = await computeOrderEconomics(scope, { order_id: orderId })
  const [wf] = await opSvc.listOrderWorkflows({ order_id: orderId })

  const warnings: string[] = []
  if (econ) {
    if (econ.units_shipped > 0) {
      warnings.push(
        `${econ.units_shipped} unit(s) already shipped — deleting will NOT put that stock back.`
      )
    }
    if (econ.captured > 0) {
      warnings.push(
        `Cash of ${econ.captured} was already captured — deleting removes it from your books without refunding the customer.`
      )
    }
    if (wf?.consignment_id) {
      warnings.push(
        `Booked with ${wf.courier_id ?? "a courier"} (consignment ${wf.consignment_id}) — cancel that parcel in their portal too.`
      )
    }
  }

  return { econ, wf, warnings }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { econ, warnings } = await assess(req.scope, req.params.id)
  if (!econ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order "${req.params.id}" not found.`)
  }
  res.json({
    order_id: econ.order_id,
    display_id: econ.display_id,
    units_shipped: econ.units_shipped,
    captured: econ.captured,
    warnings,
    confirm_phrase: CONFIRM_PHRASE,
  })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any
  const body = (req.body ?? {}) as { confirm?: string }

  if ((body.confirm ?? "").trim().toLowerCase() !== CONFIRM_PHRASE) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Type "${CONFIRM_PHRASE}" to confirm deleting this order.`
    )
  }

  const { econ, wf } = await assess(req.scope, orderId)
  if (!econ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order "${orderId}" not found.`)
  }

  const orderModule: any = req.scope.resolve(Modules.ORDER)
  const inventory: any = req.scope.resolve(Modules.INVENTORY)
  const acct: any = req.scope.resolve(ACCOUNTING_MODULE)
  const opSvc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)

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

  // 2. Remove the Cash Book rows this order owns.
  let ledgerRemoved = 0
  for (const sourceType of ["order", "production"]) {
    try {
      const rows = await acct.listLedgerEntries({ source_type: sourceType, source_id: orderId })
      if (rows?.length) {
        await acct.deleteLedgerEntries(rows.map((r: any) => r.id))
        ledgerRemoved += rows.length
      }
    } catch (err: any) {
      logger?.warn(`[orders:delete] Could not remove ${sourceType} ledger rows: ${err.message}`)
    }
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

  logger?.info(
    `[orders:delete] Order ${orderId} (#${econ.display_id}) deleted by ` +
      `${req.auth_context?.actor_id ?? "unknown"} — ${reservationsReleased} reservation(s) released, ` +
      `${ledgerRemoved} ledger row(s) removed`
  )

  res.json({
    success: true,
    order_id: orderId,
    display_id: econ.display_id,
    reservations_released: reservationsReleased,
    ledger_rows_removed: ledgerRemoved,
  })
}
