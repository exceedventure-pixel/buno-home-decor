import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LegalDoc, { type LegalSection } from "@modules/common/components/legal-doc"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * REFUND POLICY — rendered through the shared LegalDoc layout.
 *
 * Content lives here as structured section data; the layout owns numbering, the on-this-page nav,
 * deep-link anchors and styling. Contact details come from brand.config so they never drift.
 */

const PAGE_TITLE = "Refund Policy"
const LAST_UPDATED = "August 12, 2026"
const UPDATED_ISO = "2026-08-12"
const PAGE_DESCRIPTION =
  "Buno Home Decor's Refund policy — please inspect your order before accepting delivery. When a " +
  "refund may be available, delivery charges, refund method and processing time, and how to request one."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/refund-policy`,
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
    id: "inspect-before-accepting",
    title: "Important: Inspect Your Order Before Accepting Delivery",
    body: (
      <>
        <p>
          Customers are strongly advised to{" "}
          <strong>
            inspect their order while the delivery person is present and before accepting the delivery
          </strong>
          . If you notice an obvious problem, such as:
        </p>
        <ul>
          <li>Damaged product</li>
          <li>Wrong product</li>
          <li>Missing item or component</li>
          <li>Serious visible defect</li>
          <li>Significant damage to the package</li>
        </ul>
        <p>
          please inform the delivery person immediately and contact Buno Home Decor before accepting
          the order whenever possible.
        </p>
        <p>
          <strong>Once you accept the delivery</strong>
        </p>
        <p>
          Once an order has been accepted and received by the customer, a refund, return, or exchange
          is <strong>not automatically available</strong>. Any request made after acceptance will be
          reviewed by Buno Home Decor and may be refused if it does not meet our applicable policy
          conditions.
        </p>
        <p>
          <strong>
            Buno Home Decor reserves the right to approve or reject refund requests based on the
            circumstances, product condition, timing of the request, and other relevant factors.
          </strong>
        </p>
      </>
    ),
  },
  {
    id: "when-available",
    title: "When May a Refund Be Available?",
    body: (
      <>
        <p>A refund may be considered in situations such as:</p>
        <ul>
          <li>A confirmed order cannot be fulfilled by Buno Home Decor.</li>
          <li>An eligible order is cancelled before dispatch.</li>
          <li>A damaged product qualifies for a refund after review.</li>
          <li>The wrong product was delivered and a replacement or exchange is not possible.</li>
          <li>A qualifying product defect is confirmed and a refund is determined to be the appropriate solution.</li>
          <li>Another situation specifically approved by Buno Home Decor.</li>
        </ul>
        <p>
          A refund is <strong>not guaranteed simply because a customer requests one</strong>.
        </p>
      </>
    ),
  },
  {
    id: "damaged-or-incorrect",
    title: "Refunds for Damaged or Incorrect Products",
    body: (
      <>
        <p>
          If you receive a damaged or incorrect product, please report the issue{" "}
          <strong>immediately at the time of delivery</strong>. If you accept the delivery and later
          report the issue, Buno Home Decor may still review your request, but approval is not
          guaranteed.
        </p>
        <p>We may ask you to provide:</p>
        <ul>
          <li>Order number</li>
          <li>Customer name</li>
          <li>Phone number</li>
          <li>Clear photographs of the product</li>
          <li>Photographs of the packaging</li>
          <li>Video showing the issue</li>
          <li>Other relevant information</li>
        </ul>
        <p>
          After reviewing the evidence, our team will determine the appropriate resolution. This may
          be a <strong>replacement, exchange, refund, or another solution</strong> depending on the
          circumstances.
        </p>
      </>
    ),
  },
  {
    id: "refund-after-return",
    title: "Refund After an Approved Return",
    body: (
      <>
        <p>
          If Buno Home Decor approves a return and determines that a refund is appropriate, the refund
          will generally be processed after the returned product has been received and inspected,
          where applicable.
        </p>
        <p>The refund amount may depend on:</p>
        <ul>
          <li>Product price</li>
          <li>Applicable delivery charges</li>
          <li>Return delivery charges</li>
          <li>Reason for the return</li>
          <li>Condition of the returned product</li>
          <li>Original payment method</li>
        </ul>
      </>
    ),
  },
  {
    id: "delivery-charges",
    title: "Delivery Charges",
    body: (
      <>
        <p>Original delivery charges are not necessarily refundable.</p>
        <p>
          If an issue is confirmed to have resulted from Buno Home Decor, such as sending the wrong
          product, we will review the applicable delivery costs and provide an appropriate resolution.
        </p>
        <p>
          For customer-requested returns that are not caused by an error or qualifying issue from Buno
          Home Decor, applicable delivery or return charges may be deducted from the refund or may be
          the customer&apos;s responsibility.
        </p>
      </>
    ),
  },
  {
    id: "cancellation-refunds",
    title: "Cancellation Refunds",
    body: (
      <>
        <p>
          If an order is successfully cancelled <strong>before processing or dispatch</strong> and
          payment has already been made, the customer may be eligible for a refund.
        </p>
        <p>
          Once an order has been dispatched or handed over for delivery, cancellation may no longer be
          possible. In such cases, the order may instead be handled according to our applicable return
          policy, if eligible.
        </p>
        <p>
          Please see our{" "}
          <LocalizedClientLink href="/cancellation">Cancellation Policy</LocalizedClientLink> for more
          information.
        </p>
      </>
    ),
  },
  {
    id: "refund-method",
    title: "Refund Method",
    body: (
      <>
        <p>
          Where possible, refunds will be made using an appropriate method based on the original
          payment method.
        </p>
        <p>For online payments, the refund may be processed through the relevant payment service.</p>
        <p>
          For Cash on Delivery orders, Buno Home Decor will communicate the available refund method
          and any information required from the customer.
        </p>
      </>
    ),
  },
  {
    id: "processing-time",
    title: "Refund Processing Time",
    body: (
      <>
        <p>Refund processing times may vary depending on:</p>
        <ul>
          <li>Payment method</li>
          <li>Payment provider</li>
          <li>Bank or financial institution</li>
          <li>Return inspection</li>
          <li>Required verification</li>
          <li>Other circumstances outside our control</li>
        </ul>
        <p>
          Once a refund has been initiated by Buno Home Decor, the time required for the funds to reach
          the customer may depend on the relevant payment provider or financial institution.
        </p>
      </>
    ),
  },
  {
    id: "not-eligible",
    title: "Products That May Not Qualify for a Refund",
    body: (
      <>
        <p>A refund may not be available where the product:</p>
        <ul>
          <li>Has been used</li>
          <li>Has been installed or assembled</li>
          <li>Has been modified or altered</li>
          <li>Has been damaged by the customer</li>
          <li>Has been improperly handled or stored</li>
          <li>Is missing required components</li>
          <li>Is returned outside the applicable conditions</li>
          <li>Is custom-made or personalized, unless the issue is caused by Buno Home Decor</li>
          <li>Was specifically identified as non-refundable at the time of purchase</li>
        </ul>
        <p>
          Natural variations in wooden and handcrafted products, including differences in wood grain,
          texture, knots, shade, and finish, are generally not considered defects.
        </p>
      </>
    ),
  },
  {
    id: "change-of-mind",
    title: "Change of Mind",
    body: (
      <>
        <p>
          We encourage customers to carefully review product information, dimensions, images, and other
          details before placing an order.
        </p>
        <p>
          A customer changing their mind after <strong>accepting the delivery</strong> does not
          automatically qualify for a refund. Buno Home Decor reserves the right to refuse refund,
          return, or exchange requests that do not meet our applicable conditions.
        </p>
      </>
    ),
  },
  {
    id: "social-media-orders",
    title: "Orders Through Facebook, Instagram & TikTok",
    body: (
      <>
        <p>
          If you purchased a product through our <strong>Facebook, Instagram, or TikTok</strong> pages,
          the same refund conditions apply.
        </p>
        <p>
          If there is an issue with your order, contact our team with your order details as soon as
          possible. Customers should inspect products at the time of delivery regardless of which
          platform they used to place the order.
        </p>
      </>
    ),
  },
  {
    id: "how-to-request",
    title: "How to Request a Refund",
    body: (
      <>
        <p>To request a refund or ask about an existing refund, contact:</p>
        <ContactBlock />
        <p>
          Please provide your order number, phone number, and a clear explanation of the issue. Our
          team may request photographs, videos, payment information, or other relevant details before
          reviewing the request.
        </p>
      </>
    ),
  },
  {
    id: "right-to-review",
    title: "Buno Home Decor's Right to Review",
    body: (
      <>
        <p>All refund requests are subject to review.</p>
        <p>
          Buno Home Decor reserves the right to{" "}
          <strong>approve, partially approve, or reject a refund request</strong> based on the
          applicable policy, product condition, reason for the request, timing, order history, and
          other relevant circumstances.
        </p>
        <p>
          We aim to handle genuine product and fulfillment issues fairly while protecting our customers
          and our business from misuse of the return and refund process.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    body: (
      <>
        <p>
          <strong>Buno Home Decor</strong>
          <br />
          {brand.contact.address}
          <br />
          Phone: <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>
          <br />
          Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
        </p>
        <ul>
          <li>
            For return information, please see our{" "}
            <LocalizedClientLink href="/returns">Happy Return Policy</LocalizedClientLink>.
          </li>
          <li>
            For exchanges, please see our{" "}
            <LocalizedClientLink href="/exchange">Exchange Policy</LocalizedClientLink>.
          </li>
          <li>
            For order cancellations, please see our{" "}
            <LocalizedClientLink href="/cancellation">Cancellation Policy</LocalizedClientLink>.
          </li>
        </ul>
      </>
    ),
  },
]

export default function RefundPolicyPage() {
  return (
    <LegalDoc
      title={PAGE_TITLE}
      lastUpdated={LAST_UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <>
          <p>
            At <strong>Buno Home Decor</strong>, we want every customer to have a smooth and reliable
            shopping experience. If an order qualifies for a refund under our policies, we will review
            the request and process an eligible refund according to the applicable conditions.
          </p>
          <p>
            This Refund Policy should be read together with our{" "}
            <LocalizedClientLink href="/returns">Happy Return</LocalizedClientLink>,{" "}
            <LocalizedClientLink href="/exchange">Exchange</LocalizedClientLink>, and{" "}
            <LocalizedClientLink href="/cancellation">Cancellation</LocalizedClientLink> policies.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  )
}
