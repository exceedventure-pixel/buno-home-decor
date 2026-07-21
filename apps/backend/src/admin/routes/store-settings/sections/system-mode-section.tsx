import { Badge, Button, Container, Input, Label, Prompt, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { adminFetch } from "../../../lib/api"
import { useSystemMode, type SystemMode } from "../../../lib/system-mode"

const PHRASE: Record<SystemMode, string> = {
  basic: "roll to basic",
  advanced: "roll to advanced",
}

const WHAT: Record<SystemMode, { title: string; points: string[] }> = {
  basic: {
    title: "Basic",
    points: [
      "Stock quantity typed up and down, the standard Medusa way",
      "One cost price per variant",
      "Sales Insights, orders, courier booking and delivery margin all work",
      "No Cash Book, partners, fixed assets, marketing, FIFO batches or suppliers",
    ],
  },
  advanced: {
    title: "Advanced",
    points: [
      "Restocking batch by batch, each with its own landed cost (FIFO)",
      "Cash Book, partners, fixed assets and marketing spend",
      "Suppliers, and true inventory value / net worth",
      "Stock can only change through restock, found, write-off or hard adjust",
    ],
  },
}

/**
 * SWITCHING THE SHAPE OF THE SYSTEM.
 *
 * Rolling RESETS the store rather than converting it. That is deliberate: carrying data across
 * would leave stock with no cost layer behind it and a Cash Book with a hole in it, and cost of
 * goods would mean one thing before the switch and another after. A clean start in the new mode
 * has no such ambiguity — at the price of the history, which is why the confirmation names exactly
 * what is about to be destroyed.
 */
export function SystemModeSection() {
  const qc = useQueryClient()
  const { mode, counts, isLoading } = useSystemMode()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")

  const target: SystemMode = mode === "advanced" ? "basic" : "advanced"
  const phrase = PHRASE[target]
  const ok = typed.trim().toLowerCase() === phrase

  const roll = useMutation({
    mutationFn: () =>
      adminFetch<{ success: boolean; mode: SystemMode; summary: Record<string, number> }>(
        "/system-mode/roll",
        { method: "POST", body: JSON.stringify({ to: target, confirm: typed.trim().toLowerCase() }) }
      ),
    onSuccess: (r) => {
      toast.success(`Now running the ${r.mode} system — the store has been reset.`)
      setOpen(false)
      setTyped("")
      // Everything on screen was computed under the old mode.
      qc.invalidateQueries()
    },
    onError: (e: Error) => toast.error(e.message || "Roll failed"),
  })

  if (isLoading || !mode) return null

  const current = WHAT[mode]
  const other = WHAT[target]

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-5">
      <div className="flex items-center gap-x-2">
        <Text size="small" weight="plus">
          Current system
        </Text>
        <Badge size="2xsmall" color={mode === "advanced" ? "green" : "grey"}>
          {current.title}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-ui-border-strong bg-ui-bg-subtle p-3">
          <Text size="small" weight="plus">
            {current.title} — running now
          </Text>
          <ul className="mt-1 list-disc pl-4">
            {current.points.map((p) => (
              <li key={p}>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {p}
                </Text>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-ui-border-base p-3">
          <Text size="small" weight="plus">
            {other.title} — what you'd switch to
          </Text>
          <ul className="mt-1 list-disc pl-4">
            {other.points.map((p) => (
              <li key={p}>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {p}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border-base pt-4">
        <Text size="xsmall" className="text-ui-fg-muted">
          Rolling resets the store and starts {other.title.toLowerCase()} clean. Products,
          categories, prices and customers are kept — orders, the Cash Book and stock history are
          not.
        </Text>
        <Button size="small" variant="danger" onClick={() => { setTyped(""); setOpen(true) }}>
          Roll to {other.title}
        </Button>
      </div>

      <Prompt open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Roll to {other.title}?</Prompt.Title>
            <Prompt.Description>
              This cannot be undone. The store is reset so {other.title.toLowerCase()} starts from a
              clean, consistent state.
            </Prompt.Description>
          </Prompt.Header>

          <div className="flex flex-col gap-y-3 px-6 pb-2">
            <div className="rounded-lg border border-ui-tag-red-border bg-ui-tag-red-bg p-3">
              <Text size="xsmall" weight="plus" className="text-ui-tag-red-text">
                Permanently deleted:
              </Text>
              <ul className="mt-1 list-disc pl-4">
                <li>
                  <Text size="xsmall" className="text-ui-tag-red-text">
                    {counts?.orders ?? 0} order(s) — and order numbering restarts at #1
                  </Text>
                </li>
                <li>
                  <Text size="xsmall" className="text-ui-tag-red-text">
                    {counts?.ledger_rows ?? 0} Cash Book row(s)
                  </Text>
                </li>
                <li>
                  <Text size="xsmall" className="text-ui-tag-red-text">
                    {counts?.batches ?? 0} stock batch(es) · {counts?.suppliers ?? 0} supplier(s)
                  </Text>
                </li>
                <li>
                  <Text size="xsmall" className="text-ui-tag-red-text">
                    All stock quantities set to 0
                  </Text>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-ui-border-base p-3">
              <Text size="xsmall" weight="plus">
                Kept:
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Products, categories, prices, settings, and {counts?.customers ?? 0} customer
                account(s).
              </Text>
            </div>

            <div className="flex flex-col gap-y-1">
              <Label size="small">Type “{phrase}” to confirm</Label>
              <Input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={phrase}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ok && !roll.isPending) roll.mutate()
                }}
              />
            </div>
          </div>

          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Button
              size="small"
              variant="danger"
              disabled={!ok || roll.isPending}
              onClick={() => ok && roll.mutate()}
            >
              {roll.isPending ? "Rolling…" : `Roll to ${other.title}`}
            </Button>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}
