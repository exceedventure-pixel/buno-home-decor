import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
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
 * SUPPORT CENTER — the hub that routes shoppers to the right help page.
 *
 * A directory, not a document: every card is a link to a dedicated page (how to order, tracking,
 * shipping, the consumer policies…). Server component for SEO — the metadata, single <h1> + <h2>
 * hierarchy, and the card links give crawlers a clean map of the support section.
 */

const PAGE_TITLE = "Support Center"
const PAGE_DESCRIPTION =
  "Get help with your Buno Home Decor order — how to order, tracking, payment, shipping, returns, " +
  "exchanges, refunds, cancellations and more. Find an answer or contact our team."

const GOLD = "#F5B301"
const goldTint = (a: number) => `rgba(245, 179, 1, ${a})`

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

type Item = {
  href: string
  icon: typeof Truck
  title: string
  body: string
  action: string
}

const SHOPPING: Item[] = [
  {
    href: "/how-to-order",
    icon: ListChecks,
    title: "How to Order",
    body: "A step-by-step guide to placing an order, from picking your favourite pieces to confirming delivery.",
    action: "Learn how to order",
  },
  {
    href: "/order-tracking",
    icon: PackageSearch,
    title: "Order Tracking",
    body: "Check the latest available information about where your Buno Home Decor order is.",
    action: "Track your order",
  },
  {
    href: "/payment",
    icon: CreditCard,
    title: "Payment",
    body: "See the payment options available when shopping with Buno Home Decor.",
    action: "View payment information",
  },
  {
    href: "/shipping",
    icon: Truck,
    title: "Shipping",
    body: "Delivery areas, estimated delivery times, delivery charges, and other shipping details.",
    action: "View shipping information",
  },
]

const POLICIES: Item[] = [
  {
    href: "/returns",
    icon: RotateCcw,
    title: "Happy Return",
    body: "Our return process, eligibility, and what you need to do to request a return.",
    action: "View Happy Return",
  },
  {
    href: "/refund-policy",
    icon: Receipt,
    title: "Refund Policy",
    body: "When refunds may be available and how the refund process works.",
    action: "View Refund Policy",
  },
  {
    href: "/exchange",
    icon: ArrowLeftRight,
    title: "Exchange",
    body: "Exchange eligibility and how the exchange process works.",
    action: "View Exchange Policy",
  },
  {
    href: "/cancellation",
    icon: CircleX,
    title: "Cancellation",
    body: "When and how you can request an order cancellation.",
    action: "View Cancellation Policy",
  },
  {
    href: "/pre-order",
    icon: CalendarClock,
    title: "Pre-Order",
    body: "How pre-orders work — ordering, payment, estimated availability, and delivery.",
    action: "View Pre-Order Policy",
  },
  {
    href: "/offers",
    icon: BadgePercent,
    title: "Extra Discount",
    body: "Available extra discounts, promotional offers, and special deals.",
    action: "View Extra Discount",
  },
]

