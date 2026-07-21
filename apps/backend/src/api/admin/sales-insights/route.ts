import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { pnlExpenses, pnlIncome } from "../../../lib/accounting/ledger-math"
import { monthStart } from "../../../lib/insights/sales-metrics"
import { getSystemMode } from "../../../lib/store/system-mode"
import { computeOrderEconomics } from "../../../lib/orders/order-economics"
import { ACCOUNTING_MODULE } from "../../../modules/accounting"

/**
 * GET /admin/sales-insights?from=ISO&to=ISO
 *
 * The real economics, built from the per-order P&L rather than a pile of aggregates — because
 * "we made 40% margin" means nothing if every parcel loses money on delivery.
 *
 * The courier fee now lives on the order, so DELIVERY MARGIN (what the customer paid to receive
 * it, minus what carrying it actually cost) is finally a number you can see.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const now = new Date()
  const from = req.query.from ? new Date(String(req.query.from)) : monthStart(now)
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(now)
  to.setHours(23, 59, 59, 999)

  const orders = await computeOrderEconomics(req.scope, { from, to })

  const sum = (f: (o: (typeof orders)[number]) => number) => orders.reduce((s, o) => s + f(o), 0)

  const product_revenue = sum((o) => o.product_revenue)
  const delivery_charged = sum((o) => o.delivery_charged)
  const cogs = sum((o) => o.cogs)
  const courier_cost = sum((o) => o.courier_cost)
  const write_off = sum((o) => o.write_off)

  const gross_profit = product_revenue - cogs
  const delivery_margin = delivery_charged - courier_cost

  /**
   * Returns. A returned parcel restocks the goods and its revenue is already netted out upstream,
   * so it costs no COGS — but the courier was still paid to carry it both ways. That courier fee is
   * the real, easily-missed loss, so it's reported next to the count rather than buried.
   */
  const returned_orders = orders.filter((o) => o.units_returned > 0)
  const returns = {
    orders: returned_orders.length,
    units: returned_orders.reduce((s, o) => s + o.units_returned, 0),
    courier_cost: returned_orders.reduce((s, o) => s + o.courier_cost, 0),
  }

  /**
   * Expenses the ledger owns and no order knows about: ads, rent, salaries.
   *
   * BASIC mode has no Cash Book, so there is nothing to read — every ledger-derived figure stays
   * zero and the page hides those cards rather than showing ৳0, which would claim you spent
   * nothing on overheads rather than that you aren't tracking them.
   */
  const mode = await getSystemMode(req.scope)
  const acct: any = req.scope.resolve(ACCOUNTING_MODULE)
  const rows =
    mode === "advanced"
      ? await acct.listLedgerEntries({ entry_date: { $gte: from, $lte: to } }, { take: 100000 })
      : []
  const exp = pnlExpenses(rows)
  const other_income = pnlIncome(rows)

  /**
   * Both courier fees AND production costs are booked per order and already counted here —
   * courier_fee inside `courier_cost`, production_cost inside `cogs`. They also land in the
   * ledger (that's how the accounting dashboard sees them), so we strip both from ledger
   * overhead or every pre-order/custom order would be charged for its production twice.
   */
  const overhead = exp.total - exp.courier_fee - exp.production_cost

  // Packaging is NOT subtracted separately: it's a ledger expense now (bought = spent), so it is
  // already inside `overhead`. Subtracting it here as well would charge for it twice.
  const packaging = exp.packaging_purchase

  const net_profit = gross_profit + delivery_margin + other_income - write_off - overhead

  const countBy = <K extends string>(f: (o: (typeof orders)[number]) => K) => {
    const m: Record<string, number> = {}
    for (const o of orders) m[f(o)] = (m[f(o)] ?? 0) + 1
    return m
  }

  res.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    // Tells the page which ledger-derived cards it may render.
    system_mode: mode,
    currency_code: orders[0]?.currency_code ?? "bdt",
    order_count: orders.length,

    revenue: {
      product: product_revenue,
      delivery_charged,
      total: product_revenue + delivery_charged,
    },

    costs: {
      cogs,
      packaging,
      courier: courier_cost,
      write_off,
      overhead,
      marketing: exp.marketing,
      other_expense: exp.other_expense,
      refunds: exp.refund,
    },

    returns,

    profit: {
      gross_profit,
      /** What delivery made or lost. Negative means you are paying to ship. */
      delivery_margin,
      other_income,
      net_profit,
      net_margin_pct: product_revenue > 0 ? (net_profit / product_revenue) * 100 : 0,
    },

    cash: {
      captured: sum((o) => o.captured),
      refunded: sum((o) => o.refunded),
      /** COD still sitting with the courier or the customer. */
      outstanding: sum((o) => o.outstanding),
    },

    breakdown: {
      by_status: countBy((o) => o.order_status),
      by_payment: countBy((o) => o.payment_status),
      by_issue: countBy((o) => o.issue_status),
      /**
       * How the orders were SOLD, which is the split that changes how the shop runs: ready stock
       * comes off a shelf, pre-order and custom get made. Zero-filled so a type with no orders
       * still reports 0 rather than vanishing from the counters.
       */
      by_type: {
        ready_stock: 0,
        pre_order: 0,
        custom: 0,
        ...countBy((o) => o.order_type),
      },
    },

    /** The parcels that lost money — the whole point of a per-order P&L. */
    loss_making: orders
      .filter((o) => o.net_profit < 0)
      .sort((a, b) => a.net_profit - b.net_profit)
      .slice(0, 10),
  })
}
