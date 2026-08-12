import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  Clock,
  Mail,
  MessageCircle,
  Package,
  PackageCheck,
  Phone,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react"

/**
 * ORDER TRACKING — how to find where an order is.
 *
 * Honest by design: the store has real tracking for signed-in customers (the account orders page,
 * which shows courier status), but no guest "order number + phone" lookup endpoint exists — so this
 * routes the actions to what genuinely works (account orders; contact for social orders) rather
 * than showing a search box that can't look anything up. Server component for SEO.
 */

const PAGE_TITLE = "Track Your Order"
const PAGE_DESCRIPTION =
  "Track your Buno Home Decor order — check your order status through your account, or contact our " +
  "team for orders placed on Facebook, Instagram or TikTok."

const GOLD = "#F5B301"
const goldTint = (a: number) => `rgba(245, 179, 1, ${a})`

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/order-tracking" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/order-tracking`,
    siteName: brand.storeName,
  },
}

const STATUSES = [
  { icon: CircleCheck, label: "Order Confirmed", note: "Your order has been received and confirmed by our team." },
  { icon: Package, label: "Processing", note: "We're preparing your products for dispatch." },
  { icon: Truck, label: "Shipped / Dispatched", note: "Your order has been handed over for delivery." },
  { icon: MapPinRoute, label: "Out for Delivery", note: "Your order is on its way to your address." },
  { icon: PackageCheck, label: "Delivered", note: "Your order has been successfully delivered." },
] as const

