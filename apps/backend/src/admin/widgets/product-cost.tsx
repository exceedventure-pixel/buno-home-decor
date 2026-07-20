import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Label, Select, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { money } from "../lib/kpi"
import { stockApi } from "../lib/stock-api"
import { StockHealthBanner } from "./stock-health-banner"
import { VariantStockPanel } from "./variant-stock-panel"

/**
 * Product-page stock & cost.
 *
 * Nothing is typed here. Cost is the landed cost of the variant's LATEST batch, shown read-only —
 * you set it by restocking, since each batch carries its own cost.
 *
 * ONE panel, with a variant picker above it. It used to stack an identical panel under every
 * variant, which made it impossible to tell at a glance which variant you were about to restock —
 * the forms looked the same and only a small heading above them differed. Choosing the variant
 * explicitly is the whole point of restocking from the product page rather than the variant page.
 *
 * Packaging is deliberately absent: it is no longer a per-unit preset. Packaging is bought and
 * expensed straight to cash in the Accounting → Packaging tab.
 */
const cur = "bdt"

const ProductCostWidget = ({ data: product }: { data: { id: string } }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["variant-costs", product.id],
    queryFn: () => stockApi.listCosts(product.id),
  })

  const rows = data?.variant_costs ?? []
  const [selectedId, setSelectedId] = useState<string>("")

  // Default to the first variant once loaded, and recover if the selected one disappears.
  useEffect(() => {
    if (!rows.length) return
    if (!selectedId || !rows.some((v) => v.variant_id === selectedId)) {
      setSelectedId(rows[0].variant_id)
    }
  }, [rows, selectedId])

  const selected = rows.find((v) => v.variant_id === selectedId) ?? rows[0]

  return (
    <Container className="flex flex-col gap-y-5 px-6 py-6">
      <div>
        <Heading level="h2">Stock &amp; cost</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          <b>Cost</b> is set per batch when you restock — the figure shown is your latest batch's
          landed cost. Sales draw down the oldest batch first (FIFO).
        </Text>
      </div>

      <StockHealthBanner />

      {isLoading ? (
        <Text size="small" className="text-ui-fg-muted">
          Loading…
        </Text>
      ) : rows.length === 0 ? (
        <Text size="small" className="text-ui-fg-muted">
          No variants on this product.
        </Text>
      ) : (
        <div className="flex flex-col gap-y-4">
          {/* Which variant this acts on. Hidden when there's only one — a picker with a single
              option is just noise. */}
          {rows.length > 1 && (
            <div className="flex flex-col gap-y-1">
              <Label size="small">Variant to restock / adjust</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <Select.Trigger>
                  <Select.Value placeholder="Choose a variant" />
                </Select.Trigger>
                <Select.Content>
                  {rows.map((v) => (
                    <Select.Item key={v.variant_id} value={v.variant_id}>
                      {v.title}
                      {v.sku ? ` · ${v.sku}` : ""}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          )}

          {selected && (
            <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <Text size="small" weight="plus" className="truncate">
                    {selected.title}
                  </Text>
                  {selected.sku && (
                    <Text size="xsmall" className="text-ui-fg-muted truncate">
                      {selected.sku}
                    </Text>
                  )}
                </div>
                <div className="flex flex-col gap-y-1">
                  <Label size="small" className="text-ui-fg-muted">
                    Cost / unit (last batch)
                  </Label>
                  <Text size="small" className="text-right font-medium tabular-nums">
                    {money(selected.cost, cur)}
                  </Text>
                </div>
              </div>

              {/* Keyed so switching variant resets the form rather than carrying a half-typed
                  restock across to a different variant. */}
              <VariantStockPanel
                key={selected.variant_id}
                variantId={selected.variant_id}
                cur={cur}
              />
            </div>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductCostWidget
