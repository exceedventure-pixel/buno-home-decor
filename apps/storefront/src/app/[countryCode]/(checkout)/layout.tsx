import Nav from "@modules/layout/templates/nav"
import brand from "brand.config"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div id="page-wrapper">
      {/* Full site header on checkout too, so shoppers can navigate normally. */}
      <Nav />
      <div
        className="relative min-h-screen bg-[var(--brand-bg)]"
        data-testid="checkout-container"
      >
        {children}
      </div>
      <div className="py-6 w-full flex items-center justify-center border-t border-ui-border-base bg-white">
        <span className="text-xs text-ui-fg-muted">
          &copy; {new Date().getFullYear()} {brand.storeName}
        </span>
      </div>
    </div>
  )
}
