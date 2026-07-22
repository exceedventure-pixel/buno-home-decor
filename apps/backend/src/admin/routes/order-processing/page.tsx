import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PencilSquare, ShoppingBag } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  DropdownMenu,
  Heading,
  IconButton,
  Prompt,
  Select,
  Table,
  Text,
  Textarea,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { MoneyInput } from "../../components/money-input"
import { OrphanWarning } from "../../components/orphan-warning"
import { printOrder, type PrintMode } from "../../lib/print"
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

/** The row whose standing note is being edited. */
type NoteEdit = { orderId: string; displayId: number }

/**
 * The steps offered as BULK actions, in pipeline order.
 *
 * Deliberately forward-only: cancelling, returning or refunding in bulk is a different kind of
 * decision (it moves money back and restocks goods), and a mis-click there is not recoverable by
 * doing it again. Those stay per-order.
 */
const BULK_STEPS: OrderStatusKey[] = [
  "confirmed",
  "in_production",
  "ready_to_dispatch",
  "courier_booked",
  "dispatched",
  "delivered",
]

const BULK_LABEL: Partial<Record<OrderStatusKey, string>> = {
  confirmed: "Confirm all",
  in_production: "Start production for all",
  ready_to_dispatch: "Mark all ready",
  courier_booked: "Book all with courier",
  dispatched: "Mark all dispatched",
  delivered: "Mark all delivered",
}

