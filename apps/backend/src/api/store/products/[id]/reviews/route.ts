import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/productReview"

/**
 * GET  /store/products/:id/reviews — approved reviews + a rating summary. Public.
 * POST /store/products/:id/reviews — submit a review. Public, lands as `pending` (moderated).
 *
 * Anyone can post: a guest name, 1–5 stars, text, and optional photos (uploaded first via
 * /store/product-reviews/upload). Nothing shows until an admin approves it.
 */

const MAX_IMAGES = 5

function shape(r: any) {
  return {
    id: r.id,
    author_name: r.author_name,
    rating: Number(r.rating) || 0,
    title: r.title ?? null,
    content: r.content,
    images: Array.isArray(r.images) ? r.images : [],
    created_at: r.created_at,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(PRODUCT_REVIEW_MODULE)
  const productId = req.params.id

  const reviews = await svc.listProductReviews(
    { product_id: productId, status: "approved" },
    { order: { created_at: "DESC" }, take: 500 }
  )

  const count = reviews.length
  const sum = reviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0)
  const average = count ? Math.round((sum / count) * 10) / 10 : 0

  // Stars 5→1, so the storefront can draw the distribution bars without recomputing.
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r: any) => Number(r.rating) === star).length,
  }))

  res.json({
    summary: { count, average, breakdown },
    reviews: reviews.map(shape),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(PRODUCT_REVIEW_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productId = req.params.id

  const body = (req.body ?? {}) as {
    author_name?: string
    rating?: number | string
    title?: string
    content?: string
    images?: string[]
  }

  const author_name = (body.author_name ?? "").trim()
  const content = (body.content ?? "").trim()
  const rating = Math.round(Number(body.rating))
  const title = (body.title ?? "").trim() || null
  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === "string" && u).slice(0, MAX_IMAGES)
    : []

  if (!author_name) return res.status(400).json({ message: "Please add your name." })
  if (!content) return res.status(400).json({ message: "Please write your review." })
  if (!Number.isFinite(rating) || rating < 1 || rating > 5)
    return res.status(400).json({ message: "Please choose a rating from 1 to 5 stars." })

  // Cheap existence + published check, so reviews can't be attached to a bogus id.
  try {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "status"],
      filters: { id: productId },
    })
    const product = data?.[0]
    if (!product || product.status !== "published") {
      return res.status(404).json({ message: "Product not found." })
    }
  } catch {
    return res.status(404).json({ message: "Product not found." })
  }

  // Capture the customer id when a logged-in shopper happens to review — context only, never required.
  const customerId = (req as any).auth_context?.actor_id ?? null

  await svc.createProductReviews({
    product_id: productId,
    customer_id: customerId,
    author_name: author_name.slice(0, 120),
    rating,
    title: title ? title.slice(0, 160) : null,
    content: content.slice(0, 4000),
    images,
    status: "pending",
  })

  res.status(201).json({
    success: true,
    message: "Thanks! Your review was submitted and will appear once it's approved.",
  })
}
