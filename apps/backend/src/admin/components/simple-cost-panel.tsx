import { Button, Input, Label, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { adminFetch } from "../lib/api"
import { money } from "../lib/kpi"
import { stockApi } from "../lib/stock-api"

/**
 * BASIC-MODE STOCK & COST.
 *
 * No batches, no restock flow, no write-offs — quantity is edited in Medusa's own stock UI (the
 * guard steps aside in basic mode), and cost is a single price per variant.
 *
 * That cost price is not decoration: it is what Sales Insights multiplies by the units shipped to
 * work out cost of goods. Leave it at zero and every order reports its whole revenue as profit,
 * which is why the panel says so out loud rather than showing a quiet 0.
 */
export function SimpleCostPanel({ variantId, cur = "bdt" }: { variantId: string; cur?: string }) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState(false)

  const { data: stock, isLoading } = useQuery({
    queryKey: ["variant-stock", variantId],
    queryFn: () => stockApi.get(variantId),
  })

  useEffect(() => {
    if (stock && !editing) setDraft(String(stock.latest_cost ?? 0))
  }, [stock?.latest_cost, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () =>
      adminFetch("/variant-costs", {
        method: "POST",
        body: JSON.stringify({ costs: [{ variant_id: variantId, cost: Number(draft) || 0 }] }),
      }),
    onSuccess: () => {
      toast.success("Cost price saved — it drives this product's cost of goods")
      setEditing(false)
      qc.invalidateQueries({ queryKey: ["variant-stock", variantId] })
      qc.invalidateQueries({ queryKey: ["variant-costs"] })
    },
    onError: (e: Error) => toast.error(e.message || "Could not save cost price"),
  })

  if (isLoading) {
    return (
      <Text size="small" className="text-ui-fg-muted">
        Loading…
      </Text>
    )
  }

  const cost = Number(stock?.latest_cost ?? 0)

  return (
    <div className="flex flex-col gap-y-3 rounded-lg border border-ui-border-base p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <Text size="xsmall" className="text-ui-fg-muted">
            On shelf
          </Text>
          <Text size="small" weight="plus">
            {stock?.current_qty ?? 0}
            {(stock?.reserved_qty ?? 0) > 0 ? ` · ${stock?.reserved_qty} reserved` : ""}
          </Text>
        </div>

        <div className="flex flex-col items-end">
          <Text size="xsmall" className="text-ui-fg-muted">
            Cost price / unit
          </Text>
          {editing ? (
            <div className="mt-1 flex items-center gap-x-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                className="w-28"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !save.isPending) save.mutate()
                }}
              />
              <Button size="small" onClick={() => save.mutate()} isLoading={save.isPending}>
                Save
              </Button>
              <Button size="small" variant="transparent" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-x-2">
              <Text size="small" weight="plus">
                {money(cost, cur)}
              </Text>
              <Button size="small" variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>

      {cost <= 0 && (
        <div className="rounded-lg border border-ui-tag-orange-border bg-ui-tag-orange-bg p-2.5">
          <Text size="xsmall" className="text-ui-tag-orange-text">
            No cost price set — Sales Insights will report this product's cost of goods as ৳0, so
            its profit will read too high.
          </Text>
        </div>
      )}

      <Text size="xsmall" className="text-ui-fg-muted">
        <Label size="small">Quantity</Label> is edited in Medusa's own stock section on this page.
        Cost of goods = units shipped × this price.
      </Text>
    </div>
  )
}
