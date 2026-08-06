import { isDhakaCity } from "@lib/bd-districts"

/**
 * Storefront copy of Buno's delivery formula — mirrors the backend StandardDeliveryProvider so the
 * amount shown at checkout matches what the order is actually charged.
 *
 *   Inside Dhaka:  ৳100 + ৳50 per item beyond the first
 *   Elsewhere:     ৳150 + ৳50 per item beyond the first
 *
 * Keep in sync with apps/backend/src/lib/shipping/delivery-pricing.ts.
 */
export const DELIVERY_INSIDE_DHAKA = 100
export const DELIVERY_OUTSIDE_DHAKA = 150
export const DELIVERY_PER_EXTRA_ITEM = 50

export function calcDeliveryCharge(
  city: string | null | undefined,
  totalQuantity: number
): number {
  const base = isDhakaCity(city) ? DELIVERY_INSIDE_DHAKA : DELIVERY_OUTSIDE_DHAKA
  const qty = Math.max(1, Math.floor(totalQuantity || 0))
  return base + DELIVERY_PER_EXTRA_ITEM * (qty - 1)
}
