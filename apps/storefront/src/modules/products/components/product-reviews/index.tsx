import { getProductReviews } from "@lib/data/reviews"
import Stars from "./stars"
import ReviewForm from "./review-form"

function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? "" : "s"} ago`
  return d.toLocaleDateString()
}

/**
 * Per-product customer reviews — rating summary, the approved reviews, and a submission form.
 * Server component; the form inside is the only client piece. Renders on every product page.
 */
export default async function ProductReviews({ productId }: { productId: string }) {
  const { summary, reviews } = await getProductReviews(productId)

  return (
    <section className="border-t border-gray-200 pt-10" id="reviews">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Summary rail */}
        <div className="lg:w-72 lg:shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Customer Reviews</h2>

          {summary.count > 0 ? (
            <div className="mt-4 flex flex-col gap-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-semibold text-gray-900">{summary.average.toFixed(1)}</span>
                <div className="flex flex-col">
                  <Stars value={summary.average} size={18} />
                  <span className="text-xs text-gray-500">
                    {summary.count} review{summary.count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Distribution */}
              <div className="flex flex-col gap-y-1">
                {summary.breakdown.map(({ star, count }) => {
                  const pct = summary.count ? Math.round((count / summary.count) * 100) : 0
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-6 shrink-0">{star} ★</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <span className="block h-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-6 shrink-0 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No reviews yet — be the first to review this product.</p>
          )}

          <div className="mt-5">
            <ReviewForm productId={productId} />
          </div>
        </div>

        {/* Review list */}
        <div className="min-w-0 flex-1">
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              Once customers review this product, their reviews show here.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100">
              {reviews.map((r) => (
                <li key={r.id} className="flex flex-col gap-y-2 py-5 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} size={15} />
                      <span className="text-sm font-semibold text-gray-900">{r.author_name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                  </div>

                  {r.title && <p className="text-sm font-semibold text-gray-900">{r.title}</p>}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{r.content}</p>

                  {r.images.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {r.images.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer noopener">
                          <img
                            src={url}
                            alt="Customer photo"
                            loading="lazy"
                            className="h-20 w-20 rounded-lg border border-gray-200 object-cover transition-opacity hover:opacity-90"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
