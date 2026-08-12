import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LegalDoc, { type LegalSection } from "@modules/common/components/legal-doc"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * EXCHANGE POLICY — rendered through the shared LegalDoc layout.
 *
 * Content lives here as structured section data; the layout owns numbering, the on-this-page nav,
 * deep-link anchors and styling. Contact details come from brand.config so they never drift.
 */

const PAGE_TITLE = "Exchange Policy"
const LAST_UPDATED = "August 12, 2026"
const UPDATED_ISO = "2026-08-12"
const PAGE_DESCRIPTION =
  "Buno Home Decor's Exchange policy — please inspect your product before accepting delivery. When " +
  "an exchange may be accepted, product condition, availability, delivery charges, and how to request one."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/exchange" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/exchange`,
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
    id: "check-before-accepting",
    title: "Check Your Product Before Accepting Delivery",
    body: (
      <>
        <p>
          Customers are strongly advised to{" "}
          <strong>
            inspect their order while the delivery person is present and before accepting the delivery
          </strong>
          . Please check for:
        </p>
        <ul>
          <li>Wrong product</li>
          <li>Visible damage</li>
          <li>Missing components</li>
          <li>Serious visible defects</li>
          <li>Significant damage to the package</li>
        </ul>
        <p>
          If you notice an obvious issue, inform the delivery person immediately and contact Buno Home
          Decor before accepting the order whenever possible.
        </p>
        <p>
          <strong>Important</strong>
        </p>
        <p>
          Once you have accepted and received the order, an exchange is{" "}
          <strong>not automatically available</strong>. Any exchange request made after acceptance
          will be reviewed by Buno Home Decor, and we reserve the right to approve or reject the
          request.
        </p>
      </>
    ),
  },
  {
    id: "when-accepted",
    title: "When May an Exchange Be Accepted?",
    body: (
      <>
        <p>An exchange may be considered when:</p>
        <ul>
          <li>You received the wrong product.</li>
          <li>You received a product with a qualifying manufacturing defect.</li>
          <li>The product was significantly damaged before or during delivery.</li>
          <li>An essential component is missing.</li>
          <li>Buno Home Decor specifically approves an exchange for another valid reason.</li>
        </ul>
        <p>An exchange request does not guarantee approval.</p>
      </>
    ),
  },
  {
    id: "wrong-product",
    title: "Wrong Product",
    body: (
      <>
        <p>
          If you receive a product that is different from the product you ordered, please contact us
          immediately. We may request photographs or video showing:
        </p>
        <ul>
          <li>The received product</li>
          <li>Product packaging</li>
          <li>Product label or identifying information</li>
          <li>Your order information</li>
        </ul>
        <p>
          If the mistake is confirmed, we will review the available solution, which may include an
          exchange for the correct product.
        </p>
      </>
    ),
  },
  {
    id: "damaged-products",
    title: "Damaged Products",
    body: (
      <>
        <p>
          If your product arrives visibly damaged, please report the issue{" "}
          <strong>before accepting the delivery whenever possible</strong>. If you accept a visibly
          damaged product without reporting it at delivery, an exchange may not be available.
        </p>
        <p>
          Buno Home Decor may review photographs, videos, packaging condition, and other information
          before approving an exchange.
        </p>
      </>
    ),
  },
  {
    id: "product-condition",
    title: "Product Condition",
    body: (
      <>
        <p>For an approved exchange, the product may need to be:</p>
        <ul>
          <li>Unused</li>
          <li>In its original condition</li>
          <li>Free from customer-caused damage</li>
          <li>Complete with all required components</li>
          <li>Returned with original packaging where applicable</li>
        </ul>
        <p>An exchange may be refused if the product has been:</p>
        <ul>
          <li>Used</li>
          <li>Installed</li>
          <li>Assembled</li>
          <li>Modified</li>
          <li>Painted or altered</li>
          <li>Damaged through improper handling</li>
          <li>Missing components or accessories</li>
        </ul>
      </>
    ),
  },
  {
    id: "wooden-handcrafted",
    title: "Wooden & Handcrafted Products",
    body: (
      <>
        <p>Many Buno Home Decor products are wooden or handcrafted.</p>
        <p>
          Natural differences in wood grain, knots, texture, shade, and finish are normal
          characteristics of these products. Such natural variations are generally{" "}
          <strong>not considered defects and do not automatically qualify for exchange</strong>.
        </p>
        <p>
          Minor differences between product photographs and the delivered product may also occur due to
          lighting, photography, and screen settings.
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
          An exchange is not guaranteed simply because a customer changes their mind after receiving
          the product. Before ordering, customers should carefully review:
        </p>
        <ul>
          <li>Product images</li>
          <li>Product dimensions</li>
          <li>Materials</li>
          <li>Product description</li>
          <li>Available variations</li>
          <li>Other information provided on the product page</li>
        </ul>
        <p>
          Once an order has been accepted, Buno Home Decor may refuse exchange requests based solely on
          a change of preference.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Exchange Availability",
    body: (
      <>
        <p>An exchange depends on product availability.</p>
        <p>
          If the same product is unavailable, Buno Home Decor may, at its discretion, offer another
          appropriate solution such as:
        </p>
        <ul>
          <li>An alternative product</li>
          <li>Store credit</li>
          <li>Refund, where applicable</li>
          <li>Another mutually agreed solution</li>
        </ul>
        <p>The available solution will depend on the circumstances of the order.</p>
      </>
    ),
  },
  {
    id: "delivery-charges",
    title: "Exchange Delivery Charges",
    body: (
      <>
        <p>
          Where an exchange is approved because Buno Home Decor sent the wrong product or a qualifying
          issue is confirmed to be our responsibility, we will review the applicable delivery
          arrangements.
        </p>
        <p>
          For other approved exchanges, the customer may be responsible for applicable delivery or
          return costs.
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
          Orders placed through our <strong>Facebook, Instagram, or TikTok</strong> pages are subject
          to the same exchange conditions.
        </p>
        <p>
          If there is an issue with your order, contact us with your order details as soon as possible.
          Customers should inspect the product at delivery regardless of where the order was placed.
        </p>
      </>
    ),
  },
  {
    id: "how-to-request",
    title: "How to Request an Exchange",
    body: (
      <>
        <p>To request an exchange, contact Buno Home Decor:</p>
        <ContactBlock />
        <p>Please provide:</p>
        <ul>
          <li>Order number</li>
          <li>Name</li>
          <li>Phone number</li>
          <li>Product name</li>
          <li>Description of the issue</li>
          <li>Clear photographs</li>
          <li>Video, if requested</li>
        </ul>
        <p>Our team will review the request and inform you about the next steps.</p>
      </>
    ),
  },
  {
    id: "right-to-review",
    title: "Buno Home Decor's Right to Approve or Reject",
    body: (
      <>
        <p>All exchange requests are subject to review.</p>
        <p>
          <strong>Buno Home Decor reserves the right to refuse an exchange request</strong> if the
          product or request does not meet the conditions of this policy.
        </p>
        <p>
          This includes situations where the product has been accepted, used, installed, modified,
          damaged by the customer, or where the reason for exchange does not qualify under our policy.
        </p>
      </>
    ),
  },
  {
    id: "related-policies",
    title: "Related Policies",
    body: (
      <>
        <p>For more information, please see:</p>
        <ul>
          <li>
            <LocalizedClientLink href="/returns">Happy Return Policy</LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/refund-policy">Refund Policy</LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/cancellation">Cancellation Policy</LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/shipping">Shipping &amp; Delivery Policy</LocalizedClientLink>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    body: (
      <p>
        <strong>Buno Home Decor</strong>
        <br />
        {brand.contact.address}
        <br />
        Phone: <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>
        <br />
        Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
      </p>
    ),
  },
]

export default function ExchangePage() {
  return (
    <LegalDoc
      title={PAGE_TITLE}
      lastUpdated={LAST_UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <p>
          At <strong>Buno Home Decor</strong>, we want you to receive the right product in good
          condition. If you receive an incorrect or qualifying defective product, an exchange may be
          considered according to the conditions below.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
