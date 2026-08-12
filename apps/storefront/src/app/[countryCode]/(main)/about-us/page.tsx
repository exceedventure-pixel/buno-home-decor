import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowRight,
  Frame,
  Gem,
  Hammer,
  Heart,
  Leaf,
  MapPin,
  Palette,
  Quote,
  Ruler,
  ShieldCheck,
  Sofa,
  Sparkles,
  Wallet,
} from "lucide-react"

/**
 * ABOUT US — editorial brand story.
 *
 * Server component on purpose: no interactivity, so it ships as static HTML that crawlers read in
 * full. SEO lives in three places here — the page metadata below, a single <h1> with a clean
 * <h2> section hierarchy, and the AboutPage/Organization JSON-LD at the foot of the page.
 */

const PAGE_TITLE = "About Us"
const PAGE_DESCRIPTION =
  "Buno Home Decor is a growing home décor brand in Bangladesh, crafting beautiful, practical " +
  "and affordable wooden and handcrafted pieces — wall frames, shelves, kitchen racks and more."

/**
 * Brand palette: black (the site's `--brand-primary`) as the structural ink, Buno's signature
 * gold as the accent. Gold is defined here rather than pulled from a token because the global
 * `--brand-*` set has no accent slot yet. Tints are rgba of the same hue so they read as one colour.
 */
