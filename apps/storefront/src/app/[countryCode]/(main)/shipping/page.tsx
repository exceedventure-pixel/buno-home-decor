import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Package,
  PackageCheck,
  PackageSearch,
  PhoneCall,
  Sparkles,
  Truck,
} from "lucide-react"

/**
 * SHIPPING & DELIVERY — how orders reach customers across Bangladesh.
 *
 * Info-page layout, not the LegalDoc: the delivery windows and coverage are what shoppers most
 * want at a glance, so those get highlighted stat cards. Server component for SEO — metadata,
 * single <h1> + <h2> hierarchy.
 */

const PAGE_TITLE = "Shipping & Delivery"
const PAGE_DESCRIPTION =
  "How Buno Home Decor delivers home décor across Bangladesh — delivery areas, estimated times " +
  "(2–5 days inside Dhaka, 3–7 outside), delivery charges, and what to expect on delivery."

const GOLD = "#F5B301"
const goldTint = (a: number) => `rgba(245, 179, 1, ${a})`

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/shipping" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/shipping`,
    siteName: brand.storeName,
  },
}

const DELAY_FACTORS = [
  "Public holidays",
  "Festivals & campaigns",
  "Courier delays",
  "Adverse weather",
  "High order volumes",
  "Product preparation",
]

const CHARGE_FACTORS = [
  "Delivery location",
  "Product size & weight",
  "Number of products",
  "Courier service",
  "Special delivery requirements",
]

const PROVIDE = [
  "Your correct name",
  "An active phone number",
  "Complete delivery address",
  "Area / thana information",
  "A useful landmark or delivery instructions",
]

