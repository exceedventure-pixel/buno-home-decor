import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { adjustStockWorkflow } from "../../../../workflows/accounting"
import type { AdjustStockSchema } from "../validators"
import { refuseIfBasic } from "../../../../lib/store/system-mode"

// POST /admin/variant-stock/adjust — found/shrinkage from the product page.
export async function POST(
  req: AuthenticatedMedusaRequest<AdjustStockSchema>,
  res: MedusaResponse
) {
  if (await refuseIfBasic(req.scope, res, "Stock adjustment")) return

  const { result } = await adjustStockWorkflow(req.scope).run({ input: req.validatedBody })
  res.status(201).json({ adjustment: result })
}
