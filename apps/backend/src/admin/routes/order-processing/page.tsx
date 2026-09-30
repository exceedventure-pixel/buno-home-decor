import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChevronDownMini, MagnifyingGlass, PencilSquare, ShoppingBag, XMark } from "@medusajs/icons"
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

type OptionalColumnKey = "type" | "status" | "courier" | "payment" | "delivery" | "net"

const OPTIONAL_COLUMNS: { key: OptionalColumnKey; label: string }[] = [
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "courier", label: "Courier" },
  { key: "payment", label: "Payment" },
  { key: "delivery", label: "Delivery" },
  { key: "net", label: "Net Profit" },
]

const DEFAULT_VISIBLE_COLUMNS: Record<OptionalColumnKey, boolean> = {
  type: false,
  status: false,
  courier: false,
  payment: false,
  delivery: false,
  net: false,
}

const BULK_LABEL: Partial<Record<OrderStatusKey, string>> = {
  confirmed: "Confirm all",
  in_production: "Start production for all",
  ready_to_dispatch: "Mark all ready",
  courier_booked: "Book all with courier",
  dispatched: "Mark all dispatched",
  delivered: "Mark all delivered",
}

const OrderProcessingPage = () => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [sourceFilter, setSourceFilter] = useState<"all" | "website" | "manual">("all")
  const [status, setStatus] = useState<OrderStatusKey | "all">("all")
  const [search, setSearch] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<Record<OptionalColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem("buno_order_proc_columns")
      if (saved) return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) }
    } catch {}
    return DEFAULT_VISIBLE_COLUMNS
  })

  const toggleColumn = (key: OptionalColumnKey) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem("buno_order_proc_columns", JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const showAllColumns = () => {
    const next: Record<OptionalColumnKey, boolean> = {
      type: true,
      status: true,
      courier: true,
      payment: true,
      delivery: true,
      net: true,
    }
    setVisibleColumns(next)
    try {
      localStorage.setItem("buno_order_proc_columns", JSON.stringify(next))
    } catch {}
  }

  const hideAllColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
    try {
      localStorage.setItem("buno_order_proc_columns", JSON.stringify(DEFAULT_VISIBLE_COLUMNS))
    } catch {}
  }

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
   *
   * Optimistic update: the row's status changes instantly in the cache on confirmation —
   * the table feels instant. If the server rejects, we roll back to the previous data.
   */
  const move = useMutation({
    mutationFn: (m: PendingMove) => opApi.update(m.orderId, { order_status: m.to }),
    onMutate: async (m: PendingMove) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update.
      await qc.cancelQueries({ queryKey: ["order-processing", "all"] })
      const prev = qc.getQueryData<{ orders: typeof rows }>([" order-processing", "all"])
      qc.setQueryData<{ orders: typeof rows; counts: any; type_counts: any; total: any; totals: any }>(
        ["order-processing", "all"],
        (old) => {
          if (!old) return old
          return {
            ...old,
            orders: old.orders.map((r) =>
              r.order_id === m.orderId ? { ...r, order_status: m.to } : r
            ),
          }
        }
      )
      setPending(null)
      return { prev }
    },
    onSuccess: () => {
      toast.success("Order updated — stock and cash follow automatically")
      qc.invalidateQueries({ queryKey: ["order-processing"] })
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["accounting"] })
    },
    onError: (e: Error, _m, ctx: any) => {
      toast.error(e.message)
      if (ctx?.prev) qc.setQueryData(["order-processing", "all"], ctx.prev)
      setPending(null)
    },
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

  // Website vs manual counts, over the type-scoped rows so the tabs match the current type view.
  const sourceCounts = useMemo(() => {
    let website = 0
    let manual = 0
    for (const r of typeRows) r.source === "manual" ? manual++ : website++
    return { website, manual }
  }, [typeRows])

  // Then narrow by source (website / manual / all) before status.
  const sourceRows = useMemo(
    () => (sourceFilter === "all" ? typeRows : typeRows.filter((r) => r.source === sourceFilter)),
    [typeRows, sourceFilter]
  )

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of sourceRows) m[r.order_status] = (m[r.order_status] ?? 0) + 1
    return m
  }, [sourceRows])

  const statusRows = useMemo(
    () => (status === "all" ? sourceRows : sourceRows.filter((r) => r.order_status === status)),
    [sourceRows, status]
  )

  /**
   * Full-text search — client-side against the already-loaded data so it's instant.
   * Matches against: customer name, order # (with or without the #), tracking number,
   * consignment ID, product names from items_summary, and the standing note.
   */
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return statusRows
    // Allow searching "123" or "#123" for display_id
    const asNum = q.replace(/^#/, "")
    return statusRows.filter((r) => {
      if (r.customer?.toLowerCase().includes(q)) return true
      if (String(r.display_id).includes(asNum)) return true
      if (r.tracking?.toLowerCase().includes(q)) return true
      if (r.consignment_id?.toLowerCase().includes(q)) return true
      if (r.items_summary?.toLowerCase().includes(q)) return true
      if (r.note?.toLowerCase().includes(q)) return true
      return false
    })
  }, [statusRows, search])

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Heading level="h1">Order Processing</Heading>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              Pre-orders, website orders, and courier dispatch pipeline. Statuses and finances derive directly from live operations.
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button size="small" variant="secondary" className="flex items-center gap-x-1.5">
                  <span>Columns</span>
                  {Object.values(visibleColumns).filter(Boolean).length > 0 ? (
                    <Badge size="2xsmall" color="blue">
                      {Object.values(visibleColumns).filter(Boolean).length} visible
                    </Badge>
                  ) : (
                    <span className="text-xs text-ui-fg-muted">(Default)</span>
                  )}
                  <ChevronDownMini className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" className="w-60 p-2 space-y-1 z-50 bg-ui-bg-base border border-ui-border-base shadow-lg rounded-lg">
                <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-ui-border-base px-2">
                  <Text size="xsmall" weight="plus" className="text-ui-fg-muted uppercase tracking-wider">
                    Toggle Columns
                  </Text>
                  <button
                    type="button"
                    onClick={Object.values(visibleColumns).some(Boolean) ? hideAllColumns : showAllColumns}
                    className="text-xs text-ui-fg-interactive hover:underline"
                  >
                    {Object.values(visibleColumns).some(Boolean) ? "Reset to Default" : "Show All"}
                  </button>
                </div>
                {OPTIONAL_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-x-2.5 px-2 py-1.5 rounded hover:bg-ui-bg-subtle cursor-pointer select-none transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={visibleColumns[col.key]}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <Text size="small" className="text-ui-fg-base">
                      {col.label}
                    </Text>
                    {visibleColumns[col.key] && (
                      <span className="ml-auto text-[10px] text-ui-fg-interactive font-medium">On</span>
                    )}
                  </label>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters Panel with clear denotes for Source, Type, and Processing */}
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle/50 p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-ui-border-base">
            <div className="flex items-center gap-x-2">
              <Text size="small" weight="plus" className="text-ui-fg-base">
                Filters &amp; Views
              </Text>
              {(sourceFilter !== "all" || typeFilter !== "all" || status !== "all" || !!search) && (
                <Badge size="2xsmall" color="blue">
                  Active
                </Badge>
              )}
            </div>
            {(sourceFilter !== "all" || typeFilter !== "all" || status !== "all" || !!search) && (
              <Button
                size="small"
                variant="transparent"
                className="text-ui-fg-interactive text-xs h-7 px-2"
                onClick={() => {
                  setSourceFilter("all")
                  setTypeFilter("all")
                  setStatus("all")
                  setSearch("")
                  setSelected(new Set())
                }}
              >
                Reset all
              </Button>
            )}
          </div>

          {/* 1. SOURCE FILTER */}
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 items-center">
            <div className="flex items-center gap-x-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ui-fg-muted">
                1. Source
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="small"
                variant={sourceFilter === "all" ? "primary" : "secondary"}
                onClick={() => setSourceFilter("all")}
              >
                All Sources ({sourceCounts.website + sourceCounts.manual})
              </Button>
              <Button
                size="small"
                variant={sourceFilter === "website" ? "primary" : "secondary"}
                onClick={() => setSourceFilter("website")}
              >
                🌐 Website ({sourceCounts.website})
              </Button>
              <Button
                size="small"
                variant={sourceFilter === "manual" ? "primary" : "secondary"}
                onClick={() => setSourceFilter("manual")}
              >
                📝 Manual ({sourceCounts.manual})
              </Button>
            </div>
          </div>

          {/* 2. TYPE FILTER */}
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 items-center pt-2.5 border-t border-ui-border-subtle">
            <div className="flex items-center gap-x-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ui-fg-muted">
                2. Type
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="small"
                variant={typeFilter === "all" ? "primary" : "secondary"}
                onClick={() => setTypeFilter("all")}
              >
                All Types ({typeCounts.ready_stock + typeCounts.pre_order + typeCounts.custom})
              </Button>
              <Button
                size="small"
                variant={typeFilter === "production" ? "primary" : "secondary"}
                onClick={() => setTypeFilter("production")}
              >
                🛠️ Pre-order &amp; Custom ({typeCounts.pre_order + typeCounts.custom})
              </Button>
              <Button
                size="small"
                variant={typeFilter === "ready_stock" ? "primary" : "secondary"}
                onClick={() => setTypeFilter("ready_stock")}
              >
                📦 Ready Stock ({typeCounts.ready_stock})
              </Button>
            </div>
          </div>

          {/* 3. PROCESSING FILTER */}
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 items-start pt-2.5 border-t border-ui-border-subtle">
            <div className="flex items-center gap-x-1.5 pt-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ui-fg-muted">
                3. Processing
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="small"
                variant={status === "all" ? "primary" : "secondary"}
                onClick={() => setStatus("all")}
              >
                All Stages ({sourceRows.length})
              </Button>
              {ORDER_STATUS_ORDER.map((s) => {
                const c = counts[s] ?? 0
                return (
                  <Button
                    key={s}
                    size="small"
                    variant={status === s ? "primary" : "secondary"}
                    onClick={() => setStatus(s)}
                    className={c > 0 && status !== s ? "font-medium text-ui-fg-base" : ""}
                  >
                    {ORDER_STATUS_META[s].label} {c > 0 ? `(${c})` : ""}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Search bar — instant client-side filter across customer, order #, tracking, products, notes */}
        <div className="relative flex items-center gap-x-2">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-fg-muted pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelected(new Set())
              }}
              placeholder="Search by customer name, #order, tracking, product…"
              className="w-full h-9 pl-9 pr-9 rounded-lg border border-ui-border-base bg-ui-bg-field text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive transition-shadow"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSelected(new Set()) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted hover:text-ui-fg-base transition-colors"
                aria-label="Clear search"
              >
                <XMark className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {search.trim() && (
            <span className="shrink-0 text-xs text-ui-fg-subtle whitespace-nowrap">
              {rows.length} result{rows.length !== 1 ? "s" : ""}
            </span>
          )}
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
                <Table.HeaderCell className="whitespace-nowrap">Order</Table.HeaderCell>
                {visibleColumns.type && (
                  <Table.HeaderCell className="hidden lg:table-cell">Type</Table.HeaderCell>
                )}
                <Table.HeaderCell className="min-w-[220px]">Customer &amp; Products</Table.HeaderCell>
                {visibleColumns.status && <Table.HeaderCell>Status</Table.HeaderCell>}
                {visibleColumns.courier && <Table.HeaderCell>Courier</Table.HeaderCell>}
                {visibleColumns.payment && (
                  <Table.HeaderCell className="hidden sm:table-cell">Payment</Table.HeaderCell>
                )}
                <Table.HeaderCell className="hidden md:table-cell">Consignment</Table.HeaderCell>
                <Table.HeaderCell className="hidden md:table-cell">Issue</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Total</Table.HeaderCell>
                {visibleColumns.delivery && (
                  <Table.HeaderCell className="hidden md:table-cell text-right">Delivery</Table.HeaderCell>
                )}
                <Table.HeaderCell className="text-right">Courier fee</Table.HeaderCell>
                {visibleColumns.net && (
                  <Table.HeaderCell className="text-right">Net</Table.HeaderCell>
                )}
                <Table.HeaderCell className="min-w-[160px] max-w-[260px]">Notes</Table.HeaderCell>
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
                    {visibleColumns.type && (
                      <Table.Cell className="hidden lg:table-cell">
                        <Badge size="2xsmall" color={ORDER_TYPE_META[r.order_type].color}>
                          {ORDER_TYPE_META[r.order_type].label}
                        </Badge>
                      </Table.Cell>
                    )}
                    <Table.Cell className="min-w-[220px] max-w-[340px]">
                      <div className="flex flex-col gap-y-1">
                        <div className="flex items-center gap-x-1.5">
                          <span className="font-semibold text-ui-fg-base truncate">{r.customer}</span>
                          {r.source === "manual" ? (
                            <Badge size="2xsmall" color="orange">
                              Manual
                            </Badge>
                          ) : (
                            <Badge size="2xsmall" color="grey">
                              Website
                            </Badge>
                          )}
                        </div>
                        {r.items_summary ? (
                          <Tooltip content={r.items_summary} maxWidth={400}>
                            <div className="flex items-center gap-x-1.5 text-xs text-ui-fg-subtle">
                              <ShoppingBag className="w-3.5 h-3.5 shrink-0 text-ui-fg-muted" />
                              <span className="truncate font-normal">{r.items_summary}</span>
                            </div>
                          </Tooltip>
                        ) : (
                          <Text size="xsmall" className="text-ui-fg-muted italic">
                            —
                          </Text>
                        )}
                      </div>
                    </Table.Cell>
                    {/* Status is a dropdown, not a badge plus a separate "Move" menu: the thing you
                        want to change and the thing showing its value are the same control. */}
                    {visibleColumns.status && (
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
                    )}

                    {/* Courier: book it, or show the parcel once booked. */}
                    {visibleColumns.courier && (
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
                    )}
                    {visibleColumns.payment && (
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
                    )}
                    {/* Consignment ID — visible once courier is booked */}
                    <Table.Cell className="hidden md:table-cell">
                      {r.consignment_id ? (
                        <Tooltip
                          content={r.tracking && r.tracking !== r.consignment_id
                            ? `Tracking: ${r.tracking}`
                            : "Consignment booked"}
                        >
                          <span className="font-mono text-xs text-ui-fg-base select-all cursor-text">
                            {r.consignment_id}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-ui-fg-muted text-xs">—</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="hidden md:table-cell">
                      {r.issue_status !== "none" && (
                        <Badge size="2xsmall" color={is.color}>
                          {is.label}
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-right whitespace-nowrap font-medium">{money(r.total, cur)}</Table.Cell>
                    {visibleColumns.delivery && (
                      <Table.Cell
                        className={`hidden md:table-cell text-right whitespace-nowrap ${
                          r.delivery_margin < 0 ? "text-ui-tag-red-text" : "text-ui-fg-subtle"
                        }`}
                      >
                        {money(r.delivery_margin, cur)}
                      </Table.Cell>
                    )}
                    {/* Actual courier charge, set right here. Stop the click: the pencil edits the
                        fee, it doesn't open the order. */}
                    <Table.Cell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-x-1">
                        <span className={r.courier_cost > 0 ? "" : "text-ui-fg-muted"}>
                          {money(r.courier_cost, cur)}
                        </span>
                        <IconButton
                          size="small"
                          variant="transparent"
                          title="Edit actual courier charge"
                          onClick={() => openFeeEdit(r.order_id, r.display_id, r.courier_cost)}
                        >
                          <PencilSquare />
                        </IconButton>
                      </div>
                    </Table.Cell>
                    {visibleColumns.net && (
                      <Table.Cell
                        className={`text-right whitespace-nowrap font-medium ${
                          r.net_profit < 0 ? "text-ui-tag-red-text" : "text-ui-tag-green-text"
                        }`}
                      >
                        {money(r.net_profit, cur)}
                      </Table.Cell>
                    )}
                    {/* Standing / Placement note — the note given when placing the order or standing instructions */}
                    <Table.Cell
                      className="min-w-[160px] max-w-[260px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-x-1">
                        <Tooltip content={r.note || "No note recorded"} maxWidth={350}>
                          <Text size="xsmall" className="truncate text-ui-fg-base font-normal">
                            {r.note || "—"}
                          </Text>
                        </Tooltip>
                        <IconButton
                          size="small"
                          variant="transparent"
                          title="Edit note"
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
              presets={[105, 125, 155, 175, 225]}
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
