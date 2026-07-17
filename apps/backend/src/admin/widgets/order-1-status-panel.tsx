import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Prompt,
  Select,
  Text,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { ChevronDownMini, InformationCircleSolid, PencilSquare } from "@medusajs/icons"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { adminFetch } from "../lib/api"
import { money } from "../lib/kpi"
import {
  ISSUE_STATUS_META,
  NEXT_ACTION_LABEL,
  ORDER_STATUS_META,
  ORDER_TYPE_META,
  PAYMENT_STATUS_META,
  TRANSITION_EFFECT,
  isExceptionStatus,
  opApi,
  pipelineFor,
  type IssueStatusKey,
  type OrderStatusKey,
} from "../lib/order-processing-api"

// The active courier is read from the same endpoint the settings page uses.
type CourierRow = {
  courier_id: "steadfast" | "redx" | "pathao"
  is_active: boolean
  configured: boolean
  settings: Record<string, unknown> | null
}

const COURIER_NAMES: Record<string, string> = {
  steadfast: "Steadfast Courier",
  redx: "RedX",
  pathao: "Pathao",
}

// Ship statuses are driven by the Shipment-method chooser, not the generic Next-step buttons.
const SHIP_STATUSES: OrderStatusKey[] = ["courier_booked", "dispatched"]

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
// Once booked with a courier, these advance automatically (webhook + poll) — no manual button.
const COURIER_AUTO_STATUSES: OrderStatusKey[] = ["dispatched", "delivered"]

/**
 * One editable charge, guarded by a two-step reveal. The amount shows read-only with a pencil;
 * only after clicking Edit does the input appear — so a stray click can't change a charge that's
 * usually set for us (the courier fee especially). Owns its own draft; Save calls `onSave`.
 */
function ChargeRow({
  label,
  value,
  cur,
  help,
  onSave,
}: {
  label: string
  value: number
  cur: string
  help?: string
  onSave: (n: number) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? 0))
  const [saving, setSaving] = useState(false)

  const start = () => {
    setDraft(String(value ?? 0))
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(Number(draft) || 0)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center justify-between gap-2">
        <Text size="small" className="text-ui-fg-subtle">
          {label}
        </Text>
        {!editing && (
          <div className="flex items-center gap-x-2">
            <Text size="small" weight="plus">{money(value, cur)}</Text>
            <IconButton size="small" variant="transparent" onClick={start}>
              <PencilSquare />
            </IconButton>
          </div>
        )}
      </div>
      {editing && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min="0"
            step="1"
            className="w-28"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button size="small" onClick={save} isLoading={saving}>
            Save
          </Button>
          <Button size="small" variant="transparent" disabled={saving} onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      )}
      {help && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {help}
        </Text>
      )}
    </div>
  )
}

/**
 * The control panel. Changing a status here PERFORMS the action — it doesn't just label it —
 * so every move is confirmed with exactly what it will do to stock and cash.
 *
 * Payment status has no dropdown on purpose: it is derived from the money that actually moved.
 * Offering to "set" it would be offering to lie.
 */