const GOLD = "#F5B301"
const goldTint = (a: number) => `rgba(245, 179, 1, ${a})`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "home décor Bangladesh",
    "home decoration items Bangladesh",
    "wooden home décor",
    "handcrafted décor",
    "wall frames",
    "wall shelves",
    "kitchen racks",
    "Buno Home Decor",
  ],
  alternates: { canonical: "/about-us" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/about-us`,
    siteName: brand.storeName,
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
  },
}

/** The five brand beliefs — the highlighted heart of the page. */
const BELIEFS = [
  {
    icon: Palette,
    title: "Beautiful design",
    body: "Pieces that complement modern homes and quietly elevate the rooms they live in.",
  },
  {
    icon: Sofa,
    title: "Practical functionality",
    body: "Décor made for everyday living — useful first, and lovely with it.",
  },
  {
    icon: Hammer,
    title: "Quality craftsmanship",
    body: "Considered materials and honest workmanship you can feel in the finish.",
  },
  {
    icon: Wallet,
    title: "Affordable pricing",
    body: "Thoughtful design that stays within reach for customers across Bangladesh.",
  },
  {
    icon: Gem,
    title: "Unique products",
    body: "Distinctive pieces that make a space feel personal, not off-the-shelf.",
  },
] as const

/** Where the brand is heading — shown as a progression band. */
const ROADMAP = [
  { icon: Frame, label: "Wooden & handcrafted décor", note: "Where we began" },
  { icon: Sparkles, label: "Home decoration items", note: "Growing now" },
  { icon: Sofa, label: "Furniture", note: "Next" },
  { icon: Ruler, label: "Complete interiors", note: "The vision" },
] as const

const HERO_PILLS = [
  "Handcrafted in Bangladesh",
  "Wooden & décor pieces",
  "Affordable by design",
  "Delivered with care",
]

export default function AboutUsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    url: `${getBaseURL()}/about-us`,
    mainEntity: {
      "@type": "Organization",
      name: brand.storeName,
      description: brand.description,
      url: getBaseURL(),
      logo: `${getBaseURL()}${brand.logoPath}`,
      email: brand.contact.email,
      telephone: brand.contact.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: brand.contact.address,
        addressCountry: "BD",
      },
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
        {/* soft, gold wash behind the opening statement */}
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

        <div className="content-container relative py-20 medium:py-28 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em]"
            style={{ borderColor: goldTint(0.5), color: "var(--brand-primary)", backgroundColor: goldTint(0.1) }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
            About {brand.storeName}
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight small:text-5xl medium:text-6xl">
            Bringing Beautiful Ideas
            <br className="hidden small:block" /> Into Your{" "}
            <span className="relative whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full"
                style={{ backgroundColor: goldTint(0.5) }}
              />
              <span className="relative z-10">Home</span>
            </span>
          </h1>

          <p
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed"
            style={{ color: "var(--brand-secondary)" }}
          >
            A growing home décor brand from Bangladesh, built on one simple idea: your home should
            feel as beautiful, comfortable, and personal as you imagine it.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
            {HERO_PILLS.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-ui-border-base bg-ui-bg-base px-4 py-1.5 text-xs font-medium text-ui-fg-subtle"
              >
                {pill}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink
              href="/store"
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
            >
              Explore the collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Talk to us
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* ── Welcome / lead ───────────────────────────────────────────────────── */}
      <section className="content-container pb-6 medium:pb-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-xl leading-relaxed text-ui-fg-base">
            <span
              aria-hidden
              className="float-left mr-3 mt-1 text-6xl font-bold leading-[0.72]"
              style={{ color: GOLD }}
            >
              W
            </span>
            e started our journey with thoughtfully designed wooden and handcrafted home decoration
            items — wall frames, wall shelves, kitchen racks, helmet stands, key holders, and other
            practical décor pieces. What began as a small collection quickly grew through the support
            of customers who wanted stylish, functional, and affordable products for their homes.
          </p>
          <p className="mt-5 text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
            Today, Buno is growing beyond wooden décor. Our vision is to become a trusted destination
            for{" "}
            <strong
              className="font-semibold text-ui-fg-base"
              style={{ boxShadow: `inset 0 -0.5em 0 ${goldTint(0.4)}` }}
            >
              home décor and home decoration items in Bangladesh
            </strong>{" "}
            — offering products that help people create spaces they genuinely love.
          </p>
        </div>
      </section>

      {/* ── Our Journey ──────────────────────────────────────────────────────── */}
      <section className="content-container py-16 medium:py-20">
        <div className="grid gap-10 medium:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] medium:gap-16">
          <div className="medium:sticky medium:top-24 medium:self-start">
            <SectionKicker>Our Journey</SectionKicker>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight medium:text-4xl">
              From an empty wall to a home you love
            </h2>
          </div>

          <div className="space-y-6">
            <p className="text-lg leading-relaxed text-ui-fg-base">
              Buno Home Decor started with a focus on wooden home décor and handcrafted products. We
              saw an opportunity to make everyday spaces more attractive — without making good design
              unnecessarily expensive.
            </p>
            <p className="text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              From wall décor that adds character to an empty wall, to shelves and organizers that
              make a home more functional, we focus on products that combine style, usefulness, and
              value.
            </p>

            <PullQuote>
              We look for products that combine style, usefulness, and value — the three things a
              good home really needs.
            </PullQuote>

            <p className="text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              As we grow, our range will keep expanding beyond our beginnings in wooden décor. We are
              working toward bringing more home decoration products, furniture, and eventually
              complete interior solutions under one brand.
            </p>
          </div>
        </div>
      </section>

      {/* ── What We Believe — highlighted points ─────────────────────────────── */}
      <section className="border-y border-ui-border-base bg-ui-bg-subtle">
        <div className="content-container py-16 medium:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <SectionKicker center>What We Believe</SectionKicker>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight medium:text-4xl">
              Décor is about how you want to live
            </h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              Home décor is not only about making a room look good. It is about creating a space that
              reflects your personality, lifestyle, and the way you want to live. That is why every
              product we choose balances:
            </p>
          </div>

          <ul className="mx-auto mt-12 grid max-w-5xl gap-5 small:grid-cols-2 medium:grid-cols-3">
            {BELIEFS.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="group rounded-2xl border border-ui-border-base bg-ui-bg-base p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                  style={{ backgroundColor: "var(--brand-primary)", color: GOLD }}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ui-fg-base">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ui-fg-subtle">{body}</p>
              </li>
            ))}
          </ul>

          <p
            className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed"
            style={{ color: "var(--brand-secondary)" }}
          >
            Whether you are decorating a new home, refreshing a single room, organizing your kitchen,
            or simply looking for something special for an empty wall — we want Buno to be a place
            you can turn to.
          </p>
        </div>
      </section>

      {/* ── More Than Wooden Décor — dark contrast band + roadmap ────────────── */}
      <section
        className="relative"
        style={{ backgroundColor: "var(--brand-primary)", color: "#ffffff" }}
      >
        <div className="content-container py-16 medium:py-24">
          {/* faint gold glow so the black band reads warm, not flat */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(50% 60% at 50% 0%, ${goldTint(0.14)} 0%, transparent 65%)`,
            }}
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              <span className="inline-block h-0.5 w-6 rounded-full" style={{ backgroundColor: GOLD }} />
              More Than Wooden Décor
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight medium:text-4xl">
              Where our story begins —{" "}
              <span style={{ color: GOLD }}>not where it ends</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/75">
              Our goal is to build Buno into a broader home décor brand in Bangladesh, with products
              across every area of the home. From a small décor piece to a complete interior, our
              ambition is to make beautiful homes more accessible.
            </p>
          </div>

          <ol className="relative mx-auto mt-14 grid max-w-5xl gap-4 small:grid-cols-2 medium:grid-cols-4">
            {ROADMAP.map(({ icon: Icon, label, note }, i) => (
              <li
                key={label}
                className="relative rounded-2xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors hover:border-white/30"
              >
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: goldTint(0.15), color: GOLD }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span
                  className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: GOLD }}
                >
                  Step {i + 1} · {note}
                </span>
                <span className="mt-1.5 block text-base font-semibold leading-snug text-white">
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Made for Homes in Bangladesh ─────────────────────────────────────── */}
      <section className="content-container py-16 medium:py-24">
        <div className="grid gap-10 medium:grid-cols-2 medium:items-center medium:gap-16">
          <div>
            <SectionKicker>Made for Homes in Bangladesh</SectionKicker>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight medium:text-4xl">
              Designed for the way we actually live
            </h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              Homes in Bangladesh are diverse — from compact apartments in Dhaka to larger family
              homes across the country, every space has different needs. We aim to offer home
              decoration products that are practical for everyday Bangladeshi homes while keeping
              design, quality, and affordability in mind.
            </p>
            <div
              className="mt-7 flex items-start gap-3 rounded-2xl border p-5"
              style={{ borderColor: goldTint(0.35), backgroundColor: goldTint(0.08) }}
            >
              <Heart className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} fill={GOLD} />
              <p className="text-base leading-relaxed text-ui-fg-base">
                As a Bangladesh-based brand, our customers are at the heart of everything we do.
                Every order, review, and suggestion helps us serve you better.
              </p>
            </div>
          </div>

          <ul className="grid gap-4 small:grid-cols-2">
            {[
              { icon: MapPin, title: "Compact city apartments", body: "Space-smart pieces for Dhaka living." },
              { icon: Sofa, title: "Family homes", body: "Décor that scales to larger spaces." },
              { icon: Leaf, title: "Everyday practicality", body: "Useful in real, lived-in homes." },
              { icon: ShieldCheck, title: "Dependable value", body: "Quality and price kept in balance." },
            ].map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-5 transition-colors hover:border-ui-border-interactive"
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: goldTint(0.14), color: GOLD }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ui-fg-base">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ui-fg-subtle">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Our Vision + CTA ─────────────────────────────────────────────────── */}
      <section className="content-container pb-24">
        <div
          className="relative overflow-hidden rounded-3xl border px-6 py-16 text-center medium:px-16 medium:py-20"
          style={{ borderColor: goldTint(0.3), backgroundColor: "var(--brand-bg)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(55% 65% at 50% 110%, ${goldTint(0.2)} 0%, transparent 70%)`,
            }}
          />
          <div className="relative mx-auto max-w-3xl">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: "var(--brand-primary)", borderColor: goldTint(0.5), backgroundColor: goldTint(0.1) }}
            >
              <Sparkles className="h-4 w-4" style={{ color: GOLD }} /> Our Vision
            </span>
            <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight medium:text-[2.75rem]">
              To become one of Bangladesh&apos;s most trusted and loved{" "}
              <span className="relative whitespace-nowrap">
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full"
                  style={{ backgroundColor: goldTint(0.5) }}
                />
                <span className="relative z-10">home décor brands</span>
              </span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: "var(--brand-secondary)" }}>
              We want Buno Home Decor to be more than an online store — a destination where people
              discover ideas, products, and solutions that help them create better spaces. And we
              are just getting started.
            </p>

            <p className="mt-8 text-xl font-semibold text-ui-fg-base medium:text-2xl">
              Welcome to Buno Home Decor —{" "}
              <span
                className="box-decoration-clone px-1"
                style={{ backgroundColor: goldTint(0.35) }}
              >
                let&apos;s make your space beautiful.
              </span>
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <LocalizedClientLink
                href="/store"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
              >
                Start decorating
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/categories"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                Browse categories
              </LocalizedClientLink>
            </div>
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

/** Small tracked-out kicker above a section heading. */
function SectionKicker({
  children,
  center,
}: {
  children: React.ReactNode
  center?: boolean
}) {
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

/** A quiet, framed pull-quote for a highlighted line. */
function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      className="relative rounded-2xl py-4 pl-7 pr-4"
      style={{ borderLeft: `3px solid ${GOLD}`, backgroundColor: goldTint(0.07) }}
    >
      <Quote aria-hidden className="absolute left-4 top-3 h-5 w-5" style={{ color: GOLD }} />
      <p className="pl-6 text-xl font-medium italic leading-relaxed text-ui-fg-base">{children}</p>
    </blockquote>
  )
}
