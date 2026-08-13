import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { GOLD, goldTint } from "@lib/brand-ui"
import Reveal from "@modules/common/components/reveal"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react"

/**
 * FAQ — grouped, accordion-style questions with FAQPage structured data.
 *
 * Server component: native <details> accordions need no JavaScript, the category chips deep-link to
 * each group, and the FAQPage JSON-LD (built from the same data that renders) lets Google show this
 * as a rich result. Answers carry both display JSX and a plain-text version for the structured data.
 */

const PAGE_TITLE = "FAQ"
const PAGE_DESCRIPTION =
  "Answers to common questions about Buno Home Decor — products, ordering, payment, delivery, " +
  "returns, exchanges, cancellations, refunds and pre-orders."


const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/faq`,
    siteName: brand.storeName,
  },
}

type QA = { q: string; a: React.ReactNode; text: string }
type Category = { id: string; title: string; icon: typeof Info; items: QA[] }

const CATEGORIES: Category[] = [
  {
    id: "general",
    title: "General",
    icon: Info,
    items: [
      {
        q: "What is Buno Home Decor?",
        a: (
          <>
            <p>
              Buno Home Decor is a Bangladesh-based home décor brand offering stylish and practical
              products for everyday spaces. We started with wooden and handcrafted décor — wall
              frames, shelves, kitchen racks, helmet stands, key holders and more.
            </p>
            <p>
              Our long-term vision is to expand into a broader range of home décor, furniture, and
              interior solutions.
            </p>
          </>
        ),
        text: "Buno Home Decor is a Bangladesh-based home décor brand offering stylish, practical products for everyday spaces. We started with wooden and handcrafted décor such as wall frames, shelves, kitchen racks, helmet stands and key holders, and aim to expand into furniture and interior solutions.",
      },
      {
        q: "Where is Buno Home Decor located?",
        a: (
          <p>
            Our office is at <strong>{brand.contact.address}</strong>.
          </p>
        ),
        text: `Our office is located at ${brand.contact.address}.`,
      },
      {
        q: "Do you deliver across Bangladesh?",
        a: (
          <p>
            Yes — we aim to deliver across Bangladesh, subject to courier coverage and product-specific
            requirements. See our{" "}
            <LocalizedClientLink href="/shipping">Shipping &amp; Delivery</LocalizedClientLink> page
            for more.
          </p>
        ),
        text: "Yes. We aim to deliver across Bangladesh, subject to courier coverage and product-specific delivery requirements. See our Shipping & Delivery page for more.",
      },
    ],
  },
  {
    id: "ordering",
    title: "Ordering",
    icon: ShoppingCart,
    items: [
      {
        q: "How can I place an order?",
        a: (
          <>
            <p>You can order in several ways:</p>
            <ul>
              <li>
                <strong>Through our website</strong> — add products to your cart and check out.
              </li>
              <li>
                <strong>Facebook / Instagram / TikTok</strong> — message us the product name, post,
                video, or a screenshot.
              </li>
            </ul>
            <p>
              Our team guides you through the process for social orders. See{" "}
              <LocalizedClientLink href="/how-to-order">How to Order</LocalizedClientLink>.
            </p>
          </>
        ),
        text: "You can order through our website (add to cart and check out) or through Facebook, Instagram and TikTok by messaging us the product name, post, video or a screenshot. Our team guides you through social orders.",
      },
      {
        q: "Can I order through Facebook, Instagram, or TikTok?",
        a: (
          <p>
            Yes. Send us the product name, post, video, or a screenshot and our team will confirm
            availability, price, delivery information, and payment options.
          </p>
        ),
        text: "Yes. Send us the product name, post, video or screenshot on Facebook, Instagram or TikTok and our team will confirm availability, price, delivery information and payment options.",
      },
      {
        q: "Can I order by phone?",
        a: (
          <p>
            Yes — call <a href={`tel:${phoneTel}`}>{phoneDisplay}</a> or email{" "}
            <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> for help with an order
            or a product question.
          </p>
        ),
        text: `Yes. Call ${phoneDisplay} or email ${brand.contact.email} for help with an order or a product question.`,
      },
      {
        q: "Can I change my order after placing it?",
        a: (
          <p>
            If your order hasn&apos;t been processed or dispatched yet, you may be able to request
            changes — contact us as soon as possible with your order number. Once dispatched, changes
            may no longer be possible.
          </p>
        ),
        text: "If your order hasn't been processed or dispatched yet, you may be able to request changes — contact us as soon as possible with your order number. Once dispatched, changes may no longer be possible.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    icon: CreditCard,
    items: [
      {
        q: "What payment methods do you accept?",
        a: (
          <p>
            Depending on the order and channel, we may offer <strong>Cash on Delivery</strong> and
            online payment options. See our{" "}
            <LocalizedClientLink href="/payment">Payment</LocalizedClientLink> page for the latest.
          </p>
        ),
        text: "Depending on the order and channel, we may offer Cash on Delivery and online payment options. See our Payment page for the latest information.",
      },
      {
        q: "Is Cash on Delivery available?",
        a: (
          <p>
            Cash on Delivery may be available for eligible orders and locations. Availability can vary
            with the product, delivery location, and other circumstances.
          </p>
        ),
        text: "Cash on Delivery may be available for eligible orders and locations. Availability can vary with the product, delivery location and other circumstances.",
      },
      {
        q: "Is online payment available?",
        a: (
          <p>
            Online payment may be available through the methods currently supported. The options are
            communicated during ordering or displayed at checkout where applicable.
          </p>
        ),
        text: "Online payment may be available through the methods currently supported. The options are communicated during ordering or displayed at checkout where applicable.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery",
    icon: Truck,
    items: [
      {
        q: "How long does delivery take?",
        a: (
          <>
            <p>As a general estimate:</p>
            <ul>
              <li>
                <strong>Inside Dhaka:</strong> approximately 2–5 working days
              </li>
              <li>
                <strong>Outside Dhaka:</strong> approximately 3–7 working days
              </li>
            </ul>
            <p>
              These are estimates and may vary with location, availability, courier conditions and
              holidays.
            </p>
          </>
        ),
        text: "As a general estimate, inside Dhaka takes approximately 2–5 working days and outside Dhaka approximately 3–7 working days. These are estimates and may vary with location, availability, courier conditions and holidays.",
      },
      {
        q: "How much is the delivery charge?",
        a: (
          <p>
            Delivery charges vary with your location, product size and weight, order quantity, and
            courier service. The applicable charge is shown or communicated during ordering.
          </p>
        ),
        text: "Delivery charges vary with your location, product size and weight, order quantity and courier service. The applicable charge is shown or communicated during ordering.",
      },
      {
        q: "How can I track my order?",
        a: (
          <p>
            For website orders, use our{" "}
            <LocalizedClientLink href="/order-tracking">Order Tracking</LocalizedClientLink> page. For
            social orders, contact us with your order details and we&apos;ll check the status.
          </p>
        ),
        text: "For website orders, use our Order Tracking page. For orders placed through Facebook, Instagram or TikTok, contact us with your order details and we'll check the status.",
      },
      {
        q: "What happens if I miss the delivery?",
        a: (
          <p>
            Our delivery partner may make another attempt depending on their process. Please keep your
            phone available and make sure someone can receive the order. Repeated unsuccessful
            attempts or refusal of confirmed orders may lead to additional charges or restrictions on
            certain ordering options.
          </p>
        ),
        text: "Our delivery partner may make another attempt depending on their process. Keep your phone available and make sure someone can receive the order. Repeated unsuccessful attempts or refusal of confirmed orders may lead to additional charges or restrictions.",
      },
    ],
  },
  {
    id: "products",
    title: "Products",
    icon: Package,
    items: [
      {
        q: "Are Buno products made from wood?",
        a: (
          <p>
            Many are wooden or handcrafted — that&apos;s where our brand began. But we&apos;re not
            limited to wood; our goal is a broader collection using different materials, designs and
            styles.
          </p>
        ),
        text: "Many of our products are wooden or handcrafted, as that's where the brand began — but we're not limited to wood. Our goal is a broader collection using different materials, designs and styles.",
      },
      {
        q: "Will the product look exactly like the photos?",
        a: (
          <p>
            We work hard to show accurate photos, but slight differences in colour, texture, grain, or
            finish can occur due to lighting, screen settings, and natural material variation. For
            wooden and handcrafted items, these variations are part of the product&apos;s character.
          </p>
        ),
        text: "We work hard to show accurate photos, but slight differences in colour, texture, grain or finish can occur due to lighting, screen settings and natural material variation. For wooden and handcrafted items these variations are part of the character.",
      },
      {
        q: "Can product dimensions vary?",
        a: (
          <p>
            Small variations may occur, particularly with handcrafted products. Please check the
            product description for the stated dimensions before ordering.
          </p>
        ),
        text: "Small variations may occur, particularly with handcrafted products. Please check the product description for the stated dimensions before ordering.",
      },
    ],
  },
  {
    id: "returns-exchanges",
    title: "Returns & Exchanges",
    icon: RotateCcw,
    items: [
      {
        q: "Can I return a product?",
        a: (
          <p>
            Returns may be available for eligible products and situations under our{" "}
            <LocalizedClientLink href="/returns">Happy Return</LocalizedClientLink> policy. Please
            review it before requesting a return.
          </p>
        ),
        text: "Returns may be available for eligible products and situations under our Happy Return policy. Please review it before requesting a return.",
      },
      {
        q: "What if I receive a damaged product?",
        a: (
          <p>
            Contact us as soon as possible. We may request photos or a video of the product and
            packaging to assess the issue and determine the right solution.
          </p>
        ),
        text: "Contact us as soon as possible. We may request photos or a video of the product and packaging to assess the issue and determine the right solution.",
      },
      {
        q: "What if I receive the wrong product?",
        a: (
          <p>
            Contact us immediately with your order information and photos of what you received.
            We&apos;ll help you under our{" "}
            <LocalizedClientLink href="/exchange">Exchange</LocalizedClientLink> and{" "}
            <LocalizedClientLink href="/returns">Return</LocalizedClientLink> policies.
          </p>
        ),
        text: "Contact us immediately with your order information and photos of what you received. We'll help you under our Exchange and Return policies.",
      },
      {
        q: "Can I exchange a product?",
        a: (
          <p>
            Eligible products may be exchanged under our{" "}
            <LocalizedClientLink href="/exchange">Exchange Policy</LocalizedClientLink>. Eligibility
            may depend on product condition, the reason, and time since delivery.
          </p>
        ),
        text: "Eligible products may be exchanged under our Exchange Policy. Eligibility may depend on product condition, the reason and the time since delivery.",
      },
    ],
  },
  {
    id: "cancellation-refunds",
    title: "Cancellation & Refunds",
    icon: Receipt,
    items: [
      {
        q: "Can I cancel my order?",
        a: (
          <p>
            Cancellation may be possible if your order hasn&apos;t been processed or dispatched yet —
            contact us as soon as possible. See our{" "}
            <LocalizedClientLink href="/cancellation">Cancellation Policy</LocalizedClientLink>.
          </p>
        ),
        text: "Cancellation may be possible if your order hasn't been processed or dispatched yet — contact us as soon as possible. See our Cancellation Policy for complete information.",
      },
      {
        q: "How do refunds work?",
        a: (
          <p>
            If you&apos;re eligible for a refund, the process depends on the reason and your original
            payment method. See our{" "}
            <LocalizedClientLink href="/refund-policy">Refund Policy</LocalizedClientLink> for details.
          </p>
        ),
        text: "If you're eligible for a refund, the process depends on the reason and your original payment method. See our Refund Policy for details.",
      },
    ],
  },
  {
    id: "pre-order",
    title: "Pre-Order",
    icon: CalendarClock,
    items: [
      {
        q: "Do you offer pre-orders?",
        a: (
          <p>
            Some products may be offered as pre-orders. These can have different preparation, payment,
            and delivery timelines — please review the pre-order information provided with the product
            before ordering. See our{" "}
            <LocalizedClientLink href="/pre-order">Pre-Order</LocalizedClientLink> page.
          </p>
        ),
        text: "Some products may be offered as pre-orders, with different preparation, payment and delivery timelines. Please review the pre-order information provided with the product before ordering.",
      },
    ],
  },
  {
    id: "support",
    title: "Customer Support",
    icon: MessageCircle,
    items: [
      {
        q: "How can I contact Buno Home Decor?",
        a: (
          <p>
            Call <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>, email{" "}
            <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>, or reach us on our
            official Facebook, Instagram, and TikTok pages.
          </p>
        ),
        text: `Call ${phoneDisplay}, email ${brand.contact.email}, or reach us on our official Facebook, Instagram and TikTok pages.`,
      },
      {
        q: "What should I provide when contacting support?",
        a: (
          <>
            <p>For questions about an existing order, please provide your:</p>
            <ul>
              <li>Order number</li>
              <li>Name and phone number</li>
              <li>Product name</li>
              <li>Details of your issue</li>
            </ul>
            <p>These help our team assist you more quickly.</p>
          </>
        ),
        text: "For questions about an existing order, please provide your order number, name, phone number, product name and details of your issue — these help our team assist you more quickly.",
      },
    ],
  },
]

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CATEGORIES.flatMap((c) =>
      c.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.text },
      }))
    ),
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
              FAQ
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              Questions?{" "}
              <span className="relative whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-0 bottom-2 h-4 rounded-full" style={{ backgroundColor: goldTint(0.55) }} />
                <span className="relative">Answered.</span>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-gray-500">
              Common questions about our products, ordering, payment, delivery, returns, and more.
              Can&apos;t find your answer? Our team is happy to help.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
              {CATEGORIES.map((c) => (
                <a key={c.id} href={`#${c.id}`} className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900">
                  {c.title}
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-6 pb-16">
        {CATEGORIES.map((c) => {
          const Icon = c.icon
          return (
            <Reveal key={c.id}>
              <section id={c.id} className="scroll-mt-24 pt-14 first:pt-4">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: goldTint(0.14), color: GOLD }}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h2 className="text-2xl font-semibold tracking-[-0.02em]">{c.title}</h2>
                </div>
                <div className="card-soft divide-y divide-gray-100 px-6">
                  {c.items.map((item) => (
                    <Accordion key={item.q} q={item.q}>
                      {item.a}
                    </Accordion>
                  ))}
                </div>
              </section>
            </Reveal>
          )
        })}
      </div>

      {/* ── Still have questions ─────────────────────────────────────────────── */}
      <section className="bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-6 py-16 medium:py-24">
          <Reveal>
            <div className="flex flex-col gap-6 rounded-3xl p-8 medium:flex-row medium:items-center medium:justify-between medium:p-12" style={{ backgroundColor: goldTint(0.1) }}>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.02em]">Still have questions?</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">If you couldn&apos;t find the information you need, we&apos;re happy to help.</p>
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
                <LocalizedClientLink href="/support" className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white">
                  Support Center <ArrowRight className="h-4 w-4" style={{ color: GOLD }} />
                </LocalizedClientLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  )
}

const PROSE =
  "space-y-3 text-[15px] leading-7 text-gray-600 " +
  "[&_strong]:font-semibold [&_strong]:text-gray-900 " +
  "[&_a]:font-medium [&_a]:text-gray-900 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[rgba(240,180,0,0.8)] " +
  "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:marker:text-[#F0B400]"

/** A single question/answer disclosure. Native <details>, so it works without JavaScript. */
function Accordion({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left">
        <span className="text-[15px] font-semibold text-gray-900 medium:text-base">{q}</span>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-45" style={{ backgroundColor: goldTint(0.16), color: GOLD }}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </summary>
      <div className={`pb-5 pr-10 ${PROSE}`}>{children}</div>
    </details>
  )
}
