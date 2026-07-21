import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { getSystemMode } from "../../../lib/store/system-mode"
import { ACCOUNTING_MODULE } from "../../../modules/accounting"
import { PRODUCT_COST_MODULE } from "../../../modules/productCost"

/**
 * GET /admin/system-mode — the current mode, and what a roll would destroy.
 *
 * The counts are real, not estimates: a roll is irreversible, so the confirmation has to name the
 * actual number of orders and Cash Book rows about to go. A vague "this will delete your data"
 * is how people click through and lose a year of trading.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const mode = await getSystemMode(req.scope)

  const counts = {
    orders: 0,
    ledger_rows: 0,
    batches: 0,
    suppliers: 0,
    customers: 0,
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const acct: any = req.scope.resolve(ACCOUNTING_MODULE)
    const costSvc: any = req.scope.resolve(PRODUCT_COST_MODULE)
    const customerSvc: any = req.scope.resolve(Modules.CUSTOMER)

    const [{ data: orders }, ledger, batches, suppliers, customers] = await Promise.all([
      query.graph({ entity: "order", fields: ["id"] }),
      acct.listLedgerEntries({}, { take: 200000, select: ["id"] }),
      costSvc.listStockBatches({}, { take: 200000, select: ["id"] }),
      costSvc.listSuppliers({}, { take: 200000, select: ["id"] }),
      customerSvc.listCustomers({}, { take: 200000, select: ["id"] }),
    ])

    counts.orders = (orders ?? []).length
    counts.ledger_rows = (ledger ?? []).length
    counts.batches = (batches ?? []).length
    counts.suppliers = (suppliers ?? []).length
    counts.customers = (customers ?? []).length
  } catch (err: any) {
    const logger = req.scope.resolve("logger") as any
    logger?.warn(`[system-mode] Could not count roll impact: ${err.message}`)
  }

  res.json({ mode, counts })
}