export default function SupportPage() {
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
            Support Center
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight small:text-5xl medium:text-6xl">
            How Can We{" "}
            <span className="relative whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full"
                style={{ backgroundColor: goldTint(0.5) }}
              />
              <span className="relative z-10">Help</span>
            </span>{" "}
            You?
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            Everything you need to shop for home décor with confidence — ordering, delivery, payment,
            and our return and exchange policies, all in one place. Can&apos;t find an answer? Our
            team is here to help.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink
              href="/order-tracking"
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              <PackageSearch className="h-4 w-4" /> Track your order
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/faq"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Visit FAQ
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* ── Shopping Support ─────────────────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <SectionHead kicker="Shopping Support" title="Ordering, delivery & payment" />
        <div className="mt-10 grid gap-4 small:grid-cols-2 medium:grid-cols-4">
          {SHOPPING.map((item) => (
            <SupportCard key={item.href} {...item} />
          ))}
        </div>
      </section>

      {/* ── Returns & Consumer Policies ──────────────────────────────────────── */}
      <section className="border-y border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-14 medium:py-20">
          <SectionHead
            kicker="Returns & Consumer Policies"
            title="Shop with confidence"
            note="Everything you need to know about returning, exchanging, cancelling, or getting a refund on an order."
          />
          <div className="mt-10 grid gap-4 small:grid-cols-2 medium:grid-cols-3">
            {POLICIES.map((item) => (
              <SupportCard key={item.href} {...item} solid />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ callout ──────────────────────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <div
          className="relative overflow-hidden rounded-2xl border p-7 medium:p-10"
          style={{ borderColor: goldTint(0.3), backgroundColor: goldTint(0.07) }}
        >
          <div className="flex flex-col gap-5 medium:flex-row medium:items-center medium:justify-between">
            <div className="flex items-start gap-4">
              <span
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
              >
                <MessagesSquare className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
                  Quick answers to common questions about products, ordering, payment, delivery,
                  returns, and exchanges.
                </p>
              </div>
            </div>
            <LocalizedClientLink
              href="/faq"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02] medium:self-auto"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              Visit FAQ <ArrowRight className="h-4 w-4" />
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* ── Need more help? — contact ────────────────────────────────────────── */}
      <section className="content-container pb-16 medium:pb-20">
        <SectionHead
          center
          kicker="Need More Help?"
          title="Talk to our team"
          note="Still have a question after visiting our support pages? We're happy to help."
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 small:grid-cols-3">
          <ContactTile icon={<Phone className="h-5 w-5" strokeWidth={1.75} />} label="Phone" value={phoneDisplay} href={`tel:${phoneTel}`} />
          <ContactTile icon={<Mail className="h-5 w-5" strokeWidth={1.75} />} label="Email" value={brand.contact.email} href={`mailto:${brand.contact.email}`} small />
          <ContactTile
            icon={<MapPin className="h-5 w-5" strokeWidth={1.75} />}
            label="Office"
            value={brand.contact.address}
            href={`https://maps.google.com/?q=${encodeURIComponent(`Buno Home Decor, ${brand.contact.address}`)}`}
            external
            small
          />
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
          When contacting us about an existing order, please keep your{" "}
          <strong className="font-semibold text-ui-fg-base">order number and phone number</strong>{" "}
          ready so we can assist you more quickly.
        </p>
      </section>

      {/* ── Brand closing ────────────────────────────────────────────────────── */}
      <section className="border-t border-ui-border-base">
        <div className="content-container py-16 medium:py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <SectionHead center kicker="Buno Home Decor" title="Beautiful ideas for better spaces" />
            <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              From decorative pieces and practical organizers to future furniture and interior
              solutions, our goal is to help you create a home that feels beautiful, functional, and
              uniquely yours.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <LocalizedClientLink
                href="/store"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
              >
                Browse the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                Contact us
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/** Section heading with the shared gold kicker. */
function SectionHead({
  kicker,
  title,
  note,
  center,
}: {
  kicker: string
  title: string
  note?: string
  center?: boolean
}) {
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
      {note && (
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
          {note}
        </p>
      )}
    </div>
  )
}

/** A linked directory card. `solid` swaps the tile to black + gold for the policy grid. */
function SupportCard({
  href,
  icon: Icon,
  title,
  body,
  action,
  solid,
}: Item & { solid?: boolean }) {
  return (
    <LocalizedClientLink
      href={href}
      className="group flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-base p-6 transition-all hover:-translate-y-1 hover:border-ui-border-interactive hover:shadow-lg"
    >
      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={
          solid
            ? { backgroundColor: "var(--brand-primary)", color: GOLD }
            : { backgroundColor: goldTint(0.14), color: GOLD }
        }
      >
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <h3 className="mt-5 flex items-center gap-1.5 text-base font-semibold text-ui-fg-base">
        {title}
        <ArrowUpRight
          className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: GOLD }}
        />
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ui-fg-subtle">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--brand-primary)" }}>
        {action}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: GOLD }} />
      </span>
    </LocalizedClientLink>
  )
}

/** A tappable contact tile (phone / email / office). */
function ContactTile({
  icon,
  label,
  value,
  href,
  external,
  small,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href: string
  external?: boolean
  small?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className="group flex flex-col gap-3 rounded-2xl border border-ui-border-base bg-ui-bg-base p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
      >
        {icon}
      </span>
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-ui-fg-muted">
          {label}
        </span>
        <span className={`mt-1 block font-semibold text-ui-fg-base ${small ? "text-sm" : "text-base"}`}>
          {value}
        </span>
      </span>
    </a>
  )
}
