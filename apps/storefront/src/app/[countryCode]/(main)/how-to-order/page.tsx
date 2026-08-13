import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { getStoreSettings } from "@lib/data/store-settings"
import { GOLD, goldTint } from "@lib/brand-ui"
import Reveal from "@modules/common/components/reveal"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowRight,
  CircleCheck,
  ClipboardList,
  CreditCard,
  Eye,
  House,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react"

/**
 * HOW TO ORDER — a visual, step-by-step ordering guide. Apple-style: spacious numbered stepper,
 * soft cards, gentle reveals. Server component for SEO (metadata, single <h1> + <h2>s, and a HowTo
 * JSON-LD block describing the ordering steps).
 */

const PAGE_TITLE = "How to Order"
const PAGE_DESCRIPTION =
  "Order home décor from Buno Home Decor in a few easy steps — through our website or via Facebook, " +
  "Instagram and TikTok. A simple, step-by-step guide for shoppers in Bangladesh."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/how-to-order" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/how-to-order`,
    siteName: brand.storeName,
  },
}

type Step = { icon: typeof Search; title: string; body: React.ReactNode }

const WEBSITE_STEPS: Step[] = [
  {
    icon: Search,
    title: "Browse our products",
    body: (
      <>
        <p>Explore the Buno Home Decor collection of home decoration products, such as:</p>
        <ul>
          <li>Wall décor and wall frames</li>
          <li>Wall shelves</li>
          <li>Kitchen racks and organizers</li>
          <li>Key holders and helmet stands</li>
          <li>Wooden and handcrafted décor</li>
          <li>Other home decoration items</li>
        </ul>
      </>
    ),
  },
  {
    icon: Eye,
    title: "Choose your product",
    body: (
      <>
        <p>Open a product page and review the details, including:</p>
        <ul>
          <li>Product name and images</li>
          <li>Price</li>
          <li>Size and dimensions</li>
          <li>Materials</li>
          <li>Available variations, where applicable</li>
        </ul>
        <p>Select the desired quantity or variation.</p>
      </>
    ),
  },
  {
    icon: ShoppingCart,
    title: "Add to cart",
    body: (
      <p>
        Click <strong>Add to Cart</strong> to save the product. Keep browsing to add more, then open
        your cart to review your selected products and quantities.
      </p>
    ),
  },
  {
    icon: ClipboardList,
    title: "Proceed to checkout",
    body: (
      <>
        <p>Enter your delivery information carefully:</p>
        <ul>
          <li>Full name</li>
          <li>Active phone number</li>
          <li>Complete delivery address</li>
          <li>City or area</li>
          <li>Additional delivery instructions, if required</li>
        </ul>
        <p>
          Please make sure your phone number and delivery address are correct so our delivery team can
          reach you when necessary.
        </p>
      </>
    ),
  },
  {
    icon: CreditCard,
    title: "Select your payment method",
    body: (
      <p>
        Choose from the options available at checkout — depending on what&apos;s currently offered,
        you may be able to pay by <strong>Cash on Delivery</strong> or online. See our{" "}
        <LocalizedClientLink href="/payment">Payment</LocalizedClientLink> page for more.
      </p>
    ),
  },
  {
    icon: CircleCheck,
    title: "Confirm your order",
    body: (
      <>
        <p>Before confirming, double-check your:</p>
        <ul>
          <li>Products, quantities and variations</li>
          <li>Delivery address and phone number</li>
          <li>Payment method</li>
          <li>Order total and delivery charges, where applicable</li>
        </ul>
        <p>Once everything is correct, submit your order.</p>
      </>
    ),
  },
  {
    icon: PackageCheck,
    title: "Receive your order",
    body: (
      <p>
        After your order is processed, we arrange delivery to your address. Delivery time may vary
        with your location, product availability, courier conditions and holidays. Keep your phone
        available so our delivery team can reach you.
      </p>
    ),
  },
]

const SOCIAL_STEPS = [
  "Visit our official Facebook, Instagram, or TikTok page.",
  "Find the product you want to purchase.",
  "Send us a message with the product name or a screenshot.",
  "Our team confirms the product price and availability.",
  "Share your name, phone number, and complete delivery address.",
  "We confirm your order and share delivery and payment details.",
]

const BEFORE_LINKS = [
  { href: "/shipping", label: "Shipping Policy", note: "Delivery information" },
  { href: "/payment", label: "Payment", note: "Available payment methods" },
  { href: "/returns", label: "Happy Return", note: "Return information" },
  { href: "/refund-policy", label: "Refund Policy", note: "Refund terms" },
  { href: "/exchange", label: "Exchange", note: "Exchange conditions" },
  { href: "/cancellation", label: "Cancellation", note: "Cancelling an order" },
  { href: "/faq", label: "FAQ", note: "Common questions" },
]

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

