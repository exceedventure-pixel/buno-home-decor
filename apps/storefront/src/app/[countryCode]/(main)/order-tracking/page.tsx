import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { GOLD, goldTint } from "@lib/brand-ui"
import Reveal from "@modules/common/components/reveal"
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
 * ORDER TRACKING — how to find where an order is. Apple-style, spacious, animated.
 *
 * Honest by design: real tracking for signed-in customers (the account orders page shows courier
 * status), but no guest lookup exists — so this routes actions to what genuinely works (account
 * orders; contact for social orders) rather than a search box that can't look anything up.
 */

const PAGE_TITLE = "Track Your Order"
const PAGE_DESCRIPTION =
  "Track your Buno Home Decor order — check your order status through your account, or contact our " +
  "team for orders placed on Facebook, Instagram or TikTok."

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

function Kicker({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 ${center ? "justify-center" : ""}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </span>
  )
}

export default function OrderTrackingPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.22)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center medium:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
              Order Tracking
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              Where is your{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">order?</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              Waiting for your new home décor? Check the latest status — whether you ordered on our
              website or through social media, we&apos;ll help you stay informed.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <LocalizedClientLink href="/account/orders" className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                <UserRound className="h-4 w-4" /> Track in your account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </LocalizedClientLink>
              <LocalizedClientLink href="/contact" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                Contact support
              </LocalizedClientLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Two paths ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16 medium:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Kicker center>How to Track Your Order</Kicker>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Two ways, depending on how you ordered</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 medium:grid-cols-2">
          <Reveal>
            <div className="card-soft flex h-full flex-col p-8">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                <UserRound className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.01em]">Ordered on our website</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">
                Sign in and open your orders to see the latest status and courier updates. Keep your{" "}
                <span className="font-semibold text-gray-900">order number</span> and{" "}
                <span className="font-semibold text-gray-900">phone number</span> handy — your order
                number is on your order confirmation.
              </p>
              <LocalizedClientLink href="/account/orders" className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                View my orders <ArrowRight className="h-4 w-4" />
              </LocalizedClientLink>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className="card-soft flex h-full flex-col p-8">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.01em]">Ordered on Facebook, Instagram or TikTok?</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">
                Social orders may not appear in the website&apos;s tracking. Just message our team with
                your name, phone number, and order details (and order number if you have it) —
                we&apos;ll check the latest status for you.
              </p>
              <LocalizedClientLink href="/contact" className="mt-6 inline-flex items-center gap-2 self-start rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                Contact us <ArrowUpRight className="h-4 w-4" />
              </LocalizedClientLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Status timeline ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-3xl px-6 py-16 medium:py-24">
          <Reveal className="text-center">
            <Kicker center>Order Status</Kicker>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">What each stage means</h2>
          </Reveal>
          <ol className="mt-12 flex flex-col gap-4">
            {STATUSES.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal as="li" key={s.label} delay={i * 60}>
                  <div className="card-soft flex items-center gap-4 p-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gray-900" style={{ backgroundColor: GOLD }}>
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold tracking-[-0.01em]">{s.label}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{s.note}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </ol>
          <Reveal>
            <p className="mt-8 text-center text-sm text-gray-500">
              Tracking information may take some time to update after an order is dispatched.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Timing + not received ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16 medium:py-24">
        <div className="grid gap-5 medium:grid-cols-2">
          <InfoCard icon={<Clock className="h-7 w-7" strokeWidth={1.75} />} title="When will my order arrive?" body="Delivery times vary with your location, product availability, courier service, weather, and holidays." linkHref="/shipping" linkLabel="View shipping information" delay={0} />
          <InfoCard icon={<Truck className="h-7 w-7" strokeWidth={1.75} />} title="Haven't received your order?" body="If your expected delivery time has passed, or tracking hasn't updated for a while, contact us and we'll check the status and next steps." linkHref="/contact" linkLabel="Contact us" delay={90} />
        </div>
      </section>

      {/* ── Need help ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 medium:pb-28">
        <Reveal>
          <div className="flex flex-col gap-6 rounded-3xl p-8 medium:flex-row medium:items-center medium:justify-between medium:p-12" style={{ backgroundColor: goldTint(0.1) }}>
            <div className="flex items-start gap-5">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.02em]">Need help tracking your order?</h2>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-gray-600">
                  Please share your <span className="font-semibold text-gray-900">order number and phone number</span>{" "}
                  whenever possible so we can locate your order more quickly.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <a href={`tel:${phoneTel}`} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                <Phone className="h-4 w-4" /> {phoneDisplay}
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

function InfoCard({ icon, title, body, linkHref, linkLabel, delay }: { icon: React.ReactNode; title: string; body: string; linkHref: string; linkLabel: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="card-soft flex h-full flex-col p-8">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>{icon}</span>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{body}</p>
        <LocalizedClientLink href={linkHref} className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-gray-900">
          {linkLabel} <ArrowRight className="h-4 w-4" style={{ color: GOLD }} />
        </LocalizedClientLink>
      </div>
    </Reveal>
  )
}

/** "Out for delivery" glyph — a pin, kept local (not in the icon set by this name). */
function MapPinRoute({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
