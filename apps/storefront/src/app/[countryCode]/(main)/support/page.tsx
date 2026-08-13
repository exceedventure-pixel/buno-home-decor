import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { GOLD, goldTint } from "@lib/brand-ui"
import Reveal from "@modules/common/components/reveal"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  CalendarClock,
  CircleX,
  CreditCard,
  ListChecks,
  Mail,
  MapPin,
  MessagesSquare,
  PackageSearch,
  Phone,
  Receipt,
  RotateCcw,
  Sparkles,
  Truck,
} from "lucide-react"

/**
 * SUPPORT CENTER — the hub that routes shoppers to the right help page. Apple-style: spacious,
 * card-based, gently animated. Server component for SEO (metadata, single <h1> + <h2>s, and the
 * card links give crawlers a clean map of the support section).
 */

const PAGE_TITLE = "Support Center"
const PAGE_DESCRIPTION =
  "Get help with your Buno Home Decor order — how to order, tracking, payment, shipping, returns, " +
  "exchanges, refunds, cancellations and more. Find an answer or contact our team."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/support" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/support`,
    siteName: brand.storeName,
  },
}

type Item = { href: string; icon: typeof Truck; title: string; body: string; action: string }

const SHOPPING: Item[] = [
  { href: "/how-to-order", icon: ListChecks, title: "How to Order", body: "A step-by-step guide to placing an order, from picking your favourite pieces to confirming delivery.", action: "Learn how to order" },
  { href: "/order-tracking", icon: PackageSearch, title: "Order Tracking", body: "Check the latest available information about where your Buno Home Decor order is.", action: "Track your order" },
  { href: "/payment", icon: CreditCard, title: "Payment", body: "See the payment options available when shopping with Buno Home Decor.", action: "View payment information" },
  { href: "/shipping", icon: Truck, title: "Shipping", body: "Delivery areas, estimated delivery times, delivery charges, and other shipping details.", action: "View shipping information" },
]

const POLICIES: Item[] = [
  { href: "/returns", icon: RotateCcw, title: "Happy Return", body: "Our return process, eligibility, and what you need to do to request a return.", action: "View Happy Return" },
  { href: "/refund-policy", icon: Receipt, title: "Refund Policy", body: "When refunds may be available and how the refund process works.", action: "View Refund Policy" },
  { href: "/exchange", icon: ArrowLeftRight, title: "Exchange", body: "Exchange eligibility and how the exchange process works.", action: "View Exchange Policy" },
  { href: "/cancellation", icon: CircleX, title: "Cancellation", body: "When and how you can request an order cancellation.", action: "View Cancellation Policy" },
  { href: "/pre-order", icon: CalendarClock, title: "Pre-Order", body: "How pre-orders work — ordering, payment, estimated availability, and delivery.", action: "View Pre-Order Policy" },
  { href: "/offers", icon: BadgePercent, title: "Extra Discount", body: "Available extra discounts, promotional offers, and special deals.", action: "View Extra Discount" },
]

function Kicker({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 ${center ? "justify-center" : ""}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </span>
  )
}

export default function SupportPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.22)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center medium:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
              Support Center
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              How can we{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">help</span>
              </span>{" "}
              you?
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              Everything you need to shop with confidence — ordering, delivery, payment, and our
              return and exchange policies, all in one place.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <LocalizedClientLink href="/order-tracking" className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                <PackageSearch className="h-4 w-4" /> Track your order
              </LocalizedClientLink>
              <LocalizedClientLink href="/faq" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                Visit FAQ
              </LocalizedClientLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Shopping support ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Kicker center>Shopping Support</Kicker>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Ordering, delivery &amp; payment</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 small:grid-cols-2 medium:grid-cols-4">
          {SHOPPING.map((item, i) => (
            <SupportCard key={item.href} {...item} delay={i * 70} />
          ))}
        </div>
      </section>

      {/* ── Consumer policies ────────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker center>Returns &amp; Consumer Policies</Kicker>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Shop with confidence</h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-500">
              Everything you need to know about returning, exchanging, cancelling, or getting a refund.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 small:grid-cols-2 medium:grid-cols-3">
            {POLICIES.map((item, i) => (
              <SupportCard key={item.href} {...item} solid delay={i * 60} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ callout ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
        <Reveal>
          <div className="overflow-hidden rounded-3xl p-8 medium:p-12" style={{ backgroundColor: goldTint(0.1) }}>
            <div className="flex flex-col gap-6 medium:flex-row medium:items-center medium:justify-between">
              <div className="flex items-start gap-5">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                  <MessagesSquare className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.02em]">Frequently asked questions</h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-gray-600">
                    Quick answers about products, ordering, payment, delivery, returns and exchanges.
                  </p>
                </div>
              </div>
              <LocalizedClientLink href="/faq" className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] medium:self-auto">
                Visit FAQ <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </LocalizedClientLink>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Need more help ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pb-20 text-center medium:pb-28">
        <Reveal>
          <Kicker center>Need More Help?</Kicker>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Talk to our team</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            Still have a question after visiting our support pages? We&apos;re happy to help.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4" style={{ color: GOLD }} />
              <a href={`tel:${phoneTel}`} className="font-semibold text-gray-900 hover:underline">{phoneDisplay}</a>
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" style={{ color: GOLD }} />
              <a href={`mailto:${brand.contact.email}`} className="font-semibold text-gray-900 hover:underline">{brand.contact.email}</a>
            </span>
            <span className="inline-flex items-center gap-2 text-center">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
              {brand.contact.address}
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-gray-500">
            When contacting us about an existing order, please keep your{" "}
            <span className="font-semibold text-gray-900">order number and phone number</span> ready
            so we can assist you more quickly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink href="/store" className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
              Browse the collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </LocalizedClientLink>
            <LocalizedClientLink href="/contact" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-8 py-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
              Contact us
            </LocalizedClientLink>
          </div>
        </Reveal>
      </section>
    </div>
  )
}

function SupportCard({ href, icon: Icon, title, body, action, solid, delay }: Item & { solid?: boolean; delay: number }) {
  return (
    <Reveal delay={delay}>
      <LocalizedClientLink href={href} className="card-soft card-hover group flex h-full flex-col p-7">
        <span
          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
          style={solid ? { backgroundColor: "#111827", color: GOLD } : { backgroundColor: goldTint(0.14), color: GOLD }}
        >
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <h3 className="mt-5 flex items-center gap-1.5 text-base font-semibold text-gray-900">
          {title}
          <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: GOLD }} />
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          {action}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: GOLD }} />
        </span>
      </LocalizedClientLink>
    </Reveal>
  )
}
