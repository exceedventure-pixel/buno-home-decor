import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Badge, Button, Container, Prompt, Text, toast } from "@medusajs/ui"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { adminFetch } from "../lib/api"
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

// Public tracking-link builders — mirror the store route's TRACK_URL. Verify formats against each
// courier's live site; a missing/unknown format simply omits the link.
const TRACK_URL: Record<string, (code: string) => string | null> = {
  steadfast: (code) => (code ? `https://steadfast.com.bd/t/${encodeURIComponent(code)}` : null),
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
  const qc = useQueryClient()
  const cur = (order as any).currency_code ?? "bdt"
  const [busy, setBusy] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)

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

  const alreadyReturned = o.courier_status === "returned"
  const isCancelled = o.courier_status === "cancelled"

  const handleReturn = async () => {
    setBusy(true)
    try {
      const r = await adminFetch<{ success: boolean; created: boolean; items?: number; message?: string }>(
        `/orders/${orderId}/mark-returned`,
        { method: "POST" }
      )
      if (r.created) {
        toast.success(`Return recorded — ${r.items} item type(s) restocked`)
        qc.invalidateQueries({ queryKey: ["orders"] })
        qc.invalidateQueries({ queryKey: ["order-processing"] })
        qc.invalidateQueries({ queryKey: ["accounting"] })
      } else {
        toast.info(r.message || "Nothing to return")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record return")
    } finally {
      setBusy(false)
      setPromptOpen(false)
    }
  }

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

      {!isCancelled && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {alreadyReturned
              ? "This order was returned — items have been restocked."
              : "If the parcel came back, record the return to restock inventory. No refund is issued."}
          </Text>
          <Button
            size="small"
            variant="secondary"
            disabled={busy || alreadyReturned}
            isLoading={busy}
            onClick={() => setPromptOpen(true)}
          >
            {alreadyReturned ? "Returned" : "Mark returned & restock"}
          </Button>
        </div>
      )}

      <Prompt open={promptOpen} onOpenChange={setPromptOpen} variant="confirmation">
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Mark this order as returned?</Prompt.Title>
            <Prompt.Description>
              This creates a return for all items on the order and adds their quantities back to
              inventory. No refund is issued — handle any refund manually. This can't be undone here.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel disabled={busy}>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={handleReturn}>Return &amp; restock</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}

export const config = defineWidgetConfig({
  // Sidebar top (above Medusa's Customer card), just under the Order Processing panel.
  zone: "order.details.side.before",
})

export default TrackingWidget
