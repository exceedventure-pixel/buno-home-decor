import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  /** Draw attention until the shopper has consciously picked this option. */
  highlight?: boolean
  "data-testid"?: string
}

/**
 * Best-effort colour-name → swatch. Home-decor options are free text ("Navy Blue", "Off White"),
 * so this maps the common ones; anything unrecognised simply renders without a dot.
 */
const COLOR_HEX: Record<string, string> = {
  red: "#ef4444", "dark red": "#991b1b", maroon: "#7f1d1d", crimson: "#dc2626",
  blue: "#3b82f6", navy: "#1e3a8a", "navy blue": "#1e3a8a", "sky blue": "#38bdf8", "royal blue": "#1d4ed8",
  green: "#22c55e", "dark green": "#166534", olive: "#4d7c0f", "light green": "#86efac",
  yellow: "#eab308", gold: "#d4af37", mustard: "#d69e2e",
  orange: "#f97316", pink: "#ec4899", "hot pink": "#db2777", purple: "#a855f7", violet: "#8b5cf6",
  brown: "#92400e", tan: "#d2b48c", beige: "#e8dcc4", cream: "#f5efdc", ivory: "#fffff0",
  black: "#111827", white: "#ffffff", "off white": "#faf7f0", "off-white": "#faf7f0",
  gray: "#6b7280", grey: "#6b7280", silver: "#c0c0c0", charcoal: "#374151",
  teal: "#14b8a6", cyan: "#06b6d4", magenta: "#d946ef", rust: "#b45309", copper: "#b87333",
}

const resolveColor = (value: string): string | null =>
  COLOR_HEX[value.trim().toLowerCase()] ?? null

const isColorOption = (title: string): boolean => /colou?r/i.test(title)

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  highlight = false,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)
  const isColor = isColorOption(title)
  // Only nudge while nothing has been chosen for this option AND the field is live.
  const nudge = highlight && !disabled

  return (
    <div
      className={clx(
        "flex flex-col gap-y-3 rounded-xl border p-3 transition-all duration-300",
        nudge
          ? "border-[#fcbc06] bg-[#fffdf5] shadow-[0_0_0_3px_rgba(252,188,6,0.18)]"
          : "border-ui-border-base bg-transparent"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ui-fg-base">
          Select {title}
          {current && (
            <span className="ml-1.5 font-normal text-ui-fg-subtle">— {current}</span>
          )}
        </span>

        {/* The "something moving" nudge — a bouncing pill pointing shoppers at the choices. */}
        {nudge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fcbc06] px-2 py-0.5 text-[11px] font-semibold text-gray-900 animate-bounce">
            {isColor ? "Pick a colour" : "Please choose"}
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </span>
        )}
      </div>

      <div
        className="flex flex-wrap gap-2"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => {
          const isSelected = v === current
          const swatch = isColor ? resolveColor(v) : null
          return (
            <button
              onClick={() => updateOption(option.id, v)}
              key={v}
              type="button"
              className={clx(
                "group relative flex items-center gap-x-2 rounded-lg border px-3 py-2 text-sm transition-all duration-150",
                isSelected
                  ? "border-[#fcbc06] bg-[#fffdf5] font-semibold text-ui-fg-base ring-2 ring-[#fcbc06] ring-offset-1"
                  : "border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle hover:border-ui-border-interactive hover:shadow-elevation-card-rest",
                { "opacity-40 cursor-not-allowed": disabled }
              )}
              disabled={disabled}
              aria-pressed={isSelected}
              data-testid="option-button"
            >
              {swatch !== null && (
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-black/15 shadow-inner"
                  style={{ backgroundColor: swatch }}
                  aria-hidden
                />
              )}
              {v}
              {isSelected && (
                <svg className="h-4 w-4 shrink-0 text-[#b8860b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
