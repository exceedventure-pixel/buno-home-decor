import { Plus, Spinner, Trash } from "@medusajs/icons"
import {
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

/**
 * Packaging = what you SPENT on boxes, tape and wrap, dated.
 *
 * There is no pool and no per-product preset: packaging is expensed straight out of cash the day
 * it's bought, exactly the way the physical book records it. So all this page owes you is the log
 * of purchases and what a given month cost.
 */
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

export function PackagingSection() {
  const qc = useQueryClient()
  const prompt = usePrompt()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<string>(ALL)

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["accounting", "ledger", "packaging"],
    queryFn: () => api.ledger({ category: "packaging_purchase", limit: 500 }),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounting"] })

  const del = useMutation({
    mutationFn: (id: string) => api.deleteLedger(id),
    onSuccess: () => {
      toast.success("Packaging purchase removed")
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onDelete = async (e: LedgerEntry) => {
    const ok = await prompt({
      title: "Delete this packaging purchase?",
      description: `${money(e.amount, cur)} — this removes the expense from your books.`,
    })
    if (ok) del.mutate(e.id)
  }

  const all = useMemo(() => purchases?.ledger_entries ?? [], [purchases])

  // Months that actually have purchases, newest first — no empty options.
  const months = useMemo(() => {
    const set = new Set(all.map((e) => monthKey(e.entry_date)))
    return [...set].sort().reverse()
  }, [all])

  const rows = useMemo(
    () => (month === ALL ? all : all.filter((e) => monthKey(e.entry_date) === month)),
    [all, month]
  )

  const shownTotal = useMemo(() => rows.reduce((s, e) => s + Number(e.amount || 0), 0), [rows])
  const lifetimeTotal = useMemo(() => all.reduce((s, e) => s + Number(e.amount || 0), 0), [all])

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
          <Text weight="plus">Packaging</Text>
          <Text size="small" className="text-ui-fg-subtle">
            What you spent on boxes, tape and wrap. Taken out of cash on the day you buy it — a
            real expense, not stock.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setOpen(true)}>
          <Plus /> Buy packaging
        </Button>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-y-1">
          <Label size="small">Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <Select.Trigger className="w-56">
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
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Kpi
          label={month === ALL ? "Packaging bought (all time)" : `Packaging bought — ${monthLabel(month)}`}
          value={money(shownTotal, cur)}
          hint={`${rows.length} purchase${rows.length === 1 ? "" : "s"}`}
          emphasis
        />
        <Kpi label="Packaging bought (all time)" value={money(lifetimeTotal, cur)} />
      </div>

      <Text size="small" weight="plus" className="mt-2 text-ui-fg-subtle">
        Packaging purchases
      </Text>
      <div className="overflow-x-auto rounded-lg border border-ui-border-base">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Date</Table.HeaderCell>
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
                  {e.description || <span className="text-ui-fg-muted">—</span>}
                </Table.Cell>
                <Table.Cell className="text-right font-medium">{money(e.amount, cur)}</Table.Cell>
                <Table.Cell>
                  <button
                    className="text-ui-fg-muted hover:text-ui-fg-error"
                    onClick={() => onDelete(e)}
                    aria-label="Remove packaging purchase"
                  >
                    <Trash />
                  </button>
                </Table.Cell>
              </Table.Row>
            ))}
            {rows.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={4}>
                  <Text size="small" className="py-4 text-ui-fg-muted">
                    {all.length === 0
                      ? "No packaging purchases yet."
                      : "No packaging bought in this month."}
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      {open && <BuyModal onClose={() => setOpen(false)} onSaved={invalidate} />}
    </div>
  )
}

function BuyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [description, setDescription] = useState("")

  const amountNum = Number(amount)
  const valid = amountNum > 0

  const create = useMutation({
    mutationFn: () =>
      api.createLedger({
        entry_date: date.toISOString(),
        category: "packaging_purchase",
        amount: amountNum,
        description: description || null,
      }),
    onSuccess: () => {
      toast.success("Packaging purchase recorded")
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
            <Text size="small" className="text-ui-fg-subtle">
              A real expense: this comes straight out of cash on the date you pick, and reduces
              that month's profit.
            </Text>
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
              <Label size="small">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 200 boxes + bubble wrap"
              />
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
