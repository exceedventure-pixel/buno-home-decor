import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { reconcileStockWorkflow } from "../../../../workflows/accounting"
import type { HardAdjustSchema } from "../validators"
import { refuseIfBasic } from "../../../../lib/store/system-mode"

// POST /admin/variant-stock/hard-adjust — hard adjust from the product/variant/inventory pages.
export async function POST(
  req: AuthenticatedMedusaRequest<HardAdjustSchema>,
  res: MedusaResponse
) {
  if (await refuseIfBasic(req.scope, res, "Hard adjust")) return

  const { result } = await reconcileStockWorkflow(req.scope).run({ input: req.validatedBody })
  res.status(201).json({ reconciled: result })
}