const PROSE =
  "space-y-3 text-[15px] leading-7 text-gray-600 " +
  "[&_strong]:font-semibold [&_strong]:text-gray-900 " +
  "[&_a]:font-medium [&_a]:text-gray-900 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[rgba(240,180,0,0.8)] " +
  "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:marker:text-[#F0B400]"

function SocialButton({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
      {children}
      {label}
    </a>
  )
}

export default async function HowToOrderPage() {
  const settings = await getStoreSettings()
  const social = {
    facebook: settings.social_links?.facebook || brand.social.facebook,
    instagram: settings.social_links?.instagram || brand.social.instagram,
    tiktok: settings.social_links?.tiktok || brand.social.tiktok,
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to order from Buno Home Decor",
    description: PAGE_DESCRIPTION,
    step: WEBSITE_STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title })),
  }

  return (
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.22)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center medium:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
              How to Order
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              Ordering is{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">simple</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              Shop your favourite home décor in a few easy steps — through our website, or by
              messaging us on Facebook, Instagram or TikTok.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <LocalizedClientLink href="/store" className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                Start shopping <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </LocalizedClientLink>
              <a href="#social" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                Order via social media
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Website steps ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-16 medium:py-24">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} /> Option 1 · Order on our website
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Seven simple steps</h2>
        </Reveal>

        <ol className="mt-14 flex flex-col gap-4">
          {WEBSITE_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal as="li" key={step.title} delay={i * 60}>
                <div className="card-soft flex gap-5 p-6 medium:p-7">
                  <div className="flex flex-col items-center">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-gray-900" style={{ backgroundColor: GOLD }}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <h3 className="text-lg font-semibold tracking-[-0.01em]">{step.title}</h3>
                    </div>
                    <div className={`mt-3 ${PROSE}`}>{step.body}</div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </ol>
      </section>

      {/* ── Social (dark) ────────────────────────────────────────────────────── */}
      <section id="social" className="relative scroll-mt-24 overflow-hidden bg-gray-900 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${goldTint(0.16)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-5xl px-6 py-20 medium:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} /> Option 2 · Social media
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Order on Facebook, Instagram &amp; TikTok</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              Prefer social? Just message us. See a piece in one of our posts or videos? Send the post,
              video, product name or a screenshot and our team will help you order.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {social.facebook && <SocialButton href={social.facebook} label="Facebook"><FacebookGlyph className="h-4 w-4" /></SocialButton>}
              {social.instagram && <SocialButton href={social.instagram} label="Instagram"><InstagramGlyph className="h-4 w-4" /></SocialButton>}
              {social.tiktok && <SocialButton href={social.tiktok} label="TikTok"><TikTokGlyph className="h-4 w-4" /></SocialButton>}
            </div>
          </Reveal>

          <ol className="mt-14 grid gap-4 small:grid-cols-2">
            {SOCIAL_STEPS.map((text, i) => (
              <Reveal as="li" key={i} delay={i * 60}>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: goldTint(0.2), color: GOLD }}>{i + 1}</span>
                  <span className="text-sm leading-relaxed text-white/85">{text}</span>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Phone callout ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
        <Reveal>
          <div className="overflow-hidden rounded-3xl p-8 medium:p-12" style={{ backgroundColor: goldTint(0.1) }}>
            <div className="flex flex-col gap-6 medium:flex-row medium:items-center medium:justify-between">
              <div className="flex items-start gap-5">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-900" style={{ color: GOLD }}>
                  <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.02em]">Prefer to order by phone?</h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-gray-600">
                    Need help placing an order or have a question about a product? Contact our team and
                    we&apos;ll guide you through the available ordering options.
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
          </div>
        </Reveal>
      </section>

      {/* ── Before you order ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-5xl px-6 py-16 medium:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} /> Before Placing an Order
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">Good to know first</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 small:grid-cols-2 medium:grid-cols-3">
            {BEFORE_LINKS.map((link, i) => (
              <Reveal key={link.href} delay={i * 50}>
                <LocalizedClientLink href={link.href} className="card-soft card-hover group flex items-center justify-between gap-3 px-6 py-5">
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{link.label}</span>
                    <span className="block text-xs text-gray-500">{link.note}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: GOLD }} />
                </LocalizedClientLink>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Need help ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center medium:py-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} /> Need Help With Your Order?
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] medium:text-4xl">We&apos;re here to help</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LocalizedClientLink href="/store" className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
              <House className="h-4 w-4" /> Browse the collection
            </LocalizedClientLink>
            <LocalizedClientLink href="/support" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-8 py-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
              Support Center
            </LocalizedClientLink>
          </div>
        </Reveal>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  )
}
