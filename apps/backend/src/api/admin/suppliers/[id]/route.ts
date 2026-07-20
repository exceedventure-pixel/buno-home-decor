import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { PRODUCT_COST_MODULE } from "../../../../modules/productCost"

/**
 * POST   /admin/suppliers/:id — rename, edit, or retire (`is_active: false`).
 * DELETE /admin/suppliers/:id — remove one.
 *
 * Neither touches past purchases: batches store the supplier NAME, so history keeps whatever was
 * recorded at the time. Retiring is preferred to deleting — it just drops out of the picker.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const id = req.params.id
  const body = (req.body ?? {}) as {
    name?: string
    phone?: string | null
    note?: string | null
    is_active?: boolean
  }
  const svc: any = req.scope.resolve(PRODUCT_COST_MODULE)

  const [existing] = await svc.listSuppliers({ id })
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Supplier not found.")
  }

  const update: Record<string, unknown> = { id }
  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) throw new MedusaError(MedusaError.Types.INVALID_DATA, "A supplier needs a name.")
    update.name = name
  }
  if (body.phone !== undefined) update.phone = body.phone?.trim() || null
  if (body.note !== undefined) update.note = body.note?.trim() || null
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)

  await svc.updateSuppliers([update])
  res.json({ success: true })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(PRODUCT_COST_MODULE)
  await svc.deleteSuppliers([req.params.id])
  res.json({ success: true, id: req.params.id, deleted: true })
}
