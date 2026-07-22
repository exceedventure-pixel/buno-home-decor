import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Badge, Container, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

import { money } from "../lib/kpi"
import { opApi } from "../lib/order-processing-api"

/**
 * COURIER DELIVERY — the dedicated view of a courier shipment, on the order page.
 *
 * It reads from the order-processing endpoint (not fulfillment.data), so it appears the moment the
 * parcel is BOOKED — before any fulfilment exists — and it live-updates as the courier's status
 * flows in (webhook / poll). It shows the order id, consignment, tracking + a public track link,
 * the COD to collect, and the actual delivery charge once the courier reports one.
 *
 * Manual shipments have no consignment, so this renders nothing for them (correct).
 *
 * READ-ONLY on purpose. Returns used to be actioned from here, which meant a manually delivered
 * order — no consignment, so no widget — had no way to be returned at all. That lives in the
 * After the Sale widget now, which renders for every order that shipped.
 */

const STATUS_LABELS: Record<
  string,
  { label: string; color: "grey" | "blue" | "green" | "orange" | "red" }
> = {
  pending:    { label: "Awaiting pickup", color: "grey" },
  in_transit: { label: "In transit",      color: "blue" },
  delivered:  { label: "Delivered",       color: "green" },
  returned:   { label: "Returned",        color: "orange" },
  cancelled:  { label: "Cancelled",       color: "red" },
  unknown:    { label: "Unknown",         color: "grey" },
}

const COURIER_NAMES: Record<string, string> = {
  steadfast: "Steadfast Courier",
  redx: "RedX",
  pathao: "Pathao",
}

/**
 * Public tracking-link builders — a missing/unknown format simply omits the link.
 *
 * Steadfast returns NO usable public link: their real one is `steadfast.com.bd/t/<opaque-token>`
 * (e.g. `-zwSgC5DQoL_frDqC4K8jkGcAqQlYkOt`), a per-parcel token their API never gives us — it is
 * NOT the tracking code. Building the URL from the tracking code produced a dead link, so we show
 * the code alone and let staff look it up. Don't "restore" this without a token from the API.
 */
const TRACK_URL: Record<string, (code: string) => string | null> = {
  steadfast: () => null,
  redx: (code) =>
    code ? `https://redx.com.bd/track-global-parcel/?trackingId=${encodeURIComponent(code)}` : null,
  pathao: () => null,
}

function Row({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex items-center gap-x-2">
      <Text size="small" className="text-ui-fg-subtle">
        {label}:
      </Text>
      <Text size="small" className="text-ui-fg-base font-mono">
        {children}
      </Text>
    </div>
  )
}

function TrackingWidget({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) {
  const orderId = (order as any).id
  const cur = (order as any).currency_code ?? "bdt"

  const { data } = useQuery({
    queryKey: ["order-processing", orderId],
    queryFn: () => opApi.get(orderId),
    // Shares the panel's cache key, and live-updates as courier status arrives.
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  })

  const o = data?.order
  // Only a booked courier order has a consignment — manual shipments never reach here.
  if (!o?.consignment_id) return null

  const statusInfo = STATUS_LABELS[o.courier_status ?? "pending"] ?? STATUS_LABELS.unknown
  const courierName = COURIER_NAMES[o.courier_id ?? ""] ?? o.courier_id ?? "Courier"
  const trackUrl = o.tracking ? TRACK_URL[o.courier_id ?? ""]?.(o.tracking) ?? null : null

  return (
    <Container className="divide-y divide-ui-border-base p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="base" weight="plus">
          Courier Delivery
        </Text>
        <Badge color={statusInfo.color} size="2xsmall">
          {statusInfo.label}
        </Badge>
      </div>

      <div className="flex flex-col gap-y-2 px-6 py-4">
        <div className="flex items-center justify-between">
          <Text size="small" weight="plus" className="text-ui-fg-base">
            {courierName}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            Order #{o.display_id}
          </Text>
        </div>

        {o.tracking && (
          <div className="flex flex-wrap items-center gap-x-2">
            <Text size="small" className="text-ui-fg-subtle">
              Tracking #:
            </Text>
            <Text size="small" className="text-ui-fg-base font-mono">
              {o.tracking}
            </Text>
            {trackUrl && (
              <a
                href={trackUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ui-fg-interactive text-sm hover:underline"
              >
                Track parcel ↗
              </a>
            )}
          </div>
        )}

        {o.consignment_id && o.consignment_id !== o.tracking && (
          <Row label="Consignment">{o.consignment_id}</Row>
        )}

        <Text size="xsmall" className="text-ui-fg-muted">
          COD to collect {money(o.cod_amount ?? 0, cur)}
          {o.actual_delivery_charge != null
            ? ` · courier charged ${money(o.actual_delivery_charge, cur)}`
            : ""}
        </Text>
      </div>

    </Container>
  )
}

export const config = defineWidgetConfig({
  // Sidebar top (above Medusa's Customer card), just under the Order Processing panel.
  zone: "order.details.side.before",
})

export default TrackingWidget