export default function ShippingPage() {
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
            Shipping &amp; Delivery
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight small:text-5xl medium:text-6xl">
            We deliver across{" "}
            <span className="relative whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full"
                style={{ backgroundColor: goldTint(0.5) }}
              />
              <span className="relative z-10">Bangladesh</span>
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            Order on our website, Facebook, Instagram, or TikTok — our team processes your order and
            arranges delivery to the address you provide, through our trusted courier partners.
          </p>
        </div>
      </section>

      {/* ── Delivery highlights ──────────────────────────────────────────────── */}
      <section className="content-container -mt-2 pb-4">
        <div className="mx-auto grid max-w-5xl gap-4 medium:grid-cols-3">
          <StatCard
            icon={<MapPinned className="h-6 w-6" strokeWidth={1.75} />}
            stat="Inside Dhaka"
            value="2–5 working days"
            note="Estimated delivery window"
          />
          <StatCard
            icon={<Truck className="h-6 w-6" strokeWidth={1.75} />}
            stat="Outside Dhaka"
            value="3–7 working days"
            note="Estimated delivery window"
            solid
          />
          <StatCard
            icon={<Package className="h-6 w-6" strokeWidth={1.75} />}
            stat="Coverage"
            value="Nationwide"
            note="Across Bangladesh, subject to courier reach"
          />
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs" style={{ color: "var(--brand-secondary)" }}>
          These are estimated delivery periods, not guaranteed dates. Products that need extra
          preparation may take longer.
        </p>
      </section>

      {/* ── Areas + delay factors ────────────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <div className="grid gap-8 medium:grid-cols-2 medium:gap-12">
          <div>
            <SectionHead kicker="Delivery Areas" title="Serving customers nationwide" />
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              We aim to serve customers across Bangladesh. Delivery availability may depend on your
              location, courier coverage, product type, and other logistical factors. Not sure we
              reach your area?{" "}
              <LocalizedClientLink href="/contact" className="font-medium text-ui-fg-base underline decoration-[rgba(245,179,1,0.7)] underline-offset-2">
                Contact us before ordering
              </LocalizedClientLink>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-6">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="h-5 w-5" style={{ color: GOLD }} />
              <h3 className="text-base font-semibold tracking-tight">Delivery may take longer during</h3>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {DELAY_FACTORS.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-ui-border-base bg-ui-bg-base px-3 py-1.5 text-xs font-medium text-ui-fg-subtle"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Charges + order processing ───────────────────────────────────────── */}
      <section className="border-y border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-14 medium:py-20">
          <div className="mx-auto grid max-w-4xl gap-4 medium:grid-cols-2">
            {/* Charges */}
            <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-7">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: goldTint(0.14), color: GOLD }}
              >
                <Banknote className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">Delivery charges</h2>
              <p className="mt-2 text-sm leading-relaxed text-ui-fg-subtle">
                The applicable charge is shown during ordering or at checkout. It may vary with:
              </p>
              <ul className="mt-3 space-y-1.5">
                {CHARGE_FACTORS.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-ui-fg-base">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-start gap-2 text-xs" style={{ color: "var(--brand-secondary)" }}>
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
                For social-media orders, our team confirms the delivery charge before finalizing.
              </p>
            </div>

            {/* Order processing */}
            <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-7">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
              >
                <ClipboardCheck className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">Order processing</h2>
              <p className="mt-2 text-sm leading-relaxed text-ui-fg-subtle">
                Our team may call to confirm your order and delivery details, then prepare and dispatch
                it. To avoid delays, please provide:
              </p>
              <ul className="mt-3 space-y-1.5">
                {PROVIDE.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-ui-fg-base">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} strokeWidth={2} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── On delivery ──────────────────────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <SectionHead center kicker="On Delivery" title="What to expect when it arrives" />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 medium:grid-cols-2">
          <InfoCard
            icon={<PhoneCall className="h-6 w-6" strokeWidth={1.75} />}
            title="Delivery attempts"
            body="Our courier may call when your order is ready. Please make sure you or an authorized person is available to receive it. If a delivery fails because the customer can't be reached, the address is wrong, or nobody's available, extra attempts or charges may apply. Repeated refusal of confirmed orders may affect future payment or delivery options."
          />
          <InfoCard
            icon={<PackageCheck className="h-6 w-6" strokeWidth={1.75} />}
            title="Check your order on delivery"
            body="When your order arrives, please check the package and product carefully. If you notice significant damage, receive the wrong item, or spot another issue, contact us as soon as possible."
            links={[
              { href: "/returns", label: "Happy Return" },
              { href: "/exchange", label: "Exchange" },
              { href: "/refund-policy", label: "Refund Policy" },
            ]}
          />
        </div>
      </section>

      {/* ── Social orders (dark) ─────────────────────────────────────────────── */}
      <section className="relative" style={{ backgroundColor: "var(--brand-primary)", color: "#ffffff" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(50% 60% at 50% 0%, ${goldTint(0.14)} 0%, transparent 65%)` }}
        />
        <div className="content-container relative py-16 medium:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em]" style={{ color: GOLD }}>
              <span className="inline-block h-0.5 w-6 rounded-full" style={{ backgroundColor: GOLD }} />
              Facebook · Instagram · TikTok
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight medium:text-3xl">
              Ordering through social media?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              For social orders, our team confirms everything with you before finalizing:
            </p>
          </div>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {["Product availability", "Product price", "Delivery address", "Delivery charge", "Estimated delivery time", "Available payment method"].map((t) => (
              <li
                key={t}
                className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-white/85"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Delays note + need help ──────────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start gap-3 rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-6">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} />
            <div>
              <h2 className="text-base font-semibold tracking-tight">Delays beyond our control</h2>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
                We work to deliver within the estimated timeframe, but courier disruptions, severe
                weather, public holidays, transport problems, natural events, or unusually high order
                volumes can cause delays. We appreciate your patience in such situations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact + tracking ───────────────────────────────────────────────── */}
      <section className="content-container pb-16 medium:pb-20">
        <div
          className="mx-auto flex max-w-4xl flex-col gap-5 rounded-2xl border p-7 medium:flex-row medium:items-center medium:justify-between medium:p-10"
          style={{ borderColor: goldTint(0.3), backgroundColor: goldTint(0.07) }}
        >
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Need help with delivery?</h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              Questions about your delivery, or want to check your order status? We&apos;re here to
              help.
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm" style={{ color: "var(--brand-secondary)" }}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
              {brand.contact.address}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <LocalizedClientLink
              href="/order-tracking"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              <PackageSearch className="h-4 w-4" /> Track your order
            </LocalizedClientLink>
            <a
              href={`tel:${phoneTel}`}
              className="inline-flex items-center gap-2 rounded-full border border-ui-border-strong px-6 py-3 text-sm font-semibold text-ui-fg-base transition-colors hover:bg-ui-bg-base"
            >
              <PhoneCall className="h-4 w-4" /> {phoneDisplay}
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

/** A highlighted delivery-stat card. `solid` uses the black + gold tile for the middle emphasis. */
function StatCard({
  icon,
  stat,
  value,
  note,
  solid,
}: {
  icon: React.ReactNode
  stat: string
  value: string
  note: string
  solid?: boolean
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${solid ? "" : "border-ui-border-base bg-ui-bg-base"}`}
      style={solid ? { borderColor: goldTint(0.4), backgroundColor: goldTint(0.08) } : undefined}
    >
      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
        style={
          solid
            ? { backgroundColor: "var(--brand-primary)", color: GOLD }
            : { backgroundColor: goldTint(0.14), color: GOLD }
        }
      >
        {icon}
      </span>
      <span className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-ui-fg-muted">
        {stat}
      </span>
      <span className="mt-1 text-xl font-semibold tracking-tight text-ui-fg-base">{value}</span>
      <span className="mt-1.5 text-xs leading-relaxed text-ui-fg-subtle">{note}</span>
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

/** An icon + copy card, optionally with a row of related-policy links. */
function InfoCard({
  icon,
  title,
  body,
  links,
}: {
  icon: React.ReactNode
  title: string
  body: string
  links?: { href: string; label: string }[]
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
      {links && (
        <div className="mt-5 flex flex-wrap gap-2">
          {links.map((l) => (
            <LocalizedClientLink
              key={l.href}
              href={l.href}
              className="group inline-flex items-center gap-1 rounded-full border border-ui-border-base px-3.5 py-1.5 text-xs font-semibold text-ui-fg-base transition-colors hover:bg-ui-bg-subtle"
            >
              {l.label}
              <ArrowUpRight className="h-3.5 w-3.5" style={{ color: GOLD }} />
            </LocalizedClientLink>
          ))}
        </div>
      )}
    </div>
  )
}
