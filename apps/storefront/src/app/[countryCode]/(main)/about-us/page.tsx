import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { GOLD, goldTint } from "@lib/brand-ui"
import Reveal from "@modules/common/components/reveal"
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
  Ruler,
  ShieldCheck,
  Sofa,
  Sparkles,
  Wallet,
} from "lucide-react"

/**
 * ABOUT US — editorial brand story, Apple-style: generous whitespace, large type, soft cards and
 * gentle scroll reveals. Server component (crawlable in full); the only client piece is the Reveal
 * animation wrapper. SEO: page metadata, one <h1> + clean <h2>s, and AboutPage/Organization JSON-LD.
 */

const PAGE_TITLE = "About Us"
const PAGE_DESCRIPTION =
  "Buno Home Decor is a growing home décor brand in Bangladesh, crafting beautiful, practical " +
  "and affordable wooden and handcrafted pieces — wall frames, shelves, kitchen racks and more."

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

const BELIEFS = [
  { icon: Palette, title: "Beautiful design", body: "Pieces that complement modern homes and quietly elevate the rooms they live in." },
  { icon: Sofa, title: "Practical functionality", body: "Décor made for everyday living — useful first, and lovely with it." },
  { icon: Hammer, title: "Quality craftsmanship", body: "Considered materials and honest workmanship you can feel in the finish." },
  { icon: Wallet, title: "Affordable pricing", body: "Thoughtful design that stays within reach for customers across Bangladesh." },
  { icon: Gem, title: "Unique products", body: "Distinctive pieces that make a space feel personal, not off-the-shelf." },
] as const

const ROADMAP = [
  { icon: Frame, label: "Wooden & handcrafted décor", note: "Where we began" },
  { icon: Sparkles, label: "Home decoration items", note: "Growing now" },
  { icon: Sofa, label: "Furniture", note: "Next" },
  { icon: Ruler, label: "Complete interiors", note: "The vision" },
] as const

const BD = [
  { icon: MapPin, title: "Compact city apartments", body: "Space-smart pieces for Dhaka living." },
  { icon: Sofa, title: "Family homes", body: "Décor that scales to larger spaces." },
  { icon: Leaf, title: "Everyday practicality", body: "Useful in real, lived-in homes." },
  { icon: ShieldCheck, title: "Dependable value", body: "Quality and price kept in balance." },
] as const

