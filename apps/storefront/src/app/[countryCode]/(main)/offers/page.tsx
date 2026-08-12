import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { getStoreSettings } from "@lib/data/store-settings"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  CalendarClock,
  CircleCheck,
  Clock,
  Globe,
  Info,
  Layers,
  Mail,
  MapPin,
  Package,
  Phone,
  Tag,
  TicketPercent,
  TriangleAlert,
} from "lucide-react"

/**
 * EXTRA DISCOUNT & SPECIAL OFFERS — the promotional hub.
 *
 * Info-page layout, not the LegalDoc: this is a marketing page, so the draw is the "where to find
 * offers" channels (with live social links) and a shop CTA. The offer terms follow as scannable
 * cards. Server component for SEO — metadata, single <h1> + <h2> hierarchy.
 */

const PAGE_TITLE = "Extra Discount & Special Offers"
const PAGE_DESCRIPTION =
  "Save more on home décor with Buno Home Decor — seasonal campaigns, limited-time deals and " +
  "product offers. Where to find them, how they work, and the terms that apply."

const GOLD = "#F5B301"
const goldTint = (a: number) => `rgba(245, 179, 1, ${a})`

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/offers" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/offers`,
    siteName: brand.storeName,
  },
}

const AVAILABLE_ON = [
  "Selected products",
  "Special collections",
  "New launches",
  "Seasonal campaigns",
  "Limited-time offers",
  "Bulk purchases",
  "Social media offers",
]

const HOW_TO = [
  "The discount is applied automatically to the price",
  "Use a promotional code",
  "Mention the offer when ordering",
  "Purchase a specific quantity",
  "Meet a minimum order value",
  "Order within the promotional period",
]

const TERMS = [
  {
    icon: Clock,
    title: "Limited-time offers",
    body: "Some discounts run for a limited period or while stocks last. Once the period ends or the promotional stock sells out, the offer may no longer be available.",
  },
  {
    icon: CircleCheck,
    title: "Discount eligibility",
    body: "Not every product or order qualifies. Offers may require a minimum purchase, apply to selected products only, be limited in quantity, or be tied to a specific payment method, channel, location, or period — often one discount per customer or order.",
  },
  {
    icon: Layers,
    title: "Can discounts be combined?",
    body: "Unless clearly stated otherwise, multiple promotional discounts, coupons, or offers may not be combined in a single order. If two can be combined, we'll say so.",
  },
  {
    icon: CalendarClock,
    title: "Discount after an order is placed",
    body: "Promotional prices apply during the active period. A discount that becomes available after you've ordered won't automatically apply to an earlier order unless we confirm otherwise.",
  },
  {
    icon: Package,
    title: "Discount & product availability",
    body: "All promotional prices are subject to availability — a discounted product may sell out before the period ends. Availability isn't guaranteed until your order is confirmed.",
  },
  {
    icon: TriangleAlert,
    title: "Pricing & promotional errors",
    body: "If a technical, typographical, or system error causes an incorrect promotional price, we may correct it and, where necessary, cancel an affected order. If payment was made for an order we can't fulfill, a refund follows our Refund Policy.",
  },
] as const