const OrderProcessingPage = () => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("production")
  const [status, setStatus] = useState<OrderStatusKey | "all">("all")
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTo, setBulkTo] = useState<OrderStatusKey | null>(null)
  const [noteEdit, setNoteEdit] = useState<NoteEdit | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [printing, setPrinting] = useState<string | null>(null)
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

  const saveNote = useMutation({
    mutationFn: (v: { orderId: string; note: string }) =>
      opApi.update(v.orderId, { order_note: v.note }),
    onSuccess: () => {
      toast.success("Note saved")
      setNoteEdit(null)
      qc.invalidateQueries({ queryKey: ["order-processing"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const print = async (orderId: string, mode: PrintMode) => {
    setPrinting(orderId)
    try {
      await printOrder(orderId, mode)
    } catch (e: any) {
      toast.error(e?.message || "Failed to build the document")
    } finally {
      setPrinting(null)
    }
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
   * BULK MOVE — the same guarded workflow, once per order.
   *
   * Sequential, not parallel: each move ships goods or moves cash, and firing thirty of them at
   * once makes a failure impossible to attribute and hammers the same rows. One order failing
   * (a guard refusing, no stock) must not stop the rest, so every result is collected and
   * reported together rather than throwing on the first problem.
   */
  const bulk = useMutation({
    mutationFn: async (to: OrderStatusKey) => {
      const targets = rows.filter((r) => selected.has(r.order_id))
      let moved = 0
      const failed: { displayId: number; message: string }[] = []
      for (const r of targets) {
        try {
          await opApi.update(r.order_id, { order_status: to })
          moved++
        } catch (e: any) {
          failed.push({ displayId: r.display_id, message: e?.message ?? "failed" })
        }
      }
      return { moved, failed }
    },
    onSuccess: ({ moved, failed }) => {
      if (moved) toast.success(`${moved} order(s) updated — stock and cash follow automatically`)
      if (failed.length) {
        toast.error(
          `${failed.length} could not move: ` +
            failed.slice(0, 3).map((f) => `#${f.displayId} (${f.message})`).join("; ") +
            (failed.length > 3 ? "…" : "")
        )
      }
      setBulkTo(null)
      setSelected(new Set())
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

  /**
   * A bulk step is offered only when EVERY selected order can legally take it. Offering a step
   * that half the selection would refuse turns one click into a pile of error toasts, and leaves
   * the user unsure which orders actually moved.
   */
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.order_id)),
    [rows, selected]
  )
  const bulkSteps = useMemo(() => {
    if (!selectedRows.length) return [] as OrderStatusKey[]
    const tally = new Map<OrderStatusKey, number>()
    for (const r of selectedRows) {
      for (const s of r.allowed_next) tally.set(s, (tally.get(s) ?? 0) + 1)
    }
    return BULK_STEPS.filter((s) => tally.get(s) === selectedRows.length)
  }, [selectedRows])

  // Selecting rows then changing the filter would otherwise act on orders you can no longer see.
  const visibleIds = useMemo(() => rows.map((r) => r.order_id), [rows])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(visibleIds))
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

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

        {/* Leftovers from orders that no longer exist — they skew this queue's totals too. */}
        <OrphanWarning />

        {/* Bulk bar — only the steps every selected order can actually take. */}
        {selectedRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ui-border-strong bg-ui-bg-subtle p-3">
            <Text size="small" weight="plus">
              {selectedRows.length} selected
            </Text>
            <Button size="small" variant="transparent" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {bulkSteps.length === 0 ? (
                <Text size="xsmall" className="text-ui-fg-muted">
                  No step is available to all of these — they're at different stages.
                </Text>
              ) : (
                bulkSteps.map((s) => (
                  <Tooltip
                    key={s}
                    content={`${TRANSITION_EFFECT[s] ?? ORDER_STATUS_META[s].label} Runs once per selected order.`}
                  >
                    <Button size="small" variant="secondary" onClick={() => setBulkTo(s)}>
                      {BULK_LABEL[s] ?? ORDER_STATUS_META[s].label}
                    </Button>
                  </Tooltip>
                ))
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-ui-border-base">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </Table.HeaderCell>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell className="hidden lg:table-cell">Type</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Courier</Table.HeaderCell>
                <Table.HeaderCell className="hidden sm:table-cell">Payment</Table.HeaderCell>
                <Table.HeaderCell className="hidden md:table-cell">Issue</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Total</Table.HeaderCell>
                <Table.HeaderCell className="hidden md:table-cell text-right">Delivery</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Courier fee</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Net</Table.HeaderCell>
                <Table.HeaderCell className="hidden lg:table-cell">Notes</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Print</Table.HeaderCell>
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
                    {/* Selecting a row must not open it. */}
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(r.order_id)}
                        onCheckedChange={() => toggleOne(r.order_id)}
                        aria-label={`Select order ${r.display_id}`}
                      />
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap font-medium">
                      #{r.display_id}
                    </Table.Cell>
                    <Table.Cell className="hidden lg:table-cell">
                      <Badge size="2xsmall" color={ORDER_TYPE_META[r.order_type].color}>
                        {ORDER_TYPE_META[r.order_type].label}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="max-w-[140px] truncate sm:max-w-[180px]">{r.customer}</Table.Cell>
                    {/* Status is a dropdown, not a badge plus a separate "Move" menu: the thing you
                        want to change and the thing showing its value are the same control. */}
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      {r.allowed_next.length === 0 ? (
                        <Badge size="2xsmall" color={os.color}>
                          {os.label}
                        </Badge>
                      ) : (
                        <Select
                          value={r.order_status}
                          onValueChange={(v) =>
                            setPending({
                              orderId: r.order_id,
                              displayId: r.display_id,
                              to: v as OrderStatusKey,
                            })
                          }
                        >
                          <Select.Trigger className="min-w-[150px]">
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            {/* Where it is now — shown so the trigger has a label, not offered. */}
                            <Select.Item value={r.order_status} disabled>
                              {os.label}
                            </Select.Item>
                            {r.allowed_next.map((s) => (
                              <Select.Item key={s} value={s}>
                                {ORDER_STATUS_META[s].label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      )}
                    </Table.Cell>

                    {/* Courier: book it, or show the parcel once booked. */}
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      {r.consignment_id ? (
                        <div className="flex flex-col">
                          <Text size="xsmall" className="font-mono">
                            {r.tracking || r.consignment_id}
                          </Text>
                          <Text size="xsmall" className="text-ui-fg-muted">
                            {r.courier_status ?? "pending"}
                          </Text>
                        </div>
                      ) : r.allowed_next.includes("courier_booked") ? (
                        <Tooltip content={TRANSITION_EFFECT.courier_booked ?? "Books the parcel."}>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() =>
                              setPending({
                                orderId: r.order_id,
                                displayId: r.display_id,
                                to: "courier_booked",
                              })
                            }
                          >
                            Book courier
                          </Button>
                        </Tooltip>
                      ) : (
                        <Text size="xsmall" className="text-ui-fg-muted">
                          —
                        </Text>
                      )}
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
                    {/* Standing note — the "deliver after 5pm" kind, not transition history. */}
                    <Table.Cell
                      className="hidden lg:table-cell max-w-[200px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-x-1">
                        <Text size="xsmall" className="truncate text-ui-fg-subtle">
                          {r.note || "—"}
                        </Text>
                        <IconButton
                          size="small"
                          variant="transparent"
                          onClick={() => {
                            setNoteDraft(r.note ?? "")
                            setNoteEdit({ orderId: r.order_id, displayId: r.display_id })
                          }}
                        >
                          <PencilSquare />
                        </IconButton>
                      </div>
                    </Table.Cell>

                    {/* Stop the click here: this cell acts on the row, it doesn't open it. */}
                    <Table.Cell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenu.Trigger asChild>
                          <Tooltip content="Print this order's invoice, packing slip, the combined A4, or the A6 parcel slip.">
                            <Button
                              size="small"
                              variant="secondary"
                              disabled={printing === r.order_id}
                            >
                              {printing === r.order_id ? "…" : "Print"}
                            </Button>
                          </Tooltip>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                          <DropdownMenu.Item onClick={() => print(r.order_id, "invoice")}>
                            Invoice
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onClick={() => print(r.order_id, "packing")}>
                            Packing slip
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onClick={() => print(r.order_id, "combined")}>
                            Combined A4
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onClick={() => print(r.order_id, "a6")}>
                            A6 packing slip
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
              {!isLoading && rows.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={14}>
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

      {/* Bulk confirm — names the count and spells out what the step actually does. */}
      <Prompt open={!!bulkTo} onOpenChange={(v) => !v && setBulkTo(null)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>
              {bulkTo
                ? `${BULK_LABEL[bulkTo] ?? ORDER_STATUS_META[bulkTo].label} — ${selectedRows.length} order(s)?`
                : ""}
            </Prompt.Title>
            <Prompt.Description>
              {(bulkTo && TRANSITION_EFFECT[bulkTo]) ??
                "Records the stage. Nothing moves in stock or cash."}{" "}
              This runs once per order; any that can't move are reported and the rest still go
              through.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Button
              size="small"
              disabled={bulk.isPending}
              onClick={() => bulkTo && bulk.mutate(bulkTo)}
            >
              {bulk.isPending ? `Working… ` : `Move ${selectedRows.length}`}
            </Button>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      {/* Standing note on the order. */}
      <Prompt open={!!noteEdit} onOpenChange={(v) => !v && setNoteEdit(null)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Note on #{noteEdit?.displayId ?? ""}</Prompt.Title>
            <Prompt.Description>
              A standing note that stays on the order — delivery instructions, a customer request.
              It isn't part of the status history.
            </Prompt.Description>
          </Prompt.Header>
          <div className="px-6 pb-2">
            <Textarea
              autoFocus
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="e.g. Customer asked to deliver after 5pm"
            />
          </div>
          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Button
              size="small"
              disabled={saveNote.isPending}
              onClick={() =>
                noteEdit && saveNote.mutate({ orderId: noteEdit.orderId, note: noteDraft })
              }
            >
              {saveNote.isPending ? "Saving…" : "Save note"}
            </Button>
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
            <MoneyInput
              label="Actual charge"
              value={feeDraft}
              onChange={setFeeDraft}
              presets={[100, 150]}
              hint="Couriers usually revise this after weighing the parcel."
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
