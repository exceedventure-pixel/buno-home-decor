import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { GOLD, goldTint } from "@lib/brand-ui"
import Reveal from "@modules/common/components/reveal"
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
 * SHIPPING & DELIVERY — how orders reach customers across Bangladesh. Apple-style info page:
 * highlighted delivery-time stat cards, soft cards, gentle reveals. Server component for SEO.
 */

const PAGE_TITLE = "Shipping & Delivery"
const PAGE_DESCRIPTION =
  "How Buno Home Decor delivers home décor across Bangladesh — delivery areas, estimated times " +
  "(2–5 days inside Dhaka, 3–7 outside), delivery charges, and what to expect on delivery."

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

const DELAY_FACTORS = ["Public holidays", "Festivals & campaigns", "Courier delays", "Adverse weather", "High order volumes", "Product preparation"]
const CHARGE_FACTORS = ["Delivery location", "Product size & weight", "Number of products", "Courier service", "Special delivery requirements"]
const PROVIDE = ["Your correct name", "An active phone number", "Complete delivery address", "Area / thana information", "A useful landmark or delivery instructions"]

function Kicker({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 ${center ? "justify-center" : ""}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </span>
  )
}

export default function ShippingPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.22)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center medium:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
              Shipping &amp; Delivery
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              We deliver across{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">Bangladesh</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              Order on our website, Facebook, Instagram, or TikTok — our team processes your order and
              arranges delivery through our trusted courier partners.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Delivery highlights ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6">
        <div className="grid gap-5 medium:grid-cols-3">
          <StatCard icon={<MapPinned className="h-7 w-7" strokeWidth={1.75} />} stat="Inside Dhaka" value="2–5 working days" note="Estimated delivery window" delay={0} />
          <StatCard icon={<Truck className="h-7 w-7" strokeWidth={1.75} />} stat="Outside Dhaka" value="3–7 working days" note="Estimated delivery window" solid delay={90} />
          <StatCard icon={<Package className="h-7 w-7" strokeWidth={1.75} />} stat="Coverage" value="Nationwide" note="Across Bangladesh, subject to courier reach" delay={180} />
        </div>
        <Reveal>
          <p className="mx-auto mt-5 max-w-2xl text-center text-xs text-gray-400">
            These are estimated delivery periods, not guaranteed dates. Products that need extra
            preparation may take longer.
          </p>
        </Reveal>
      </section>

      {/* ── Areas + delay factors ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
        <div className="grid gap-10 medium:grid-cols-2 medium:gap-12">
          <Reveal>
            <Kicker>Delivery Areas</Kicker>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Serving customers nationwide</h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-500">
              We aim to serve customers across Bangladesh. Availability may depend on your location,
              courier coverage, product type, and other logistics. Not sure we reach your area?{" "}
              <LocalizedClientLink href="/contact" className="font-medium text-gray-900 underline decoration-[rgba(240,180,0,0.8)] underline-offset-2">
                Contact us before ordering
              </LocalizedClientLink>.
            </p>
          </Reveal>
          <Reveal delay={90}>
            <div className="card-soft p-7">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-5 w-5" style={{ color: GOLD }} />
                <h3 className="text-base font-semibold">Delivery may take longer during</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {DELAY_FACTORS.map((f) => (
                  <span key={f} className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-medium text-gray-600">{f}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Charges + processing ─────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-5xl px-6 py-16 medium:py-24">
          <div className="grid gap-5 medium:grid-cols-2">
            <Reveal>
              <div className="card-soft h-full p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                  <Banknote className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em]">Delivery charges</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">The applicable charge is shown during ordering or at checkout. It may vary with:</p>
                <ul className="mt-3 space-y-1.5">
                  {CHARGE_FACTORS.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} />
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
                  For social-media orders, our team confirms the delivery charge before finalizing.
                </p>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="card-soft h-full p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900" style={{ color: GOLD }}>
                  <ClipboardCheck className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em]">Order processing</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Our team may call to confirm your order, then prepare and dispatch it. To avoid delays,
                  please provide:
                </p>
                <ul className="mt-3 space-y-1.5">
                  {PROVIDE.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} strokeWidth={2} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── On delivery ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16 medium:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Kicker center>On Delivery</Kicker>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">What to expect when it arrives</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 medium:grid-cols-2">
          <InfoCard
            icon={<PhoneCall className="h-7 w-7" strokeWidth={1.75} />}
            title="Delivery attempts"
            body="Our courier may call when your order is ready. Please make sure you or an authorized person is available to receive it. If delivery fails because the customer can't be reached, the address is wrong, or nobody's available, extra attempts or charges may apply. Repeated refusal of confirmed orders may affect future payment or delivery options."
            delay={0}
          />
          <InfoCard
            icon={<PackageCheck className="h-7 w-7" strokeWidth={1.75} />}
            title="Check your order on delivery"
            body="When your order arrives, please check the package and product carefully. If you notice significant damage, receive the wrong item, or spot another issue, contact us as soon as possible."
            links={[{ href: "/returns", label: "Happy Return" }, { href: "/exchange", label: "Exchange" }, { href: "/refund-policy", label: "Refund Policy" }]}
            delay={90}
          />
        </div>
      </section>

      {/* ── Social (dark) ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-900 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${goldTint(0.16)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-5xl px-6 py-20 medium:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} /> Facebook · Instagram · TikTok
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Ordering through social media?</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">For social orders, our team confirms everything with you before finalizing:</p>
          </Reveal>
          <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {["Product availability", "Product price", "Delivery address", "Delivery charge", "Estimated delivery time", "Available payment method"].map((t) => (
              <li key={t} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-white/85">{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Delays note + contact ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16 medium:py-24">
        <Reveal>
          <div className="flex items-start gap-3 rounded-3xl border border-gray-100 bg-gray-50 p-7">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} />
            <div>
              <h2 className="text-base font-semibold">Delays beyond our control</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                We work to deliver within the estimated timeframe, but courier disruptions, severe
                weather, public holidays, transport problems, natural events, or unusually high order
                volumes can cause delays. We appreciate your patience.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-6 block">
          <div className="flex flex-col gap-6 rounded-3xl p-8 medium:flex-row medium:items-center medium:justify-between medium:p-10" style={{ backgroundColor: goldTint(0.1) }}>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">Need help with delivery?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">Questions about your delivery, or want to check your order status? We&apos;re here to help.</p>
              <p className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
                {brand.contact.address}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <LocalizedClientLink href="/order-tracking" className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                <PackageSearch className="h-4 w-4" /> Track your order
              </LocalizedClientLink>
              <a href={`tel:${phoneTel}`} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white">
                <PhoneCall className="h-4 w-4" /> {phoneDisplay}
              </a>
              <a href={`mailto:${brand.contact.email}`} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white">
                <Mail className="h-4 w-4" /> Email
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}

function StatCard({ icon, stat, value, note, solid, delay }: { icon: React.ReactNode; stat: string; value: string; note: string; solid?: boolean; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className={`card-soft card-hover h-full p-7 ${solid ? "" : ""}`}>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={solid ? { backgroundColor: "#111827", color: GOLD } : { backgroundColor: goldTint(0.14), color: GOLD }}>
          {icon}
        </span>
        <span className="mt-6 block text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{stat}</span>
        <span className="mt-1 block text-2xl font-semibold tracking-[-0.01em] text-gray-900">{value}</span>
        <span className="mt-1.5 block text-xs leading-relaxed text-gray-500">{note}</span>
      </div>
    </Reveal>
  )
}

function InfoCard({ icon, title, body, links, delay }: { icon: React.ReactNode; title: string; body: string; links?: { href: string; label: string }[]; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="card-soft h-full p-8">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>{icon}</span>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
        {links && (
          <div className="mt-5 flex flex-wrap gap-2">
            {links.map((l) => (
              <LocalizedClientLink key={l.href} href={l.href} className="group inline-flex items-center gap-1 rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                {l.label}
                <ArrowUpRight className="h-3.5 w-3.5" style={{ color: GOLD }} />
              </LocalizedClientLink>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  )
}
