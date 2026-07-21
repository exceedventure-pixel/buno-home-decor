import { Spinner, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  DatePicker,
  Drawer,
  IconButton,
  Input,
  Label,
  Select,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"

import { MoneyInput } from "../../../components/money-input"
import { SupplierSelect } from "../../../components/supplier-select"
import { StockHealthBanner } from "../../../widgets/stock-health-banner"
import { BatchActions } from "./batch-actions"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { money } from "../../../lib/kpi"
import { api } from "../lib/api"

type Picked = { variant_id: string; label: string; sku: string | null; cost: number }

const cur = "bdt"

let lineSeq = 0
const nextKey = () => `ln_${Date.now()}_${lineSeq++}`

/** One product on a purchase. Amounts stay strings so a half-typed figure isn't coerced to 0. */
type Line = {
  key: string
  picked: Picked | null
  quantity: string
  unitCost: string
  freight: string
}

const emptyLine = (): Line => ({
  key: nextKey(),
  picked: null,
  quantity: "",
  unitCost: "",
  freight: "0",
})

/**
 * Pick one variant. Self-contained so each line of a bulk restock owns its own search — a single
 * shared search box would make it ambiguous which line you were filling in.
 */
function VariantPicker({
  picked,
  onPick,
  onClear,
}: {
  picked: Picked | null
  onPick: (v: Picked) => void
  onClear: () => void
}) {
  const [q, setQ] = useState("")

  const { data, isFetching } = useQuery({
    queryKey: ["accounting", "variants", q],
    queryFn: () => api.variants(q),
    enabled: !picked,
  })

  if (picked) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-ui-border-base px-3 py-2">
        <div className="min-w-0">
          <Text size="small" className="truncate">
            {picked.label}
          </Text>
          {picked.sku && (
            <Text size="xsmall" className="text-ui-fg-muted truncate">
              {picked.sku}
            </Text>
          )}
        </div>
        <Button size="small" variant="transparent" onClick={onClear}>
          Change
        </Button>
      </div>
    )
  }

  const results = data?.variants ?? []

  return (
    <div className="flex flex-col gap-y-1">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by product name…"
      />
      {/* Capped and scrollable: the picker must not push the rest of the form off-screen. */}
      <div className="max-h-40 overflow-y-auto rounded-lg border border-ui-border-base divide-y divide-ui-border-base">
        {isFetching && (
          <div className="flex items-center gap-x-2 p-2 text-ui-fg-subtle">
            <Spinner className="animate-spin" /> <Text size="xsmall">Searching…</Text>
          </div>
        )}
        {!isFetching &&
          results.map((v) => (
            <button
              key={v.variant_id}
              type="button"
              className="flex w-full items-center justify-between p-2 text-left hover:bg-ui-bg-base-hover"
              onClick={() => onPick(v)}
            >
              <div className="min-w-0">
                <Text size="xsmall" className="truncate">
                  {v.label}
                </Text>
                {v.sku && (
                  <Text size="xsmall" className="text-ui-fg-muted truncate">
                    {v.sku}
                  </Text>
                )}
              </div>
              <Text size="xsmall" className="text-ui-fg-muted whitespace-nowrap">
                {money(v.cost, cur)}
              </Text>
            </button>
          ))}
        {!isFetching && results.length === 0 && (
          <Text size="xsmall" className="p-2 text-ui-fg-muted">
            {q ? "No products match." : "Type to search your products."}
          </Text>
        )}
      </div>
    </div>
  )
}

