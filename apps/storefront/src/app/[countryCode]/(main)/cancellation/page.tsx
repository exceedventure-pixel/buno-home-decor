import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LegalDoc, { type LegalSection } from "@modules/common/components/legal-doc"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * CANCELLATION POLICY — rendered through the shared LegalDoc layout.
 *
 * Content lives here as structured section data; the layout owns numbering, the on-this-page nav,
 * deep-link anchors and styling. Contact details come from brand.config so they never drift.
 */

const PAGE_TITLE = "Cancellation Policy"
const LAST_UPDATED = "August 12, 2026"
const UPDATED_ISO = "2026-08-12"
const PAGE_DESCRIPTION =
  "Buno Home Decor's Cancellation policy — when an order can be cancelled, how to request it, what " +
  "happens before and after dispatch, refunds after cancellation, and special-order conditions."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/cancellation" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/cancellation`,
    siteName: brand.storeName,
  },
}

const ContactBlock = () => (
  <p>
    <strong>Buno Home Decor</strong>
    <br />
    Phone: <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>
    <br />
    Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
  </p>
)

const SECTIONS: LegalSection[] = [
  {
    id: "when-can-i-cancel",
    title: "When Can I Cancel My Order?",
    body: (
      <>
        <p>
          You may request to cancel an order <strong>as soon as possible after placing it</strong>.
          Cancellation is generally easier when the order has not yet been processed or dispatched.
        </p>
        <p>
          Once an order has been prepared, packed, handed over to the courier, or placed into the
          delivery process, cancellation may no longer be possible.
        </p>
      </>
    ),
  },
  {
    id: "how-to-request",
    title: "How to Request a Cancellation",
    body: (
      <>
        <p>To request a cancellation, contact Buno Home Decor as soon as possible.</p>
        <ContactBlock />
        <p>Please provide:</p>
        <ul>
          <li>Order number</li>
          <li>Customer name</li>
          <li>Phone number</li>
          <li>Reason for cancellation</li>
        </ul>
        <p>
          Our team will check the status of your order and confirm whether cancellation is still
          possible.
        </p>
      </>
    ),
  },
  {
    id: "before-dispatch",
    title: "Cancellation Before Dispatch",
    body: (
      <>
        <p>
          If your order has not yet been processed or dispatched, we will generally try to accommodate
          a valid cancellation request.
        </p>
        <p>
          For prepaid orders, an eligible refund may be processed according to our{" "}
          <LocalizedClientLink href="/refund-policy">Refund Policy</LocalizedClientLink>.
        </p>
        <p>
          For Cash on Delivery orders, there is generally no payment to refund if the order is
          successfully cancelled before delivery.
        </p>
      </>
    ),
  },
  {
    id: "after-dispatch",
    title: "Cancellation After Dispatch",
    body: (
      <>
        <p>
          Once an order has been dispatched or handed over to a delivery partner, cancellation may no
          longer be possible. At this stage, the order has already entered the delivery process and may
          have incurred packaging, processing, and delivery costs.
        </p>
        <p>
          If cancellation is still requested after dispatch, Buno Home Decor reserves the right to
          refuse the cancellation or apply any applicable delivery or return costs.
        </p>
      </>
    ),
  },
  {
    id: "refusing-at-delivery",
    title: "Refusing an Order at Delivery",
    body: (
      <>
        <p>
          Customers should{" "}
          <strong>
            not intentionally refuse a confirmed order at the doorstep simply as a method of
            cancellation
          </strong>
          . If you want to cancel an order, please contact Buno Home Decor before the order is
          dispatched whenever possible.
        </p>
        <p>
          Repeated refusal of confirmed orders may result in restrictions on future orders, including
          limitations on Cash on Delivery availability.
        </p>
      </>
    ),
  },
  {
    id: "inspect-before-accepting",
    title: "Inspect Your Order Before Accepting Delivery",
    body: (
      <>
        <p>
          If you have an issue with the product when the delivery arrives, please inspect the order
          while the delivery person is present. If you receive a visibly damaged, incorrect, or
          incomplete product, report the issue immediately before accepting the delivery whenever
          possible.
        </p>
        <p>
          Once an order has been accepted, return, refund, or exchange requests are subject to our
          applicable policies and are <strong>not automatically guaranteed</strong>. Please see our{" "}
          <LocalizedClientLink href="/returns">Happy Return</LocalizedClientLink>,{" "}
          <LocalizedClientLink href="/refund-policy">Refund</LocalizedClientLink>, and{" "}
          <LocalizedClientLink href="/exchange">Exchange</LocalizedClientLink> policies for more
          information.
        </p>
      </>
    ),
  },
  {
    id: "social-media-orders",
    title: "Cancellation of Social Media Orders",
    body: (
      <>
        <p>
          Orders placed through <strong>Facebook, Instagram, or TikTok</strong> are also subject to
          this Cancellation Policy.
        </p>
        <p>
          If you placed an order through social media and want to cancel it, contact our team through
          the same platform or through:
        </p>
        <ContactBlock />
        <p>
          Please provide your order details so that we can check the current status of your order.
        </p>
      </>
    ),
  },
  {
    id: "refund-after-cancellation",
    title: "Refund After Cancellation",
    body: (
      <>
        <p>
          If a cancellation is approved for a prepaid order, the applicable refund will be handled
          according to our{" "}
          <LocalizedClientLink href="/refund-policy">Refund Policy</LocalizedClientLink>.
        </p>
        <p>
          The refund process and timing may vary depending on the original payment method and payment
          provider.
        </p>
        <p>
          Delivery or other applicable charges may not always be refundable, particularly where the
          order has already been processed or dispatched.
        </p>
      </>
    ),
  },
  {
    id: "custom-special-orders",
    title: "Custom, Personalized & Special Orders",
    body: (
      <>
        <p>
          Orders involving custom-made, personalized, specially prepared, or pre-ordered products may
          have different cancellation conditions.
        </p>
        <p>
          Where special cancellation terms apply, they may be communicated before the order is
          confirmed. Once production or special preparation has started, cancellation may no longer be
          available.
        </p>
      </>
    ),
  },
  {
    id: "our-right-to-cancel",
    title: "Buno Home Decor's Right to Cancel",
    body: (
      <>
        <p>
          In certain circumstances, Buno Home Decor may need to cancel an order. This may happen
          because of:
        </p>
        <ul>
          <li>Product unavailability</li>
          <li>Incorrect pricing or product information</li>
          <li>Technical errors</li>
          <li>Delivery limitations</li>
          <li>Suspected fraudulent activity</li>
          <li>Inability to contact the customer</li>
          <li>Other circumstances that prevent us from fulfilling the order</li>
        </ul>
        <p>
          If a prepaid order is cancelled by Buno Home Decor and a refund is applicable, we will
          arrange the appropriate refund according to our Refund Policy.
        </p>
      </>
    ),
  },
  {
    id: "not-guaranteed",
    title: "Cancellation Is Not Guaranteed",
    body: (
      <>
        <p>
          Submitting a cancellation request does not mean that the order has been cancelled. Your
          cancellation is only confirmed when Buno Home Decor confirms that the order has been
          successfully cancelled.
        </p>
        <p>
          Please do not assume that an order has been cancelled until you receive confirmation from our
          team.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    body: (
      <>
        <p>If you need to cancel an order, contact us as quickly as possible.</p>
        <p>
          <strong>Buno Home Decor</strong>
          <br />
          {brand.contact.address}
          <br />
          Phone: <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>
          <br />
          Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
        </p>
      </>
    ),
  },
]

export default function CancellationPage() {
  return (
    <LegalDoc
      title={PAGE_TITLE}
      lastUpdated={LAST_UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <p>
          At <strong>Buno Home Decor</strong>, we understand that sometimes you may need to cancel an
          order after placing it. Our Cancellation Policy explains when an order can be cancelled and
          what happens after a cancellation request is made.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
