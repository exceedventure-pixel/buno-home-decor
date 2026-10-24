import { Plus, Spinner, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  DatePicker,
  FocusModal,
  Input,
  Label,
  Select,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { Kpi, money } from "../../../lib/kpi"
import { api, type LedgerEntry } from "../lib/api"

const cur = "bdt"
const ALL = "all"

const monthKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

const COURIER_PROVIDERS = [
  "Steadfast Courier",
  "Pathao Courier",
  "RedX",
  "Paperfly",
  "eCourier",
  "Sundarban Courier",
  "SA Paribahan",
  "Manual / Other",
]

export function CourierSection() {
  const qc = useQueryClient()
  const prompt = usePrompt()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<string>(ALL)
  const [sourceFilter, setSourceFilter] = useState<string>(ALL)

  const { data: result, isLoading } = useQuery({
    queryKey: ["accounting", "ledger", "courier_fee"],
    queryFn: () => api.ledger({ category: "courier_fee", limit: 200 }),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounting"] })

  const del = useMutation({
    mutationFn: (id: string) => api.deleteLedger(id),
    onSuccess: () => {
      toast.success("Courier fee removed")
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onDelete = async (e: LedgerEntry) => {
    const ok = await prompt({
      title: "Delete this courier fee?",
      description: `${e.description || "Courier fee"} — ${money(e.amount, cur)}. This removes the expense from your books.`,
    })
    if (ok) del.mutate(e.id)
  }

  const all = useMemo(() => result?.ledger_entries ?? [], [result])

  // Months with courier entries
  const months = useMemo(() => {
    const set = new Set(all.map((e) => monthKey(e.entry_date)))
    return [...set].sort().reverse()
  }, [all])

  // Filtered rows by month and source
  const rows = useMemo(() => {
    return all.filter((e) => {
      const matchMonth = month === ALL || monthKey(e.entry_date) === month
      const matchSource =
        sourceFilter === ALL ||
        (sourceFilter === "order" ? e.source_type === "order" : e.source_type !== "order")
      return matchMonth && matchSource
    })
  }, [all, month, sourceFilter])

  const shownTotal = useMemo(() => rows.reduce((s, e) => s + Number(e.amount || 0), 0), [rows])
  const lifetimeTotal = useMemo(() => all.reduce((s, e) => s + Number(e.amount || 0), 0), [all])

  const orderLinkedRows = useMemo(() => all.filter((e) => e.source_type === "order"), [all])
  const orderTotal = useMemo(
    () => orderLinkedRows.reduce((s, e) => s + Number(e.amount || 0), 0),
    [orderLinkedRows]
  )

  const manualRows = useMemo(() => all.filter((e) => e.source_type !== "order"), [all])
  const manualTotal = useMemo(
    () => manualRows.reduce((s, e) => s + Number(e.amount || 0), 0),
    [manualRows]
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-ui-fg-subtle">
        <Spinner className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Text weight="plus">Courier fees</Text>
          <Text size="small" className="text-ui-fg-subtle">
            Delivery partner charges (Pathao, Steadfast, RedX, etc.) — both per-order delivery fees
            synced from Order Processing and bulk/manual courier settlement bills. Offsets delivery
            margin in P&L.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setOpen(true)}>
          <Plus /> Record courier fee
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          label={month === ALL ? "Total courier fees (all time)" : `Courier fees — ${monthLabel(month)}`}
          value={money(shownTotal, cur)}
          hint={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
          emphasis
        />
        <Kpi
          label="Order-linked courier fees"
          value={money(orderTotal, cur)}
          hint={`${orderLinkedRows.length} order parcels`}
        />
        <Kpi
          label="Manual / bulk courier bills"
          value={money(manualTotal, cur)}
          hint={`${manualRows.length} payment entries`}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-y-1">
            <Label size="small">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <Select.Trigger className="w-48">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={ALL}>All time</Select.Item>
                {months.map((m) => (
                  <Select.Item key={m} value={m}>
                    {monthLabel(m)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div className="flex flex-col gap-y-1">
            <Label size="small">Source</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <Select.Trigger className="w-44">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={ALL}>All sources</Select.Item>
                <Select.Item value="order">Order-linked only</Select.Item>
                <Select.Item value="manual">Manual / bulk only</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>

        <Text size="xsmall" className="text-ui-fg-muted">
          Showing {rows.length} of {all.length} entries
        </Text>
      </div>

      <div className="overflow-x-auto rounded-lg border border-ui-border-base">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Origin</Table.HeaderCell>
              <Table.HeaderCell>Reference</Table.HeaderCell>
              <Table.HeaderCell>Description</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Amount</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((e) => (
              <Table.Row key={e.id}>
                <Table.Cell className="whitespace-nowrap">
                  {new Date(e.entry_date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Table.Cell>
                <Table.Cell>
                  {e.source_type === "order" ? (
                    <Badge color="blue" size="2xsmall">
                      Order #{e.source_id ? e.source_id.slice(-6) : ""}
                    </Badge>
                  ) : (
                    <Badge color="grey" size="2xsmall">
                      Manual / Bulk
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell className="font-mono text-xs">
                  {e.reference || <span className="text-ui-fg-muted">—</span>}
                </Table.Cell>
                <Table.Cell className="max-w-[320px] truncate">
                  {e.description || <span className="text-ui-fg-muted">—</span>}
                </Table.Cell>
                <Table.Cell className="text-right font-medium text-ui-tag-red-text">
                  {money(e.amount, cur)}
                </Table.Cell>
                <Table.Cell>
                  {e.source_type === "manual" ? (
                    <button
                      className="text-ui-fg-muted hover:text-ui-fg-error"
                      onClick={() => onDelete(e)}
                      aria-label="Delete courier fee"
                    >
                      <Trash />
                    </button>
                  ) : (
                    <span className="text-ui-fg-muted text-xs" title="Managed via Order Processing">
                      —
                    </span>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
            {rows.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={6}>
                  <Text size="small" className="py-4 text-ui-fg-muted">
                    {all.length === 0 ? "No courier fees recorded yet." : "No courier fees matching filter."}
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      {open && <AddCourierModal onClose={() => setOpen(false)} onSaved={invalidate} />}
    </div>
  )
}

function AddCourierModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [provider, setProvider] = useState<string>("Steadfast Courier")
  const [customProvider, setCustomProvider] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [reference, setReference] = useState("")
  const [description, setDescription] = useState("")

  const amountNum = Number(amount)
  const valid = amountNum > 0

  const courierName = provider === "Manual / Other" ? customProvider || "Courier" : provider

  const create = useMutation({
    mutationFn: () =>
      api.createLedger({
        entry_date: date.toISOString(),
        category: "courier_fee",
        amount: amountNum,
        reference: reference || courierName,
        description: description || `Courier fee payment — ${courierName}`,
      }),
    onSuccess: () => {
      toast.success("Courier fee payment recorded")
      onSaved()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <FocusModal open onOpenChange={(v) => !v && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Button
            size="small"
            disabled={!valid || create.isPending}
            isLoading={create.isPending}
            onClick={() => create.mutate()}
          >
            Record
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-8">
          <div className="flex w-full max-w-lg flex-col gap-y-4">
            <div>
              <Text weight="plus">Record courier fee payment</Text>
              <Text size="small" className="text-ui-fg-subtle">
                Log a courier company invoice, weekly settlement fee, or manual delivery cost.
              </Text>
            </div>

            <div className="flex flex-col gap-y-1">
              <Label size="small">Courier partner</Label>
              <Select value={provider} onValueChange={setProvider}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {COURIER_PROVIDERS.map((p) => (
                    <Select.Item key={p} value={p}>
                      {p}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            {provider === "Manual / Other" && (
              <div className="flex flex-col gap-y-1">
                <Label size="small">Custom courier name</Label>
                <Input
                  value={customProvider}
                  onChange={(e) => setCustomProvider(e.target.value)}
                  placeholder="e.g. Local Delivery Service"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-y-1">
                <Label size="small">Amount (BDT)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">Date</Label>
                <DatePicker value={date} onChange={(d) => d && setDate(d)} />
              </div>
            </div>

            <div className="flex flex-col gap-y-1">
              <Label size="small">Reference / Invoice # / Consignment ID</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. ST-2026-OCT-01 or Consignment #83921"
              />
            </div>

            <div className="flex flex-col gap-y-1">
              <Label size="small">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weekly settlement for 25 parcels"
              />
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
