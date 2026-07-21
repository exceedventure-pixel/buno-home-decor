import { Button, Input, Label, Text } from "@medusajs/ui"

/**
 * A MONEY FIELD THAT CAN'T BE CHANGED BY ACCIDENT.
 *
 * `<Input type="number">` has two traps that make it genuinely dangerous for money:
 *   - the SCROLL WHEEL silently increments the value whenever the cursor happens to be over it
 *     while scrolling the page, so a delivery charge can change without anyone touching it;
 *   - the tiny spinner arrows invite ±1 nudges on a figure that should be typed deliberately.
 *
 * So: the wheel is neutralised by blurring on wheel (the field can't take wheel input unless it
 * has focus), the spinners are hidden, and common amounts are offered as one-tap presets instead
 * of something to arrow towards.
 */
export function MoneyInput({
  label,
  value,
  onChange,
  presets,
  hint,
  placeholder = "0",
  disabled,
  className = "",
}: {
  label?: string
  /** Kept as a string so a half-typed value isn't coerced to 0 mid-edit. */
  value: string
  onChange: (v: string) => void
  /** One-tap common amounts, e.g. [100, 150] for delivery. */
  presets?: number[]
  hint?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const current = Number(value) || 0

  return (
    <div className={`flex flex-col gap-y-1 ${className}`}>
      {label && <Label size="small">{label}</Label>}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          // Wheel scrolling over a focused number input changes its value — blur instead, so the
          // page scrolls and the amount doesn't move.
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        {presets?.map((p) => (
          <Button
            key={p}
            type="button"
            size="small"
            variant={current === p ? "primary" : "secondary"}
            disabled={disabled}
            onClick={() => onChange(String(p))}
          >
            ৳{p}
          </Button>
        ))}
      </div>

      {hint && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {hint}
        </Text>
      )}
    </div>
  )
}
