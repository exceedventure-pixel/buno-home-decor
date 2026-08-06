"use client"

import { clx } from "@modules/common/components/ui"
import { useState } from "react"

type ProductDescriptionProps = {
  description: string
}

/**
 * Shows the first few lines of the description, then a "See more" toggle to expand — so a long
 * description doesn't push the tabs and related products far down the page.
 *
 * The toggle only appears when the text is actually long enough to be clamped; short descriptions
 * render in full with no dangling button.
 */
export default function ProductDescription({ description }: ProductDescriptionProps) {
  const [expanded, setExpanded] = useState(false)

  const isLong = description.trim().length > 180 || description.split("\n").length > 3

  return (
    <div className="flex flex-col gap-y-1.5">
      <p
        className={clx(
          "text-sm text-ui-fg-subtle leading-relaxed whitespace-pre-line",
          !expanded && isLong && "line-clamp-3"
        )}
        data-testid="product-description"
      >
        {description}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-sm font-semibold text-ui-fg-base underline underline-offset-2 hover:text-ui-fg-subtle transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  )
}
