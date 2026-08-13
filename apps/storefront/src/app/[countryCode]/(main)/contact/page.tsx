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
 * CONTACT — Apple-style: spacious, card-based, gently animated. Contact values come from the same
 * admin-editable settings the footer uses (brand.config fallback), so a number changed in the
 * dashboard updates here too. SEO: metadata, single <h1> + <h2>s, ContactPage/Organization JSON-LD.
 */

const PAGE_TITLE = "Contact Us"
const PAGE_DESCRIPTION =
  "Get in touch with Buno Home Decor — call, WhatsApp or email us for help with products, orders, " +
  "delivery and returns, or for wholesale and collaboration enquiries in Bangladesh."

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
  const intl = digits.startsWith("880") ? digits : digits.startsWith("0") ? `88${digits}` : digits
  const local = intl.startsWith("880") ? `0${intl.slice(3)}` : raw
  return { display: local, tel: `+${intl}`, wa: intl }
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.72-1.6-2.01-.17-.29-.02-.45.13-.59.13-.13.29-.34.44-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.64-1.55-.88-2.13-.23-.56-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.41 1.02 2.76 1.17 2.95.14.19 2.01 3.08 4.88 4.32.68.29 1.21.47 1.63.6.68.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12.04 2.5C6.79 2.5 2.53 6.76 2.53 12c0 1.68.44 3.31 1.27 4.75L2.4 21.5l4.87-1.28a9.46 9.46 0 0 0 4.77 1.28h.01c5.24 0 9.5-4.26 9.5-9.5 0-2.54-.99-4.92-2.78-6.72a9.44 9.44 0 0 0-6.73-2.78z" />
    </svg>
  )
}

function Kicker({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 ${center ? "justify-center" : ""}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </span>
  )
}

