import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { GOLD, goldTint } from "@lib/brand-ui"
import Reveal from "@modules/common/components/reveal"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CircleCheck,
  CreditCard,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Truck,
} from "lucide-react"

/**
 * PAYMENT METHODS — how customers can pay, plus the safety note that matters most. Apple-style
 * info page: method cards, a prominent "never share your PIN/OTP" warning, soft cards and reveals.
 * Server component for SEO — metadata, single <h1> + <h2> hierarchy.
 */

const PAGE_TITLE = "Payment Methods"
const PAGE_DESCRIPTION =
  "Flexible ways to pay at Buno Home Decor — Cash on Delivery for eligible orders, supported online " +
  "payments, and social-media ordering. Plus how to keep your payment safe."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/payment" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/payment`,
    siteName: brand.storeName,
  },
}

function Kicker({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 ${center ? "justify-center" : ""}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </span>
  )
}

export default function PaymentPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.22)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center medium:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
              Payment Methods
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              Easy &amp; convenient{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">payment</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              Choose the payment method that works best for you. Available options may depend on your
              order, delivery location, and how you place your order.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Methods ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Kicker center>How You Can Pay</Kicker>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Flexible payment options</h2>
        </Reveal>

        <div className="mt-12 grid gap-5 medium:grid-cols-3">
          <Reveal>
            <div className="card-soft h-full p-8">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                <Banknote className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.01em]">Cash on Delivery</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-500">
                Available for eligible orders within our delivery coverage — order online and pay when
                it arrives. Before accepting, please check:
              </p>
              <ul className="mt-4 space-y-2">
                {["Your name and phone number are correct", "Your delivery address is complete", "You're available to receive the order", "You have the required amount ready"].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} strokeWidth={2} />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-gray-400">COD availability may vary by location, order, or product.</p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="card-soft h-full p-8">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                <CreditCard className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.01em]">Online Payment</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-gray-500">
                Where available, pay through supported online payment methods. The options shown at
                checkout may vary with the services currently supported.
              </p>
              <p className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
                Always complete payment through the official process provided for your order.
              </p>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <div className="card-soft h-full p-8">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.01em]">Facebook, Instagram &amp; TikTok</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-gray-500">
                Order through our social pages and our team will share the available payment options
                and instructions. Send us the product name, post, video, or a screenshot to get started.
              </p>
              <LocalizedClientLink href="/how-to-order" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                How to order <ArrowUpRight className="h-4 w-4" style={{ color: GOLD }} />
              </LocalizedClientLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Security warning ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16 medium:pb-24">
        <Reveal>
          <div className="flex items-start gap-5 rounded-3xl border-2 p-8" style={{ borderColor: GOLD, backgroundColor: goldTint(0.1) }}>
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
              <TriangleAlert className="h-7 w-7" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.01em]">Keep your payment safe</h2>
              <p className="mt-2 text-[15px] font-semibold leading-relaxed text-gray-900">
                Never share your PIN, password, OTP, or other confidential payment credentials with
                anyone claiming to represent Buno Home Decor.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                For online payments, keep your payment confirmation or transaction details until your
                order has been delivered — our team may ask for them to verify a payment.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Confirmation + issues ────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-5xl px-6 py-16 medium:py-24">
          <div className="grid gap-5 medium:grid-cols-2">
            <Reveal>
              <div className="card-soft h-full p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                  <Receipt className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em]">Payment confirmation</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  For online payments, keep your payment confirmation or transaction information until
                  your order has been successfully delivered. If we request verification, you may need
                  to provide the relevant transaction details.
                </p>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="card-soft h-full p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900" style={{ color: GOLD }}>
                  <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em]">Payment &amp; order issues</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Paid but your order isn&apos;t confirmed? Contact us as soon as possible with:
                </p>
                <ul className="mt-3 space-y-1.5">
                  {["Your name", "Phone number", "Order number, if available", "Payment method", "Transaction information or confirmation"].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Good to know ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16 medium:py-24">
        <Reveal>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} />
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.01em]">Good to know</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Product prices and applicable delivery charges are communicated during ordering.
                Payment methods and availability may change from time to time, and we may restrict
                certain methods for specific products, locations, or orders when necessary.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 small:grid-cols-2">
            <RelatedLink href="/shipping" icon={<Truck className="h-5 w-5" strokeWidth={1.75} />} label="Shipping" note="Delivery areas, times & charges" />
            <RelatedLink href="/refund-policy" icon={<RotateCcw className="h-5 w-5" strokeWidth={1.75} />} label="Refund Policy" note="When and how refunds work" />
          </div>
        </Reveal>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 medium:pb-28">
        <Reveal>
          <div className="flex flex-col gap-6 rounded-3xl p-8 medium:flex-row medium:items-center medium:justify-between medium:p-12" style={{ backgroundColor: goldTint(0.1) }}>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">Questions about payment?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">Our team is happy to help with payment or any order assistance.</p>
              <p className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
                {brand.contact.address}
              </p>
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

function RelatedLink({ href, icon, label, note }: { href: string; icon: React.ReactNode; label: string; note: string }) {
  return (
    <LocalizedClientLink href={href} className="card-soft card-hover group flex items-center justify-between gap-3 px-6 py-5">
      <span className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>{icon}</span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">{label}</span>
          <span className="block text-xs text-gray-500">{note}</span>
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: GOLD }} />
    </LocalizedClientLink>
  )
}
