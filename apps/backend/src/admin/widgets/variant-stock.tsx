import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"

import { SimpleCostPanel } from "../components/simple-cost-panel"
import { useSystemMode } from "../lib/system-mode"
import { VariantStockPanel } from "./variant-stock-panel"

/**
 * The variant page is where people go looking for "Manage location quantity".
 *
 * ADVANCED: the native box is refused by the server, so the sanctioned flow lives right here —
 * restock (costed batch), found, write-off and Hard adjust.
 * BASIC: there are no batches to protect, the native box works, and the only thing this page needs
 * to own is the cost price that Sales Insights multiplies by units shipped.
 */
const VariantStockWidget = ({ data: variant }: { data: { id: string } }) => {
  const { isBasic, isLoading } = useSystemMode()

  if (isLoading) return null

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-6">
      <div>
        <Heading level="h2">{isBasic ? "Stock & cost" : "Stock (batch-managed)"}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {isBasic ? (
            <>
              Quantity is edited in Medusa's own stock section below. Set the <b>cost price</b> here
              — it's what this variant's cost of goods is calculated from.
            </>
          ) : (
            <>
              Stock can't be typed in directly — every unit is backed by a FIFO cost batch, which is
              what keeps COGS and net worth honest. <b>Restock</b> to bring in costed stock, or{" "}
              <b>Hard adjust</b> to correct a count.
            </>
          )}
        </Text>
      </div>

      {isBasic ? (
        <SimpleCostPanel variantId={variant.id} />
      ) : (
        <VariantStockPanel variantId={variant.id} />
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.after",
})

export default VariantStockWidget
