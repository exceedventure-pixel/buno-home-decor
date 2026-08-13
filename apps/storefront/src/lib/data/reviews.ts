const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type ReviewSummary = {
  count: number
  average: number
  breakdown: { star: number; count: number }[]
}

export type StoreReview = {
  id: string
  author_name: string
  rating: number
  title: string | null
  content: string
  images: string[]
  created_at: string
}

export type ProductReviewsData = {
  summary: ReviewSummary
  reviews: StoreReview[]
}

const EMPTY: ProductReviewsData = {
  summary: { count: 0, average: 0, breakdown: [] },
  reviews: [],
}

/** Approved reviews + rating summary for a product. Server-side; safe to call in RSC. */
export async function getProductReviews(productId: string): Promise<ProductReviewsData> {
  try {
    const res = await fetch(`${BACKEND}/store/products/${productId}/reviews`, {
      headers: { "x-publishable-api-key": PK },
      // Reviews change only when an admin approves one — a minute of staleness is fine.
      next: { revalidate: 60 },
    })
    if (!res.ok) return EMPTY
    return (await res.json()) as ProductReviewsData
  } catch {
    return EMPTY
  }
}
