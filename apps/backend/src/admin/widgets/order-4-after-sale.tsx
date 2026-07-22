import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Prompt,
  Text,
  Textarea,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { InformationCircleSolid, Trash } from "@medusajs/icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { adminFetch } from "../lib/api"
import { money } from "../lib/kpi"
import { opApi } from "../lib/order-processing-api"

/**
 * AFTER THE SALE — return, refund and exchange, which are three different events.
 *
 *   Return   — the parcel came back. GOODS move, money does not: on a refused COD the customer
 *              never paid, so there is nothing to give back. The courier fee stays our loss.
 *   Refund   — money goes back, in full or in part. GOODS are untouched; use Return for those.
 *   Exchange — we sent the wrong thing. The wrong item comes back and the right one ships as its
 *              own linked order, so the cost of delivering twice is visible instead of blended.
 *
 * Deliberately NOT inside the Courier widget, where the return button used to live: that widget
 * renders only for a booked consignment, so a manually delivered order could never be returned.
 */

/** A small ⓘ that reveals explanatory text on hover — keeps the panel compact without losing it. */
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

/**
 * The replacement picker. Same catalogue search the Quick Order page uses — the right product is
 * usually a DIFFERENT variant from the wrong one (wrong colour, wrong size), so re-sending the
 * original line is not enough.
 */
function ExchangeDrawer({
  open,
  onOpenChange,
  orderId,
  currency,
  defaultDelivery,
  awaitingReceipt,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  orderId: string
  currency: string
  defaultDelivery: number
  /** The wrong item is already recorded as coming back, so don't offer to return it again. */
  awaitingReceipt: boolean
  onDone: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchVariant[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [delivery, setDelivery] = useState(String(defaultDelivery))
  const [receiveNow, setReceiveNow] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setDelivery(String(defaultDelivery))
  }, [open, defaultDelivery])

  useEffect(() => {
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
              title:
                v.title && v.title !== "Default variant" ? `${p.title} — ${v.title}` : p.title,
              unit_price: variantPrice(v.prices, currency),
            })
          }
        }
        setResults(flat)
      } catch {
        /* a failed search just shows nothing */
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, currency])

  const add = (v: SearchVariant) => {
    setLines((ls) => {
      const existing = ls.find((l) => l.variant_id === v.variant_id)
      if (existing) {
        return ls.map((l) =>
          l.variant_id === v.variant_id ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      return [...ls, { key: nextKey(), ...v, quantity: 1 }]
    })
    setQuery("")
    setResults([])
  }

  const update = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const remove = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key))

  const itemsTotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)

  const submit = async () => {
    if (!lines.length) {
      toast.error("Choose at least one item to send as the replacement.")
      return
    }
    setBusy(true)
    try {
      const r = await adminFetch<{
        success: boolean
        message?: string
        replacement_order_id?: string
        returned?: boolean
        return_reason?: string
      }>(`/orders/${orderId}/exchange`, {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({
            variant_id: l.variant_id,
            product_id: l.product_id,
            title: l.title,
            quantity: l.quantity,
            unit_price: l.unit_price,
          })),
          delivery_charged: Number(delivery) || 0,
          receive_now: receiveNow,
          note: note.trim() || null,
        }),
      })
      if (!r.success) {
        toast.error(r.message || "Could not create the replacement order")
        return
      }
      toast.success(
        r.returned
          ? "Replacement order created and the wrong item marked returned"
          : `Replacement order created. The return was not recorded: ${r.return_reason ?? "unknown"}`
      )
      setLines([])
      setNote("")
      onOpenChange(false)
      onDone()
    } catch (err: any) {
      toast.error(err.message || "Could not create the replacement order")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Send a replacement</Drawer.Title>
        </Drawer.Header>

        <Drawer.Body className="flex flex-col gap-y-5 overflow-y-auto">
          <Text size="small" className="text-ui-fg-subtle">
            The wrong item is marked returned on this order and the correct one ships as a new,
            linked order. The FIRST delivery is our loss — it stays a cost here. The replacement is
            a normal order, so its delivery is charged as usual.
          </Text>

          <div className="flex flex-col gap-y-2">
            <Label size="small">What should we send instead?</Label>
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
                    onClick={() => add(r)}
                  >
                    <Text size="small">{r.title}</Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      {money(r.unit_price, currency)}
                    </Text>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="flex flex-col gap-y-2">
              <Label size="small">Replacement items</Label>
              {lines.map((l) => (
                <div
                  key={l.key}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-ui-border-base p-3"
                >
                  <Text size="small" className="w-full">
                    {l.title}
                  </Text>
                  <div className="flex flex-col gap-y-1">
                    <Label size="xsmall" className="text-ui-fg-muted">
                      Qty
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      className="w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={String(l.quantity)}
                      onChange={(e) => update(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      // Wheel over a focused number input edits it — blur so the page scrolls.
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </div>
                  <div className="flex flex-col gap-y-1">
                    <Label size="xsmall" className="text-ui-fg-muted">
                      Price each
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={String(l.unit_price)}
                      onChange={(e) => update(l.key, { unit_price: Math.max(0, Number(e.target.value) || 0) })}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </div>
                  <Button
                    size="small"
                    variant="transparent"
                    className="text-ui-fg-muted"
                    onClick={() => remove(l.key)}
                  >
                    <Trash />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-y-1">
            <div className="flex items-center gap-x-1.5">
              <Label size="small">Delivery charged on the replacement</Label>
              <InfoHint text="What the customer pays for the second parcel. Only the FIRST delivery is absorbed as our loss — it stays on this order." />
            </div>
            <Input
              type="number"
              min="0"
              step="1"
              className="w-32 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
          </div>

          {!awaitingReceipt && (
            <label className="flex items-start gap-x-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={receiveNow}
                onChange={(e) => setReceiveNow(e.target.checked)}
              />
              <span>
                <Text size="small">The wrong item is already back with us</Text>
                <Text size="xsmall" className="text-ui-fg-muted">
                  Restocks it now. Leave unticked while it's still on its way — you can mark it
                  received later.
                </Text>
              </span>
            </label>
          )}

          <div className="flex flex-col gap-y-1">
            <Label size="small">Note (optional)</Label>
            <Textarea
              rows={2}
              placeholder="Why the exchange — e.g. wrong colour sent"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {lines.length > 0 && (
            <Text size="small" className="text-ui-fg-subtle">
              Replacement order total: <b>{money(itemsTotal + (Number(delivery) || 0), currency)}</b>
            </Text>
          )}
        </Drawer.Body>

        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button size="small" variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </Drawer.Close>
          <Button size="small" onClick={submit} isLoading={busy} disabled={busy || !lines.length}>
            Create replacement order
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

function AfterSaleWidget({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) {
  const orderId = (order as any).id
  const cur = (order as any).currency_code ?? "bdt"
  const qc = useQueryClient()

  const [busy, setBusy] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [exchangeOpen, setExchangeOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState("")

  const { data } = useQuery({
    queryKey: ["order-processing", orderId],
    queryFn: () => opApi.get(orderId),
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  })

  const o = data?.order

  // Money still in our hands. Defaults the refund box, and is the ceiling the server enforces.
  const heldCash = Math.max(0, (o?.captured ?? 0) - (o?.refunded ?? 0))
  useEffect(() => {
    if (refundOpen) setRefundAmount(String(heldCash))
  }, [refundOpen, heldCash])

  if (!o) return null

  /**
   * Two stages, two different facts: units the customer has sent back vs units physically on our
   * shelf. Between them the parcel is in a van and must not be sellable, so the return is only
   * half-done — which is exactly what the middle state below says.
   */
  const comingBack = Number(o.units_coming_back ?? 0)
  const backOnShelf = Number(o.units_returned ?? 0)
  const awaitingReceipt = comingBack > 0 && backOnShelf < comingBack
  const fullyBack = comingBack > 0 && backOnShelf >= comingBack
  const shipped = Number(o.units_shipped ?? 0) > 0

  // Nothing has shipped, no money has moved and there's no link to show — there is nothing to say.
  const hasLink = !!(o.replaces_order_id || o.replaced_by_order_id)
  if (!shipped && heldCash <= 0 && comingBack <= 0 && !hasLink) return null

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["order-processing"] })
    qc.invalidateQueries({ queryKey: ["orders"] })
    qc.invalidateQueries({ queryKey: ["accounting"] })
  }

  /**
   * Record the parcel coming back. `receiveNow` also puts it on the shelf in one go, for a parcel
   * already in hand — otherwise the goods stay out until Received, because until then they are out.
   */
  const doReturn = async (receiveNow: boolean) => {
    setBusy(true)
    try {
      const r = await adminFetch<{ created: boolean; items?: number; message?: string }>(
        `/orders/${orderId}/mark-returned`,
        { method: "POST", body: JSON.stringify({ receive_now: receiveNow }) }
      )
      if (r.created) {
        toast.success(
          receiveNow
            ? `Returned and received — ${r.items} item type(s) back in stock`
            : "Marked returned — the stock comes back when you mark it received"
        )
        refresh()
      } else {
        toast.info(r.message || "Nothing to return")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record the return")
    } finally {
      setBusy(false)
      setReturnOpen(false)
    }
  }

  /** The goods are physically back — this is the step that actually restocks them. */
  const doReceive = async () => {
    setBusy(true)
    try {
      const r = await adminFetch<{ created: boolean; items?: number; message?: string }>(
        `/orders/${orderId}/receive-return`,
        { method: "POST" }
      )
      if (r.created) {
        toast.success(`Received — ${r.items} item type(s) back in stock`)
        refresh()
      } else {
        toast.info(r.message || "Nothing to receive")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to receive the goods")
    } finally {
      setBusy(false)
    }
  }

  const doRefund = async () => {
    const amount = Math.max(0, Number(refundAmount) || 0)
    if (amount <= 0) {
      toast.error("Enter an amount to refund.")
      return
    }
    setBusy(true)
    try {
      const r = await adminFetch<{
        success: boolean
        message?: string
        refunded?: number
        remaining?: number
      }>(`/orders/${orderId}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      })
      if (!r.success) {
        toast.error(r.message || "Refund refused")
        return
      }
      toast.success(
        (r.remaining ?? 0) > 0
          ? `Refunded ${money(r.refunded ?? 0, cur)} — ${money(r.remaining ?? 0, cur)} still held`
          : `Refunded ${money(r.refunded ?? 0, cur)} in full`
      )
      setRefundOpen(false)
      refresh()
    } catch (err: any) {
      toast.error(err.message || "Refund failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-6">
      <div className="flex items-center gap-x-1.5">
        <Heading level="h2">After the Sale</Heading>
        <InfoHint text="Return moves GOODS. Refund moves MONEY. They are recorded separately because either can happen without the other — a refused COD parcel comes back with no money to give." />
      </div>

      {/* Exchange links, both directions, so neither order is an orphan. */}
      {hasLink && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ui-bg-subtle p-2.5">
          {o.replaces_order_id && (
            <a
              href={`/app/orders/${o.replaces_order_id}`}
              className="text-ui-fg-interactive text-sm hover:underline"
            >
              Replaces order #{o.replaces_display_id ?? "—"} ↗
            </a>
          )}
          {o.replaced_by_order_id && (
            <a
              href={`/app/orders/${o.replaced_by_order_id}`}
              className="text-ui-fg-interactive text-sm hover:underline"
            >
              Replaced by order #{o.replaced_by_display_id ?? "—"} ↗
            </a>
          )}
        </div>
      )}

      {/* ── Goods ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center gap-x-2">
          <Label size="small">The goods</Label>
          {awaitingReceipt && (
            <Badge size="2xsmall" color="orange">
              {comingBack - backOnShelf} on the way back
            </Badge>
          )}
          {fullyBack && (
            <Badge size="2xsmall" color="green">
              {backOnShelf} back in stock
            </Badge>
          )}
        </div>

        <Text size="xsmall" className="text-ui-fg-muted">
          {awaitingReceipt
            ? "The parcel has turned around. Revenue is already reversed; the stock comes back when it physically arrives."
            : fullyBack
              ? "Returned and received — back on the shelf and their cost of goods reversed. The courier fee stays a real cost."
              : "If the parcel came back, record it here. This does NOT move money — a refused COD was never paid for."}
        </Text>

        <div className="flex flex-wrap gap-1.5">
          {awaitingReceipt ? (
            <Tooltip content="The parcel is physically in your hands. Puts the units back on the shelf and reverses their cost of goods.">
              <Button size="small" disabled={busy} isLoading={busy} onClick={doReceive}>
                Mark received (restock)
              </Button>
            </Tooltip>
          ) : (
            !fullyBack &&
            shipped && (
              <>
                <Tooltip content="The parcel has turned around but isn't with you yet. Revenue reverses now; the stock stays out until you mark it received.">
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setReturnOpen(true)}
                  >
                    Mark returned
                  </Button>
                </Tooltip>
                <Tooltip content="The parcel is already back with you — records the return and restocks in one step.">
                  <Button
                    size="small"
                    disabled={busy}
                    isLoading={busy}
                    onClick={() => doReturn(true)}
                  >
                    Returned &amp; received
                  </Button>
                </Tooltip>
              </>
            )
          )}

          {shipped && (
            <Tooltip content="We sent the wrong product. Takes it back and ships the right one as a new, linked order — the first delivery stays our loss.">
              <Button size="small" variant="secondary" onClick={() => setExchangeOpen(true)}>
                Send a replacement
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ── Money ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-y-2 border-t border-ui-border-base pt-4">
        <div className="flex items-center gap-x-2">
          <Label size="small">The money</Label>
          {(o.refunded ?? 0) > 0 && (
            <Badge size="2xsmall" color="orange">
              {money(o.refunded, cur)} refunded
            </Badge>
          )}
        </div>

        <Text size="xsmall" className="text-ui-fg-muted">
          {heldCash > 0
            ? `${money(heldCash, cur)} of the customer's money is still with us. Refund some or all of it if you gave cash back.`
            : (o.captured ?? 0) > 0
              ? "Everything the customer paid has been refunded."
              : "The customer never paid, so there is nothing to refund."}
        </Text>

        {heldCash > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Tooltip content="Gives money back to the customer. Stock is untouched — record a return separately if the goods came back too.">
              <Button
                size="small"
                variant="danger"
                disabled={busy}
                onClick={() => setRefundOpen(true)}
              >
                Refund…
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Mark returned confirm — the goods-only, not-yet-received case. */}
      <Prompt open={returnOpen} onOpenChange={(v) => !v && setReturnOpen(false)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Mark this order as returned?</Prompt.Title>
            <Prompt.Description>
              Records that every shipped item is coming back. Revenue reverses now — the customer
              isn't paying for it — but the stock stays out until you mark it received, because
              until then it's still in a courier's van. No money is refunded; the courier fee stays
              a real cost.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel disabled={busy}>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={() => doReturn(false)}>Mark returned</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      {/* Refund — an amount, not a yes/no, because a goodwill partial is the common case. */}
      <Prompt open={refundOpen} onOpenChange={(v) => !v && setRefundOpen(false)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Refund the customer</Prompt.Title>
            <Prompt.Description>
              Money goes back to the customer. Stock is not touched — if the goods came back too,
              record a return as well. You can refund up to {money(heldCash, cur)}.
            </Prompt.Description>
          </Prompt.Header>

          <div className="flex flex-col gap-y-2 px-6 pb-2">
            <Label size="small">Amount to refund</Label>
            <Input
              type="number"
              min="0"
              step="1"
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
            <Text size="xsmall" className="text-ui-fg-muted">
              Defaults to everything still held. A partial refund leaves the order's status alone
              and shows as "Partially refunded" on payment.
            </Text>
          </div>

          <Prompt.Footer>
            <Prompt.Cancel disabled={busy}>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={doRefund}>Refund</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      <ExchangeDrawer
        open={exchangeOpen}
        onOpenChange={setExchangeOpen}
        orderId={orderId}
        currency={cur}
        defaultDelivery={o.delivery_charged ?? 0}
        awaitingReceipt={awaitingReceipt}
        onDone={refresh}
      />
    </Container>
  )
}

export const config = defineWidgetConfig({
  // Sidebar, under Order Processing / Print / Courier Delivery — this is what happens afterwards.
  zone: "order.details.side.before",
})

export default AfterSaleWidget
