import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { InformationCircleSolid, Trash } from "@medusajs/icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import { adminFetch } from "../lib/api"
import { money } from "../lib/kpi"
import {
  FAULT_META,
  RESOLUTION_META,
  opApi,
  type FaultKey,
  type ResolutionKey,
} from "../lib/order-processing-api"

/**
 * AFTER THE SALE — one "Resolve an issue" flow.
 *
 * Every outcome (return, refund, exchange, RTO, damaged, missed-pickup rebook, wrong slip) is a
 * RESOLUTION that performs the real action AND records what happened with correct P&L. This is the
 * single control surface: the old decorative "issue" dropdown is gone, and choosing a resolution
 * here is what sets the order's issue status.
 */

function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <span className="inline-flex text-ui-fg-muted">
        <InformationCircleSolid />
      </span>
    </Tooltip>
  )
}

type SearchVariant = {
  variant_id: string
  product_id: string
  title: string
  unit_price: number
}
type Line = SearchVariant & { key: string; quantity: number }

let seq = 0
const nextKey = () => `l${++seq}`

function variantPrice(prices: any[] | undefined, cur: string): number {
  const p = (prices ?? []).find((x) => (x.currency_code ?? "").toLowerCase() === cur.toLowerCase())
  return Number(p?.amount ?? 0) || 0
}

/** Resolutions that carry a whose-fault choice (drives free reship + customer-paid offset). */
const FAULT_RESOLUTIONS: ResolutionKey[] = ["return_only", "return_refund", "exchange"]
/**
 * Resolutions where the goods come back, so "already in hand?" applies.
 *
 * rto_refused belongs here too: a refused parcel is still travelling back from the customer's door,
 * so it needs the same received / not-yet-received choice as any other return. The backend has
 * always honoured receive_now for it (it shares return_only's path in resolve.ts) — only the
 * checkbox was missing, which pinned every refusal to "still on the way".
 */
const RECEIVE_RESOLUTIONS: ResolutionKey[] = [
  "return_only",
  "return_refund",
  "exchange",
  "rto_refused",
]

