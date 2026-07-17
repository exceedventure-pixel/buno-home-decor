import type { FulfillmentOrderDTO } from "@medusajs/types"
import type {
  CourierAdapter,
  CreateParcelOptions,
  NormalizedStatus,
  ParcelResult,
} from "./interface"

/**
 * Pull a per-consignment delivery charge out of a Steadfast payload IF one is present.
 * Steadfast's public API has historically NOT returned this on create/status, so this is a
 * best-effort read across the field names they've used — it returns undefined when absent,
 * and the caller leaves the courier fee to manual entry in that case. Verify against current
 * Steadfast docs before relying on it.
 */
function readDeliveryCharge(payload: any): number | undefined {
  const c = payload?.consignment ?? payload ?? {}
  const candidate =
    c.delivery_charge ?? c.delivery_fee ?? c.charge ?? payload?.delivery_charge
  const n = Number(candidate)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Steadfast `delivery_status` → our NormalizedStatus.
 *
 * Steadfast's public API (`status_by_cid`) returns only the parcel's SINGLE current status string —
 * there is no event-timeline/history endpoint like the one in their merchant app, so we can't
 * mirror that here. What we can do is recognise their full status vocabulary and bucket it safely.
 *
 * The load-bearing rule is money: only Steadfast's FINAL states drive terminal actions. `delivered`
 * captures COD, `cancelled` runs the RTO/cancel, `returned` restocks. Their "…_approval_pending"
 * states mean the parcel is still out but not finalised, so they map to `in_transit` — the order
 * dispatches (stock leaves) but no cash is captured until the status is truly `delivered`.
 */
const STATUS_MAP: Record<string, NormalizedStatus> = {
  // Awaiting pickup / on hold with the courier.
  pending: "pending",
  in_review: "pending",
  hold: "pending",
  // Out with the courier — moving, but not a final state.
  out_for_delivery: "in_transit",
  partial_delivered: "in_transit",
  partially_delivered: "in_transit",
  delivered_approval_pending: "in_transit",
  partial_delivered_approval_pending: "in_transit",
  cancelled_approval_pending: "in_transit",
  // Final states — these are the only ones that move cash or stock.
  delivered: "delivered",
  returned: "returned",
  cancelled: "cancelled",
  // Explicitly unknown — recorded, no transition.
  unknown: "unknown",
  unknown_approval_pending: "unknown",
}

export const steadfastAdapter: CourierAdapter = {
  async createParcel(
    order: Partial<FulfillmentOrderDTO>,
    credentials: Record<string, string>,
    opts?: CreateParcelOptions
  ): Promise<ParcelResult> {
    const address = (order as any).shipping_address
    const recipientName =
      address?.first_name && address?.last_name
        ? `${address.first_name} ${address.last_name}`.trim()
        : address?.first_name || address?.last_name || "Customer"

    const recipientPhone =
      address?.phone || (order as any).email || ""

    const recipientAddress = [
      address?.address_1,
      address?.address_2,
      address?.city,
    ]
      .filter(Boolean)
      .join(", ")

    // COD amount: the caller passes the exact figure to collect (order total minus any advance,
    // delivery included — see order-economics `outstanding`). Only fall back to the payment-status
    // heuristic when no explicit amount is given.
    const paymentMethod = (order as any).payment_status
    const fallbackCod =
      paymentMethod === "not_paid" || paymentMethod === "awaiting"
        ? Number(((order as any).total ?? 0))
        : 0
    const codAmount = opts?.cod_amount ?? fallbackCod

    const body = {
      invoice: String((order as any).display_id ?? (order as any).id ?? ""),
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress || "Dhaka, Bangladesh",
      cod_amount: codAmount,
      note: opts?.note ?? `Order #${(order as any).display_id ?? ""}`,
    }

    const res = await fetch("https://portal.packzy.com/api/v1/create_order", {
      method: "POST",
      headers: {
        "Api-Key": credentials.api_key ?? "",
        "Secret-Key": credentials.secret_key ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const json = (await res.json()) as any

    if (!res.ok || json.status !== 200) {
      throw new Error(
        `Steadfast createParcel failed: ${json.message ?? res.status}`
      )
    }

    const consignment = json.consignment ?? {}
    return {
      tracking_id: String(consignment.tracking_code ?? consignment.consignment_id ?? ""),
      consignment_id: String(consignment.consignment_id ?? ""),
      delivery_charge: readDeliveryCharge(json),
      raw: json,
    }
  },

  async getStatus(
    consignment_id: string,
    credentials: Record<string, string>
  ): Promise<NormalizedStatus> {
    const res = await fetch(
      `https://portal.packzy.com/api/v1/status_by_cid/${consignment_id}`,
      {
        headers: {
          "Api-Key": credentials.api_key ?? "",
          "Secret-Key": credentials.secret_key ?? "",
          "Content-Type": "application/json",
        },
      }
    )

    if (!res.ok) return "unknown"

    const json = (await res.json()) as any
    const rawStatus: string = (
      json.delivery_status ??
      json.consignment?.delivery_status ??
      ""
    ).toLowerCase()

    return STATUS_MAP[rawStatus] ?? "unknown"
  },
}
