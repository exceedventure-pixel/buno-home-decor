import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { PRODUCT_REVIEW_MODULE } from "../../../modules/productReview"
import { REVIEW_STATUSES } from "../../../modules/productReview/constants"

/**
 * GET /admin/product-reviews[?status=&product_id=] — the moderation queue.
 *
 * Returns reviews (newest first), per-status counts for the tabs, and each review's product title
 * + thumbnail (joined by id, since product_id is a plain text id, not a module link).
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(PRODUCT_REVIEW_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { status, product_id } = req.query as { status?: string; product_id?: string }

  const filters: Record<string, unknown> = {}
  if (status && REVIEW_STATUSES.includes(status as any)) filters.status = status
  if (product_id) filters.product_id = product_id

  const [reviews, all] = await Promise.all([
    svc.listProductReviews(filters, { order: { created_at: "DESC" }, take: 1000 }),
    svc.listProductReviews({}, { take: 100000 }),
  ])

  const counts = { pending: 0, approved: 0, rejected: 0 } as Record<string, number>
  for (const r of all) counts[r.status] = (counts[r.status] ?? 0) + 1

  // Resolve product titles/thumbnails in one query.
  const ids: string[] = [...new Set<string>(reviews.map((r: any) => String(r.product_id)))]
  const productMap = new Map<string, { title: string; thumbnail: string | null; handle: string }>()
  if (ids.length) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "thumbnail", "handle"],
      filters: { id: ids },
    })
    for (const p of data ?? [])
      productMap.set(p.id, { title: p.title, thumbnail: p.thumbnail ?? null, handle: p.handle })
  }

  res.json({
    counts,
    total: reviews.length,
    reviews: reviews.map((r: any) => ({
      id: r.id,
      product_id: r.product_id,
      product: productMap.get(r.product_id) ?? null,
      author_name: r.author_name,
      rating: Number(r.rating) || 0,
      title: r.title ?? null,
      content: r.content,
      images: Array.isArray(r.images) ? r.images : [],
      status: r.status,
      created_at: r.created_at,
    })),
  })
}
