import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { PRODUCT_REVIEW_MODULE } from "../../../../modules/productReview"
import { REVIEW_STATUSES } from "../../../../modules/productReview/constants"

/**
 * POST   /admin/product-reviews/:id — moderate a review (set status: approved | rejected | pending).
 * DELETE /admin/product-reviews/:id — remove it for good.
 *
 * Approving is what makes a review public; rejecting hides it without deleting, so an obvious
 * mistake can be undone. Delete is the hard removal.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(PRODUCT_REVIEW_MODULE)
  const id = req.params.id
  const { status } = (req.body ?? {}) as { status?: string }

  if (!status || !REVIEW_STATUSES.includes(status as any)) {
    return res.status(400).json({ message: `status must be one of: ${REVIEW_STATUSES.join(", ")}` })
  }

  await svc.updateProductReviews({ id, status })
  res.json({ success: true, id, status })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(PRODUCT_REVIEW_MODULE)
  const id = req.params.id
  await svc.deleteProductReviews(id)
  res.json({ success: true, id, deleted: true })
}
