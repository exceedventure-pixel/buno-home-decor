import { Star } from "lucide-react"

/** Read-only star row. `value` is rounded to the nearest whole star for the fill. */
export default function Stars({
  value,
  size = 16,
  className = "",
}: {
  value: number
  size?: number
  className?: string
}) {
  const filled = Math.round(value)
  return (
    <span className={`inline-flex items-center ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= filled ? "text-amber-400" : "text-gray-300"}
          fill={i <= filled ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}
