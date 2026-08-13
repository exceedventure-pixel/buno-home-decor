import { model } from "@medusajs/framework/utils"

import { REVIEW_STATUSES } from "../constants"

/**
 * A CUSTOMER REVIEW ON ONE PRODUCT.
 *
 * Anyone can submit (guest name + rating + text + optional photos) — the store has many COD /
 * social-media buyers with no account, so requiring login would silence most real customers. That
 * openness is balanced by MODERATION: every review lands as `pending` and shows publicly only once
 * an admin approves it, which is what keeps spam and abuse off the storefront.
 *
 * `product_id` is a plain text id (no module link) matching the variant_cost / stock_batch
 * convention — cross-module reads stay simple query.graph joins, and a deleted product doesn't
 * cascade-wipe its review history.
 */
const ProductReview = model
  .define("product_review", {
    id: model.id({ prefix: "prev" }).primaryKey(),

    product_id: model.text(),
    // Captured when a logged-in customer happens to review, purely for context — never required.
    customer_id: model.text().nullable(),

    author_name: model.text(),
    // 1–5 whole stars. Validated at the API boundary before it ever reaches here.
    rating: model.number(),
    title: model.text().nullable(),
    content: model.text(),
    // Customer-uploaded photo URLs (moderated with the review). Empty/absent for a text-only review.
    images: model.json().nullable(),

    // pending → approved (public) | rejected (hidden). Defaults to pending: nothing is trusted
    // until a human has looked at it.
    status: model.enum([...REVIEW_STATUSES]).default("pending"),
  })
  .indexes([{ on: ["product_id"] }, { on: ["status"] }])

export default ProductReview
