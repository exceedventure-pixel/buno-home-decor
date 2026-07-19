import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ACCOUNTING_MODULE } from "../../modules/accounting"
import { ORDER_PROCESSING_MODULE } from "../../modules/orderProcessing"

/**
 * PURGE THE FOOTPRINTS OF ORDERS THAT NO LONGER EXIST.
 *
 * Deleting an order soft-deletes it, and everything DERIVED from live orders (revenue, COGS, Sales
 * Insights) corrects itself instantly. But three kinds of row are owned by the order rather than
 * derived from it, and they survive on their own:
 *
 *   1. Cash Book rows — `source_type: "order"` (courier fee) and `"production"` (production cost).
 *      These are real ledger entries, so a stranded one keeps charging the P&L for an order that
 *      no longer exists. This is what made production cost keep counting after the orders were
 *      deleted.
 *   2. order_workflow rows — worse than untidy: the courier sync job iterates workflow rows with a
 *      consignment, so a stranded one keeps polling the courier about a deleted order forever.
 *   3. order_status_event rows — history for an order nobody can open.
 *
 * The delete endpoint removes these for the order it deletes; this sweep catches anything stranded
 * by an earlier delete, a partial failure, or an order removed outside that endpoint.
 *
 * SAFETY: a row is only removed when its `order_id` is proven absent. We never build a list of
 * "all live orders" and diff against it — a truncated page there would delete live orders' rows.
 * Instead we take the ids the rows actually reference and ask which of THOSE still exist.
 */

export type OrphanPurgeResult = {
  ledger_rows: number
  ledger_amount: number
  workflows: number
  status_events: number
}

/** Of these order ids, which still exist? query.graph excludes soft-deleted orders — the point. */
async function liveOrderIds(container: MedusaContainer, ids: string[]): Promise<Set<string>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const live = new Set<string>()
  const CHUNK = 300
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    if (!slice.length) continue
    const { data } = await query.graph({
      entity: "order",
      fields: ["id"],
      filters: { id: slice },
    })
    for (const o of (data ?? []) as any[]) live.add(o.id)
  }
  return live
}

const distinct = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter((v): v is string => !!v))]

export async function purgeOrphanOrderFootprints(
  container: MedusaContainer,
  opts?: { dryRun?: boolean }
): Promise<OrphanPurgeResult> {
  const dryRun = !!opts?.dryRun
  const acct: any = container.resolve(ACCOUNTING_MODULE)
  const opSvc: any = container.resolve(ORDER_PROCESSING_MODULE)

  const result: OrphanPurgeResult = {
    ledger_rows: 0,
    ledger_amount: 0,
    workflows: 0,
    status_events: 0,
  }

  /* 1. Cash Book rows owned by an order. */
  const ledgerRows: any[] = []
  for (const sourceType of ["order", "production"]) {
    const rows = await acct.listLedgerEntries({ source_type: sourceType }, { take: 200000 })
    for (const r of rows ?? []) if (r.source_id) ledgerRows.push(r)
  }
  if (ledgerRows.length) {
    const live = await liveOrderIds(container, distinct(ledgerRows.map((r) => r.source_id)))
    const dead = ledgerRows.filter((r) => !live.has(r.source_id))
    if (dead.length) {
      if (!dryRun) await acct.deleteLedgerEntries(dead.map((r) => r.id))
      result.ledger_rows = dead.length
      result.ledger_amount = dead.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0)
    }
  }

  /* 2. Workflow rows — also stops the courier poll chasing deleted orders. */
  const wfs = (await opSvc.listOrderWorkflows({}, { take: 200000 })) ?? []
  if (wfs.length) {
    const live = await liveOrderIds(container, distinct(wfs.map((w: any) => w.order_id)))
    const dead = wfs.filter((w: any) => w.order_id && !live.has(w.order_id))
    if (dead.length) {
      if (!dryRun) await opSvc.deleteOrderWorkflows(dead.map((w: any) => w.id))
      result.workflows = dead.length
    }
  }

  /* 3. Status history for orders that are gone. */
  const events = (await opSvc.listOrderStatusEvents({}, { take: 200000 })) ?? []
  if (events.length) {
    const live = await liveOrderIds(container, distinct(events.map((e: any) => e.order_id)))
    const dead = events.filter((e: any) => e.order_id && !live.has(e.order_id))
    if (dead.length) {
      if (!dryRun) await opSvc.deleteOrderStatusEvents(dead.map((e: any) => e.id))
      result.status_events = dead.length
    }
  }

  return result
}
