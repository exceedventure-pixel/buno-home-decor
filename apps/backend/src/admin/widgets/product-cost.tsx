import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Label, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

import { money } from "../lib/kpi"
import { stockApi } from "../lib/stock-api"
import { StockHealthBanner } from "./stock-health-banner"
import { VariantStockPanel } from "./variant-stock-panel"

/**
 * Product-page stock & cost.
 *
 * Nothing is typed here. Cost is the landed cost of the variant's LATEST batch, shown read-only —
 * you set it by restocking, since each batch carries its own cost. Below each variant is the full
 * restock / found / write-off panel with its FIFO batch log.
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
        <div className="flex flex-col gap-y-6">
          {rows.map((v) => (
            <div
              key={v.variant_id}
              className="flex flex-col gap-y-3 border-t border-ui-border-base pt-5 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <Text size="small" weight="plus" className="truncate">
                    {v.title}
                  </Text>
                  {v.sku && (
                    <Text size="xsmall" className="text-ui-fg-muted truncate">
                      {v.sku}
                    </Text>
                  )}
                </div>
                <div className="flex flex-col gap-y-1">
                  <Label size="small" className="text-ui-fg-muted">
                    Cost / unit (last batch)
                  </Label>
                  <Text size="small" className="text-right font-medium tabular-nums">
                    {money(v.cost, cur)}
                  </Text>
                </div>
              </div>

              <VariantStockPanel variantId={v.variant_id} cur={cur} />
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductCostWidget
