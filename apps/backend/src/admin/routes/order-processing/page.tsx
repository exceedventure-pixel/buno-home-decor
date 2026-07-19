import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PencilSquare, ShoppingBag } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  DropdownMenu,
  Heading,
  IconButton,
  Input,
  Label,
  Prompt,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { money } from "../../lib/kpi"
import {
  ISSUE_STATUS_META,
  ORDER_STATUS_META,
  ORDER_STATUS_ORDER,
  ORDER_TYPE_META,
  PAYMENT_STATUS_META,
  TRANSITION_EFFECT,
  opApi,
  type OrderStatusKey,
} from "../../lib/order-processing-api"

/**
 * The PRE-ORDERS queue — pre-order and custom orders that move through a production pipeline
 * (New → Confirmed → In Production → Ready → Booked → Dispatched → Delivered). Ready-stock orders
 * work like website orders and don't need this, but a filter can show them too.
 *
 * Every status here is the TRUTH, not a label someone remembered to update: anything from
 * Dispatched onwards is derived from Medusa itself, and payment status is derived from the money
 * that actually moved.
 */
type TypeFilter = "production" | "ready_stock" | "all"

/** The row + destination awaiting confirmation, so the Prompt can name both. */
type PendingMove = { orderId: string; displayId: number; to: OrderStatusKey }

/** The row whose courier fee is being set from the queue. */
type FeeEdit = { orderId: string; displayId: number }

const OrderProcessingPage = () => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("production")
  const [status, setStatus] = useState<OrderStatusKey | "all">("all")
  const [pending, setPending] = useState<PendingMove | null>(null)
  // Courier fee is revised after weighing on nearly every parcel, so it's editable straight from
  // the queue — opening each order to change one number was the whole complaint.
  const [feeEdit, setFeeEdit] = useState<FeeEdit | null>(null)
  const [feeDraft, setFeeDraft] = useState("")
  const navigate = useNavigate()
  const qc = useQueryClient()

  const saveFee = useMutation({
    mutationFn: (v: { orderId: string; fee: number }) =>
      opApi.update(v.orderId, { courier_fee: v.fee }),
    onSuccess: () => {
      toast.success("Courier fee saved — this order's cost and the Cash Book updated")
      setFeeEdit(null)
      qc.invalidateQueries({ queryKey: ["order-processing"] })
      qc.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openFeeEdit = (orderId: string, displayId: number, current: number) => {
    setFeeDraft(String(current ?? 0))
    setFeeEdit({ orderId, displayId })
  }

  /**
   * Moving an order from the queue runs the very same workflow the order page does — it ships
   * goods and moves cash. So it gets the same confirmation, spelling out what will happen.
   */
  const move = useMutation({
    mutationFn: (m: PendingMove) => opApi.update(m.orderId, { order_status: m.to }),
    onSuccess: () => {
      toast.success("Order updated — stock and cash follow automatically")
      setPending(null)
      qc.invalidateQueries({ queryKey: ["order-processing"] })
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  /**
   * Fetch every order ONCE (type=all), filter in the browser. Filtering is a view of data we
   * already have, not a new question, so switching a tab should cost nothing — the request used
   * to be re-fired on every click, which blanked the table and read as a glitch.
   */
  const { data, isLoading } = useQuery({
    queryKey: ["order-processing", "all"],
    queryFn: () => opApi.list({ type: "all" }),
    // Keep the queue live: pick up courier-driven status changes and edits from the order pages
    // without a manual refresh.
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  })

  const everything = useMemo(() => data?.orders ?? [], [data])
  const typeCounts = data?.type_counts ?? { ready_stock: 0, pre_order: 0, custom: 0 }
  const cur = "bdt"

  // First narrow by type (the "Pre-orders" default = pre_order + custom), then by status.
  const typeRows = useMemo(() => {
    if (typeFilter === "all") return everything
    if (typeFilter === "ready_stock") return everything.filter((r) => r.order_type === "ready_stock")
    return everything.filter((r) => r.order_type === "pre_order" || r.order_type === "custom")
  }, [everything, typeFilter])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of typeRows) m[r.order_status] = (m[r.order_status] ?? 0) + 1
    return m
  }, [typeRows])

  const rows = useMemo(
    () => (status === "all" ? typeRows : typeRows.filter((r) => r.order_status === status)),
    [typeRows, status]
  )

  // Totals follow whatever is on screen, so the money always matches the rows below it.
  const t = useMemo(() => {
    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0)
    return {
      revenue: sum((r) => r.product_revenue),
      delivery_margin: sum((r) => r.delivery_margin),
      cogs: sum((r) => r.cogs),
      outstanding: sum((r) => r.outstanding),
      net_profit: sum((r) => r.net_profit),
    }
  }, [rows])

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <Container className="flex flex-col gap-y-5 px-4 py-4 sm:px-6 sm:py-6">
        <div>
          <Heading level="h1">Pre-orders</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Pre-orders and custom orders, worked through the production pipeline. Moving an order
            here <b>does the real thing</b> — Dispatched ships and books the cost, Delivered
            collects the cash. Statuses are derived from what actually happened, so they can't
            drift from Medusa.
          </Text>
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="small"
            variant={typeFilter === "production" ? "primary" : "secondary"}
            onClick={() => setTypeFilter("production")}
          >
            Pre-order &amp; Custom ({typeCounts.pre_order + typeCounts.custom})
          </Button>
          <Button
            size="small"
            variant={typeFilter === "ready_stock" ? "primary" : "secondary"}
            onClick={() => setTypeFilter("ready_stock")}
          >
            Ready Stock ({typeCounts.ready_stock})
          </Button>
          <Button
            size="small"
            variant={typeFilter === "all" ? "primary" : "secondary"}
            onClick={() => setTypeFilter("all")}
          >
            All ({typeCounts.ready_stock + typeCounts.pre_order + typeCounts.custom})
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="small"
            variant={status === "all" ? "primary" : "secondary"}
            onClick={() => setStatus("all")}
          >
            All ({typeRows.length})
          </Button>
          {ORDER_STATUS_ORDER.map((s) => (
            <Button
              key={s}
              size="small"
              variant={status === s ? "primary" : "secondary"}
              onClick={() => setStatus(s)}
            >
              {ORDER_STATUS_META[s].label} {counts[s] ? `(${counts[s]})` : ""}
            </Button>
          ))}
        </div>

        {/* Money for whatever is in view */}
        {t && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Kpi label="Revenue" value={money(t.revenue, cur)} />
            <Kpi
              label="Delivery margin"
              value={money(t.delivery_margin, cur)}
              hint="charged − courier cost"
              accent={t.delivery_margin >= 0 ? "green" : "red"}
            />
            <Kpi label="COGS" value={money(t.cogs, cur)} accent="red" />
            <Kpi
              label="COD outstanding"
              value={money(t.outstanding, cur)}
              hint="still to collect"
              accent={t.outstanding > 0 ? "orange" : "base"}
            />
            <Kpi
              label="Net profit"
              value={money(t.net_profit, cur)}
              accent={t.net_profit >= 0 ? "green" : "red"}
            />
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-ui-border-base">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell className="hidden lg:table-cell">Type</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="hidden sm:table-cell">Payment</Table.HeaderCell>
                <Table.HeaderCell className="hidden md:table-cell">Issue</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Total</Table.HeaderCell>
                <Table.HeaderCell className="hidden md:table-cell text-right">Delivery</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Courier fee</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Net</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Move</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((r) => {
                const os = ORDER_STATUS_META[r.order_status]
                const ps = PAYMENT_STATUS_META[r.payment_status]
                const is = ISSUE_STATUS_META[r.issue_status]
                return (
                  <Table.Row
                    key={r.order_id}
                    className="cursor-pointer"
                    // Router navigation, not location.href — the dashboard is a SPA and a full
                    // page load here costs a re-boot of the whole admin.
                    onClick={() => navigate(`/orders/${r.order_id}`)}
                  >
                    <Table.Cell className="whitespace-nowrap font-medium">
                      #{r.display_id}
                    </Table.Cell>
                    <Table.Cell className="hidden lg:table-cell">
                      <Badge size="2xsmall" color={ORDER_TYPE_META[r.order_type].color}>
                        {ORDER_TYPE_META[r.order_type].label}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="max-w-[140px] truncate sm:max-w-[180px]">{r.customer}</Table.Cell>
                    <Table.Cell>
                      <Badge size="2xsmall" color={os.color}>
                        {os.label}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="hidden sm:table-cell">
                      <Badge size="2xsmall" color={ps.color}>
                        {ps.label}
                      </Badge>
                      {r.outstanding > 0 && (
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {money(r.outstanding, cur)} due
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell className="hidden md:table-cell">
                      {r.issue_status !== "none" && (
                        <Badge size="2xsmall" color={is.color}>
                          {is.label}
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-right">{money(r.total, cur)}</Table.Cell>
                    <Table.Cell
                      className={`hidden md:table-cell text-right ${
                        r.delivery_margin < 0 ? "text-ui-tag-red-text" : "text-ui-fg-subtle"
                      }`}
                    >
                      {money(r.delivery_margin, cur)}
                    </Table.Cell>
                    {/* Actual courier charge, set right here. Stop the click: the pencil edits the
                        fee, it doesn't open the order. */}
                    <Table.Cell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-x-1">
                        <span className={r.courier_cost > 0 ? "" : "text-ui-fg-muted"}>
                          {money(r.courier_cost, cur)}
                        </span>
                        <IconButton
                          size="small"
                          variant="transparent"
                          onClick={() => openFeeEdit(r.order_id, r.display_id, r.courier_cost)}
                        >
                          <PencilSquare />
                        </IconButton>
                      </div>
                    </Table.Cell>
                    <Table.Cell
                      className={`text-right font-medium ${
                        r.net_profit < 0 ? "text-ui-tag-red-text" : "text-ui-tag-green-text"
                      }`}
                    >
                      {money(r.net_profit, cur)}
                    </Table.Cell>
                    {/* Stop the click here: this cell acts on the row, it doesn't open it. */}
                    <Table.Cell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {r.allowed_next.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenu.Trigger asChild>
                            <Button size="small" variant="secondary">
                              Move…
                            </Button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content>
                            {r.allowed_next.map((s) => (
                              <DropdownMenu.Item
                                key={s}
                                onClick={() =>
                                  setPending({
                                    orderId: r.order_id,
                                    displayId: r.display_id,
                                    to: s,
                                  })
                                }
                              >
                                {ORDER_STATUS_META[s].label}
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.Content>
                        </DropdownMenu>
                      ) : (
                        <Text size="xsmall" className="text-ui-fg-muted">
                          —
                        </Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                )
              })}
              {!isLoading && rows.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={11}>
                    <Text size="small" className="py-6 text-ui-fg-muted">
                      Nothing in this queue.
                    </Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </div>

        <Text size="xsmall" className="text-ui-fg-muted">
          Move an order or set its courier fee straight from this queue — open it to flag an issue
          or see its full timeline.
        </Text>
      </Container>

      {/* Same confirmation as the order page — a move from here does exactly the same work. */}
      <Prompt open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>
              {pending
                ? `Move #${pending.displayId} to ${ORDER_STATUS_META[pending.to].label}?`
                : ""}
            </Prompt.Title>
            <Prompt.Description>
              {(pending && TRANSITION_EFFECT[pending.to]) ??
                "Records the stage. Nothing moves in stock or cash."}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={() => pending && move.mutate(pending)}>Confirm</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      {/* Set the actual courier charge without leaving the queue. A plain Save button (not
          Prompt.Action) so it doesn't auto-close before the save lands. */}
      <Prompt open={!!feeEdit} onOpenChange={(v) => !v && setFeeEdit(null)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Courier fee for #{feeEdit?.displayId ?? ""}</Prompt.Title>
            <Prompt.Description>
              What the courier actually charged us. They usually revise it after weighing, so this
              is the figure to correct — it updates this order's cost and the Cash Book.
            </Prompt.Description>
          </Prompt.Header>

          <div className="flex flex-col gap-y-2 px-6 pb-2">
            <Label size="small">Actual charge</Label>
            <Input
              type="number"
              min="0"
              step="1"
              autoFocus
              value={feeDraft}
              onChange={(e) => setFeeDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && feeEdit && !saveFee.isPending) {
                  saveFee.mutate({ orderId: feeEdit.orderId, fee: Number(feeDraft) || 0 })
                }
              }}
            />
          </div>

          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Button
              size="small"
              disabled={saveFee.isPending}
              onClick={() =>
                feeEdit && saveFee.mutate({ orderId: feeEdit.orderId, fee: Number(feeDraft) || 0 })
              }
            >
              {saveFee.isPending ? "Saving…" : "Save"}
            </Button>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: "green" | "red" | "orange" | "base"
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
    <div className="flex flex-col gap-y-1 rounded-lg border border-ui-border-base p-3">
      <Text size="xsmall" className="text-ui-fg-muted">
        {label}
      </Text>
      <Text className={`text-lg font-semibold ${color}`}>{value}</Text>
      {hint && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {hint}
        </Text>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Order Processing",
  icon: ShoppingBag,
  rank: 2,
})

export default OrderProcessingPage
