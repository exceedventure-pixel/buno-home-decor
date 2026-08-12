import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
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
 * PAYMENT METHODS — how customers can pay, plus the safety note that matters most.
 *
 * A support/info page rather than a legal doc: the value is the at-a-glance method cards and a
 * prominent "never share your PIN/OTP" warning, so it uses the marketing layout. Server component
 * for SEO — metadata, single <h1> + <h2> hierarchy.
 */

const PAGE_TITLE = "Payment Methods"
const PAGE_DESCRIPTION =
  "Flexible ways to pay at Buno Home Decor — Cash on Delivery for eligible orders, supported online " +
  "payments, and social-media ordering. Plus how to keep your payment safe."

const GOLD = "#F5B301"
const goldTint = (a: number) => `rgba(245, 179, 1, ${a})`

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

export default function PaymentPage() {
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
            Payment Methods
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight small:text-5xl medium:text-6xl">
            Easy &amp; convenient{" "}
            <span className="relative whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full"
                style={{ backgroundColor: goldTint(0.5) }}
              />
              <span className="relative z-10">payment</span>
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            Choose the payment method that works best for you. Available options may depend on your
            order, delivery location, and how you place your order.
          </p>
        </div>
      </section>

      {/* ── Payment methods ──────────────────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <SectionHead center kicker="How You Can Pay" title="Flexible payment options" />
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 medium:grid-cols-3">
          {/* Cash on Delivery */}
          <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-base p-7">
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
            >
              <Banknote className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">Cash on Delivery</h3>
            <p className="mt-2 text-sm leading-relaxed text-ui-fg-subtle">
              Available for eligible orders within our delivery coverage — order online and pay when
              your order arrives. Before accepting, please check:
            </p>
            <ul className="mt-4 space-y-2">
              {[
                "Your name and phone number are correct",
                "Your delivery address is complete",
                "You're available to receive the order",
                "You have the required amount ready",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-ui-fg-base">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} strokeWidth={2} />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs" style={{ color: "var(--brand-secondary)" }}>
              COD availability may vary by location, order, or product.
            </p>
          </div>

          {/* Online Payment */}
          <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-base p-7">
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: goldTint(0.14), color: GOLD }}
            >
              <CreditCard className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">Online Payment</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ui-fg-subtle">
              Where available, pay through supported online payment methods. The options shown at
              checkout may vary with the services currently supported.
            </p>
            <p className="mt-4 flex items-start gap-2 text-xs" style={{ color: "var(--brand-secondary)" }}>
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
              Always complete payment through the official process provided for your order.
            </p>
          </div>

          {/* Social ordering */}
          <div className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-7">
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: goldTint(0.14), color: GOLD }}
            >
              <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">Facebook, Instagram &amp; TikTok</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ui-fg-subtle">
              Order through our social pages and our team will share the available payment options and
              instructions. Send us the product name, post, video, or a screenshot to get started.
            </p>
            <LocalizedClientLink
              href="/how-to-order"
              className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold"
              style={{ color: "var(--brand-primary)" }}
            >
              How to order <ArrowUpRight className="h-4 w-4" style={{ color: GOLD }} />
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* ── Security warning — deliberately loud ─────────────────────────────── */}
      <section className="content-container pb-14 medium:pb-16">
        <div
          className="mx-auto flex max-w-5xl items-start gap-4 rounded-2xl border-2 p-6 medium:p-7"
          style={{ borderColor: GOLD, backgroundColor: goldTint(0.1) }}
        >
          <span
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
          >
            <TriangleAlert className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Keep your payment safe</h2>
            <p className="mt-2 text-[15px] font-semibold leading-relaxed text-ui-fg-base">
              Never share your PIN, password, OTP, or other confidential payment credentials with
              anyone claiming to represent Buno Home Decor.
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              For online payments, keep your payment confirmation or transaction details until your
              order has been delivered — our team may ask for them to verify a payment.
            </p>
          </div>
        </div>
      </section>

      {/* ── Confirmation + issues ────────────────────────────────────────────── */}
      <section className="border-y border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-14 medium:py-20">
          <div className="mx-auto grid max-w-4xl gap-4 medium:grid-cols-2">
            {/* Confirmation */}
            <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-7">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: goldTint(0.14), color: GOLD }}
              >
                <Receipt className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">Payment confirmation</h2>
              <p className="mt-2 text-sm leading-relaxed text-ui-fg-subtle">
                For online payments, keep your payment confirmation or transaction information until
                your order has been successfully delivered. If we request verification, you may need
                to provide the relevant transaction details.
              </p>
            </div>

            {/* Issues */}
            <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-7">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
              >
                <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">Payment &amp; order issues</h2>
              <p className="mt-2 text-sm leading-relaxed text-ui-fg-subtle">
                Paid but your order isn&apos;t confirmed? Contact us as soon as possible with:
              </p>
              <ul className="mt-3 space-y-1.5">
                {[
                  "Your name",
                  "Phone number",
                  "Order number, if available",
                  "Payment method",
                  "Transaction information or confirmation",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-ui-fg-base">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Important information ────────────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Good to know</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
                Product prices and applicable delivery charges are communicated during ordering.
                Payment methods and availability may change from time to time, and we may restrict
                certain methods for specific products, locations, or orders when necessary.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 small:grid-cols-2">
            <RelatedLink href="/shipping" icon={<Truck className="h-5 w-5" strokeWidth={1.75} />} label="Shipping" note="Delivery areas, times & charges" />
            <RelatedLink href="/refund-policy" icon={<RotateCcw className="h-5 w-5" strokeWidth={1.75} />} label="Refund Policy" note="When and how refunds work" />
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────────── */}
      <section className="content-container pb-16 medium:pb-20">
        <div
          className="mx-auto flex max-w-4xl flex-col gap-5 rounded-2xl border p-7 medium:flex-row medium:items-center medium:justify-between medium:p-10"
          style={{ borderColor: goldTint(0.3), backgroundColor: goldTint(0.07) }}
        >
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Questions about payment?</h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              Our team is happy to help with payment or any order assistance.
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm" style={{ color: "var(--brand-secondary)" }}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
              {brand.contact.address}
            </p>
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

/** A compact related-policy link row. */
function RelatedLink({
  href,
  icon,
  label,
  note,
}: {
  href: string
  icon: React.ReactNode
  label: string
  note: string
}) {
  return (
    <LocalizedClientLink
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-ui-border-base bg-ui-bg-base px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-ui-border-interactive hover:shadow-md"
    >
      <span className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: goldTint(0.14), color: GOLD }}
        >
          {icon}
        </span>
        <span>
          <span className="block text-sm font-semibold text-ui-fg-base">{label}</span>
          <span className="block text-xs text-ui-fg-subtle">{note}</span>
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: GOLD }}
      />
    </LocalizedClientLink>
  )
}
