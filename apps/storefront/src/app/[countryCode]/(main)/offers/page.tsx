import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { getStoreSettings } from "@lib/data/store-settings"
import { GOLD, goldTint } from "@lib/brand-ui"
import Reveal from "@modules/common/components/reveal"
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
 * EXTRA DISCOUNT & SPECIAL OFFERS — the promotional hub. Apple-style: spacious, card-based,
 * animated. The draw is the "where to find offers" channels (with live social links) and a shop
 * CTA; the offer terms follow as scannable cards. Server component for SEO.
 */

const PAGE_TITLE = "Extra Discount & Special Offers"
const PAGE_DESCRIPTION =
  "Save more on home décor with Buno Home Decor — seasonal campaigns, limited-time deals and " +
  "product offers. Where to find them, how they work, and the terms that apply."

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

const AVAILABLE_ON = ["Selected products", "Special collections", "New launches", "Seasonal campaigns", "Limited-time offers", "Bulk purchases", "Social media offers"]

const HOW_TO = [
  "The discount is applied automatically to the price",
  "Use a promotional code",
  "Mention the offer when ordering",
  "Purchase a specific quantity",
  "Meet a minimum order value",
  "Order within the promotional period",
]

const TERMS = [
  { icon: Clock, title: "Limited-time offers", body: "Some discounts run for a limited period or while stocks last. Once the period ends or the promotional stock sells out, the offer may no longer be available." },
  { icon: CircleCheck, title: "Discount eligibility", body: "Not every product or order qualifies. Offers may require a minimum purchase, apply to selected products only, be limited in quantity, or be tied to a specific payment method, channel, location, or period — often one discount per customer or order." },
  { icon: Layers, title: "Can discounts be combined?", body: "Unless clearly stated otherwise, multiple promotional discounts, coupons, or offers may not be combined in a single order. If two can be combined, we'll say so." },
  { icon: CalendarClock, title: "Discount after an order is placed", body: "Promotional prices apply during the active period. A discount that becomes available after you've ordered won't automatically apply to an earlier order unless we confirm otherwise." },
  { icon: Package, title: "Discount & product availability", body: "All promotional prices are subject to availability — a discounted product may sell out before the period ends. Availability isn't guaranteed until your order is confirmed." },
  { icon: TriangleAlert, title: "Pricing & promotional errors", body: "If a technical, typographical, or system error causes an incorrect promotional price, we may correct it and, where necessary, cancel an affected order. If payment was made for an order we can't fulfill, a refund follows our Refund Policy." },
] as const

function Kicker({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 ${center ? "justify-center" : ""}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </span>
  )
}

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
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.24)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center medium:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              <TicketPercent className="h-3.5 w-3.5" style={{ color: GOLD }} />
              Extra Discount &amp; Offers
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              Save more on your{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">home décor</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              From seasonal campaigns to product-specific deals, you&apos;ll occasionally find extra
              discounts on our home decoration products. Here&apos;s where to find them and how they work.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <LocalizedClientLink href="/store" className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                Shop the collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </LocalizedClientLink>
              <a href="#channels" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                Where to find offers
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── What is an extra discount ────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-14 medium:py-20 text-center">
        <Reveal>
          <Kicker center>What Is an Extra Discount?</Kicker>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">A little extra off, when it&apos;s on</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            An extra discount is a special price reduction or promotional benefit offered in addition
            to the regular price, or during a specific campaign. The amount, availability, and
            conditions of each offer may vary.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {AVAILABLE_ON.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600">
                <Tag className="h-3 w-3" style={{ color: GOLD }} />
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Where to find offers ─────────────────────────────────────────────── */}
      <section id="channels" className="scroll-mt-24 bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker center>Where to Find Offers</Kicker>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Follow us — and check back often</h2>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 small:grid-cols-2 medium:grid-cols-4">
            {CHANNELS.map((c, i) => {
              const Icon = c.icon
              const inner = (
                <>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <h3 className="mt-5 flex items-center gap-1.5 text-base font-semibold text-gray-900">
                    {c.title}
                    <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: GOLD }} />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{c.note}</p>
                </>
              )
              const cls = "card-soft card-hover group flex h-full flex-col p-7"
              return (
                <Reveal key={c.title} delay={i * 70}>
                  {c.internal ? (
                    <LocalizedClientLink href={c.href} className={cls}>{inner}</LocalizedClientLink>
                  ) : (
                    <a href={c.href} target="_blank" rel="noreferrer noopener" className={cls}>{inner}</a>
                  )}
                </Reveal>
              )
            })}
          </div>
          <Reveal>
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-gray-500">
              See an offer on social? Send us the product name, post, video, or a screenshot and our
              team will confirm the promotional price, conditions, delivery charge, payment options,
              and validity.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── How to get one ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-16 medium:py-24">
        <Reveal>
          <Kicker>How Can I Get One?</Kicker>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">It depends on the promotion</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            Some offers apply automatically; others have a simple requirement. The specifics are always
            communicated with the offer. Depending on the promotion, you may need to:
          </p>
        </Reveal>
        <ul className="mt-8 grid gap-3 small:grid-cols-2">
          {HOW_TO.map((t, i) => (
            <Reveal as="li" key={t} delay={i * 50}>
              <div className="card-soft flex items-start gap-3 px-5 py-4">
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} strokeWidth={2} />
                <span className="text-sm text-gray-700">{t}</span>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ── The terms ────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker center>Good to Know</Kicker>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">How our offers work</h2>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 small:grid-cols-2 medium:grid-cols-3">
            {TERMS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="card-soft card-hover h-full p-7">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mx-auto mt-6 block max-w-5xl">
            <div className="flex items-start gap-4 rounded-3xl p-7" style={{ backgroundColor: goldTint(0.1) }}>
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900" style={{ color: GOLD }}>
                <Info className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Important information</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                  Extra discounts are promotional and may change from time to time. Buno Home Decor may
                  introduce, change, or end promotions, limit quantities, exclude selected products, or
                  correct genuine pricing or technical errors. The terms shown with a specific promotion
                  take priority over the general information on this page.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Current offers ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center medium:py-28">
        <Reveal>
          <Kicker center>Current Offers?</Kicker>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Stay in the loop</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            Follow us on social media and check the website regularly — or ask our team whether a
            particular product currently has an available offer.
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
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink href="/store" className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
              <BadgePercent className="h-4 w-4" /> Shop now
            </LocalizedClientLink>
            <LocalizedClientLink href="/support" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-8 py-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
              Support Center
            </LocalizedClientLink>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