const OrderStatusPanel = ({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) => {
  const orderId = (order as any).id
  const qc = useQueryClient()
  const cur = (order as any).currency_code ?? "bdt"

  const { data, isLoading } = useQuery({
    queryKey: ["order-processing", orderId],
    queryFn: () => opApi.get(orderId),
    // Live updates without a page reload: refetch when the tab regains focus and on a light
    // interval, so changes from Medusa's own buttons AND server-driven courier status (the
    // webhook auto-dispatching / delivering an order) appear here on their own.
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  })

  // Which courier (if any) is active — so the shipment chooser can name it and know if booking
  // is even possible. Cheap and cached; shared with the settings page under the same key.
  const { data: couriersData } = useQuery({
    queryKey: ["admin-couriers"],
    queryFn: () => adminFetch<{ couriers: CourierRow[] }>("/couriers"),
    staleTime: 60000,
  })
  const activeCourier =
    couriersData?.couriers?.find((c) => c.is_active && c.configured) ?? null

  const [pending, setPending] = useState<OrderStatusKey | null>(null)
  const [codInput, setCodInput] = useState("")
  // Reveal the normally-hidden manual dispatch/deliver buttons for a courier order, and the
  // collapsed charge editors — both closed by default so the panel stays compact.
  const [manualOverride, setManualOverride] = useState(false)
  const [chargesOpen, setChargesOpen] = useState(false)

  const o = data?.order

  // When booking a courier, default the COD to what's still owed (advance already deducted).
  useEffect(() => {
    if (pending === "courier_booked" && o) setCodInput(String(Math.max(0, o.outstanding ?? 0)))
  }, [pending, o?.outstanding]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * A status change moves real stock and cash, so Medusa's own panels on this page (summary,
   * payment, fulfilment) are stale the moment ours succeeds. They're React Query too, and the
   * dashboard keys everything under "orders" — so invalidating that prefix makes them refetch
   * in place. This used to call location.reload(), which threw away the whole page to do it.
   */
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["order-processing"] })
    qc.invalidateQueries({ queryKey: ["orders"] })
    // Courier fee / production cost / advance mirror into the Cash Book, so refresh accounting too.
    qc.invalidateQueries({ queryKey: ["accounting"] })
  }

  const move = useMutation({
    mutationFn: (vars: { to: OrderStatusKey; cod_amount?: number }) =>
      opApi.update(orderId, {
        order_status: vars.to,
        ...(vars.cod_amount != null ? { cod_amount: vars.cod_amount } : {}),
      }),
    onSuccess: (_r, vars) => {
      toast.success(
        vars.to === "courier_booked"
          ? "Booked with the courier — it dispatches automatically on pickup"
          : "Order updated — stock and cash follow automatically"
      )
      setPending(null)
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const setIssue = useMutation({
    mutationFn: (issue: IssueStatusKey) => opApi.update(orderId, { issue_status: issue }),
    onSuccess: (_r, issue) => {
      toast.success(
        issue === "damaged"
          ? "Marked damaged — the goods were written off at cost, not restocked"
          : "Issue updated"
      )
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // These take the value from the ChargeRow's own draft (mutateAsync(n)) rather than panel state.
  const saveFee = useMutation({
    mutationFn: (v: number) => opApi.update(orderId, { courier_fee: v }),
    onSuccess: () => {
      toast.success("Courier fee saved and booked to the Cash Book")
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveDelivery = useMutation({
    mutationFn: (v: number) => opApi.update(orderId, { delivery_charged: v }),
    onSuccess: () => {
      toast.success("Delivery charge updated — revenue recalculated")
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveProdCost = useMutation({
    mutationFn: (v: number) => opApi.update(orderId, { production_cost: v }),
    onSuccess: () => {
      toast.success("Production cost updated — this order's COGS recalculated")
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !o) return null

  const os = ORDER_STATUS_META[o.order_status]
  const ps = PAYMENT_STATUS_META[o.payment_status]
  const is = ISSUE_STATUS_META[o.issue_status]
  const ot = ORDER_TYPE_META[o.order_type]
  const isProduction = o.order_type !== "ready_stock"
  const next = data?.allowed_next ?? []

  const pipeline = pipelineFor(o.order_type)
  const exceptionNext = next.filter(isExceptionStatus)
  const offTheLine = isExceptionStatus(o.order_status)

  // The Shipment-method chooser owns the courier-vs-manual decision, shown once the order is ready
  // to ship and not already booked. When it's up, the generic Next-step buttons hide the ship
  // statuses so there's exactly one place to make that call.
  const shipChooser = !o.consignment_id && next.includes("courier_booked")

  // A courier order dispatches + delivers itself (webhook/poll), so those steps aren't manual
  // buttons — the courier drives them. They stay reachable only behind "Update manually".
  const isCourierOrder = !!o.consignment_id
  const bookedCourierName = COURIER_NAMES[o.courier_id ?? ""] ?? "the courier"
  const sortByPipeline = (a: OrderStatusKey, b: OrderStatusKey) =>
    pipeline.indexOf(a) - pipeline.indexOf(b)

  const forwardNext = next.filter((s) => !isExceptionStatus(s))
  const hidden: OrderStatusKey[] = [
    ...(shipChooser ? SHIP_STATUSES : []),
    ...(isCourierOrder ? COURIER_AUTO_STATUSES : []),
  ]
  const nextActions = forwardNext.filter((s) => !hidden.includes(s)).slice().sort(sortByPipeline)
  // Forward steps the courier normally drives — surfaced only when staff choose to override.
  const autoActions = isCourierOrder
    ? forwardNext.filter((s) => COURIER_AUTO_STATUSES.includes(s)).slice().sort(sortByPipeline)
    : []
  const showAutoNote =
    isCourierOrder && (o.order_status === "courier_booked" || o.order_status === "dispatched")

  const feeNum = o.courier_cost || 0
  const deliveryNum = o.delivery_charged || 0
  const margin = deliveryNum - feeNum

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-6">
      <div className="flex items-center gap-x-1.5">
        <Heading level="h2">Order Processing</Heading>
        <InfoHint text="Moving the status here does the real work — it isn't a label." />
      </div>

      {/* Current state */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge size="small" color={ot.color}>
          {ot.label}
        </Badge>
        <Badge size="small" color={os.color}>
          {os.label}
        </Badge>
        <Badge size="small" color={ps.color}>
          {ps.label}
        </Badge>
        {o.issue_status !== "none" && (
          <Badge size="small" color={is.color}>
            {is.label}
          </Badge>
        )}
      </div>

      {o.outstanding > 0 && (
        <div className="flex items-center gap-x-1.5">
          <Text size="xsmall" className="text-ui-fg-muted">
            {money(o.captured, cur)} collected · <b>{money(o.outstanding, cur)} still owed</b>
          </Text>
          {(o.payment_status === "cod" || o.payment_status === "advance_paid") && (
            <InfoHint text="Collected when you mark it Delivered." />
          )}
        </div>
      )}

      {/* Ship this order — the clear fork: courier OR manual. Only while the order is ready to ship
          and not already booked. Courier details (tracking, COD, status) live in the dedicated
          "Courier Delivery" widget once it's booked, not here. */}
      {shipChooser && (
        <div className="flex flex-col gap-y-2 border-t border-ui-border-base pt-4">
          <Label size="small">Ship this order</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Courier */}
            <div className="flex flex-col justify-between gap-y-2 rounded-lg border border-ui-border-base p-3">
              <div className="flex flex-col gap-y-1">
                <div className="flex items-center gap-x-2">
                  <Text size="small" weight="plus">🚚 Ship by courier</Text>
                  {activeCourier && (
                    <Badge size="2xsmall" color="green">Active</Badge>
                  )}
                </div>
                {activeCourier ? (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {COURIER_NAMES[activeCourier.courier_id] ?? "Courier"} · books the parcel and
                    dispatches automatically on pickup. COD defaults to what's still owed.
                  </Text>
                ) : (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    No courier is active.{" "}
                    <a href="/app/store-settings" className="text-ui-fg-interactive hover:underline">
                      Set one up in Store Settings → Couriers
                    </a>
                    .
                  </Text>
                )}
              </div>
              <Button
                size="small"
                disabled={!activeCourier}
                onClick={() => setPending("courier_booked")}
              >
                Send to courier
              </Button>
            </div>

            {/* Manual */}
            <div className="flex flex-col justify-between gap-y-2 rounded-lg border border-ui-border-base p-3">
              <div className="flex flex-col gap-y-1">
                <Text size="small" weight="plus">📦 Manual delivery</Text>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  You ship it yourself — no courier booked. Dispatches now: stock leaves and cost of
                  goods books.
                </Text>
              </div>
              <Button size="small" variant="secondary" onClick={() => setPending("dispatched")}>
                Ship manually
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Where it is on the line. The timeline is a read-only progress view; actions live in the
          "Next step" row below it, phrased as verbs. */}
      <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-4">
        <Label size="small">Progress</Label>

        {offTheLine && (
          <div className="rounded-lg bg-ui-bg-subtle p-2.5">
            <Text size="xsmall">
              <Badge size="2xsmall" color={os.color}>
                {os.label}
              </Badge>{" "}
              {o.order_status === "on_hold"
                ? "— paused. Use a step below to put it back on the line."
                : "— this order came off the line."}
            </Text>
          </div>
        )}

        <Timeline
          pipeline={pipeline}
          current={o.order_status}
          bookedLabel={isCourierOrder ? `Booked with ${bookedCourierName}` : undefined}
        />
      </div>

      {/* Next step — the forward action(s), labeled as what they DO. Ship statuses are handled by
          the chooser above; a courier order's dispatch/deliver are automatic, so those show as a
          note with a hidden manual override rather than buttons. */}
      {(nextActions.length > 0 || showAutoNote) && (
        <div className="flex flex-col gap-y-2">
          <Label size="small">Next step</Label>

          {showAutoNote && (
            <div className="flex flex-col gap-y-2 rounded-lg bg-ui-bg-subtle p-2.5">
              <div className="flex items-center gap-x-1.5">
                <Text size="xsmall" className="text-ui-fg-subtle">
                  Auto-updates from {bookedCourierName}
                </Text>
                <InfoHint text="It dispatches on pickup and completes on delivery. No action needed." />
              </div>
              {autoActions.length > 0 &&
                (manualOverride ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {autoActions.map((s) => (
                      <Button
                        key={s}
                        size="small"
                        variant="secondary"
                        onClick={() => setPending(s)}
                      >
                        {NEXT_ACTION_LABEL[s]}
                      </Button>
                    ))}
                    <Button
                      size="small"
                      variant="transparent"
                      onClick={() => setManualOverride(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="small"
                    variant="transparent"
                    className="self-start text-ui-fg-muted"
                    onClick={() => setManualOverride(true)}
                  >
                    Update manually
                  </Button>
                ))}
            </div>
          )}

          {nextActions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {nextActions.map((s, i) => (
                <Button
                  key={s}
                  size="small"
                  variant={i === 0 ? "primary" : "secondary"}
                  onClick={() => setPending(s)}
                >
                  {NEXT_ACTION_LABEL[s]}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* The exits. Not steps on the line, so they don't belong on the timeline. */}
      {exceptionNext.length > 0 && (
        <div className="flex flex-col gap-y-2">
          <Label size="small">Something went wrong?</Label>
          <div className="flex flex-wrap gap-1.5">
            {exceptionNext.map((s) => (
              <Button
                key={s}
                size="small"
                variant={s === "cancelled" || s === "refunded" ? "danger" : "secondary"}
                onClick={() => setPending(s)}
              >
                {ORDER_STATUS_META[s].label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Charges & costs — collapsed by default; these rarely change (the courier fee is even set
          for us), and each edit is a deliberate two-step (Edit → input → Save). */}
      <div className="flex flex-col border-t border-ui-border-base pt-4">
        <button
          type="button"
          onClick={() => setChargesOpen((v) => !v)}
          className="flex items-center justify-between gap-2 text-left"
        >
          <Label size="small" className="cursor-pointer">Charges &amp; costs</Label>
          <div className="flex items-center gap-x-2 text-ui-fg-subtle">
            {!chargesOpen && (
              <Text size="xsmall" className="text-ui-fg-muted">
                delivery {margin >= 0 ? "makes" : "loses"} {money(Math.abs(margin), cur)}
              </Text>
            )}
            <ChevronDownMini
              className={`transition-transform ${chargesOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {chargesOpen && (
          <div className="flex flex-col gap-y-4 pt-3">
            <ChargeRow
              label="Courier fee (what they charge us)"
              value={feeNum}
              cur={cur}
              onSave={(v) => saveFee.mutateAsync(v)}
              help="Set by the courier automatically — a standard charge first, adjusted after the parcel is weighed. Edit only to override."
            />
            <ChargeRow
              label="Delivery charged (what the customer pays us)"
              value={deliveryNum}
              cur={cur}
              onSave={(v) => saveDelivery.mutateAsync(v)}
              help={`Charged ${money(deliveryNum, cur)} · costs us ${money(feeNum, cur)} · delivery ${margin >= 0 ? "makes" : "loses"} ${money(Math.abs(margin), cur)}.`}
            />
            {isProduction && (
              <ChargeRow
                label="Production cost (this order's cost of goods)"
                value={o.production_cost || 0}
                cur={cur}
                onSave={(v) => saveProdCost.mutateAsync(v)}
                help="What it cost to make. Booked to the Cash Book and used as this order's COGS — the P&L recomputes."
              />
            )}
          </div>
        )}
      </div>

      {/* Issue */}
      <div className="flex flex-col gap-y-2 border-t border-ui-border-base pt-4">
        <div className="flex items-center gap-x-1.5">
          <Label size="small">Issue</Label>
          <InfoHint text="Damaged writes the goods off at cost — they are not put back on the shelf, because they no longer exist." />
        </div>
        <Select
          value={o.issue_status}
          onValueChange={(v) => setIssue.mutate(v as IssueStatusKey)}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {(Object.keys(ISSUE_STATUS_META) as IssueStatusKey[]).map((k) => (
              <Select.Item key={k} value={k}>
                {ISSUE_STATUS_META[k].label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      {/* This order's P&L — the headline number; the breakdown sits behind the ⓘ. */}
      <div className="flex items-center justify-between gap-x-2 rounded-lg bg-ui-bg-subtle p-3">
        <Text
          size="small"
          weight="plus"
          className={o.net_profit >= 0 ? "text-ui-tag-green-text" : "text-ui-tag-red-text"}
        >
          This order {o.net_profit >= 0 ? "made" : "lost"} {money(Math.abs(o.net_profit), cur)}
        </Text>
        <InfoHint
          text={`Revenue ${money(o.product_revenue, cur)} + delivery ${money(o.delivery_charged, cur)} − goods ${money(o.cogs, cur)} − courier ${money(o.courier_cost, cur)}${o.write_off > 0 ? ` − written off ${money(o.write_off, cur)}` : ""}`}
        />
      </div>

      {/* Confirm — always say what will actually happen */}
      <Prompt open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>
              {pending === "courier_booked"
                ? `Send to ${activeCourier ? COURIER_NAMES[activeCourier.courier_id] : "courier"}?`
                : `${pending ? NEXT_ACTION_LABEL[pending] : ""}?`}
            </Prompt.Title>
            <Prompt.Description>
              {pending === "courier_booked"
                ? `Books the parcel with ${activeCourier ? COURIER_NAMES[activeCourier.courier_id] : "your active courier"}. Stock does NOT move yet — the order dispatches automatically when the courier reports pickup.`
                : (pending && TRANSITION_EFFECT[pending]) ??
                  "Records the stage. Nothing moves in stock or cash."}
            </Prompt.Description>
          </Prompt.Header>

          {pending === "courier_booked" && (
            <div className="flex flex-col gap-y-2 px-6 pb-2">
              <Label size="small">Cash to collect on delivery (COD)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={codInput}
                onChange={(e) => setCodInput(e.target.value)}
              />
              <Text size="xsmall" className="text-ui-fg-muted">
                Defaults to what's still owed after any advance. Delivery charge is included in the
                order total.
              </Text>
            </div>
          )}

          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Prompt.Action
              onClick={() =>
                pending &&
                move.mutate({
                  to: pending,
                  cod_amount:
                    pending === "courier_booked" ? Math.max(0, Number(codInput) || 0) : undefined,
                })
              }
            >
              {pending === "courier_booked" ? "Book courier" : "Confirm"}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}

/**
 * The pipeline drawn as a line: what's done, where it is now, and what's still ahead — visible at a
 * glance instead of inferred from a lone badge.
 *
 * This is READ-ONLY on purpose. It used to carry a "Move here" button on every reachable step,
 * which read as navigation and buried the one action that mattered. Advancing the order is now the
 * job of the verb-labeled "Next step" buttons (and the Shipment chooser) beside it.
 */
function Timeline({
  pipeline,
  current,
  bookedLabel,
}: {
  pipeline: OrderStatusKey[]
  current: OrderStatusKey
  /** Overrides the "Courier Booked" step label, e.g. "Booked with Steadfast Courier". */
  bookedLabel?: string
}) {
  // -1 when the order is off the line (On Hold, Cancelled…): nothing reads as current, and every
  // step reads as "not yet" rather than falsely as "done".
  const currentIdx = pipeline.indexOf(current)

  return (
    <ol className="flex flex-col">
      {pipeline.map((s, i) => {
        const done = currentIdx >= 0 && i < currentIdx
        const isCurrent = i === currentIdx
        const isLast = i === pipeline.length - 1

        return (
          <li key={s} className="flex gap-x-3">
            <div className="flex flex-col items-center">
              <span
                className={
                  isCurrent
                    ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-ui-fg-base ring-2 ring-ui-fg-base ring-offset-2 ring-offset-ui-bg-base"
                    : done
                      ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-ui-fg-muted"
                      : "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-ui-border-strong bg-ui-bg-base"
                }
              />
              {!isLast && (
                <span
                  className={`w-px flex-1 ${done ? "bg-ui-fg-muted" : "bg-ui-border-base"}`}
                />
              )}
            </div>

            <div className={`flex min-h-[24px] flex-wrap items-center gap-2 ${isLast ? "" : "pb-3"}`}>
              <Text
                size="small"
                weight={isCurrent ? "plus" : "regular"}
                className={done || isCurrent ? "text-ui-fg-base" : "text-ui-fg-muted"}
              >
                {s === "courier_booked" && bookedLabel ? bookedLabel : ORDER_STATUS_META[s].label}
              </Text>
              {isCurrent && (
                <Badge size="2xsmall" color={ORDER_STATUS_META[s].color}>
                  Now
                </Badge>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderStatusPanel
