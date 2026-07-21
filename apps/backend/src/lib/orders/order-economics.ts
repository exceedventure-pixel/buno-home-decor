import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { computeFifoCosting } from "../insights/fifo-costing"
import { getSystemMode } from "../store/system-mode"
import { ORDER_PROCESSING_MODULE } from "../../modules/orderProcessing"
import { PRODUCT_COST_MODULE } from "../../modules/productCost"
import {
  derivePaymentStatus,
  resolveOrderStatus,
  type OrderFacts,
} from "./status"
import {
  PRODUCTION_TYPES,
  type IssueStatus,
  type OrderPaymentStatus,
  type OrderStatus,
  type OrderType,
  type StoredStage,
} from "../../modules/orderProcessing/constants"

/**
 * THE PER-ORDER P&L — did this order actually make money?
 *
 * A store can be busy and still lose money on every parcel: the goods cost more than you think,
 * the box costs something, the courier charges more than you charged the customer, and a
 * return-to-origin costs you the courier fee twice with no revenue at all. None of that is
 * visible from revenue alone, which is why this exists.
 *
 * Every number is DERIVED — from Medusa's orders and payments, the FIFO engine, and the courier
 * fee on the order. Nothing here is a stored total that could go stale.
 */

export type OrderEconomics = {
  order_id: string
  display_id: number
  created_at: string
  customer: string
  currency_code: string

  // How it was sold — drives costing and which pipeline stages apply.
  order_type: OrderType

  // Statuses — all derived except the stage/issue we legitimately own.
  order_status: OrderStatus
  payment_status: OrderPaymentStatus
  issue_status: IssueStatus
  stage: StoredStage

  // What we earn
  product_revenue: number
  delivery_charged: number
  total: number

  // What it costs
  cogs: number
  /** For pre-order/custom: what production cost. (For ready-stock this is 0; COGS is FIFO.) */
  production_cost: number
  courier_cost: number
  /** Goods destroyed in transit — a real loss, never restocked. */
  write_off: number

  /** What delivery actually made or lost: charged − courier cost. The "overcharge". */
  delivery_margin: number
  /** Revenue − every cost above. The only number that says whether the parcel was worth sending. */
  net_profit: number

  // Cash
  captured: number
  refunded: number
  /** Still to collect — the COD sitting with the courier or the customer. */
  outstanding: number

  units_shipped: number
  units_returned: number
  tracking: string | null
  courier_id: string | null
  /** Normalised courier status (pending | in_transit | delivered | returned | cancelled). */
  courier_status: string | null
  consignment_id: string | null
  /** The order's STANDING note (order_workflow.note) — not transition history. */
  note: string | null
  /** COD amount handed to the courier to collect. */
  cod_amount: number
  /** The courier's own delivery charge, once captured from its API (else null). */
  actual_delivery_charge: number | null
}

/**
 * Always coerce through Number().
 *
 * Order totals arrive from query.graph as Medusa BigNumber OBJECTS, not numbers — and a cast
 * like `v as number` leaves the object intact, so `Number.isFinite()` rejects it and the value
 * silently becomes 0. Number(v) invokes valueOf and gets the real figure. Postgres `numeric`
 * also arrives as a string, which this handles too.
 */
