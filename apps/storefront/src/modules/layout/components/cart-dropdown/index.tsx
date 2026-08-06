"use client"

import { ShoppingCart } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

/**
 * The cart trigger in the nav.
 *
 * Clicking it — at ANY width — opens the slide-out cart drawer rather than navigating to a /cart
 * page. The drawer's "Checkout" button then goes straight to checkout, so the separate cart page
 * step is skipped entirely. (The old desktop hover dropdown is gone; the drawer is the one cart UI
 * on every breakpoint.)
 *
 * It also pops the drawer open automatically when an item is added, so shoppers get immediate
 * confirmation without hunting for the cart icon.
 */
const CartDropdown = ({ cart }: { cart?: HttpTypes.StoreCart | null }) => {
  const totalItems =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
  const pathname = usePathname()
  const prevCount = useRef(totalItems)

  const openDrawer = () =>
    document.dispatchEvent(new CustomEvent("cart-drawer-open"))

  useEffect(() => {
    // Don't auto-open on the cart/checkout pages — the shopper is already looking at their items.
    const onCartPage =
      pathname.includes("/cart") || pathname.includes("/checkout")
    if (totalItems > prevCount.current && !onCartPage) {
      openDrawer()
    }
    prevCount.current = totalItems
  }, [totalItems, pathname])

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="hover:text-ui-fg-base flex flex-col items-center gap-0.5 relative"
      data-testid="nav-cart-link"
      aria-label={`Open cart, ${totalItems} item${totalItems === 1 ? "" : "s"}`}
    >
      <span className="relative">
        <ShoppingCart className="w-5 h-5" />
        {totalItems > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[var(--brand-primary)] text-white text-[9px] font-bold leading-none w-4 h-4 rounded-full flex items-center justify-center">
            {totalItems > 9 ? "9+" : totalItems}
          </span>
        )}
      </span>
      <span className="text-[10px] leading-none">Cart</span>
    </button>
  )
}

export default CartDropdown
