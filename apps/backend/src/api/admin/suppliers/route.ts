import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { PRODUCT_COST_MODULE } from "../../../modules/productCost"

type SupplierRow = {
  id: string
  name: string
  phone: string | null
  note: string | null
  is_active: boolean
}

/**
 * GET  /admin/suppliers — the list that fills the restock picker.
 *      `?active=true` returns only the ones still in use.
 * POST /admin/suppliers — add one.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(PRODUCT_COST_MODULE)
  const activeOnly = String(req.query.active ?? "") === "true"

  const rows: SupplierRow[] = await svc.listSuppliers(
    activeOnly ? { is_active: true } : {},
    { order: { name: "ASC" }, take: 1000 }
  )

  res.json({ suppliers: rows })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { name?: string; phone?: string; note?: string }
  const name = (body.name ?? "").trim()

  if (!name) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "A supplier needs a name.")
  }

  const svc: any = req.scope.resolve(PRODUCT_COST_MODULE)

  // Names are what batches record, so a duplicate would split one supplier's spend in two.
  const existing: SupplierRow[] = await svc.listSuppliers({ name }, { take: 1 })
  if (existing?.length) {
    throw new MedusaError(MedusaError.Types.DUPLICATE_ERROR, `"${name}" is already a supplier.`)
  }

  const [created] = await svc.createSuppliers([
    {
      name,
      phone: body.phone?.trim() || null,
      note: body.note?.trim() || null,
      is_active: true,
    },
  ])

  res.status(201).json({ supplier: created })
}
