import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LegalDoc, { type LegalSection } from "@modules/common/components/legal-doc"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * PRE-ORDER POLICY — rendered through the shared LegalDoc layout.
 *
 * Content lives here as structured section data; the layout owns numbering, the on-this-page nav,
 * deep-link anchors and styling. Contact details come from brand.config so they never drift.
 */

const PAGE_TITLE = "Pre-Order Policy"
const LAST_UPDATED = "August 12, 2026"
const UPDATED_ISO = "2026-08-12"
const PAGE_DESCRIPTION =
  "Buno Home Decor's Pre-Order policy — how pre-orders work, availability and estimated timelines, " +
  "payment, cancellation, refunds, and returns for products reserved before they're ready."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/pre-order" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/pre-order`,
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
    id: "what-is-a-pre-order",
    title: "What Is a Pre-Order?",
    body: (
      <>
        <p>
          A pre-order is an order placed for a product that is{" "}
          <strong>not currently ready for immediate delivery</strong>.
        </p>
        <p>
          Pre-order products may be identified as <strong>Pre-Order</strong> on the product page or
          communicated to customers before the order is confirmed. The estimated availability or
          delivery timeframe will be communicated as clearly as possible at the time of ordering.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Pre-Order Availability",
    body: (
      <>
        <p>A pre-order does not necessarily mean that the product is already in stock.</p>
        <p>The product may need to be:</p>
        <ul>
          <li>Produced</li>
          <li>Sourced</li>
          <li>Prepared</li>
          <li>Imported</li>
          <li>Customized</li>
          <li>Restocked</li>
        </ul>
        <p>
          before it can be delivered. For this reason, pre-order products may require more time than
          regular in-stock products.
        </p>
      </>
    ),
  },
  {
    id: "estimated-delivery-time",
    title: "Estimated Delivery Time",
    body: (
      <>
        <p>
          Pre-order delivery dates are <strong>estimated timelines, not guaranteed dates</strong>. The
          actual delivery time may be affected by:
        </p>
        <ul>
          <li>Production time</li>
          <li>Material availability</li>
          <li>Supplier delays</li>
          <li>Product preparation</li>
          <li>Transportation</li>
          <li>Customs or logistics, where applicable</li>
          <li>Courier delays</li>
          <li>Holidays</li>
          <li>Unexpected circumstances</li>
        </ul>
        <p>
          If there is a significant change to the expected availability of a pre-order product, Buno
          Home Decor may contact the customer with an updated estimate.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    title: "Payment for Pre-Orders",
    body: (
      <>
        <p>Depending on the product and ordering method, Buno Home Decor may require:</p>
        <ul>
          <li>Full payment</li>
          <li>Partial advance payment</li>
          <li>Deposit</li>
          <li>Cash on Delivery, where available</li>
        </ul>
        <p>
          The required payment method will be communicated before the pre-order is confirmed. For
          products requiring an advance payment or deposit, the order will only be considered confirmed
          after the required payment has been received.
        </p>
      </>
    ),
  },
  {
    id: "website-and-social",
    title: "Pre-Orders Through Website & Social Media",
    body: (
      <>
        <p>
          Pre-orders may be available through our website as well as our social media platforms. You
          may place an enquiry or pre-order through:
        </p>
        <ul>
          <li>Our website</li>
          <li>Facebook</li>
          <li>Instagram</li>
          <li>TikTok</li>
        </ul>
        <p>
          When placing a pre-order through social media, our team will communicate the relevant product
          information, estimated timeline, price, payment requirements, and other applicable
          conditions.
        </p>
      </>
    ),
  },
  {
    id: "cancel-a-pre-order",
    title: "Can I Cancel a Pre-Order?",
    body: (
      <>
        <p>Pre-order cancellation may be subject to different conditions from regular orders.</p>
        <p>
          Because pre-order products may require Buno Home Decor to begin production, sourcing,
          purchasing materials, or making other commitments,{" "}
          <strong>cancellation may not always be possible after preparation has started</strong>.
        </p>
        <p>If you want to cancel a pre-order, contact us as soon as possible.</p>
        <ContactBlock />
        <p>
          We will review the status of your pre-order and inform you whether cancellation is possible.
          See also our{" "}
          <LocalizedClientLink href="/cancellation">Cancellation Policy</LocalizedClientLink>.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    title: "Pre-Order Refunds",
    body: (
      <>
        <p>
          If a pre-order is cancelled and a refund is approved, the refund will be handled according to
          the applicable payment method and our{" "}
          <LocalizedClientLink href="/refund-policy">Refund Policy</LocalizedClientLink>.
        </p>
        <p>
          Any applicable costs already incurred for custom preparation, production, sourcing, or other
          approved services may affect the refund amount where clearly communicated and applicable.
        </p>
      </>
    ),
  },
  {
    id: "product-changes",
    title: "Pre-Order Product Changes",
    body: (
      <>
        <p>
          In some cases, minor changes to a pre-order product may occur during production or
          preparation. These may include minor variations in:
        </p>
        <ul>
          <li>Wood grain</li>
          <li>Texture</li>
          <li>Colour or shade</li>
          <li>Finish</li>
          <li>Measurements</li>
          <li>Other natural characteristics</li>
        </ul>
        <p>
          For wooden and handcrafted products, natural variations are expected and are not necessarily
          considered defects. If there is a significant change that materially affects the product
          ordered, Buno Home Decor may contact the customer before fulfillment where appropriate.
        </p>
      </>
    ),
  },
  {
    id: "inspect-at-delivery",
    title: "Inspect Your Pre-Order at Delivery",
    body: (
      <>
        <p>
          When your pre-order arrives, customers should{" "}
          <strong>
            inspect the product while the delivery person is present and before accepting the delivery
          </strong>
          . Check for obvious issues such as:
        </p>
        <ul>
          <li>Damage</li>
          <li>Wrong product</li>
          <li>Missing components</li>
          <li>Significant defects</li>
        </ul>
        <p>
          If you identify an obvious issue, inform the delivery person immediately and contact Buno
          Home Decor before accepting the delivery whenever possible. Once a pre-order has been
          accepted, return or exchange requests are subject to our applicable policies and are{" "}
          <strong>not automatically guaranteed</strong>.
        </p>
      </>
    ),
  },
  {
    id: "returns-exchanges",
    title: "Pre-Order Returns & Exchanges",
    body: (
      <>
        <p>
          Pre-order products are subject to our{" "}
          <LocalizedClientLink href="/returns">Happy Return</LocalizedClientLink> and{" "}
          <LocalizedClientLink href="/exchange">Exchange</LocalizedClientLink> policies.
        </p>
        <p>
          Because some pre-order products may be custom-made, personalized, specially sourced, or
          prepared specifically for a customer, they may have additional return or exchange
          restrictions. Any special conditions will be communicated before the pre-order is confirmed.
        </p>
      </>
    ),
  },
  {
    id: "cannot-fulfill",
    title: "If We Cannot Fulfill Your Pre-Order",
    body: (
      <p>
        In rare circumstances, Buno Home Decor may become unable to fulfill a pre-order due to product
        availability, supplier issues, production problems, or other circumstances beyond our
        reasonable control. If we cannot fulfill a confirmed prepaid pre-order, we will communicate
        with the customer and provide an appropriate resolution, which may include a refund where
        applicable.
      </p>
    ),
  },
  {
    id: "price",
    title: "Pre-Order Price",
    body: (
      <>
        <p>
          The price shown or communicated when the pre-order is confirmed will generally apply to that
          confirmed order. However, pricing, promotions, and availability may change for future orders.
        </p>
        <p>
          A pre-order does not automatically guarantee the same price for additional products or future
          purchases.
        </p>
      </>
    ),
  },
  {
    id: "right-to-refuse",
    title: "Buno Home Decor's Right to Refuse a Pre-Order",
    body: (
      <>
        <p>
          Buno Home Decor reserves the right to refuse or cancel a pre-order where necessary, including
          situations involving:
        </p>
        <ul>
          <li>Product unavailability</li>
          <li>Incorrect pricing</li>
          <li>Technical errors</li>
          <li>Inability to fulfill the order</li>
          <li>Suspected fraudulent activity</li>
          <li>Incomplete or inaccurate customer information</li>
          <li>Other circumstances preventing successful fulfillment</li>
        </ul>
        <p>
          If a prepaid order is cancelled by Buno Home Decor and a refund is applicable, the applicable
          refund will be handled according to our Refund Policy.
        </p>
      </>
    ),
  },
  {
    id: "important-reminder",
    title: "Important Reminder",
    body: (
      <>
        <p>
          <strong>Pre-orders are different from regular in-stock orders.</strong>
        </p>
        <p>Before placing a pre-order, please make sure you understand:</p>
        <ul>
          <li>The product may not be immediately available.</li>
          <li>Delivery may take longer than regular orders.</li>
          <li>The stated delivery date is an estimate.</li>
          <li>Cancellation may be restricted after preparation begins.</li>
          <li>Custom or specially prepared products may have additional restrictions.</li>
          <li>Return and exchange eligibility is subject to Buno Home Decor&apos;s policies.</li>
        </ul>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    body: (
      <>
        <p>
          If you have questions about a pre-order or want to check the availability of a product,
          contact us:
        </p>
        <p>
          <strong>Buno Home Decor</strong>
          <br />
          {brand.contact.address}
          <br />
          Phone: <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>
          <br />
          Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
        </p>
        <p>You can also contact us through our official Facebook, Instagram, or TikTok pages.</p>
      </>
    ),
  },
]

export default function PreOrderPage() {
  return (
    <LegalDoc
      title={PAGE_TITLE}
      lastUpdated={LAST_UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <>
          <p>
            At <strong>Buno Home Decor</strong>, we may occasionally offer selected home décor,
            furniture, or other products on a <strong>pre-order basis</strong>.
          </p>
          <p>
            A pre-order allows you to reserve a product before it becomes ready for regular delivery.
            Because pre-order products may require additional preparation, sourcing, production, or
            customization, they are subject to different timelines and conditions than products that
            are immediately available.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  )
}