export default async function ContactPage() {
  const settings = await getStoreSettings()

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
        { "@type": "ContactPoint", telephone: phone.tel, email, contactType: "customer service", areaServed: "BD", availableLanguage: ["Bengali", "English"] },
        { "@type": "ContactPoint", telephone: whatsapp.tel, contactType: "sales", areaServed: "BD" },
      ],
      sameAs: Object.values(brand.social).filter(Boolean),
    },
  }

  const methods = [
    { icon: <Phone className="h-6 w-6" strokeWidth={1.75} />, label: "Call us", value: phone.display, href: `tel:${phone.tel}` },
    { icon: <WhatsAppIcon className="h-6 w-6" />, label: "WhatsApp", value: whatsapp.display, href: `https://wa.me/${whatsapp.wa}`, external: true },
    { icon: <Mail className="h-6 w-6" strokeWidth={1.75} />, label: "Email", value: email, href: `mailto:${email}`, small: true },
    { icon: <MapPin className="h-6 w-6" strokeWidth={1.75} />, label: "Visit us", value: "Savar, Dhaka", href: mapUrl, external: true },
  ]

  return (
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.22)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center medium:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
              Contact {brand.storeName}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              We&apos;re here to{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 -z-0 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">help</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              A question about a product, help with an order, or just curious about our collection?
              Reach us whichever way suits you — our team is happy to help.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a href={`tel:${phone.tel}`} className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                <Phone className="h-4 w-4" /> Call {phone.display}
              </a>
              <a href={`https://wa.me/${whatsapp.wa}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Quick contact methods ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-6">
        <div className="grid gap-4 small:grid-cols-2 medium:grid-cols-4">
          {methods.map((m, i) => (
            <Reveal key={m.label} delay={i * 70}>
              <a
                href={m.href}
                {...(m.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                className="card-soft card-hover flex h-full flex-col gap-4 p-6"
              >
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                  {m.icon}
                </span>
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{m.label}</span>
                  <span className={`mt-1 block font-semibold text-gray-900 ${m.small ? "break-all text-sm" : "text-base"}`}>{m.value}</span>
                </span>
              </a>
            </Reveal>
          ))}
        </div>
        {hotline && (
          <p className="mt-5 text-center text-sm text-gray-500">
            Hotline:{" "}
            <a href={`tel:${phoneLinks(hotline).tel}`} className="font-semibold text-gray-900 hover:underline">{hotline}</a>
          </p>
        )}
      </section>

      {/* ── Support + office ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
        <div className="grid gap-6 medium:grid-cols-2">
          <Reveal>
            <div className="card-soft h-full p-8 medium:p-10">
              <Kicker>Customer Support</Kicker>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em]">Talk to our team</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
                Questions about products, orders, delivery or returns? Contact us directly — we do our
                best to respond as quickly as possible.
              </p>
              <dl className="mt-7 space-y-4">
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone">
                  <a href={`tel:${phone.tel}`} className="font-semibold text-gray-900 hover:underline">{phone.display}</a>
                </DetailRow>
                <DetailRow icon={<Mail className="h-4 w-4" />} label="Email">
                  <a href={`mailto:${email}`} className="font-semibold text-gray-900 hover:underline">{email}</a>
                </DetailRow>
                <DetailRow icon={<Clock className="h-4 w-4" />} label="Hours">
                  <span className="text-gray-900">Saturday – Thursday, 10:00 – 20:00</span>
                </DetailRow>
              </dl>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="card-soft h-full p-8 medium:p-10">
              <Kicker>Visit Our Office</Kicker>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em]">Buno Home Decor</h2>
              <address className="mt-3 not-italic text-[15px] leading-relaxed text-gray-500">{address}</address>
              <div className="mt-6 flex items-start gap-3 rounded-2xl p-4" style={{ backgroundColor: goldTint(0.1) }}>
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} />
                <p className="text-sm leading-relaxed text-gray-700">
                  Planning to visit? Please contact us beforehand so we can confirm availability.
                </p>
              </div>
              <a href={mapUrl} target="_blank" rel="noreferrer noopener" className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                Open in Google Maps <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Order help callout ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16 medium:pb-24">
        <Reveal>
          <div className="overflow-hidden rounded-3xl p-8 medium:p-12" style={{ backgroundColor: goldTint(0.1) }}>
            <div className="flex flex-col gap-6 medium:flex-row medium:items-center medium:justify-between">
              <div className="flex items-start gap-5">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                  <ShoppingBag className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.02em]">Need help with an order?</h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-gray-600">
                    Keep your <span className="font-semibold text-gray-900">order number</span> handy —
                    it lets us find your purchase fast and help with delivery, status, or returns.
                  </p>
                </div>
              </div>
              <LocalizedClientLink href="/order-tracking" className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] medium:self-auto">
                Track your order <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </LocalizedClientLink>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Enquiries + Business ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16 medium:pb-24">
        <div className="grid gap-6 medium:grid-cols-2">
          <Reveal>
            <div className="card-soft h-full p-8 medium:p-10">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                <PackageOpen className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">Product &amp; décor enquiries</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
                Ask us about dimensions, materials, colours or availability. From wall décor and
                shelves to kitchen organizers and handcrafted wooden products, we&apos;re always
                expanding our collection.
              </p>
              <a href={`mailto:${email}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                Email us your question <ArrowRight className="h-4 w-4" style={{ color: GOLD }} />
              </a>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="card-hover relative h-full overflow-hidden rounded-3xl bg-gray-900 p-8 text-white medium:p-10">
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 70% at 100% 0%, ${goldTint(0.18)} 0%, transparent 65%)` }} />
              <div className="relative">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.18), color: GOLD }}>
                  <Briefcase className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">Business &amp; collaboration</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-white/70">
                  For wholesale, corporate orders, brand collaborations or partnerships, get in touch.
                  We&apos;re always open to opportunities that help us serve customers better.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={`tel:${phone.tel}`} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-gray-900 transition-transform hover:scale-[1.03]" style={{ backgroundColor: GOLD }}>
                    <Phone className="h-4 w-4" /> {phone.display}
                  </a>
                  <a href={`mailto:${email}`} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                    <Mail className="h-4 w-4" /> Email
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Helpful links ────────────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker center>Before You Reach Out</Kicker>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">
              You might find a quick answer here
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
              Still can&apos;t find what you&apos;re looking for? Simply reach out — we&apos;re happy to help.
            </p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 small:grid-cols-3">
            <HelpLink href="/faq" icon={<HelpGlyph />} title="FAQ" body="Answers to common questions." delay={0} />
            <HelpLink href="/shipping" icon={<Truck className="h-6 w-6" strokeWidth={1.75} />} title="Shipping & Delivery" body="How and when your order arrives." delay={80} />
            <HelpLink href="/refund-policy" icon={<RotateCcw className="h-6 w-6" strokeWidth={1.75} />} title="Return & Refund" body="Our policy, step by step." delay={160} />
          </div>
        </div>
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center medium:py-28">
        <Reveal>
          <Kicker center>Explore Buno Home Decor</Kicker>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] medium:text-5xl">
            Beautiful ideas for better spaces
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-500">
            Explore our growing collection of home décor and home decoration items in Bangladesh —
            designed to bring style, personality and practicality into everyday spaces.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink href="/store" className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
              Browse the collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </LocalizedClientLink>
            <LocalizedClientLink href="/about-us" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-8 py-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
              About us
            </LocalizedClientLink>
          </div>
        </Reveal>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</dt>
        <dd className="mt-0.5 break-words text-sm">{children}</dd>
      </div>
    </div>
  )
}

function HelpLink({ href, icon, title, body, delay }: { href: string; icon: React.ReactNode; title: string; body: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <LocalizedClientLink href={href} className="card-soft card-hover group flex h-full flex-col p-7">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
          {icon}
        </span>
        <span className="mt-5 flex items-center gap-1.5 text-base font-semibold text-gray-900">
          {title}
          <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: GOLD }} />
        </span>
        <span className="mt-1 text-sm leading-relaxed text-gray-500">{body}</span>
      </LocalizedClientLink>
    </Reveal>
  )
}

function HelpGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
