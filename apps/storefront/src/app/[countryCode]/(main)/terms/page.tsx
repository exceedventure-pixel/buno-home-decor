import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LegalDoc, { type LegalSection } from "@modules/common/components/legal-doc"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * TERMS & CONDITIONS — rendered through the shared LegalDoc layout.
 *
 * Content lives here as structured section data; the layout owns numbering, the on-this-page nav,
 * deep-link anchors and styling. Contact details come from brand.config so they never drift from
 * the rest of the site.
 */

const PAGE_TITLE = "Terms & Conditions"
const LAST_UPDATED = "August 12, 2026"
const UPDATED_ISO = "2026-08-12"
const PAGE_DESCRIPTION =
  "The Terms & Conditions for shopping with Buno Home Decor — orders, pricing, delivery, cash on " +
  "delivery, returns, intellectual property and more, for customers in Bangladesh."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/terms`,
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
    id: "about",
    title: "About Buno Home Decor",
    body: (
      <>
        <p>
          Buno Home Decor is a Bangladesh-based home décor brand offering a growing collection of
          home decoration products, including wooden and handcrafted décor, wall décor, shelves,
          organizers, kitchen racks, and other products for the home.
        </p>
        <p>
          Our product range may change and expand over time to include furniture and other home and
          interior solutions.
        </p>
      </>
    ),
  },
  {
    id: "use-of-website",
    title: "Use of Our Website",
    body: (
      <>
        <p>
          You agree to use our website only for lawful purposes and in a way that does not:
        </p>
        <ul>
          <li>Violate any applicable law or regulation</li>
          <li>Attempt to gain unauthorized access to our website or systems</li>
          <li>Interfere with the operation or security of our website</li>
          <li>Copy, reproduce, or misuse our content without permission</li>
          <li>Provide false or misleading information when placing an order</li>
        </ul>
        <p>
          We reserve the right to restrict or terminate access to our website where necessary to
          protect our business, customers, or website.
        </p>
      </>
    ),
  },
  {
    id: "product-information",
    title: "Product Information",
    body: (
      <>
        <p>
          We make reasonable efforts to ensure that product descriptions, images, dimensions,
          materials, colors, and other information displayed on our website are accurate.
        </p>
        <p>
          However, there may be minor differences between the product shown on your screen and the
          physical product due to:
        </p>
        <ul>
          <li>Screen and device settings</li>
          <li>Lighting and photography conditions</li>
          <li>Natural variations in wooden or handcrafted materials</li>
          <li>Manufacturing and finishing processes</li>
        </ul>
        <p>
          For handcrafted and wooden products, natural variations in grain, texture, shade, and
          finish may occur. These variations are part of the character of the material and should
          not necessarily be considered defects.
        </p>
      </>
    ),
  },
  {
    id: "product-availability",
    title: "Product Availability",
    body: (
      <>
        <p>All products are subject to availability.</p>
        <p>We reserve the right to:</p>
        <ul>
          <li>Change product availability</li>
          <li>Discontinue products</li>
          <li>Limit the quantity available for purchase</li>
          <li>Correct product or pricing information where an error has occurred</li>
        </ul>
        <p>
          If a product becomes unavailable after you place an order, we will contact you and provide
          an appropriate solution, which may include an alternative product or refund where
          applicable.
        </p>
      </>
    ),
  },
  {
    id: "pricing",
    title: "Pricing",
    body: (
      <>
        <p>
          All product prices displayed on our website are stated in{" "}
          <strong>Bangladeshi Taka (BDT)</strong> unless otherwise specified.
        </p>
        <p>
          Prices may change at any time without prior notice. However, changes made after a
          confirmed order will not normally affect the agreed product price for that order, except
          where an obvious pricing or technical error has occurred.
        </p>
        <p>
          Delivery charges, where applicable, may be added separately during the checkout or order
          confirmation process.
        </p>
      </>
    ),
  },
  {
    id: "orders",
    title: "Orders",
    body: (
      <>
        <p>
          When you place an order through our website, you are responsible for providing accurate
          information, including:
        </p>
        <ul>
          <li>Full name</li>
          <li>Phone number</li>
          <li>Delivery address</li>
          <li>Product and quantity</li>
          <li>Any other information required to process the order</li>
        </ul>
        <p>
          An order is considered confirmed when Buno Home Decor has accepted the order through our
          ordering process or otherwise confirmed it with you.
        </p>
        <p>
          We reserve the right to cancel or decline an order in situations such as incorrect pricing,
          product unavailability, suspected fraudulent activity, or inaccurate customer information.
        </p>
      </>
    ),
  },
  {
    id: "order-confirmation",
    title: "Order Confirmation",
    body: (
      <>
        <p>
          After placing an order, you may receive an order confirmation through the contact
          information provided during checkout.
        </p>
        <p>
          If you do not receive confirmation or believe there is an issue with your order, please
          contact us at:
        </p>
        <ContactBlock />
      </>
    ),
  },
  {
    id: "delivery",
    title: "Delivery",
    body: (
      <>
        <p>
          We deliver products to customers within Bangladesh according to our available delivery
          coverage.
        </p>
        <p>Delivery times may vary depending on:</p>
        <ul>
          <li>Delivery location</li>
          <li>Product availability</li>
          <li>Order volume</li>
          <li>Courier or delivery service conditions</li>
          <li>Weather, holidays, or other circumstances beyond our control</li>
        </ul>
        <p>
          Estimated delivery times are provided as guidance and are not always guaranteed. Please
          ensure that the delivery address and phone number provided with your order are correct.
        </p>
        <p>
          For more information, please see our{" "}
          <LocalizedClientLink href="/shipping">Shipping &amp; Delivery Policy</LocalizedClientLink>.
        </p>
      </>
    ),
  },
  {
    id: "cash-on-delivery",
    title: "Cash on Delivery",
    body: (
      <>
        <p>
          Where Cash on Delivery (COD) is available, customers are expected to receive the order and
          make the required payment upon delivery.
        </p>
        <p>
          Customers should not place orders with the intention of refusing delivery without a valid
          reason.
        </p>
        <p>
          Repeated order cancellations, fake orders, or deliberate refusal of multiple deliveries may
          result in restrictions on future Cash on Delivery orders.
        </p>
      </>
    ),
  },
  {
    id: "returns-exchanges-refunds",
    title: "Returns, Exchanges & Refunds",
    body: (
      <>
        <p>
          Our return, exchange, and refund procedures are governed by our{" "}
          <LocalizedClientLink href="/refund-policy">Return &amp; Refund Policy</LocalizedClientLink>.
          Customers should review that policy before placing an order.
        </p>
        <p>
          If you receive a damaged, incorrect, or significantly different product, please contact us
          as soon as possible with the relevant order information and supporting photographs or
          videos where requested.
        </p>
      </>
    ),
  },
  {
    id: "damaged-or-incorrect",
    title: "Damaged or Incorrect Products",
    body: (
      <>
        <p>
          We take care in packaging and delivering our products. However, if your order arrives
          damaged or you receive an incorrect item, please contact us promptly.
        </p>
        <p>To help us investigate and resolve the issue, we may request:</p>
        <ul>
          <li>Order number</li>
          <li>Photographs of the received product</li>
          <li>Photographs of the packaging</li>
          <li>A short video showing the condition of the product, where necessary</li>
        </ul>
        <p>Resolution will be handled according to our Return &amp; Refund Policy.</p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    body: (
      <>
        <p>All content available on the Buno Home Decor website, including but not limited to:</p>
        <ul>
          <li>Logos and brand names</li>
          <li>Product photographs</li>
          <li>Product descriptions</li>
          <li>Graphics and designs</li>
          <li>Website text</li>
          <li>Page layouts</li>
          <li>Other original content</li>
        </ul>
        <p>is owned by or licensed to Buno Home Decor unless otherwise stated.</p>
        <p>
          You may not reproduce, copy, modify, distribute, publish, or commercially use our content
          without prior written permission.
        </p>
      </>
    ),
  },
  {
    id: "reviews-user-content",
    title: "Customer Reviews & User Content",
    body: (
      <>
        <p>
          If you submit a review, photograph, testimonial, comment, or other content to Buno Home
          Decor, you agree that the content should be genuine, lawful, and not misleading.
        </p>
        <p>You should not submit content that:</p>
        <ul>
          <li>Violates another person&apos;s rights</li>
          <li>Contains abusive, offensive, or unlawful material</li>
          <li>Infringes copyright or intellectual property rights</li>
          <li>Contains misleading information</li>
          <li>Promotes fraudulent or harmful activity</li>
        </ul>
        <p>
          Where permitted, Buno Home Decor may use customer-submitted reviews, photographs, or
          testimonials for marketing and promotional purposes.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    body: (
      <>
        <p>
          We respect your privacy and handle customer information according to our{" "}
          <LocalizedClientLink href="/privacy">Privacy Policy</LocalizedClientLink>.
        </p>
        <p>
          By using our website and placing an order, you acknowledge that certain information is
          required to process orders, communicate with you, arrange delivery, and provide customer
          support.
        </p>
      </>
    ),
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    body: (
      <>
        <p>
          We may use third-party services such as payment providers, courier companies, technology
          providers, analytics services, or other partners to operate our business and provide
          services to customers.
        </p>
        <p>
          Third-party services may have their own terms and policies, and Buno Home Decor is not
          responsible for matters that are solely within the control of those third parties.
        </p>
      </>
    ),
  },
  {
    id: "website-accuracy",
    title: "Website Accuracy & Availability",
    body: (
      <>
        <p>
          We work to keep our website accurate, secure, and available. However, we do not guarantee
          that the website will always be:
        </p>
        <ul>
          <li>Available without interruption</li>
          <li>Completely free of errors</li>
          <li>Free from technical issues</li>
          <li>Completely free from inaccurate or outdated information</li>
        </ul>
        <p>We may update, modify, suspend, or discontinue parts of the website when necessary.</p>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    body: (
      <>
        <p>
          To the extent permitted by applicable law, Buno Home Decor will not be responsible for
          losses or damages arising from circumstances beyond our reasonable control, including
          delivery delays, technical problems, natural events, third-party service interruptions, or
          other unforeseen circumstances.
        </p>
        <p>
          Nothing in these Terms &amp; Conditions is intended to exclude any rights or protections
          that cannot legally be excluded under applicable law.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-terms",
    title: "Changes to These Terms",
    body: (
      <>
        <p>
          Buno Home Decor may update these Terms &amp; Conditions from time to time to reflect
          changes in our business, products, services, website, or applicable requirements.
        </p>
        <p>
          When we make changes, the updated version will be published on this page with a revised{" "}
          <strong>Last Updated</strong> date. We encourage customers to review this page
          periodically.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law",
    body: (
      <>
        <p>
          These Terms &amp; Conditions shall be governed by and interpreted in accordance with the
          applicable laws of <strong>Bangladesh</strong>.
        </p>
        <p>
          Any disputes will be handled in accordance with the applicable laws and legal procedures of
          Bangladesh.
        </p>
      </>
    ),
  },
  {
    id: "contact-us",
    title: "Contact Us",
    body: (
      <>
        <p>If you have any questions about these Terms &amp; Conditions, please contact us.</p>
        <p>
          <strong>Buno Home Decor</strong>
          <br />
          Phone: <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>
          <br />
          Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
          <br />
          Office Address: {brand.contact.address}
        </p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalDoc
      title={PAGE_TITLE}
      lastUpdated={LAST_UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <>
          <p>
            Welcome to <strong>Buno Home Decor</strong>. These Terms &amp; Conditions govern your use
            of our website and your purchase of products from Buno Home Decor.
          </p>
          <p>
            By accessing our website, placing an order, or using our services, you agree to these
            terms. Please read them carefully before making a purchase.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  )
}
