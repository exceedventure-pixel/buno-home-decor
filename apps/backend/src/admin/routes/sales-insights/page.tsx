import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { KpiInfo, money } from "../../lib/kpi"
import { rbacFetch } from "../../lib/permissions"
import {
  ISSUE_STATUS_META,
  ORDER_STATUS_META,
  type IssueStatusKey,
  type OrderRow,
  type OrderStatusKey,
} from "../../lib/order-processing-api"

type Insights = {
  currency_code: string
  order_count: number
  revenue: { product: number; delivery_charged: number; total: number }
  costs: {
    cogs: number
    packaging: number
    courier: number
    write_off: number
    overhead: number
    marketing: number
    other_expense: number
    refunds: number
  }
  returns: { orders: number; units: number; courier_cost: number }
  profit: {
    gross_profit: number
    delivery_margin: number
    other_income: number
    net_profit: number
    net_margin_pct: number
  }
  cash: { captured: number; refunded: number; outstanding: number }
  breakdown: {
    by_status: Record<string, number>
    by_payment: Record<string, number>
    by_issue: Record<string, number>
    by_type: { ready_stock: number; pre_order: number; custom: number }
  }
  loss_making: OrderRow[]
}

/** A plain count — no currency, no accent maths. Distinct enough from Kpi to keep both simple. */
function Count({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number
  hint?: string
  accent?: "green" | "red" | "orange" | "base"
}) {
  const color =
    accent === "red" && value > 0
      ? "text-ui-tag-red-text"
      : accent === "orange" && value > 0
        ? "text-ui-tag-orange-text"
        : accent === "green" && value > 0
          ? "text-ui-tag-green-text"
          : "text-ui-fg-base"
  return (
    <div className="flex flex-col gap-y-1 rounded-lg border border-ui-border-base p-4">
      <Text size="xsmall" className="text-ui-fg-muted">
        {label}
      </Text>
      <Text className={`text-xl font-semibold ${color}`}>{value}</Text>
      {hint && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {hint}
        </Text>
      )}
    </div>
  )
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

function presetRange(key: string): [string, string] {
  const now = new Date()
  const today = iso(now)
  if (key === "last_month") {
    return [
      iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      iso(new Date(now.getFullYear(), now.getMonth(), 0)),
    ]
  }
  if (key === "last_30") {
    const s = new Date(now)
    s.setDate(s.getDate() - 29)
    return [iso(s), today]
  }
  if (key === "this_year") return [iso(new Date(now.getFullYear(), 0, 1)), today]
  return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), today]
}

function Kpi({
  label,
  value,
  hint,
  accent,
  emphasis,
  info,
}: {
  label: string
  value: string
  hint?: string
  accent?: "green" | "red" | "orange" | "base"
  emphasis?: boolean
  /** How this figure is calculated — shown from the ⓘ beside the label. */
  info?: string
}) {
  const color =
    accent === "green"
      ? "text-ui-tag-green-text"
      : accent === "red"
        ? "text-ui-tag-red-text"
        : accent === "orange"
          ? "text-ui-tag-orange-text"
          : "text-ui-fg-base"
  return (
    <div
      className={`flex flex-col gap-y-1 rounded-lg border p-4 ${
        emphasis ? "border-ui-border-strong bg-ui-bg-subtle" : "border-ui-border-base"
      }`}
    >
      <div className="flex items-center gap-x-1">
        <Text size="xsmall" className="text-ui-fg-muted">
          {label}
        </Text>
        {info && <KpiInfo text={info} />}
      </div>
      <Text className={`text-xl font-semibold ${color}`}>{value}</Text>
      {hint && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {hint}
        </Text>
      )}
    </div>
  )
}

