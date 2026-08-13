import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { PRODUCT_COST_MODULE } from "../../../../modules/productCost"

/**
 * GET /admin/accounting/variants?q=search
 *
 * A slim variant picker for the Restock form. Lives under /accounting so it is gated by the
 * accounting permission — a Finance user can search products to restock without needing the
 * separate `products` grant.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const productSvc: any = req.scope.resolve(Modules.PRODUCT)
  const costSvc: any = req.scope.resolve(PRODUCT_COST_MODULE)

  const q = (req.query.q as string | undefined)?.trim()

  const products = await productSvc.listProducts(q ? { q } : {}, {
    take: 20,
    select: ["id", "title"],
    relations: ["variants"],
  })

  const rows: { variant_id: string; label: string; sku: string | null }[] = []
  for (const p of products) {
    for (const v of p.variants ?? []) {
      rows.push({
        variant_id: v.id,
        label: `${p.title} — ${v.title}`,
        sku: v.sku ?? null,
      })
    }
  }

  const ids = rows.map((r) => r.variant_id)

  /**
   * PREFILL FROM THE LAST RESTOCK, KEEPING UNIT COST AND FREIGHT SEPARATE.
   *
   * `variant_cost.cost` stores the LANDED cost (unit + freight lumped), so prefilling from it put
   * freight into the unit-cost box. The FIFO batch keeps them split, so use the latest restock
   * batch per variant instead: cost = unit_cost, freight = landed − unit. A variant with no
   * restock batch (only a manual variant_cost) falls back to the landed figure with freight 0.
   */
  const [costs, batches] = await Promise.all([
    ids.length ? costSvc.listVariantCosts({ variant_id: ids }) : [],
    ids.length ? costSvc.listStockBatches({ variant_id: ids, source: "restock" }, { take: 100000 }) : [],
  ])
  const costMap = new Map(costs.map((c: any) => [c.variant_id, Number(c.cost) || 0]))

  // Latest restock batch per variant (max received_date).
  const latestBatch = new Map<string, any>()
  for (const b of batches) {
    const prev = latestBatch.get(b.variant_id)
    if (!prev || new Date(b.received_date).getTime() > new Date(prev.received_date).getTime()) {
      latestBatch.set(b.variant_id, b)
    }
  }

  res.json({
    variants: rows.map((r) => {
      const b = latestBatch.get(r.variant_id)
      if (b) {
        const unit = Number(b.unit_cost) || 0
        const landed = Number(b.landed_unit_cost) || 0
        return { ...r, cost: unit, freight: Math.max(0, landed - unit) }
      }
      return { ...r, cost: costMap.get(r.variant_id) ?? 0, freight: 0 }
    }),
  })
}
