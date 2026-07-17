import { rbacFetch } from "./permissions"

/**
 * Order Processing client. Mirrors the enums in modules/orderProcessing/constants.ts — that file
 * is the spec; this is only the display layer.
 */

export type OrderStatusKey =
  | "new_order" | "confirmed" | "in_production" | "ready_to_dispatch" | "courier_booked"
  | "dispatched" | "delivered" | "cancelled" | "on_hold" | "returned" | "refunded"

export type PaymentStatusKey =
  | "unpaid" | "advance_paid" | "partially_paid" | "paid" | "cod" | "refunded"

export type IssueStatusKey =
  | "none" | "returned" | "damaged" | "wrong_product" | "exchange_requested" | "refunded"

export type OrderTypeKey = "ready_stock" | "pre_order" | "custom"

type Color = "grey" | "blue" | "green" | "orange" | "red" | "purple"

export const ORDER_TYPE_META: Record<
  OrderTypeKey,
  { label: string; color: Color; touchesInventory: boolean }
> = {
  ready_stock: { label: "Ready Stock", color: "grey", touchesInventory: true },
  pre_order: { label: "Pre-order", color: "blue", touchesInventory: false },
  custom: { label: "Custom", color: "purple", touchesInventory: false },
}

export const ORDER_STATUS_META: Record<OrderStatusKey, { label: string; color: Color }> = {
  new_order:         { label: "New Order",         color: "grey" },
  confirmed:         { label: "Confirmed",         color: "blue" },
  in_production:     { label: "In Production",     color: "purple" },
  ready_to_dispatch: { label: "Ready to Dispatch", color: "purple" },
  courier_booked:    { label: "Courier Booked",    color: "blue" },
  dispatched:        { label: "Dispatched",        color: "blue" },
  delivered:         { label: "Delivered",         color: "green" },
  cancelled:         { label: "Cancelled",         color: "red" },
  on_hold:           { label: "On Hold",           color: "orange" },
  returned:          { label: "Returned",          color: "orange" },
  refunded:          { label: "Refunded",          color: "red" },
}

export const ORDER_STATUS_ORDER: OrderStatusKey[] = [
  "new_order", "confirmed", "in_production", "ready_to_dispatch", "courier_booked",
  "dispatched", "delivered", "on_hold", "cancelled", "returned", "refunded",
]

/** Mirrors ORDER_PIPELINE in modules/orderProcessing/constants.ts — the happy path, in order. */
export const ORDER_PIPELINE: OrderStatusKey[] = [
  "new_order", "confirmed", "in_production", "ready_to_dispatch", "courier_booked",
  "dispatched", "delivered",
]

/** Mirrors EXCEPTION_STATUSES — the exits, which are actions rather than steps on the line. */
export const EXCEPTION_STATUSES: OrderStatusKey[] = [
  "on_hold", "cancelled", "returned", "refunded",
]

// Mirrors PRODUCTION_ONLY_STATUSES in the backend constants: only the workshop stages are
// production-only. `courier_booked` is NOT here — every order type can be booked with a courier,
// so ready-stock timelines must show it too.
const PRODUCTION_ONLY: OrderStatusKey[] = ["in_production", "ready_to_dispatch"]

export const isExceptionStatus = (s: OrderStatusKey) => EXCEPTION_STATUSES.includes(s)

/** Mirrors orderPipelineFor — ready-stock skips the workshop entirely. */
export function pipelineFor(type: OrderTypeKey): OrderStatusKey[] {
  if (type === "ready_stock") return ORDER_PIPELINE.filter((s) => !PRODUCTION_ONLY.includes(s))
  return ORDER_PIPELINE
}

export const PAYMENT_STATUS_META: Record<PaymentStatusKey, { label: string; color: Color }> = {
  unpaid:         { label: "Unpaid",           color: "red" },
  advance_paid:   { label: "Advance Paid",     color: "blue" },
  partially_paid: { label: "Partially Paid",   color: "orange" },
  paid:           { label: "Paid",             color: "green" },
  cod:            { label: "Cash on Delivery", color: "grey" },
  refunded:       { label: "Refunded",         color: "red" },
}

export const ISSUE_STATUS_META: Record<IssueStatusKey, { label: string; color: Color }> = {
  none:               { label: "None",               color: "grey" },
  returned:           { label: "Returned",           color: "orange" },
  damaged:            { label: "Damaged",            color: "red" },
  wrong_product:      { label: "Wrong Product",      color: "orange" },
  exchange_requested: { label: "Exchange Requested", color: "blue" },
  refunded:           { label: "Refunded",           color: "red" },
}

/**
 * The action a step's button performs, phrased as an imperative — so the control reads like a verb
 * ("Mark as delivered") instead of a location ("Move here"). Keyed by the TARGET status.
 */
export const NEXT_ACTION_LABEL: Record<OrderStatusKey, string> = {
  new_order:         "Reopen",
  confirmed:         "Confirm order",
  in_production:     "Start production",
  ready_to_dispatch: "Mark ready to dispatch",
  courier_booked:    "Send to courier",
  dispatched:        "Mark dispatched",
  delivered:         "Mark as delivered",
  returned:          "Mark returned",
  cancelled:         "Cancel order",
  on_hold:           "Put on hold",
  refunded:          "Refund",
}

/** What each status change will actually DO — shown in the confirmation, so nobody is surprised. */
export const TRANSITION_EFFECT: Partial<Record<OrderStatusKey, string>> = {
  dispatched:
    "Creates the fulfilment: stock leaves the shelf and cost of goods is booked (FIFO).",
  delivered: "Captures the outstanding payment — the cash the courier collected lands in the books.",
  returned: "Creates and receives a return: the goods go back on the shelf and their COGS reverses.",
  cancelled:
    "If nothing shipped, releases the stock reservation. If it already went out, this is an RTO — the goods come back, but the courier fee is still a real cost.",
  refunded: "Refunds the captured payment — money goes back to the customer.",
}

export type OrderRow = {
  order_id: string
  display_id: number
  created_at: string
  customer: string
  currency_code: string
  order_type: OrderTypeKey
  order_status: OrderStatusKey
  payment_status: PaymentStatusKey
  issue_status: IssueStatusKey
  product_revenue: number
  delivery_charged: number
  total: number
  cogs: number
  production_cost: number
  courier_cost: number
  write_off: number
  delivery_margin: number
  net_profit: number
  captured: number
  refunded: number
  outstanding: number
  units_shipped: number
  units_returned: number
  tracking: string | null
  courier_id: string | null
  courier_status: string | null
  consignment_id: string | null
  cod_amount: number
  actual_delivery_charge: number | null
  /** What this row may legally move to next — type-aware, computed server-side. */
  allowed_next: OrderStatusKey[]
}

export type StatusEvent = {
  id: string
  field: string
  from_value: string | null
  to_value: string
  source: string
  note: string | null
  created_at: string
}

export const opApi = {
  list: (params: Record<string, string | undefined> = {}) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
    const qs = q.toString()
    return rbacFetch<{
      orders: OrderRow[]
      counts: Record<string, number>
      type_counts: Record<OrderTypeKey, number>
      total: number
      totals: Record<string, number>
    }>(`/order-processing${qs ? `?${qs}` : ""}`)
  },

  get: (orderId: string) =>
    rbacFetch<{
      order: OrderRow
      allowed_next: OrderStatusKey[]
      events: StatusEvent[]
    }>(`/order-processing/${orderId}`),

  update: (orderId: string, body: unknown) =>
    rbacFetch(`/order-processing/${orderId}`, { method: "POST", body: JSON.stringify(body) }),
}
