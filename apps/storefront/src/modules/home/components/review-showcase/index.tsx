import { Star } from "lucide-react"
import type { ReviewShowcaseSection, SectionProps } from "@modules/home/types"

type Props = SectionProps & { variant: "grid" | "carousel" }

function Stars({ value }: { value: number }) {
  const filled = Math.round(value)
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={15}
          height={15}
          className={i <= filled ? "text-amber-400" : "text-gray-300"}
          fill={i <= filled ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

function ReviewCard({ r }: { r: ReviewShowcaseSection["reviews"][0] }) {
  return (
    <figure className="flex h-full flex-col gap-y-3 rounded-2xl border border-ui-border-base bg-ui-bg-base p-5">
      {r.image_url && (
        <div className="overflow-hidden rounded-xl">
          {/* A customer photo or a screenshot of the review — object-contain so a tall screenshot
              isn't cropped to nonsense. */}
          <img
            src={r.image_url}
            alt={`Review from ${r.author}`}
            loading="lazy"
            className="max-h-64 w-full bg-ui-bg-subtle object-contain"
          />
        </div>
      )}

      {r.rating ? <Stars value={r.rating} /> : null}

      <blockquote className="flex-1 text-sm leading-relaxed text-ui-fg-subtle">
        “{r.text}”
      </blockquote>

      <figcaption className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ui-fg-base">{r.author}</span>
          {r.location && <span className="block truncate text-xs text-ui-fg-muted">{r.location}</span>}
        </span>
        {r.source && (
          <span className="shrink-0 rounded-full bg-ui-bg-subtle px-2.5 py-1 text-[11px] font-medium text-ui-fg-subtle">
            {r.source}
          </span>
        )}
      </figcaption>
    </figure>
  )
}

export function ReviewShowcase({ section, variant }: Props) {
  const { reviews, heading, subheading } = section as ReviewShowcaseSection
  if (!reviews || reviews.length === 0) return null

  return (
    <div className="content-container py-10">
      {(heading || subheading) && (
        <div className="mb-6 flex flex-col gap-y-1">
          {heading && <h2 className="text-2xl font-semibold text-ui-fg-base">{heading}</h2>}
          {subheading && <p className="text-sm text-ui-fg-subtle">{subheading}</p>}
        </div>
      )}

      {variant === "carousel" ? (
        <div className="flex snap-x gap-4 overflow-x-auto pb-2 no-scrollbar">
          {reviews.map((r) => (
            <div key={r.id} className="w-72 shrink-0 snap-start">
              <ReviewCard r={r} />
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 small:grid-cols-2 medium:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <ReviewCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
