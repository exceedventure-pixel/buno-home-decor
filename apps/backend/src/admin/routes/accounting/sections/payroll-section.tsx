import { Plus, Spinner, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  DatePicker,
  FocusModal,
  Input,
  Label,
  RadioGroup,
  Select,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { Kpi, money } from "../../../lib/kpi"
import { api, type LedgerEntry } from "../lib/api"
import { PAYROLL_CATEGORIES } from "../lib/categories"

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

const PAYMENT_METHODS = [
  "Bank Transfer",
  "bKash",
  "Nagad",
  "Cash",
  "Cheque",
  "Other",
]

export function PayrollSection() {
  const qc = useQueryClient()
  const prompt = usePrompt()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<string>(ALL)
  const [typeFilter, setTypeFilter] = useState<string>(ALL)

  const results = useQueries({
    queries: PAYROLL_CATEGORIES.map((c) => ({
      queryKey: ["accounting", "ledger", c],
      queryFn: () => api.ledger({ category: c, limit: 100 }),
    })),
  })

  const loading = results.some((r) => r.isLoading)
  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounting"] })

  const allEntries: LedgerEntry[] = useMemo(() => {
    const list = results.flatMap((r) => r.data?.ledger_entries ?? [])
    return list.sort((a, b) => +new Date(b.entry_date) - +new Date(a.entry_date))
  }, [results])

  const del = useMutation({
    mutationFn: (id: string) => api.deleteLedger(id),
    onSuccess: () => {
      toast.success("Payment record removed")
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onDelete = async (e: LedgerEntry) => {
    const isSalary = e.category === "salary"
    const label = isSalary ? "salary payment" : "project payment"
    const ok = await prompt({
      title: `Delete this ${label}?`,
      description: `${e.description || e.category_label} — ${money(e.amount, cur)}. This removes the payment from your books.`,
    })
    if (ok) del.mutate(e.id)
  }

  // Months available
  const months = useMemo(() => {
    const set = new Set(allEntries.map((e) => monthKey(e.entry_date)))
    return [...set].sort().reverse()
  }, [allEntries])

  // Filtered rows
  const rows = useMemo(() => {
    return allEntries.filter((e) => {
      const matchMonth = month === ALL || monthKey(e.entry_date) === month
      const matchType = typeFilter === ALL || e.category === typeFilter
      return matchMonth && matchType
    })
  }, [allEntries, month, typeFilter])

  const shownTotal = useMemo(() => rows.reduce((s, e) => s + Number(e.amount || 0), 0), [rows])

  const salaryRows = useMemo(() => allEntries.filter((e) => e.category === "salary"), [allEntries])
  const salaryTotal = useMemo(
    () => salaryRows.reduce((s, e) => s + Number(e.amount || 0), 0),
    [salaryRows]
  )

  const projectRows = useMemo(
    () => allEntries.filter((e) => e.category === "project_payment"),
    [allEntries]
  )
  const projectTotal = useMemo(
    () => projectRows.reduce((s, e) => s + Number(e.amount || 0), 0),
    [projectRows]
  )

  if (loading) {
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
          <Text weight="plus">Employee Salaries & Project Payments</Text>
          <Text size="small" className="text-ui-fg-subtle">
            Track regular monthly staff payroll and project-based disbursements for freelancers,
            craftsmen, and specialized assignments.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setOpen(true)}>
          <Plus /> Record payment
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          label={month === ALL ? "Total compensation paid" : `Paid in ${monthLabel(month)}`}
          value={money(shownTotal, cur)}
          hint={`${rows.length} payment record${rows.length === 1 ? "" : "s"}`}
          emphasis
        />
        <Kpi
          label="Employee salaries (all time)"
          value={money(salaryTotal, cur)}
          hint={`${salaryRows.length} salary payments`}
        />
        <Kpi
          label="Project payments (all time)"
          value={money(projectTotal, cur)}
          hint={`${projectRows.length} contractor / project payments`}
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
            <Label size="small">Payment Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <Select.Trigger className="w-48">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={ALL}>All types</Select.Item>
                <Select.Item value="salary">Employee salaries</Select.Item>
                <Select.Item value="project_payment">Project-based payments</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>

        <Text size="xsmall" className="text-ui-fg-muted">
          Showing {rows.length} of {allEntries.length} entries
        </Text>
      </div>

      <div className="overflow-x-auto rounded-lg border border-ui-border-base">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>Recipient / Staff</Table.HeaderCell>
              <Table.HeaderCell>Project / Period / Details</Table.HeaderCell>
              <Table.HeaderCell>Method & Ref</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Amount</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((e) => {
              const meta = (e.metadata as Record<string, any>) || {}
              const recipient = meta.recipient_name || meta.employee_name || meta.contractor_name
              const isSalary = e.category === "salary"

              return (
                <Table.Row key={e.id}>
                  <Table.Cell className="whitespace-nowrap">
                    {new Date(e.entry_date).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Table.Cell>
                  <Table.Cell>
                    {isSalary ? (
                      <Badge color="green" size="2xsmall">
                        Employee Salary
                      </Badge>
                    ) : (
                      <Badge color="purple" size="2xsmall">
                        Project Payment
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell className="font-medium">
                    {recipient || <span className="text-ui-fg-muted">—</span>}
                  </Table.Cell>
                  <Table.Cell className="max-w-[280px]">
                    <div className="flex flex-col">
                      <span className="truncate">{e.description || "—"}</span>
                      {meta.project_name && (
                        <span className="text-ui-fg-muted text-xs">
                          Project: {meta.project_name}
                        </span>
                      )}
                      {meta.salary_period && (
                        <span className="text-ui-fg-muted text-xs">
                          Period: {meta.salary_period}
                        </span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap text-xs">
                    {e.reference ? (
                      <span className="font-mono">{e.reference}</span>
                    ) : meta.payment_method ? (
                      <span>{meta.payment_method}</span>
                    ) : (
                      <span className="text-ui-fg-muted">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-right font-medium text-ui-tag-red-text">
                    {money(e.amount, cur)}
                  </Table.Cell>
                  <Table.Cell>
                    {e.source_type === "manual" && (
                      <button
                        className="text-ui-fg-muted hover:text-ui-fg-error"
                        onClick={() => onDelete(e)}
                        aria-label="Delete payment entry"
                      >
                        <Trash />
                      </button>
                    )}
                  </Table.Cell>
                </Table.Row>
              )
            })}
            {rows.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={7}>
                  <Text size="small" className="py-4 text-ui-fg-muted">
                    {allEntries.length === 0
                      ? "No salary or project payments recorded yet."
                      : "No payments matching filter."}
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      {open && <AddPaymentModal onClose={() => setOpen(false)} onSaved={invalidate} />}
    </div>
  )
}

function AddPaymentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<"salary" | "project_payment">("salary")
  const [recipientName, setRecipientName] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer")
  const [reference, setReference] = useState("")
  const [projectName, setProjectName] = useState("")
  const [salaryPeriod, setSalaryPeriod] = useState("")
  const [notes, setNotes] = useState("")

  const amountNum = Number(amount)
  const valid = amountNum > 0 && recipientName.trim().length > 0

  const create = useMutation({
    mutationFn: () => {
      const isSalary = category === "salary"
      const desc = isSalary
        ? `Salary — ${recipientName}${salaryPeriod ? ` (${salaryPeriod})` : ""}${notes ? `: ${notes}` : ""}`
        : `Project pay — ${recipientName}${projectName ? ` (${projectName})` : ""}${notes ? `: ${notes}` : ""}`

      const refText = [paymentMethod, reference].filter(Boolean).join(" - ")

      return api.createLedger({
        entry_date: date.toISOString(),
        category,
        amount: amountNum,
        reference: refText || null,
        description: desc,
        metadata: {
          recipient_name: recipientName.trim(),
          payment_type: category,
          payment_method: paymentMethod,
          reference_id: reference.trim() || null,
          salary_period: isSalary ? salaryPeriod.trim() || null : null,
          project_name: !isSalary ? projectName.trim() || null : null,
          notes: notes.trim() || null,
        },
      })
    },
    onSuccess: () => {
      toast.success(category === "salary" ? "Employee salary recorded" : "Project payment recorded")
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
            Record payment
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-8">
          <div className="flex w-full max-w-lg flex-col gap-y-4">
            <div>
              <Text weight="plus">Record Compensation Payment</Text>
              <Text size="small" className="text-ui-fg-subtle">
                Log employee salary payments or project-based contractor and freelancer fees.
              </Text>
            </div>

            {/* Payment Type Toggle */}
            <div className="flex flex-col gap-y-2 rounded-lg border border-ui-border-base p-3">
              <Label size="small">Payment Type</Label>
              <RadioGroup
                value={category}
                onValueChange={(v) => setCategory(v as "salary" | "project_payment")}
                className="flex items-center gap-x-6"
              >
                <div className="flex items-center gap-x-2">
                  <RadioGroup.Item value="salary" id="salary-radio" />
                  <Label htmlFor="salary-radio" size="small" className="cursor-pointer font-medium">
                    Employee Salary
                  </Label>
                </div>
                <div className="flex items-center gap-x-2">
                  <RadioGroup.Item value="project_payment" id="project-radio" />
                  <Label htmlFor="project-radio" size="small" className="cursor-pointer font-medium">
                    Project-Based Payment
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Recipient */}
            <div className="flex flex-col gap-y-1">
              <Label size="small">
                {category === "salary" ? "Employee name *" : "Contractor / Worker / Freelancer name *"}
              </Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={category === "salary" ? "e.g. Rahat Ahmed" : "e.g. Sajib Woodcrafts"}
              />
            </div>

            {category === "salary" ? (
              <div className="flex flex-col gap-y-1">
                <Label size="small">Salary month / period</Label>
                <Input
                  value={salaryPeriod}
                  onChange={(e) => setSalaryPeriod(e.target.value)}
                  placeholder="e.g. October 2026 or Oct 1 - Oct 31"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-y-1">
                <Label size="small">Project name / Scope of work</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Teak Dining Table Carving / Photoshoot"
                />
              </div>
            )}

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-y-1">
                <Label size="small">Amount (BDT) *</Label>
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
                <Label size="small">Payment date</Label>
                <DatePicker value={date} onChange={(d) => d && setDate(d)} />
              </div>
            </div>

            {/* Payment Method & Reference */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-y-1">
                <Label size="small">Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {PAYMENT_METHODS.map((m) => (
                      <Select.Item key={m} value={m}>
                        {m}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>

              <div className="flex flex-col gap-y-1">
                <Label size="small">Reference / TxID / Cheque #</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. TR-94812 or bKash TrxID"
                />
              </div>
            </div>

            {/* Notes / Description */}
            <div className="flex flex-col gap-y-1">
              <Label size="small">Notes / Additional details</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Full month salary + transport allowance"
              />
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