function AfterSaleWidget({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) {
  const orderId = (order as any).id
  const cur = (order as any).currency_code ?? "bdt"
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ["order-processing", orderId],
    queryFn: () => opApi.get(orderId),
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  })
  const o = data?.order

  // ── Resolve-form state ─────────────────────────────────────────────────────
  const [resolution, setResolution] = useState<ResolutionKey | "">("")
  const [fault, setFault] = useState<FaultKey>("customer")
  const [note, setNote] = useState("")
  const [receiveNow, setReceiveNow] = useState(false)
  const [customerPaid, setCustomerPaid] = useState("")
  const [refundAmount, setRefundAmount] = useState("")
  const [replacementDelivery, setReplacementDelivery] = useState("")
  const [busy, setBusy] = useState(false)
  /** Ticked on the receive step when the parcel turns up broken — restock, then write off. */
  const [receivedDamaged, setReceivedDamaged] = useState(false)

  // Exchange item picker
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchVariant[]>([])
  const [lines, setLines] = useState<Line[]>([])

  const heldCash = Math.max(0, (o?.captured ?? 0) - (o?.refunded ?? 0))

  // Default the refund box + replacement delivery when the resolution changes.
  useEffect(() => {
    if (resolution === "return_refund") setRefundAmount(String(heldCash))
    if (resolution === "exchange") {
      setReplacementDelivery(fault === "our_fault" ? "0" : String(o?.delivery_charged ?? 0))
    }
  }, [resolution, fault, heldCash, o?.delivery_charged])

  // Product search for the exchange replacement.
  useEffect(() => {
    if (resolution !== "exchange") return
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const { products } = await adminFetch<{ products: any[] }>(
          `/products?q=${encodeURIComponent(q)}&limit=8&fields=id,title,variants.id,variants.title,variants.sku,variants.prices.amount,variants.prices.currency_code`
        )
        const flat: SearchVariant[] = []
        for (const p of products) {
          for (const v of p.variants ?? []) {
            flat.push({
              variant_id: v.id,
              product_id: p.id,
              title: v.title && v.title !== "Default variant" ? `${p.title} — ${v.title}` : p.title,
              unit_price: variantPrice(v.prices, cur),
            })
          }
        }
        setResults(flat)
      } catch {
        /* a failed search just shows nothing */
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, resolution, cur])

  const addLine = (v: SearchVariant) => {
    setLines((ls) => {
      const existing = ls.find((l) => l.variant_id === v.variant_id)
      if (existing) {
        return ls.map((l) => (l.variant_id === v.variant_id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...ls, { key: nextKey(), ...v, quantity: 1 }]
    })
    setQuery("")
    setResults([])
  }
  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key))

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["order-processing"] })
    qc.invalidateQueries({ queryKey: ["orders"] })
    qc.invalidateQueries({ queryKey: ["accounting"] })
  }

  const comingBack = Number(o?.units_coming_back ?? 0)
  const backOnShelf = Number(o?.units_returned ?? 0)
  const awaitingReceipt = comingBack > 0 && backOnShelf < comingBack
  const fullyBack = comingBack > 0 && backOnShelf >= comingBack
  const shipped = Number(o?.units_shipped ?? 0) > 0
  const booked = !!(o as any)?.consignment_id
  const hasLink = !!(o?.replaces_order_id || o?.replaced_by_order_id)
  const canReturn = shipped && comingBack === 0

  // Which resolutions make sense for this order right now.
  const available = useMemo<ResolutionKey[]>(() => {
    const out: ResolutionKey[] = []
    if (booked && !fullyBack) out.push("rebook_courier")
    if (canReturn) {
      // damaged_on_return is deliberately absent: condition is judged when the parcel physically
      // lands, so damage is a tick on the receive step instead of a resolution chosen up front.
      out.push("return_only", "rto_refused", "exchange")
      if (heldCash > 0) out.push("return_refund")
    }
    if (shipped) out.push("damaged_in_transit", "wrong_slip_correction")
    return out
  }, [booked, fullyBack, canReturn, heldCash, shipped])

  if (!o) return null
  // Nothing shipped, no money moved, nothing coming back, no link — nothing to say.
  if (!shipped && heldCash <= 0 && comingBack <= 0 && !hasLink) return null

  const showFault = resolution !== "" && FAULT_RESOLUTIONS.includes(resolution as ResolutionKey)
  const showReceive = resolution !== "" && RECEIVE_RESOLUTIONS.includes(resolution as ResolutionKey)
  /**
   * What the customer put toward getting the goods back to us. Always offered on a plain return —
   * on a full-COD order that contribution is the only thing that softens the courier fee, so hiding
   * it behind the fault choice made the common case unreachable. Never offered on a refusal: the
   * customer never took the parcel, so we bear the whole fee.
   */
  const showCustomerPaid =
    resolution === "return_only" || (showFault && fault === "customer" && resolution !== "rto_refused")
  const showRefund = resolution === "return_refund"
  const showExchange = resolution === "exchange"

  const reset = () => {
    setResolution("")
    setNote("")
    setReceiveNow(false)
    setCustomerPaid("")
    setRefundAmount("")
    setReplacementDelivery("")
    setLines([])
    setQuery("")
    setResults([])
  }

  const doReceive = async () => {
    setBusy(true)
    try {
      const r = await adminFetch<{
        created: boolean
        items?: number
        message?: string
        written_off?: number
      }>(`/orders/${orderId}/receive-return`, {
        method: "POST",
        body: JSON.stringify({ damaged: receivedDamaged }),
      })
      if (r.created) {
        toast.success(
          r.written_off
            ? `Received — ${r.items} item type(s) back, ${r.written_off} unit(s) written off as damaged`
            : `Received — ${r.items} item type(s) back in stock`
        )
        setReceivedDamaged(false)
      } else {
        toast.info(r.message || "Nothing to receive")
      }
      // Refetch either way. "Already received" means our cached counts are the stale ones — without
      // this the widget keeps showing "on the way back" and offering a button that can't do anything.
      refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to receive the goods")
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!resolution) return
    if (resolution === "exchange" && !lines.length) {
      toast.error("Choose at least one item to send as the replacement.")
      return
    }
    if (resolution === "wrong_slip_correction" && !note.trim()) {
      toast.error("Add a note describing the slip correction.")
      return
    }
    setBusy(true)
    try {
      const body: Record<string, unknown> = { resolution, note: note.trim() || null }
      if (showFault) body.fault = fault
      if (showReceive) body.receive_now = receiveNow
      if (showCustomerPaid) body.customer_return_paid = Math.max(0, Number(customerPaid) || 0)
      if (showRefund) body.refund_amount = Math.max(0, Number(refundAmount) || 0)
      if (showExchange) {
        body.items = lines.map((l) => ({
          variant_id: l.variant_id,
          product_id: l.product_id,
          title: l.title,
          quantity: l.quantity,
          unit_price: l.unit_price,
        }))
        body.replacement_delivery_charged = Math.max(0, Number(replacementDelivery) || 0)
      }

      const r = await adminFetch<{ success: boolean; message?: string }>(
        `/orders/${orderId}/resolve`,
        { method: "POST", body: JSON.stringify(body) }
      )
      if (!r.success) {
        toast.error(r.message || "Could not resolve the issue")
        return
      }
      toast.success(`Resolved: ${RESOLUTION_META[resolution as ResolutionKey].label}`)
      reset()
      refresh()
    } catch (err: any) {
      toast.error(err.message || "Could not resolve the issue")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-6">
      <div className="flex items-center gap-x-1.5">
        <Heading level="h2">After the Sale</Heading>
        <InfoHint text="Pick what happened. Each resolution does the real thing — restock, refund, exchange, write-off, rebook — and records it with the correct profit impact." />
      </div>

      {/* Exchange links, both directions. */}
      {hasLink && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ui-bg-subtle p-2.5">
          {o.replaces_order_id && (
            <a href={`/app/orders/${o.replaces_order_id}`} className="text-ui-fg-interactive text-sm hover:underline">
              Replaces order #{o.replaces_display_id ?? "—"} ↗
            </a>
          )}
          {o.replaced_by_order_id && (
            <a href={`/app/orders/${o.replaced_by_order_id}`} className="text-ui-fg-interactive text-sm hover:underline">
              Replaced by order #{o.replaced_by_display_id ?? "—"} ↗
            </a>
          )}
        </div>
      )}

      {/* Current after-sales state. */}
      <div className="flex flex-wrap items-center gap-2">
        {awaitingReceipt && (
          <Badge size="2xsmall" color="orange">{comingBack - backOnShelf} on the way back</Badge>
        )}
        {fullyBack && <Badge size="2xsmall" color="green">{backOnShelf} back in stock</Badge>}
        {(o.refunded ?? 0) > 0 && (
          <Badge size="2xsmall" color="orange">{money(o.refunded, cur)} refunded</Badge>
        )}
        {(o.customer_return_paid ?? 0) > 0 && (
          <Badge size="2xsmall" color="green">{money(o.customer_return_paid, cur)} paid by customer</Badge>
        )}
      </div>

      {/* Goods physically in transit back → the receive follow-up. */}
      {awaitingReceipt && (
        <div className="flex flex-col gap-y-1.5">
          <Text size="xsmall" className="text-ui-fg-muted">
            The parcel has turned around. Revenue is already reversed; restock it when it physically arrives.
          </Text>
          <label className="flex items-start gap-x-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={receivedDamaged}
              onChange={(e) => setReceivedDamaged(e.target.checked)}
            />
            <span>
              <Text size="small">It came back damaged</Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                Still restocks — then writes the units off as damage, so the loss shows as shrinkage
                instead of a phantom sale. Tick this only if it arrived broken.
              </Text>
            </span>
          </label>
          <div>
            <Button size="small" disabled={busy} isLoading={busy} onClick={doReceive}>
              {receivedDamaged ? "Mark received (restock & write off)" : "Mark received (restock)"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Resolve an issue ──────────────────────────────────────────────────── */}
      {available.length > 0 && (
        <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-4">
          <Label size="small">Resolve an issue</Label>

          <Select value={resolution} onValueChange={(v) => setResolution(v as ResolutionKey)}>
            <Select.Trigger>
              <Select.Value placeholder="What happened?" />
            </Select.Trigger>
            <Select.Content>
              {available.map((r) => (
                <Select.Item key={r} value={r}>
                  {RESOLUTION_META[r].label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          {resolution && (
            <>
              <Text size="xsmall" className="text-ui-fg-muted">
                {RESOLUTION_META[resolution as ResolutionKey].help}
              </Text>

              {showFault && (
                <div className="flex flex-col gap-y-1">
                  <Label size="xsmall" className="text-ui-fg-muted">Whose fault?</Label>
                  <Select value={fault} onValueChange={(v) => setFault(v as FaultKey)}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {(Object.keys(FAULT_META) as FaultKey[]).map((f) => (
                        <Select.Item key={f} value={f}>{FAULT_META[f].label}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              )}

              {/* Exchange item picker */}
              {showExchange && (
                <div className="flex flex-col gap-y-2">
                  <Label size="xsmall" className="text-ui-fg-muted">What to send instead</Label>
                  <Input
                    placeholder="Search products by name or SKU…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {results.length > 0 && (
                    <div className="flex flex-col divide-y divide-ui-border-base rounded-lg border border-ui-border-base">
                      {results.map((r) => (
                        <button
                          key={r.variant_id}
                          type="button"
                          className="flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-ui-bg-base-hover"
                          onClick={() => addLine(r)}
                        >
                          <Text size="small">{r.title}</Text>
                          <Text size="small" className="text-ui-fg-subtle">{money(r.unit_price, cur)}</Text>
                        </button>
                      ))}
                    </div>
                  )}
                  {lines.map((l) => (
                    <div key={l.key} className="flex flex-wrap items-end gap-2 rounded-lg border border-ui-border-base p-3">
                      <Text size="small" className="w-full">{l.title}</Text>
                      <div className="flex flex-col gap-y-1">
                        <Label size="xsmall" className="text-ui-fg-muted">Qty</Label>
                        <Input
                          type="number" min="1" step="1"
                          className="w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          value={String(l.quantity)}
                          onChange={(e) => updateLine(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        />
                      </div>
                      <div className="flex flex-col gap-y-1">
                        <Label size="xsmall" className="text-ui-fg-muted">Price each</Label>
                        <Input
                          type="number" min="0" step="1"
                          className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          value={String(l.unit_price)}
                          onChange={(e) => updateLine(l.key, { unit_price: Math.max(0, Number(e.target.value) || 0) })}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        />
                      </div>
                      <Button size="small" variant="transparent" className="text-ui-fg-muted" onClick={() => removeLine(l.key)}>
                        <Trash />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-col gap-y-1">
                    <div className="flex items-center gap-x-1.5">
                      <Label size="xsmall" className="text-ui-fg-muted">Delivery charged on the replacement</Label>
                      <InfoHint text="0 when it's our mistake (free reship). The first delivery stays our loss on this order." />
                    </div>
                    <Input
                      type="number" min="0" step="1"
                      className="w-32 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={replacementDelivery}
                      onChange={(e) => setReplacementDelivery(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </div>
                </div>
              )}

              {showRefund && (
                <div className="flex flex-col gap-y-1">
                  <Label size="xsmall" className="text-ui-fg-muted">Advance to refund (up to {money(heldCash, cur)})</Label>
                  <Input
                    type="number" min="0" step="1"
                    className="w-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>
              )}

              {showCustomerPaid && (
                <div className="flex flex-col gap-y-1">
                  <div className="flex items-center gap-x-1.5">
                    <Label size="xsmall" className="text-ui-fg-muted">Amount the customer paid toward the return</Label>
                    <InfoHint text="Offsets the delivery loss — net loss = courier fee − what the customer paid." />
                  </div>
                  <Input
                    type="number" min="0" step="1"
                    className="w-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={customerPaid}
                    onChange={(e) => setCustomerPaid(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>
              )}

              {showReceive && (
                <label className="flex items-start gap-x-2">
                  <input type="checkbox" className="mt-1" checked={receiveNow} onChange={(e) => setReceiveNow(e.target.checked)} />
                  <span>
                    <Text size="small">The goods are already back with us</Text>
                    <Text size="xsmall" className="text-ui-fg-muted">
                      Restocks now. Leave unticked while it's still on the way — mark it received later.
                    </Text>
                  </span>
                </label>
              )}

              <div className="flex flex-col gap-y-1">
                <Label size="xsmall" className="text-ui-fg-muted">
                  Note {resolution === "wrong_slip_correction" ? "(required)" : "(optional)"}
                </Label>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened…" />
              </div>

              <div className="flex gap-2">
                <Button size="small" onClick={submit} isLoading={busy} disabled={busy}>
                  Resolve
                </Button>
                <Button size="small" variant="secondary" onClick={reset} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default AfterSaleWidget