export default async function OffersPage() {
  const settings = await getStoreSettings()
  const social = {
    facebook: settings.social_links?.facebook || brand.social.facebook,
    instagram: settings.social_links?.instagram || brand.social.instagram,
    tiktok: settings.social_links?.tiktok || brand.social.tiktok,
  }

  const CHANNELS = [
    { icon: Globe, title: "Website", note: "Promotional prices, special collections and limited-time offers.", href: "/store", internal: true },
    { icon: FacebookGlyph, title: "Facebook", note: "Discounts, campaigns, new products and promotional offers.", href: social.facebook },
    { icon: InstagramGlyph, title: "Instagram", note: "Product launches, décor inspiration and special offers.", href: social.instagram },
    { icon: TikTokGlyph, title: "TikTok", note: "Featured products, campaigns and promotional prices.", href: social.tiktok },
  ].filter((c) => c.href)

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
          style={{ background: `radial-gradient(60% 55% at 50% 0%, ${goldTint(0.18)} 0%, transparent 70%)` }}
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
            <TicketPercent className="h-3.5 w-3.5" style={{ color: GOLD }} />
            Extra Discount &amp; Offers
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight small:text-5xl medium:text-6xl">
            Save more on your{" "}
            <span className="relative whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full"
                style={{ backgroundColor: goldTint(0.5) }}
              />
              <span className="relative z-10">home décor</span>
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            From seasonal campaigns to product-specific deals, you&apos;ll occasionally find extra
            discounts on our home decoration products. Here&apos;s where to find them and how they
            work.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink
              href="/store"
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              Shop the collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </LocalizedClientLink>
            <a
              href="#channels"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Where to find offers
            </a>
          </div>
        </div>
      </section>

      {/* ── What is an extra discount ────────────────────────────────────────── */}
      <section className="content-container py-12 medium:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHead center kicker="What Is an Extra Discount?" title="A little extra off, when it's on" />
          <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            An extra discount is a special price reduction or promotional benefit offered in addition
            to the regular price, or during a specific campaign. The amount, availability, and
            conditions of each offer may vary.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {AVAILABLE_ON.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-ui-border-base bg-ui-bg-base px-3.5 py-1.5 text-xs font-medium text-ui-fg-subtle"
              >
                <Tag className="h-3 w-3" style={{ color: GOLD }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Where to find offers — channels ──────────────────────────────────── */}
      <section id="channels" className="scroll-mt-24 border-y border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-14 medium:py-20">
          <SectionHead center kicker="Where to Find Offers" title="Follow us — and check back often" />
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 small:grid-cols-2 medium:grid-cols-4">
            {CHANNELS.map((c) => {
              const Icon = c.icon
              const inner = (
                <>
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                    style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 flex items-center gap-1.5 text-base font-semibold text-ui-fg-base">
                    {c.title}
                    <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: GOLD }} />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ui-fg-subtle">{c.note}</p>
                </>
              )
              const cls =
                "group flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-base p-6 transition-all hover:-translate-y-1 hover:border-ui-border-interactive hover:shadow-lg"
              return c.internal ? (
                <LocalizedClientLink key={c.title} href={c.href} className={cls}>
                  {inner}
                </LocalizedClientLink>
              ) : (
                <a key={c.title} href={c.href} target="_blank" rel="noreferrer noopener" className={cls}>
                  {inner}
                </a>
              )
            })}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm" style={{ color: "var(--brand-secondary)" }}>
            See an offer on social? Send us the product name, post, video, or a screenshot and our
            team will confirm the promotional price, conditions, delivery charge, payment options,
            and validity.
          </p>
        </div>
      </section>

      {/* ── How to get an extra discount ─────────────────────────────────────── */}
      <section className="content-container py-14 medium:py-16">
        <div className="mx-auto max-w-3xl">
          <SectionHead kicker="How Can I Get One?" title="It depends on the promotion" />
          <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            Some offers apply automatically; others have a simple requirement. The specifics are always
            communicated with the offer. Depending on the promotion, you may need to:
          </p>
          <ul className="mt-6 grid gap-3 small:grid-cols-2">
            {HOW_TO.map((t) => (
              <li
                key={t}
                className="flex items-start gap-3 rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3"
              >
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} strokeWidth={2} />
                <span className="text-sm text-ui-fg-base">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The terms ────────────────────────────────────────────────────────── */}
      <section className="border-t border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-14 medium:py-20">
          <SectionHead center kicker="Good to Know" title="How our offers work" />
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 small:grid-cols-2 medium:grid-cols-3">
            {TERMS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-base p-6">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: goldTint(0.14), color: GOLD }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ui-fg-subtle">{body}</p>
              </div>
            ))}
          </div>

          {/* Important information */}
          <div className="mx-auto mt-6 flex max-w-5xl items-start gap-4 rounded-2xl border p-6" style={{ borderColor: goldTint(0.3), backgroundColor: goldTint(0.07) }}>
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
            >
              <Info className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-base font-semibold tracking-tight">Important information</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
                Extra discounts are promotional and may change from time to time. Buno Home Decor may
                introduce, change, or end promotions, limit quantities, exclude selected products, or
                correct genuine pricing or technical errors. The terms shown with a specific promotion
                take priority over the general information on this page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Want to know about current offers ────────────────────────────────── */}
      <section className="content-container py-16 medium:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHead center kicker="Current Offers?" title="Stay in the loop" />
          <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            Follow us on social media and check the website regularly — or ask our team whether a
            particular product currently has an available offer.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 text-sm" style={{ color: "var(--brand-secondary)" }}>
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4" style={{ color: GOLD }} />
              <a href={`tel:${phoneTel}`} className="font-semibold text-ui-fg-base hover:underline">{phoneDisplay}</a>
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" style={{ color: GOLD }} />
              <a href={`mailto:${brand.contact.email}`} className="font-semibold text-ui-fg-base hover:underline">{brand.contact.email}</a>
            </span>
            <span className="inline-flex items-center gap-2 text-center">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
              {brand.contact.address}
            </span>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink
              href="/store"
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              <BadgePercent className="h-4 w-4" /> Shop now
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/support"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Support Center
            </LocalizedClientLink>
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

/* Brand social glyphs — not in the icon set, inlined like the footer's socials. */
function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  )
}
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.2v12.86a2.59 2.59 0 0 1-2.59 2.46 2.59 2.59 0 0 1-.96-5 2.59 2.59 0 0 1 1.14-.14V9.9a5.8 5.8 0 0 0-5.92 5.8 5.8 5.8 0 0 0 11.6 0V9.01a7.45 7.45 0 0 0 4.34 1.39V7.2a4.28 4.28 0 0 1-3.4-1.38z" />
    </svg>
  )
}