const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function computeOrderEconomics(
  container: MedusaContainer,
  opts?: { order_id?: string; from?: Date; to?: Date }
): Promise<OrderEconomics[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const opSvc: any = container.resolve(ORDER_PROCESSING_MODULE)

  /**
   * WHERE COST OF GOODS COMES FROM depends on the system mode.
   *
   *   advanced — FIFO: the exact cost of the batches each order actually drew.
   *   basic    — there are no batches, so cost is the variant's single cost price × units shipped.
   *
   * Without this, a basic-mode store would compute COGS of ZERO for every order (nothing to draw
   * from) and report its entire revenue as profit.
   */
  const mode = await getSystemMode(container)
  const fifo = await computeFifoCosting(container)

  // Basic mode only: variant_id -> cost price.
  const simpleCost = new Map<string, number>()
  if (mode === "basic") {
    try {
      const costSvc: any = container.resolve(PRODUCT_COST_MODULE)
      const rows = await costSvc.listVariantCosts({}, { take: 200000 })
      for (const r of rows ?? []) simpleCost.set(r.variant_id, Number(r.cost) || 0)
    } catch {
      // No cost prices set yet — COGS reads 0, which the Sales Insights hint calls out.
    }
  }

  const workflows = await opSvc.listOrderWorkflows({}, { take: 100000 })
  const wfByOrder = new Map<string, any>(workflows.map((w: any) => [w.order_id, w]))

  const filters: Record<string, unknown> = {}
  if (opts?.order_id) filters.id = opts.order_id
  if (opts?.from || opts?.to) {
    filters.created_at = {
      ...(opts.from ? { $gte: opts.from } : {}),
      ...(opts.to ? { $lte: opts.to } : {}),
    }
  }

  /**
   * TWO queries, deliberately — and the split is not where you'd expect.
   *
   * Asking query.graph for an order's TOTALS alongside ANY relation (items, shipping address,
   * payments…) silently corrupts them: `item_total` comes back 0 and `total` collapses to just
   * the shipping. It does not error — it lies. That is precisely how this store came to report
   * zero product revenue on every dashboard.
   *
   * So the totals query takes SCALAR ORDER FIELDS ONLY. Everything relational lives in the
   * second query, joined by id. Do not add a relation to the first list, however harmless it
   * looks — a shipping address is enough to zero your revenue.
   */
  const PAGE = 200
  const paged = async (fields: string[]): Promise<any[]> => {
    const out: any[] = []
    let skip = 0
    for (;;) {
      const { data } = await query.graph({
        entity: "order",
        fields,
        filters,
        pagination: { skip, take: PAGE },
      })
      out.push(...data)
      if (data.length < PAGE) break
      skip += data.length
    }
    return out
  }

  const [totalsRows, detailRows] = await Promise.all([
    // SCALARS ONLY. One relation in here and the totals come back as zeros.
    paged([
      "id", "display_id", "created_at", "email", "currency_code", "canceled_at",
      "total", "item_total", "shipping_total",
    ]),
    paged([
      "id",
      "shipping_address.first_name", "shipping_address.last_name",
      "items.id", "items.variant_id", "items.unit_price",
      "items.detail.quantity",
      "items.detail.fulfilled_quantity",
      "items.detail.delivered_quantity",
      "items.detail.return_received_quantity",
      // `captured_amount`/`refunded_amount` are NOT exposed to query.graph. A payment is
      // captured in full, so `captured_at` + `amount` IS the cash that came in, and the
      // refunds are their own rows. Multiple payments = an advance plus the COD balance.
      "payment_collections.payments.amount",
      "payment_collections.payments.captured_at",
      "payment_collections.payments.canceled_at",
      "payment_collections.payments.refunds.amount",
      "fulfillments.data",
    ]),
  ])

  const detailById = new Map<string, any>(detailRows.map((r: any) => [r.id, r]))
  const orders: any[] = totalsRows.map((t: any) => {
    const d = detailById.get(t.id) ?? {}
    return {
      ...t, // totals win — they came from the query that computes them correctly
      shipping_address: d.shipping_address ?? null,
      items: d.items ?? [],
      payment_collections: d.payment_collections ?? [],
      fulfillments: d.fulfillments ?? [],
    }
  })

  return orders.map((o: any): OrderEconomics => {
    const wf = wfByOrder.get(o.id)
    const orderType: OrderType = (wf?.order_type as OrderType) ?? "ready_stock"
    const stage: StoredStage = (wf?.stage as StoredStage) ?? "new_order"
    const issue: IssueStatus = (wf?.issue_status as IssueStatus) ?? "none"
    const isCod = wf ? Boolean(wf.is_cod) : true
    const isProduction = PRODUCTION_TYPES.includes(orderType)

    /**
     * Cash: only money that actually moved.
     *
     * A Medusa payment is captured in full or not at all, so a captured payment's `amount` IS
     * the cash. An advance is simply a first payment (৳500 captured) with the COD balance
     * following later as a second one — which is why "Advance Paid" needs no special storage.
     */
    let captured = 0
    let refunded = 0
    for (const pc of o.payment_collections ?? []) {
      for (const p of pc.payments ?? []) {
        if (p.captured_at && !p.canceled_at) captured += num(p.amount)
        for (const r of p.refunds ?? []) refunded += num(r.amount)
      }
    }

    // ── Goods: what physically moved ─────────────────────────────────────────
    let unitsShipped = 0
    let unitsReturned = 0
    let returnedValue = 0
    for (const it of o.items ?? []) {
      const fulfilled = num(it.detail?.fulfilled_quantity)
      const returned = num(it.detail?.return_received_quantity)
      unitsShipped += fulfilled
      unitsReturned += returned
      returnedValue += num(it.unit_price) * returned
    }

    const delivered = (o.items ?? []).some((it: any) => num(it.detail?.delivered_quantity) > 0)
    const courierData = (o.fulfillments ?? []).map((f: any) => f.data ?? {})
    // Courier shipment lives on the workflow row (booked before any fulfilment exists); fall back
    // to fulfilment.data for orders booked before that move.
    const courierId = wf?.courier_id ?? courierData.find((d: any) => d.courier_id)?.courier_id ?? null
    const trackingId = wf?.tracking_id ?? courierData.find((d: any) => d.tracking_id)?.tracking_id ?? null
    const consignmentId =
      wf?.consignment_id ?? courierData.find((d: any) => d.consignment_id)?.consignment_id ?? null
    const courierStatus =
      wf?.courier_status ?? courierData.find((d: any) => d.courier_status)?.courier_status ?? null
    const courierDelivered =
      courierStatus === "delivered" || courierData.some((d: any) => d.courier_status === "delivered")

    const facts: OrderFacts = {
      canceled: !!o.canceled_at,
      fulfilled_qty: unitsShipped,
      delivered: delivered || courierDelivered,
      returned_qty: unitsReturned,
      refunded_amount: refunded,
    }

    const orderStatus = resolveOrderStatus(stage, facts)
    const paymentStatus = derivePaymentStatus({
      total: num(o.total),
      captured,
      refunded,
      is_cod: isCod,
    })

    // ── The money ────────────────────────────────────────────────────────────

    /** Cash we actually took and did NOT give back. The only money we really kept. */
    const retained = Math.max(0, captured - refunded)

    let productRevenue = Math.max(0, num(o.item_total) - returnedValue)

    /**
     * Delivery charged is the revenue side. Use the per-order override when set (the
     * "overcharge" — what you actually billed), otherwise Medusa's shipping_total.
     */
    let deliveryCharged =
      wf?.delivery_charged != null ? num(wf.delivery_charged) : num(o.shipping_total)

    /**
     * A SALE THAT DIDN'T HAPPEN IS NOT REVENUE — and this is where it used to lie.
     *
     * Two cases, and both were being counted as if the customer had paid:
     *
     *   Cancelled before anything shipped — nothing moved, no cash, no parcel. It rolls back as
     *   if the order was never placed: no revenue, no delivery. (It used to keep its full
     *   item_total, which is why a cancelled order still inflated Sales Insights.)
     *
     *   RTO / returned — the goods came back, so there is no product sale. Delivery is only
     *   revenue to the extent the customer ACTUALLY PAID for it: we recover the delivery out of
     *   whatever they put down (an advance), and whatever the courier charged beyond that is a
     *   real loss. With no advance we keep nothing and eat the courier fee — which is exactly
     *   what happens on the shelf, and what the books previously showed as a PROFIT.
     *
     * Deriving this from retained cash also means "we'll collect the delivery from them later"
     * needs no flag: the day that cash is recorded, the delivery revenue appears on its own.
     */
    const goodsDestroyed = issue === "damaged"

    if (facts.canceled && unitsShipped === 0) {
      productRevenue = 0
      deliveryCharged = 0
    } else if (facts.canceled || unitsReturned > 0 || goodsDestroyed) {
      // Destroyed in transit is the same story as a return: the customer never got the goods, so
      // there is no sale — only whatever cash they had already put down.
      if (facts.canceled || goodsDestroyed) productRevenue = 0
      deliveryCharged = Math.min(deliveryCharged, retained)
    }

    const productionCost = num(wf?.production_cost)

    /**
     * COGS depends on the type. Ready-stock draws real inventory, so the cost is what the FIFO
     * batches say. Pre-order/custom never touch inventory (no batch to draw from) — the cost is
     * the production cost entered on the order.
     */
    const cogs = isProduction
      ? productionCost
      : mode === "basic"
        ? // Units that actually shipped, at the variant's cost price. Lines with no variant
          // (custom items) never touch inventory and are covered by productionCost above.
          (o.items ?? []).reduce(
            (s: number, it: any) =>
              s +
              num(it.detail?.fulfilled_quantity) * (simpleCost.get(it.variant_id) ?? 0),
            0
          )
        : (fifo.cogs_by_ref.get(o.id) ?? 0)
    const courierCost = num(wf?.courier_fee)

    /**
     * The value of goods destroyed in transit — REPORTED, not charged again.
     *
     * These units left the shelf on this order, so `cogs` has already counted them exactly once.
     * Subtracting write_off on top charged the same physical units twice: a ৳1000 order whose
     * ৳400 of goods were destroyed booked full revenue AND ৳800 of cost, and reported +৳200
     * PROFIT on a parcel that lost ৳400. Revenue is zeroed above (nobody received anything), so
     * `− cogs` alone is the loss, and this figure is here to show what it was worth.
     */
    const writeOff = issue === "damaged" ? cogs : 0

    const deliveryMargin = deliveryCharged - courierCost
    // Packaging is deliberately absent: it's expensed when bought (a period cost in the Cash
    // Book), not allocated per order.
    const netProfit = productRevenue + deliveryCharged - cogs - courierCost

    const name =
      [o.shipping_address?.first_name, o.shipping_address?.last_name].filter(Boolean).join(" ") ||
      o.email ||
      "—"

    return {
      order_id: o.id,
      display_id: o.display_id,
      created_at: o.created_at,
      customer: name,
      currency_code: o.currency_code ?? "bdt",

      order_type: orderType,
      order_status: orderStatus,
      payment_status: paymentStatus,
      issue_status: issue,
      stage,

      product_revenue: productRevenue,
      delivery_charged: deliveryCharged,
      total: num(o.total),

      cogs,
      production_cost: productionCost,
      courier_cost: courierCost,
      write_off: writeOff,

      delivery_margin: deliveryMargin,
      net_profit: netProfit,

      captured,
      refunded,
      outstanding: Math.max(0, num(o.total) - captured),

      units_shipped: unitsShipped,
      units_returned: unitsReturned,
      tracking: trackingId,
      courier_id: courierId,
      courier_status: courierStatus,
      consignment_id: consignmentId,
      note: wf?.note ?? null,
      cod_amount: num(wf?.cod_amount),
      actual_delivery_charge:
        wf?.actual_delivery_charge != null ? num(wf.actual_delivery_charge) : null,
    }
  })
}