const HERO_PILLS = ["Handcrafted in Bangladesh", "Wooden & décor pieces", "Affordable by design", "Delivered with care"]

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </span>
  )
}

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
      address: { "@type": "PostalAddress", streetAddress: brand.contact.address, addressCountry: "BD" },
      sameAs: Object.values(brand.social).filter(Boolean),
    },
  }

  return (
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.22)} 0%, transparent 60%)` }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center medium:py-36">
          <Reveal>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700"
              style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
              About {brand.storeName}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              Bringing beautiful ideas
              <br className="hidden small:block" /> into your{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 -z-0 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">home</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              A growing home décor brand from Bangladesh, built on one simple idea: your home should
              feel as beautiful, comfortable, and personal as you imagine it.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <LocalizedClientLink
                href="/store"
                className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
              >
                Explore the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
              >
                Talk to us
              </LocalizedClientLink>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
              {HERO_PILLS.map((pill) => (
                <span key={pill} className="rounded-full border border-gray-200 bg-white/70 px-4 py-1.5 text-xs font-medium text-gray-600 backdrop-blur">
                  {pill}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Welcome / lead ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-8 medium:pb-16">
        <Reveal>
          <p className="text-2xl font-medium leading-relaxed tracking-[-0.01em] text-gray-900">
            We started our journey with thoughtfully designed wooden and handcrafted home decoration
            items — wall frames, shelves, kitchen racks, helmet stands, key holders and more. What
            began as a small collection grew through the support of customers who wanted stylish,
            functional, and affordable products for their homes.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-6 text-lg leading-relaxed text-gray-500">
            Today, Buno is growing beyond wooden décor. Our vision is to become a trusted destination
            for{" "}
            <span className="font-semibold text-gray-900" style={{ boxShadow: `inset 0 -0.5em 0 ${goldTint(0.4)}` }}>
              home décor and home decoration items in Bangladesh
            </span>{" "}
            — products that help people create spaces they genuinely love.
          </p>
        </Reveal>
      </section>

      {/* ── Our Journey ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-6 py-20 medium:py-28">
          <div className="grid gap-12 medium:grid-cols-[0.85fr_1.15fr] medium:gap-16">
            <Reveal className="medium:sticky medium:top-28 medium:self-start">
              <Kicker>Our Journey</Kicker>
              <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] medium:text-5xl">
                From an empty wall to a home you love
              </h2>
            </Reveal>
            <div className="flex flex-col gap-6">
              <Reveal>
                <p className="text-lg leading-relaxed text-gray-600">
                  Buno Home Decor started with a focus on wooden home décor and handcrafted products.
                  We saw an opportunity to make everyday spaces more attractive — without making good
                  design unnecessarily expensive.
                </p>
              </Reveal>
              <Reveal delay={80}>
                <figure className="card-soft p-8">
                  <div className="text-3xl leading-none" style={{ color: GOLD }}>&ldquo;</div>
                  <blockquote className="mt-2 text-2xl font-medium leading-snug tracking-[-0.01em] text-gray-900">
                    Style, usefulness, and value — the three things a good home really needs.
                  </blockquote>
                </figure>
              </Reveal>
              <Reveal delay={120}>
                <p className="text-lg leading-relaxed text-gray-600">
                  As we grow, our range keeps expanding beyond our beginnings in wooden décor — toward
                  more home decoration products, furniture, and eventually complete interior solutions
                  under one brand.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Believe ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 medium:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Kicker>What We Believe</Kicker>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] medium:text-5xl">
            Décor is about how you want to live
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-500">
            Not only about making a room look good — about creating a space that reflects your
            personality and lifestyle. Every product we choose balances five things.
          </p>
        </Reveal>

        <ul className="mt-14 grid gap-5 small:grid-cols-2 medium:grid-cols-3">
          {BELIEFS.map(({ icon: Icon, title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 70}>
              <div className="card-soft card-hover h-full p-8">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                  <Icon className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-500">{body}</p>
              </div>
            </Reveal>
          ))}
          {/* CTA tile completes the grid */}
          <Reveal as="li" delay={BELIEFS.length * 70}>
            <LocalizedClientLink
              href="/store"
              className="card-hover flex h-full flex-col justify-between rounded-3xl p-8 text-white"
              style={{ backgroundColor: "#111827" }}
            >
              <span className="text-lg font-semibold leading-snug">
                Whatever the room, we want Buno to be the place you turn to.
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: GOLD }}>
                Browse the collection <ArrowRight className="h-4 w-4" />
              </span>
            </LocalizedClientLink>
          </Reveal>
        </ul>
      </section>

      {/* ── More Than Wooden Décor (dark) ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-900 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${goldTint(0.16)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-6xl px-6 py-20 medium:py-28">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
              More Than Wooden Décor
            </span>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] medium:text-5xl">
              Where our story begins — <span style={{ color: GOLD }}>not where it ends</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/70">
              Our goal is to build Buno into a broader home décor brand in Bangladesh — from a small
              piece to a complete interior, making beautiful homes more accessible.
            </p>
          </Reveal>

          <ol className="mt-16 grid gap-4 small:grid-cols-2 medium:grid-cols-4">
            {ROADMAP.map(({ icon: Icon, label, note }, i) => (
              <Reveal as="li" key={label} delay={i * 80}>
                <div className="card-hover h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.18), color: GOLD }}>
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
                    Step {i + 1} · {note}
                  </span>
                  <span className="mt-1.5 block text-base font-semibold leading-snug text-white">{label}</span>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Made for Homes in Bangladesh ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 medium:py-28">
        <div className="grid gap-12 medium:grid-cols-2 medium:items-center medium:gap-16">
          <Reveal>
            <Kicker>Made for Homes in Bangladesh</Kicker>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] medium:text-5xl">
              Designed for the way we actually live
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-500">
              From compact apartments in Dhaka to larger family homes across the country, every space
              has different needs. We keep design, quality, and affordability in balance for real
              Bangladeshi homes.
            </p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl p-5" style={{ backgroundColor: goldTint(0.1) }}>
              <Heart className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} fill={GOLD} />
              <p className="text-[15px] leading-relaxed text-gray-700">
                Our customers are at the heart of everything we do. Every order, review, and suggestion
                helps us serve you better.
              </p>
            </div>
          </Reveal>

          <ul className="grid gap-4 small:grid-cols-2">
            {BD.map(({ icon: Icon, title, body }, i) => (
              <Reveal as="li" key={title} delay={i * 70}>
                <div className="card-soft card-hover h-full p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Vision + CTA ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gray-50 px-6 py-20 text-center medium:px-16 medium:py-28">
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 70% at 50% 120%, ${goldTint(0.28)} 0%, transparent 65%)` }} />
            <div className="relative mx-auto max-w-3xl">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
                <Sparkles className="h-4 w-4" style={{ color: GOLD }} /> Our Vision
              </span>
              <h2 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] medium:text-6xl">
                One of Bangladesh&apos;s most loved{" "}
                <span className="relative whitespace-nowrap">
                  <span aria-hidden className="absolute inset-x-0 bottom-1.5 -z-0 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                  <span className="relative">home décor brands</span>
                </span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-500">
                More than an online store — a destination where people discover ideas, products, and
                solutions that help them create better spaces. And we&apos;re just getting started.
              </p>
              <p className="mt-8 text-2xl font-medium tracking-[-0.01em] text-gray-900">
                Welcome to Buno Home Decor — let&apos;s make your space beautiful.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <LocalizedClientLink
                  href="/store"
                  className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
                >
                  Start decorating
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/categories"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-8 py-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-white"
                >
                  Browse categories
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  )
}