export default function OrderTrackingPage() {
  return (
    <div
      style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}
      className="overflow-hidden"
    >
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60% 55% at 50% 0%, ${goldTint(0.16)} 0%, transparent 70%)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${GOLD} 20%, ${GOLD} 80%, transparent)` }}
        />
        <div className="content-container relative py-20 medium:py-24 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em]"
            style={{ borderColor: goldTint(0.5), color: "var(--brand-primary)", backgroundColor: goldTint(0.1) }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
            Order Tracking
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight small:text-5xl medium:text-6xl">
            Where is your{" "}
            <span className="relative whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full"
                style={{ backgroundColor: goldTint(0.5) }}
              />
              <span className="relative z-10">order?</span>
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            Waiting for your new home décor? Check the latest status of your Buno Home Decor order —
            whether you ordered on our website or through social media, we&apos;ll help you stay
            informed.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink
              href="/account/orders"
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              <UserRound className="h-4 w-4" /> Track in your account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Contact support
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* ── How to track: two paths ──────────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <SectionHead center kicker="How to Track Your Order" title="Two ways, depending on how you ordered" />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 medium:grid-cols-2">
          {/* Website orders */}
          <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-base p-7">
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: goldTint(0.14), color: GOLD }}
            >
              <UserRound className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">Ordered on our website</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ui-fg-subtle">
              Sign in and open your orders to see the latest status and courier updates. Keep your{" "}
              <strong className="font-semibold text-ui-fg-base">order number</strong> and{" "}
              <strong className="font-semibold text-ui-fg-base">phone number</strong> handy — your
              order number is on your order confirmation.
            </p>
            <LocalizedClientLink
              href="/account/orders"
              className="mt-5 inline-flex items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              View my orders <ArrowRight className="h-4 w-4" />
            </LocalizedClientLink>
          </div>

          {/* Social orders */}
          <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-7">
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
            >
              <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">
              Ordered on Facebook, Instagram or TikTok?
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ui-fg-subtle">
              Social orders may not appear in the website&apos;s tracking. Just message our team with
              your name, phone number, and order details (and order number if you have it) — we&apos;ll
              check the latest status for you.
            </p>
            <LocalizedClientLink
              href="/contact"
              className="mt-5 inline-flex items-center gap-2 self-start rounded-full border border-ui-border-strong px-5 py-2.5 text-sm font-semibold text-ui-fg-base transition-colors hover:bg-ui-bg-base"
            >
              Contact us <ArrowUpRight className="h-4 w-4" />
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* ── Order status timeline ────────────────────────────────────────────── */}
      <section className="border-y border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-14 medium:py-20">
          <SectionHead center kicker="Order Status" title="What each stage means" />
          <ol className="mx-auto mt-12 max-w-3xl">
            {STATUSES.map((s, i) => {
              const Icon = s.icon
              const isLast = i === STATUSES.length - 1
              return (
                <li key={s.label} className="flex gap-4 medium:gap-6">
                  <div className="flex flex-col items-center">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm"
                      style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    {!isLast && <span className="my-1 w-px flex-1" style={{ backgroundColor: goldTint(0.35) }} />}
                  </div>
                  <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-7"}`}>
                    <h3 className="text-base font-semibold tracking-tight">{s.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ui-fg-subtle">{s.note}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm" style={{ color: "var(--brand-secondary)" }}>
            Tracking information may take some time to update after an order is dispatched.
          </p>
        </div>
      </section>

      {/* ── Delivery timing + not received ───────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <div className="mx-auto grid max-w-4xl gap-4 medium:grid-cols-2">
          <InfoCard
            icon={<Clock className="h-6 w-6" strokeWidth={1.75} />}
            title="When will my order arrive?"
            body="Delivery times vary with your location, product availability, courier service, weather, and holidays."
            linkHref="/shipping"
            linkLabel="View shipping information"
          />
          <InfoCard
            icon={<Truck className="h-6 w-6" strokeWidth={1.75} />}
            title="Haven't received your order?"
            body="If your expected delivery time has passed, or tracking hasn't updated for a while, contact us and we'll check the status and next steps."
            linkHref="/contact"
            linkLabel="Contact us"
          />
        </div>
      </section>

      {/* ── Need help ────────────────────────────────────────────────────────── */}
      <section className="content-container pb-16 medium:pb-20">
        <div
          className="mx-auto flex max-w-4xl flex-col gap-5 rounded-2xl border p-7 medium:flex-row medium:items-center medium:justify-between medium:p-10"
          style={{ borderColor: goldTint(0.3), backgroundColor: goldTint(0.07) }}
        >
          <div className="flex items-start gap-4">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
            >
              <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Need help tracking your order?</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
                Please share your{" "}
                <strong className="font-semibold text-ui-fg-base">order number and phone number</strong>{" "}
                whenever possible so we can locate your order more quickly.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a
              href={`tel:${phoneTel}`}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              <Phone className="h-4 w-4" /> {phoneDisplay}
            </a>
            <a
              href={`mailto:${brand.contact.email}`}
              className="inline-flex items-center gap-2 rounded-full border border-ui-border-strong px-6 py-3 text-sm font-semibold text-ui-fg-base transition-colors hover:bg-ui-bg-base"
            >
              <Mail className="h-4 w-4" /> Email
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

/** Section heading with the shared gold kicker. */
function SectionHead({ kicker, title, center }: { kicker: string; title: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span
        className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] ${center ? "justify-center" : ""}`}
        style={{ color: "var(--brand-secondary)" }}
      >
        <span className="inline-block h-0.5 w-6 rounded-full" style={{ backgroundColor: GOLD }} />
        {kicker}
      </span>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight medium:text-3xl">{title}</h2>
    </div>
  )
}

/** An icon + copy + link card. */
function InfoCard({
  icon,
  title,
  body,
  linkHref,
  linkLabel,
}: {
  icon: React.ReactNode
  title: string
  body: string
  linkHref: string
  linkLabel: string
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-base p-7">
      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: goldTint(0.14), color: GOLD }}
      >
        {icon}
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ui-fg-subtle">{body}</p>
      <LocalizedClientLink
        href={linkHref}
        className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold"
        style={{ color: "var(--brand-primary)" }}
      >
        {linkLabel}
        <ArrowRight className="h-4 w-4" style={{ color: GOLD }} />
      </LocalizedClientLink>
    </div>
  )
}

/** "Out for delivery" glyph — a pin with motion, kept local (not in the icon set by this name). */
function MapPinRoute({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