const SalesInsightsPage = () => {
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange("this_month"))

  const { data, isLoading } = useQuery({
    queryKey: ["sales-insights", from, to],
    queryFn: () => rbacFetch<Insights>(`/sales-insights?from=${from}&to=${to}`),
  })

  const cur = data?.currency_code ?? "bdt"

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <Container className="flex flex-col gap-y-5 px-4 py-4 sm:px-6 sm:py-6">
        <div>
          <Heading level="h1">Sales Insights</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Built from each order's real P&amp;L — what the goods cost (FIFO), what the box cost,
            and what the courier charged. A busy store can still lose money on every parcel; this
            is where you'd see it.
          </Text>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { k: "this_month", l: "This month" },
            { k: "last_month", l: "Last month" },
            { k: "last_30", l: "Last 30 days" },
            { k: "this_year", l: "This year" },
          ].map((p) => (
            <Button key={p.k} size="small" variant="secondary" onClick={() => setRange(presetRange(p.k))}>
              {p.l}
            </Button>
          ))}
        </div>

        {isLoading || !data ? (
          <Text size="small" className="text-ui-fg-muted">
            Loading…
          </Text>
        ) : (
          <>
            {/* How many, and of what kind — the shape of the period before any money talk. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <Count label="Total orders" value={data.order_count} hint="in this range" />
              <Count
                label="Ready stock"
                value={data.breakdown.by_type.ready_stock}
                hint="off the shelf"
              />
              <Count label="Pre-orders" value={data.breakdown.by_type.pre_order} hint="made to order" />
              <Count label="Custom" value={data.breakdown.by_type.custom} hint="made to order" />
              <Count
                label="Returned"
                value={data.breakdown.by_status.returned ?? 0}
                hint="came back to stock"
                accent="orange"
              />
              <Count
                label="Refunded"
                value={data.breakdown.by_status.refunded ?? 0}
                hint="money given back"
                accent="red"
              />
              <Count
                label="Damaged"
                value={data.breakdown.by_issue.damaged ?? 0}
                hint="written off, not restocked"
                accent="red"
              />
            </div>

            {/* Headline */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Kpi
                label="Product revenue"
                value={money(data.revenue.product, cur)}
                hint={`${data.order_count} orders`}
                info="Goods sold in this period, excluding delivery. Cancelled orders count nothing, and a returned or damaged order's revenue is reversed — so this is money actually earned, not money invoiced."
              />
              <Kpi
                label="Gross profit"
                value={money(data.profit.gross_profit, cur)}
                hint="revenue − cost of goods"
                accent={data.profit.gross_profit >= 0 ? "green" : "red"}
                info="Product revenue MINUS cost of goods. Delivery is deliberately excluded on both sides — it is reported separately as the delivery overcharge, so shipping can't flatter the margin on the goods."
              />
              <Kpi
                label="Delivery overcharge"
                value={money(data.profit.delivery_margin, cur)}
                hint="charged − courier cost"
                accent={data.profit.delivery_margin >= 0 ? "green" : "red"}
                info="What customers were charged for delivery MINUS what the couriers charged us. Positive means delivery makes money; negative means you are paying to ship. Only this difference is a real result — the gross delivery charge is not profit."
              />
              <Kpi
                label="Net profit"
                value={money(data.profit.net_profit, cur)}
                hint={`${data.profit.net_margin_pct.toFixed(1)}% margin`}
                accent={data.profit.net_profit >= 0 ? "green" : "red"}
                emphasis
                info="Gross profit + delivery overcharge + other income − written-off goods − overheads. Courier fee and production cost are NOT subtracted again here: courier already sits in the delivery overcharge, production already inside cost of goods."
              />
            </div>

            {/* Where the money goes. Overheads is a TOTAL — its parts are broken out below it, not
                beside it, because adding them to it would count the same taka twice. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                label="Cost of goods"
                value={money(data.costs.cogs, cur)}
                accent="red"
                info="What the goods themselves cost. FIFO cost of every unit that left the shelf, plus the per-order production cost of made-to-order items (which never had a shelf)."
              />
              <Kpi
                label="Courier"
                value={money(data.costs.courier, cur)}
                accent="red"
                info="What the couriers charged us to carry these orders. Counted here and inside delivery margin — never in overheads, or it would be charged twice."
              />
              <Kpi
                label="Damaged / written off"
                value={money(data.costs.write_off, cur)}
                accent={data.costs.write_off > 0 ? "red" : "base"}
                info="Goods destroyed in transit. They are NOT restocked — written off at cost — so the loss is the goods' cost with no revenue against it."
              />
              <Kpi
                label="Overheads"
                value={money(data.costs.overhead, cur)}
                hint="packaging + marketing + operational + refunds"
                accent="red"
                info="Every ledger expense in the period MINUS courier fee and production cost. Those two are excluded because courier is already charged to delivery margin and production is already inside cost of goods — counting them here would double-charge."
              />
            </div>

            {/* The four parts that MAKE UP overheads. Courier fee and production cost are
                deliberately absent: courier is charged to delivery margin, production to COGS. */}
            <div className="flex flex-col gap-y-2">
              <Text size="xsmall" className="text-ui-fg-muted">
                Inside overheads — these four add up to {money(data.costs.overhead, cur)}
              </Text>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi
                  label="Packaging"
                  value={money(data.costs.packaging, cur)}
                  hint="bought in this period"
                  accent="red"
                  info="Packaging bought in this period, expensed on the purchase date (bought = spent). It is not drawn down per order, so a big buy shows up in the month you paid for it."
                />
                <Kpi
                  label="Marketing / ads"
                  value={money(data.costs.marketing, cur)}
                  accent="red"
                  info="Every ledger entry in the Marketing / ads category, dated inside this period."
                />
                <Kpi
                  label="Operational"
                  value={money(data.costs.other_expense, cur)}
                  hint="rent, utilities, salaries"
                  accent="red"
                  info="The 'Other expense' ledger category — rent, utilities, salaries. Note the Operational Expenses TAB also lists courier fee and refunds; those are counted separately here, so this card is the rent/utilities/salaries part only."
                />
                <Kpi
                  label="Refunds"
                  value={money(data.costs.refunds, cur)}
                  hint="paid outside Medusa"
                  accent={data.costs.refunds > 0 ? "red" : "base"}
                  info="Cash refunded OUTSIDE Medusa, booked in the ledger. A refund recorded in Medusa is already netted out of revenue and cash — it is not counted here, or it would subtract twice."
                />
              </div>
            </div>

            {/* Returns, and the gross delivery figure behind the overcharge. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Kpi
                label="Returns"
                value={`${data.returns.orders}`}
                hint={`${data.returns.units} unit(s) came back`}
                accent={data.returns.orders > 0 ? "orange" : "base"}
                info="Orders with at least one unit returned. The goods go back on the shelf and their revenue and cost of goods are both reversed — so a return costs no COGS. What it does cost is the courier fee, shown next to this."
              />
              <Kpi
                label="Return courier cost"
                value={money(data.returns.courier_cost, cur)}
                hint="paid to carry them anyway"
                accent={data.returns.courier_cost > 0 ? "red" : "base"}
                info="Courier fees on the returned orders. This is the real loss on a return: the goods came back, but the courier was still paid to carry the parcel."
              />
              <Kpi
                label="Delivery charged"
                value={money(data.revenue.delivery_charged, cur)}
                hint="gross, before courier cost"
                info="What customers were charged for delivery, before paying the courier. This is NOT profit on its own — subtract the courier cost to get the overcharge (see Delivery overcharge above)."
              />
            </div>

            {/* Cash */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                label="Cash collected"
                value={money(data.cash.captured, cur)}
                accent="green"
                info="Payments actually captured on these orders — advances plus COD collected when an order was marked Delivered. Cash in hand, not amounts invoiced."
              />
              <Kpi
                label="COD outstanding"
                value={money(data.cash.outstanding, cur)}
                hint="with the courier / customer"
                accent={data.cash.outstanding > 0 ? "orange" : "base"}
                info="Order total MINUS what has been captured, for orders not yet settled. This is money the courier or customer still owes you — it is revenue already, but not yet cash."
              />
              <Kpi
                label="Refunded"
                value={money(data.cash.refunded, cur)}
                accent="red"
                info="Money refunded through Medusa on these orders. Already netted out of revenue and cash, so it is NOT subtracted a second time in net profit. Refunds paid outside Medusa are the separate 'Refunds' card in overheads."
              />
              <Kpi
                label="Other income"
                value={money(data.profit.other_income, cur)}
                hint="courier compensation, scrap"
                accent="green"
                info="Income-class ledger entries in the period that aren't product sales — courier compensation for a damaged parcel, scrap sales, and similar. Added on top of net profit."
              />
            </div>

            {/* Issues */}
            <div className="flex flex-wrap items-center gap-2">
              <Text size="small" weight="plus" className="text-ui-fg-subtle">
                Issues:
              </Text>
              {Object.entries(data.breakdown.by_issue)
                .filter(([k, n]) => k !== "none" && n > 0)
                .map(([k, n]) => (
                  <Badge key={k} size="2xsmall" color={ISSUE_STATUS_META[k as IssueStatusKey]?.color ?? "grey"}>
                    {ISSUE_STATUS_META[k as IssueStatusKey]?.label ?? k}: {n}
                  </Badge>
                ))}
              {Object.entries(data.breakdown.by_issue).every(([k, n]) => k === "none" || n === 0) && (
                <Text size="small" className="text-ui-fg-muted">
                  none
                </Text>
              )}
            </div>

            {/* The parcels that lost money — the whole point */}
            {data.loss_making.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <Text size="small" weight="plus" className="text-ui-tag-red-text">
                  Orders that lost money
                </Text>
                <div className="overflow-x-auto rounded-lg border border-ui-border-error">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Order</Table.HeaderCell>
                        <Table.HeaderCell>Status</Table.HeaderCell>
                        <Table.HeaderCell className="text-right">Revenue</Table.HeaderCell>
                        <Table.HeaderCell className="text-right">Goods</Table.HeaderCell>
                        <Table.HeaderCell className="text-right">Courier</Table.HeaderCell>
                        <Table.HeaderCell className="text-right">Lost</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {data.loss_making.map((o) => (
                        <Table.Row
                          key={o.order_id}
                          className="cursor-pointer"
                          onClick={() => {
                            window.location.href = `/app/orders/${o.order_id}`
                          }}
                        >
                          <Table.Cell className="font-medium">#{o.display_id}</Table.Cell>
                          <Table.Cell>
                            <Badge size="2xsmall" color={ORDER_STATUS_META[o.order_status as OrderStatusKey]?.color ?? "grey"}>
                              {ORDER_STATUS_META[o.order_status as OrderStatusKey]?.label ?? o.order_status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell className="text-right">{money(o.product_revenue, cur)}</Table.Cell>
                          <Table.Cell className="text-right">{money(o.cogs, cur)}</Table.Cell>
                          <Table.Cell className="text-right">{money(o.courier_cost, cur)}</Table.Cell>
                          <Table.Cell className="text-right font-medium text-ui-tag-red-text">
                            {money(o.net_profit, cur)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Sales Insights",
  icon: CurrencyDollar,
  rank: 5,
})

export default SalesInsightsPage
