export const PRODUCT_REVIEW_MODULE = "productReview"

/** A review's moderation state. `pending` until a human approves; only `approved` shows publicly. */
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]
