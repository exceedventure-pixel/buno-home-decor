import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { getStoreSettings } from "@lib/data/store-settings"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Clock,
  Mail,
  MapPin,
  PackageOpen,
  Phone,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react"

/**
 * CONTACT — how to reach Buno, with live details.
 *
 * Server component: contact values come from the same admin-editable settings the footer uses
 * (with brand.config as the fallback), so a number changed in the dashboard updates here too —
 * there is no second, hand-typed source of truth to drift. SEO lives in the metadata, the single
 * <h1> + <h2> hierarchy, and the ContactPage/Organization JSON-LD at the foot.
 */

const PAGE_TITLE = "Contact Us"
const PAGE_DESCRIPTION =
  "Get in touch with Buno Home Decor — call, WhatsApp or email us for help with products, orders, " +
  "delivery and returns, or for wholesale and collaboration enquiries in Bangladesh."

/** Brand palette: black ink + Buno gold accent (matches the About page). */
const GOLD = "#F5B301"
const goldTint = (a: number) => `rgba(245, 179, 1, ${a})`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "contact Buno Home Decor",
    "Buno Home Decor phone",
    "home décor Bangladesh contact",
    "customer support",
    "wholesale enquiry",
    "Savar Dhaka home décor",
  ],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/contact`,
    siteName: brand.storeName,
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
  },
}

/** Turn any stored phone format into a tidy local display + tel/WhatsApp links. */
function phoneLinks(raw: string) {
  const digits = raw.replace(/[^\d]/g, "")
  const intl = digits.startsWith("880")
    ? digits
    : digits.startsWith("0")
      ? `88${digits}`
      : digits
  const local = intl.startsWith("880") ? `0${intl.slice(3)}` : raw
  return { display: local, tel: `+${intl}`, wa: intl }
}

/** WhatsApp glyph — not in the icon set, so inlined (same approach as the footer's socials). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.72-1.6-2.01-.17-.29-.02-.45.13-.59.13-.13.29-.34.44-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.64-1.55-.88-2.13-.23-.56-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.41 1.02 2.76 1.17 2.95.14.19 2.01 3.08 4.88 4.32.68.29 1.21.47 1.63.6.68.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12.04 2.5C6.79 2.5 2.53 6.76 2.53 12c0 1.68.44 3.31 1.27 4.75L2.4 21.5l4.87-1.28a9.46 9.46 0 0 0 4.77 1.28h.01c5.24 0 9.5-4.26 9.5-9.5 0-2.54-.99-4.92-2.78-6.72a9.44 9.44 0 0 0-6.73-2.78z" />
    </svg>
  )
}

export default async function ContactPage() {
  const settings = await getStoreSettings()

  // Admin-editable values win; brand.config is the fallback when a field is blank — mirrors the footer.
  const phone = phoneLinks(settings.store_phone || settings.order_phone || brand.contact.phone)
  const whatsapp = phoneLinks(settings.whatsapp_number || brand.contact.whatsapp)
  const email = settings.store_email || brand.contact.email
  const address = settings.store_address || brand.contact.address
  const hotline = settings.hotline || ""
  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(`Buno Home Decor, ${address}`)}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    url: `${getBaseURL()}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: brand.storeName,
      url: getBaseURL(),
      logo: `${getBaseURL()}${brand.logoPath}`,
      email,
      address: {
        "@type": "PostalAddress",
        streetAddress: address,
        addressLocality: "Savar",
        addressRegion: "Dhaka",
        addressCountry: "BD",
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: phone.tel,
          email,
          contactType: "customer service",
          areaServed: "BD",
          availableLanguage: ["Bengali", "English"],
        },
        {
          "@type": "ContactPoint",
          telephone: whatsapp.tel,
          contactType: "sales",
          areaServed: "BD",
        },
      ],
      sameAs: Object.values(brand.social).filter(Boolean),
    },
  }

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
          style={{
            background: `radial-gradient(60% 55% at 50% 0%, ${goldTint(0.16)} 0%, transparent 70%)`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${GOLD} 20%, ${GOLD} 80%, transparent)`,
          }}
        />

        <div className="content-container relative py-20 medium:py-24 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em]"
            style={{ borderColor: goldTint(0.5), color: "var(--brand-primary)", backgroundColor: goldTint(0.1) }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
            Contact {brand.storeName}
          </span>

          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight small:text-5xl medium:text-6xl">
            We&apos;re Here to{" "}
            <span className="relative whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full"
                style={{ backgroundColor: goldTint(0.5) }}
              />
              <span className="relative z-10">Help</span>
            </span>
          </h1>

          <p
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed"
            style={{ color: "var(--brand-secondary)" }}
          >
            A question about a product, help with an order, or just want to know more about our home
            décor collection? Our team is happy to help — reach us whichever way suits you.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`tel:${phone.tel}`}
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              <Phone className="h-4 w-4" /> Call {phone.display}
            </a>
            <a
              href={`https://wa.me/${whatsapp.wa}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Quick contact methods ────────────────────────────────────────────── */}
      <section className="content-container pb-4">
        <div className="grid gap-4 small:grid-cols-2 medium:grid-cols-4">
          <ContactCard
            icon={<Phone className="h-5 w-5" strokeWidth={1.75} />}
            label="Call us"
            value={phone.display}
            href={`tel:${phone.tel}`}
          />
          <ContactCard
            icon={<WhatsAppIcon className="h-5 w-5" />}
            label="WhatsApp"
            value={whatsapp.display}
            href={`https://wa.me/${whatsapp.wa}`}
            external
          />
          <ContactCard
            icon={<Mail className="h-5 w-5" strokeWidth={1.75} />}
            label="Email"
            value={email}
            href={`mailto:${email}`}
            small
          />
          <ContactCard
            icon={<MapPin className="h-5 w-5" strokeWidth={1.75} />}
            label="Visit us"
            value="Savar, Dhaka"
            href={mapUrl}
            external
          />
        </div>
        {hotline && (
          <p className="mt-4 text-center text-sm" style={{ color: "var(--brand-secondary)" }}>
            Hotline:{" "}
            <a href={`tel:${phoneLinks(hotline).tel}`} className="font-semibold text-ui-fg-base hover:underline">
              {hotline}
            </a>
          </p>
        )}
      </section>

      {/* ── Get in touch: support + office ───────────────────────────────────── */}
      <section className="content-container py-16 medium:py-20">
        <div className="grid gap-8 medium:grid-cols-2 medium:gap-12">
          {/* Customer support */}
          <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-7 medium:p-9">
            <SectionKicker>Customer Support</SectionKicker>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Talk to our team</h2>
            <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              For questions about our products, orders, delivery, returns, or anything related to your
              shopping experience, contact us directly. We do our best to respond as quickly as
              possible.
            </p>
            <dl className="mt-6 space-y-4">
              <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone">
                <a href={`tel:${phone.tel}`} className="font-semibold text-ui-fg-base hover:underline">
                  {phone.display}
                </a>
              </DetailRow>
              <DetailRow icon={<Mail className="h-4 w-4" />} label="Email">
                <a href={`mailto:${email}`} className="font-semibold text-ui-fg-base hover:underline">
                  {email}
                </a>
              </DetailRow>
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Hours">
                <span className="text-ui-fg-base">Saturday – Thursday, 10:00 – 20:00</span>
              </DetailRow>
            </dl>
          </div>

          {/* Office */}
          <div className="rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-7 medium:p-9">
            <SectionKicker>Visit Our Office</SectionKicker>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Buno Home Decor</h2>
            <address className="mt-3 not-italic text-base leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              {address}
            </address>
            <div
              className="mt-6 flex items-start gap-3 rounded-xl border p-4"
              style={{ borderColor: goldTint(0.35), backgroundColor: goldTint(0.08) }}
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} />
              <p className="text-sm leading-relaxed text-ui-fg-base">
                Planning to visit? Please contact us beforehand so we can confirm availability.
              </p>
            </div>
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-ui-border-strong px-5 py-2.5 text-sm font-semibold text-ui-fg-base transition-colors hover:bg-ui-bg-base"
            >
              Open in Google Maps <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Order help callout ───────────────────────────────────────────────── */}
      <section className="content-container pb-16 medium:pb-20">
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
                <ShoppingBag className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Need help with an order?</h2>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
                  Keep your <strong className="text-ui-fg-base font-semibold">order number</strong>{" "}
                  handy — it lets us find your purchase fast and help with delivery, status, product
                  details, or returns.
                </p>
              </div>
            </div>
            <LocalizedClientLink
              href="/order-tracking"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02] medium:self-auto"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              Track your order <ArrowRight className="h-4 w-4" />
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* ── Enquiries + Business ─────────────────────────────────────────────── */}
      <section className="content-container pb-16 medium:pb-20">
        <div className="grid gap-5 medium:grid-cols-2">
          {/* Product enquiries */}
          <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-7 medium:p-9">
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: goldTint(0.14), color: GOLD }}
            >
              <PackageOpen className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Product &amp; décor enquiries</h2>
            <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              Looking for something specific? Ask us about dimensions, materials, colours, or
              availability. From wall décor and shelves to kitchen organizers and handcrafted wooden
              products, we&apos;re always expanding our collection for homes across Bangladesh.
            </p>
            <a
              href={`mailto:${email}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--brand-primary)" }}
            >
              Email us your question
              <ArrowRight className="h-4 w-4" style={{ color: GOLD }} />
            </a>
          </div>

          {/* Business — dark card for contrast */}
          <div
            className="relative overflow-hidden rounded-2xl p-7 medium:p-9"
            style={{ backgroundColor: "var(--brand-primary)", color: "#ffffff" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(60% 70% at 100% 0%, ${goldTint(0.16)} 0%, transparent 65%)` }}
            />
            <div className="relative">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: goldTint(0.15), color: GOLD }}
              >
                <Briefcase className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">Business &amp; collaboration</h2>
              <p className="mt-3 text-base leading-relaxed text-white/75">
                For wholesale, corporate orders, brand collaborations, or partnerships, get in touch.
                We&apos;re always open to opportunities that help us grow and serve our customers
                better.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`tel:${phone.tel}`}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
                >
                  <Phone className="h-4 w-4" /> {phone.display}
                </a>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Mail className="h-4 w-4" /> Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Helpful links ────────────────────────────────────────────────────── */}
      <section className="border-y border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-16 medium:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <SectionKicker center>Before You Reach Out</SectionKicker>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight medium:text-3xl">
              You might find a quick answer here
            </h2>
            <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              Still can&apos;t find what you&apos;re looking for? Simply reach out — we&apos;re happy
              to help.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 small:grid-cols-3">
            <HelpLink href="/faq" icon={<HelpGlyph />} title="FAQ" body="Answers to common questions." />
            <HelpLink
              href="/shipping"
              icon={<Truck className="h-5 w-5" strokeWidth={1.75} />}
              title="Shipping & Delivery"
              body="How and when your order arrives."
            />
            <HelpLink
              href="/refund-policy"
              icon={<RotateCcw className="h-5 w-5" strokeWidth={1.75} />}
              title="Return & Refund"
              body="Our policy, step by step."
            />
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────────── */}
      <section className="content-container py-16 medium:py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <SectionKicker center>Explore Buno Home Decor</SectionKicker>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight medium:text-4xl">
            Beautiful ideas for better spaces
          </h2>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            Explore our growing collection of home décor and home decoration items in Bangladesh —
            designed to bring style, personality, and practicality into everyday spaces.
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
              href="/about-us"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              About us
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* Structured data for search engines — rendered, not visible. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}

