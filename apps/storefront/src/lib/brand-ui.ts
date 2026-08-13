/**
 * Shared brand accent for the storefront content pages — one source of truth.
 *
 * GOLD is a hair deeper than the logo's #fdc904 so it holds up as a standalone accent on white.
 * It's used for fills, underlines, icons and one primary CTA per page — never for body text, where
 * yellow-on-white is too low-contrast (ink/black carries the text).
 */
export const GOLD = "#F0B400"

/** Translucent gold for washes, highlight swipes and soft tints. */
export const goldTint = (alpha: number) => `rgba(240, 180, 0, ${alpha})`
