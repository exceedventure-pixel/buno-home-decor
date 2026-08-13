import { IconButton, Input } from "@medusajs/ui"
import { MinusMini, PlusMini } from "@medusajs/icons"

/**
 * A QUANTITY FIELD WITH EXPLICIT −/+ ARROWS THAT THE WHEEL CAN'T TOUCH.
 *
 * A plain `<Input type="number">` has two problems for a quantity: its native spinners are ugly and
 * easy to hide (so there's no click-to-step at all), and the SCROLL WHEEL silently changes the value
 * whenever the cursor is over it while the page scrolls. Here the native spinners are hidden, the
 * wheel is neutralised by blurring, and stepping is done by our own −/+ buttons instead.
 *
 * String in / string out, like MoneyInput, so a half-typed value isn't coerced to 0 mid-edit. The
 * buttons clamp to `min`; typing passes straight through and the caller clamps if it needs to.
 */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  disabled,
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  min?: number
  disabled?: boolean
  className?: string
}) {
  const current = Number(value)
  const hasValue = value.trim() !== "" && Number.isFinite(current)
  const base = hasValue ? current : min
  const step = (delta: number) => {
    // From an empty field, the first "+" lands on `min` (not min+1) and "−" stays at `min`.
    const from = hasValue ? Math.round(current) : delta > 0 ? min - 1 : min
    onChange(String(Math.max(min, from + delta)))
  }

  return (
    <div className={`flex items-center ${className}`}>
      <IconButton
        type="button"
        size="small"
        variant="secondary"
        disabled={disabled || base <= min}
        onClick={() => step(-1)}
        className="rounded-r-none"
        aria-label="Decrease quantity"
      >
        <MinusMini />
      </IconButton>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        // Wheel scrolling over a focused number input changes its value — blur so the page scrolls
        // and the quantity doesn't move.
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        className="w-14 rounded-none border-x-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <IconButton
        type="button"
        size="small"
        variant="secondary"
        disabled={disabled}
        onClick={() => step(1)}
        className="rounded-l-none"
        aria-label="Increase quantity"
      >
        <PlusMini />
      </IconButton>
    </div>
  )
}