export function RestockSection() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounting"] })

  const [restockOpen, setRestockOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)

  // ── Bulk restock: one purchase, many products ──────────────────────────────
  const [lines, setLines] = useState<Line[]>([emptyLine()])
  const [supplier, setSupplier] = useState("")
  const [date, setDate] = useState<Date>(new Date())

  // ── Found / write-off: a single-variant correction, not a purchase ─────────
  const [adjPicked, setAdjPicked] = useState<Picked | null>(null)
  const [adjMode, setAdjMode] = useState<"found" | "shrinkage">("found")
  const [adjQty, setAdjQty] = useState("")
  const [adjCost, setAdjCost] = useState("")
  const [adjReason, setAdjReason] = useState<"shrinkage" | "damage" | "correction">("shrinkage")
  const [adjNote, setAdjNote] = useState("")
  const [adjDate, setAdjDate] = useState<Date>(new Date())

  // Every FIFO cost layer, newest first — with how far each has sold down.
  const { data: batchData } = useQuery({
    queryKey: ["accounting", "batches"],
    queryFn: () => api.batches(),
  })
  const allBatches = useMemo(() => batchData?.batches ?? [], [batchData])

  /**
   * Filter the log to one product or variant.
   *
   * Matched against the batch LABEL ("Product — Variant") and sku rather than a variant id, so a
   * bare product name pulls up every variant's history in one view — which is what you want when
   * asking "what have we ever paid for this product?" — while typing the variant narrows it.
   */
  const [logFilter, setLogFilter] = useState("")
  const batches = useMemo(() => {
    const q = logFilter.trim().toLowerCase()
    if (!q) return allBatches
    return allBatches.filter(
      (b) =>
        b.label.toLowerCase().includes(q) || (b.sku ?? "").toLowerCase().includes(q)
    )
  }, [allBatches, logFilter])

  // Totals for whatever the filter is showing, so a per-product view answers "how many did we buy,
  // what did we pay, how much is left" without adding up rows by hand.
  const shown = useMemo(
    () => ({
      received: batches.reduce((s, b) => s + Number(b.qty_received || 0), 0),
      remaining: batches.reduce((s, b) => s + Number(b.remaining || 0), 0),
      cash: batches.reduce((s, b) => s + Number(b.cash_paid || 0), 0),
    }),
    [batches]
  )

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const addLine = () => setLines((ls) => [...ls, emptyLine()])
  const removeLine = (key: string) =>
    setLines((ls) => (ls.length === 1 ? [emptyLine()] : ls.filter((l) => l.key !== key)))

  const lineMath = (l: Line) => {
    const qty = Number(l.quantity) || 0
    const unit = Number(l.unitCost) || 0
    const freight = Number(l.freight) || 0
    return { qty, unit, freight, landed: unit + freight, cash: qty * (unit + freight) }
  }

  const readyLines = lines.filter((l) => {
    const { qty, unit } = lineMath(l)
    return l.picked && qty > 0 && unit > 0
  })
  const totalCash = readyLines.reduce((s, l) => s + lineMath(l).cash, 0)

  const resetRestock = () => {
    setLines([emptyLine()])
    setSupplier("")
    setDate(new Date())
  }

  /**
   * One call per product. Each line becomes its OWN cost batch with its own landed cost and its
   * own Cash Book row, which is what FIFO needs — a single lumped entry couldn't be drawn down
   * per product. Failures are collected rather than thrown, so one bad line doesn't silently
   * abandon the products already received.
   */
  const submitRestock = useMutation({
    mutationFn: async () => {
      let done = 0
      const failed: { label: string; message: string }[] = []
      for (const l of readyLines) {
        const { qty, unit, freight } = lineMath(l)
        try {
          await api.restock({
            variant_id: l.picked!.variant_id,
            quantity: qty,
            unit_cost: unit,
            freight_per_unit: freight,
            purchase_date: date.toISOString(),
            supplier: supplier || null,
          })
          done++
        } catch (e: any) {
          failed.push({ label: l.picked!.label, message: e?.message ?? "failed" })
        }
      }
      return { done, failed }
    },
    onSuccess: ({ done, failed }) => {
      if (done) toast.success(`${done} product(s) restocked — stock raised, batches and cash booked`)
      if (failed.length) {
        toast.error(
          `${failed.length} failed: ` +
            failed.slice(0, 3).map((f) => `${f.label} (${f.message})`).join("; ") +
            (failed.length > 3 ? "…" : "")
        )
      }
      invalidate()
      if (!failed.length) {
        resetRestock()
        setRestockOpen(false)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const adjQtyNum = Number(adjQty) || 0
  const adjValid = !!adjPicked && adjQtyNum > 0

  const submitAdjust = useMutation({
    mutationFn: () =>
      adjMode === "found"
        ? api.adjustStock({
            variant_id: adjPicked!.variant_id,
            direction: "found",
            quantity: adjQtyNum,
            unit_cost: Number(adjCost) || 0,
            date: adjDate.toISOString(),
            note: adjNote || null,
          })
        : api.adjustStock({
            variant_id: adjPicked!.variant_id,
            direction: "shrinkage",
            quantity: adjQtyNum,
            date: adjDate.toISOString(),
            reason: adjReason,
            note: adjNote || null,
          }),
    onSuccess: () => {
      toast.success(
        adjMode === "found"
          ? "Found stock added — new cost layer, no cash moved"
          : "Written off — stock lowered, booked as a non-cash loss"
      )
      invalidate()
      setAdjPicked(null)
      setAdjQty("")
      setAdjCost("")
      setAdjNote("")
      setAdjOpenReset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function setAdjOpenReset() {
    setAdjustOpen(false)
    setAdjMode("found")
    setAdjReason("shrinkage")
    setAdjDate(new Date())
  }

  return (
    <div className="flex flex-col gap-y-4">
      {/* Restock is blocked while the setup is broken — this is how you unblock it. */}
      <StockHealthBanner />

      {/* The log comes FIRST: this tab is read far more often than it is written to. Recording a
          purchase is a deliberate act behind a button, not a form occupying the whole page. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text weight="plus">Stock batches (FIFO cost layers)</Text>
          <Text size="small" className="text-ui-fg-subtle">
            Every purchase, what it landed at, and how far it has sold down. Sales draw from the
            oldest batch first.
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="small" onClick={() => setRestockOpen(true)}>
            Restock…
          </Button>
          <Button size="small" variant="secondary" onClick={() => setAdjustOpen(true)}>
            Found / Write-off…
          </Button>
        </div>
      </div>

      {/* Narrow the log to one product or variant. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[240px] flex-1 flex-col gap-y-1">
          <Label size="small">Filter by product or variant</Label>
          <Input
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value)}
            placeholder="Product name, variant or SKU…"
          />
        </div>
        {logFilter.trim() && (
          <Button size="small" variant="secondary" onClick={() => setLogFilter("")}>
            Clear
          </Button>
        )}
        <Text size="xsmall" className="text-ui-fg-muted pb-2">
          {batches.length} batch(es) · {shown.received} received · {shown.remaining} left ·{" "}
          {money(shown.cash, cur)} paid
        </Text>
      </div>

      <div className="overflow-x-auto rounded-lg border border-ui-border-base">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Product</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Received</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Landed / unit</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Cash paid</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {batches.map((b) => (
              <Table.Row key={b.id}>
                <Table.Cell className="whitespace-nowrap">
                  {new Date(b.received_date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Table.Cell>
                <Table.Cell className="max-w-[260px]">
                  <div className="truncate">{b.label}</div>
                  {b.source !== "restock" && (
                    <Badge size="2xsmall" color="orange" className="mt-1">
                      {b.source}
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell className="text-right">{b.qty_received}</Table.Cell>
                <Table.Cell className="text-right">{money(b.landed_unit_cost, cur)}</Table.Cell>
                <Table.Cell className="text-right font-medium">
                  {b.cash_paid ? money(b.cash_paid, cur) : "—"}
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  {b.remaining <= 0 ? (
                    <Badge size="2xsmall" color="grey">
                      Sold out ({b.sold}/{b.qty_received})
                    </Badge>
                  ) : (
                    <Badge size="2xsmall" color="green">
                      {b.remaining} left ({b.sold}/{b.qty_received} sold)
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <BatchActions
                    batch={b}
                    onChanged={invalidate}
                    onEdit={api.editBatch}
                    onDelete={api.deleteBatch}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
            {batches.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={7}>
                  <Text size="small" className="py-4 text-ui-fg-muted">
                    {logFilter.trim()
                      ? `No batches match “${logFilter.trim()}”.`
                      : "No stock batches recorded yet."}
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      {/* ── Bulk restock ──────────────────────────────────────────────────── */}
      <Drawer open={restockOpen} onOpenChange={setRestockOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Restock</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-5 overflow-y-auto">
            <Text size="small" className="text-ui-fg-subtle">
              Records a purchase in one step: it raises each product's stock AND books the cash you
              paid in the Cash Book. Net worth stays put — cash becomes goods. A delivery usually
              has several products, so add a line for each; every line becomes its own cost batch.
            </Text>

            {/* One supplier and date for the whole delivery. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SupplierSelect value={supplier} onChange={setSupplier} label="Supplier (optional)" />
              <div className="flex flex-col gap-y-1">
                <Label size="small">Purchase date</Label>
                <DatePicker value={date} onChange={(d) => d && setDate(d)} />
              </div>
            </div>

            <div className="flex flex-col gap-y-3">
              {lines.map((l, i) => {
                const m = lineMath(l)
                return (
                  <div
                    key={l.key}
                    className="flex flex-col gap-y-3 rounded-lg border border-ui-border-base p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Text size="xsmall" weight="plus" className="text-ui-fg-muted">
                        Product {i + 1}
                      </Text>
                      <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => removeLine(l.key)}
                      >
                        <Trash />
                      </IconButton>
                    </div>

                    <VariantPicker
                      picked={l.picked}
                      onPick={(v) =>
                        setLine(l.key, {
                          picked: v,
                          // Prefill from the last landed cost — usually right, always editable.
                          unitCost: v.cost > 0 ? String(v.cost) : "",
                        })
                      }
                      onClear={() => setLine(l.key, { picked: null })}
                    />

                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-y-1">
                        <Label size="small">Quantity</Label>
                        <MoneyInput
                          value={l.quantity}
                          onChange={(v) => setLine(l.key, { quantity: v })}
                        />
                      </div>
                      <MoneyInput
                        label={`Unit cost (${cur.toUpperCase()})`}
                        value={l.unitCost}
                        onChange={(v) => setLine(l.key, { unitCost: v })}
                      />
                      <MoneyInput
                        label="Freight / unit"
                        value={l.freight}
                        onChange={(v) => setLine(l.key, { freight: v })}
                      />
                    </div>

                    {m.qty > 0 && m.unit > 0 && (
                      <Text size="xsmall" className="text-ui-fg-muted">
                        Landed <b>{money(m.landed, cur)}</b>/unit · {m.qty} × {money(m.landed, cur)}{" "}
                        = <b>{money(m.cash, cur)}</b>
                      </Text>
                    )}
                  </div>
                )
              })}

              <Button size="small" variant="secondary" onClick={addLine} className="self-start">
                + Add another product
              </Button>
            </div>

            <div className="rounded-lg bg-ui-bg-subtle p-3">
              <Text size="small">
                {readyLines.length} product(s) · cash out <b>{money(totalCash, cur)}</b>
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                Booked as an asset purchase — cash goes down, inventory value goes up by the same
                amount.
              </Text>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Button size="small" variant="secondary" onClick={() => setRestockOpen(false)}>
              Cancel
            </Button>
            <Button
              size="small"
              disabled={readyLines.length === 0 || submitRestock.isPending}
              onClick={() => submitRestock.mutate()}
            >
              {submitRestock.isPending
                ? "Restocking…"
                : `Restock ${readyLines.length || ""} product(s)`}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      {/* ── Found / write-off ─────────────────────────────────────────────── */}
      <Drawer open={adjustOpen} onOpenChange={(v) => (v ? setAdjustOpen(true) : setAdjOpenReset())}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Found stock / Write-off</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
            <Text size="small" className="text-ui-fg-subtle">
              Corrections, not purchases — neither moves cash. <b>Found</b> adds a cost layer for
              stock you already had; <b>Write-off</b> removes stock at its FIFO cost.
            </Text>

            <div className="flex gap-1.5">
              {(["found", "shrinkage"] as const).map((m) => (
                <Button
                  key={m}
                  size="small"
                  variant={adjMode === m ? "primary" : "secondary"}
                  onClick={() => setAdjMode(m)}
                >
                  {m === "found" ? "Found" : "Write off"}
                </Button>
              ))}
            </div>

            <VariantPicker
              picked={adjPicked}
              onPick={(v) => {
                setAdjPicked(v)
                if (v.cost > 0) setAdjCost(String(v.cost))
              }}
              onClear={() => setAdjPicked(null)}
            />

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-y-1">
                <Label size="small">Quantity</Label>
                <MoneyInput value={adjQty} onChange={setAdjQty} />
              </div>
              {adjMode === "found" && (
                <MoneyInput
                  label={`Cost / unit (${cur.toUpperCase()})`}
                  value={adjCost}
                  onChange={setAdjCost}
                />
              )}
              {adjMode === "shrinkage" && (
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Reason</Label>
                  <Select value={adjReason} onValueChange={(v) => setAdjReason(v as typeof adjReason)}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="shrinkage">Shrinkage / lost</Select.Item>
                      <Select.Item value="damage">Damaged</Select.Item>
                      <Select.Item value="correction">Count correction</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-y-1">
                <Label size="small">Date</Label>
                <DatePicker value={adjDate} onChange={(d) => d && setAdjDate(d)} />
              </div>
            </div>

            <div className="flex flex-col gap-y-1">
              <Label size="small">Note (optional)</Label>
              <Textarea value={adjNote} onChange={(e) => setAdjNote(e.target.value)} />
            </div>

            <Text size="xsmall" className="text-ui-fg-muted">
              {adjMode === "found"
                ? "Adds a cost layer · no cash moves"
                : "Non-cash loss at FIFO cost"}
            </Text>
          </Drawer.Body>
          <Drawer.Footer>
            <Button size="small" variant="secondary" onClick={setAdjOpenReset}>
              Cancel
            </Button>
            <Button
              size="small"
              disabled={!adjValid || submitAdjust.isPending}
              onClick={() => submitAdjust.mutate()}
            >
              {adjMode === "found" ? "Add found stock" : "Write off"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}
