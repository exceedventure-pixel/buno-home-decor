import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { purgeOrphanOrderFootprints } from "../../../../lib/orders/orphan-footprints"

/**
 * GET  /admin/accounting/purge-orphans — COUNT what's stranded, changing nothing. Drives the
 *      warning banner, so the books tell you when they're carrying a deleted order.
 * POST /admin/accounting/purge-orphans — remove rows left behind by orders that no longer exist.
 *
 * Deleting an order should leave no trace, but three kinds of row are OWNED by the order rather
 * than derived from it and can survive a partial or out-of-band delete: its Cash Book rows (courier
 * fee, production cost), its workflow row, and its status history. A stranded Cash Book row keeps
 * charging the P&L — which is how production cost went on counting after the orders were deleted.
 *
 * Safe to run any time: a row is only removed once its order is proven absent.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const found = await purgeOrphanOrderFootprints(req.scope, { dryRun: true })
    return res.json({ success: true, ...found })
  } catch {
    // A diagnostic must never break the page it warns on.
    return res.json({
      success: false,
      ledger_rows: 0,
      ledger_amount: 0,
      workflows: 0,
      status_events: 0,
    })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") as any

  try {
    const result = await purgeOrphanOrderFootprints(req.scope)
    logger?.info(
      `[accounting:purge-orphans] ${result.ledger_rows} Cash Book row(s), ` +
        `${result.workflows} workflow row(s), ${result.status_events} event(s) removed by ` +
        `${req.auth_context?.actor_id ?? "unknown"}`
    )
    return res.json({ success: true, ...result })
  } catch (err: any) {
    logger?.error(`[accounting:purge-orphans] failed: ${err.message}`)
    return res.status(200).json({ success: false, message: err.message })
  }
}
