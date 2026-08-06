import { Select } from "@medusajs/ui"

/**
 * Shared month picker for the accounting tabs.
 *
 * A month value is "YYYY-MM" (or the sentinel "all"). `monthRange` turns it into the ISO
 * from/to the accounting APIs already accept (dashboard profit block, ledger entry_date).
 */

export type MonthOption = { value: string; label: string }

export function currentMonthValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function buildMonthOptions(count = 12, includeAll = false): MonthOption[] {
  const opts: MonthOption[] = includeAll ? [{ value: "all", label: "All time" }] : []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({
      value: currentMonthValue(d),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    })
  }
  return opts
}

/** ISO from/to for a month value. `all` (or empty) → no bounds. Month → first day 00:00 to last day 23:59. */
export function monthRange(value: string): { from?: string; to?: string } {
  if (!value || value === "all") return {}
  const [y, m] = value.split("-").map(Number)
  const from = new Date(y, m - 1, 1, 0, 0, 0, 0)
  const to = new Date(y, m, 0, 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function labelForMonth(value: string): string {
  if (!value || value === "all") return "All time"
  const [y, m] = value.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

export function MonthSelect({
  value,
  onChange,
  includeAll = false,
  count = 12,
}: {
  value: string
  onChange: (v: string) => void
  includeAll?: boolean
  count?: number
}) {
  const options = buildMonthOptions(count, includeAll)
  return (
    <Select value={value} onValueChange={onChange}>
      <Select.Trigger className="w-[190px]">
        <Select.Value placeholder="Select month" />
      </Select.Trigger>
      <Select.Content>
        {options.map((o) => (
          <Select.Item key={o.value} value={o.value}>
            {o.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}