/** A tappable quick-contact tile. */
function ContactCard({
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
        <span
          className={`mt-1 block font-semibold text-ui-fg-base ${small ? "break-all text-sm" : "text-base"}`}
        >
          {value}
        </span>
      </span>
    </a>
  )
}

/** A labelled detail row inside the support card. */
function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: goldTint(0.14), color: GOLD }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ui-fg-muted">
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-sm">{children}</dd>
      </div>
    </div>
  )
}

/** A helpful-link card in the "before you reach out" band. */
function HelpLink({
  href,
  icon,
  title,
  body,
}: {
  href: string
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <LocalizedClientLink
      href={href}
      className="group flex flex-col rounded-2xl border border-ui-border-base bg-ui-bg-base p-6 transition-all hover:-translate-y-1 hover:border-ui-border-interactive hover:shadow-lg"
    >
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: goldTint(0.14), color: GOLD }}
      >
        {icon}
      </span>
      <span className="mt-4 flex items-center gap-1.5 text-base font-semibold text-ui-fg-base">
        {title}
        <ArrowUpRight
          className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: GOLD }}
        />
      </span>
      <span className="mt-1 text-sm leading-relaxed text-ui-fg-subtle">{body}</span>
    </LocalizedClientLink>
  )
}

/** Question-mark glyph for the FAQ tile (kept local so the import list stays lean). */
function HelpGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/** Small tracked-out kicker above a section heading (matches the About page). */
function SectionKicker({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] ${
        center ? "justify-center" : ""
      }`}
      style={{ color: "var(--brand-secondary)" }}
    >
      <span className="inline-block h-0.5 w-6 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </span>
  )
}
