/**
 * Buno's standard delivery pricing — the ONE place the formula lives on the backend.
 *
 *   Inside Dhaka:  ৳100 + ৳50 for each item beyond the first
 *   Elsewhere:     ৳150 + ৳50 for each item beyond the first
 *
 * "Item beyond the first" = total quantity across the cart minus one, so a 3-item order pays for
 * two extras regardless of how the lines are split. The storefront product page mirrors these
 * numbers (see product-actions); keep the two in step if they ever change.
 */
export const DELIVERY_INSIDE_DHAKA = 100
export const DELIVERY_OUTSIDE_DHAKA = 150
export const DELIVERY_PER_EXTRA_ITEM = 50

/** The exact district string the in-Dhaka rate keys on (matches the storefront district list). */
export const DHAKA_CITY = "Dhaka"

export function isDhaka(city?: string | null): boolean {
  return (city ?? "").trim().toLowerCase() === DHAKA_CITY.toLowerCase()
}

/**
 * Delivery charge for a whole order. `totalQuantity` is the summed quantity of every line item;
 * anything below 1 is treated as 1 so a cart always pays at least the base rate.
 */
export function calcDeliveryCharge(
  city: string | null | undefined,
  totalQuantity: number
): number {
  const base = isDhaka(city) ? DELIVERY_INSIDE_DHAKA : DELIVERY_OUTSIDE_DHAKA
  const qty = Math.max(1, Math.floor(totalQuantity || 0))
  return base + DELIVERY_PER_EXTRA_ITEM * (qty - 1)
}
