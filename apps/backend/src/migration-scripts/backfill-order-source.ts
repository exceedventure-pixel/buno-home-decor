import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ORDER_PROCESSING_MODULE } from "../modules/orderProcessing"

/**
 * BACKFILL — mark historical manually-created orders as source = "manual".
 *
 * When the `source` column is added, every existing row defaults to "website". Orders that were
 * really created through the Quick Order page carry two fingerprints left by that route:
 *
 *   - a synthetic email ending "@manual.local" (used when the customer gave no email), and/or
 *   - a `manual_note` key in order.metadata (set when a note was entered).
 *
 * Neither is watertight — a manual order placed with a real email and no note leaves no trace —
 * but together they recover the clear majority. Everything without a fingerprint is left as
 * "website", which is the safe assumption.
 *
 * Idempotent: only flips rows still marked "website", so it's safe to run more than once.
 *
 * Run: npx medusa exec ./src/migration-scripts/backfill-order-source.ts
 */
export default async function backfill_order_source({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const opSvc: any = container.resolve(ORDER_PROCESSING_MODULE)

  // 1. Every order's email + metadata — enough to spot the Quick Order fingerprints. Paged the
  //    same way order-economics does (scalar fields only; a relation here is harmless but the
  //    page loop is the house style for "all orders").
  const PAGE = 200
  const manualOrderIds = new Set<string>()
  let skip = 0
  for (;;) {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "email", "metadata"],
      pagination: { skip, take: PAGE },
    })
    for (const o of data as any[]) {
      const email: unknown = o.email
      const isSyntheticEmail = typeof email === "string" && email.endsWith("@manual.local")
      const hasManualNote = o.metadata != null && o.metadata.manual_note != null
      if (isSyntheticEmail || hasManualNote) manualOrderIds.add(o.id)
    }
    if (data.length < PAGE) break
    skip += data.length
  }

  if (manualOrderIds.size === 0) {
    logger.info("[order-source] No manual-order fingerprints found — nothing to backfill.")
    return
  }

  // 2. Only the workflow rows that belong to those orders AND are still marked "website".
  const rows: any[] = await opSvc.listOrderWorkflows({
    order_id: Array.from(manualOrderIds),
    source: "website",
  })

  if (rows.length === 0) {
    logger.info("[order-source] Manual orders already marked — nothing to change.")
    return
  }

  await opSvc.updateOrderWorkflows(rows.map((r) => ({ id: r.id, source: "manual" })))
  logger.info(
    `[order-source] Backfilled ${rows.length} order(s) to source = "manual" ` +
      `(from ${manualOrderIds.size} fingerprinted order(s)).`
  )
}
