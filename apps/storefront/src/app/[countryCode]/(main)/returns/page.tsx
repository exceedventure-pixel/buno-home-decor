import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LegalDoc, { type LegalSection } from "@modules/common/components/legal-doc"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * HAPPY RETURN POLICY — rendered through the shared LegalDoc layout.
 *
 * Content lives here as structured section data; the layout owns numbering, the on-this-page nav,
 * deep-link anchors and styling. Contact details come from brand.config so they never drift.
 */

const PAGE_TITLE = "Happy Return Policy"
const LAST_UPDATED = "August 12, 2026"
const UPDATED_ISO = "2026-08-12"
const PAGE_DESCRIPTION =
  "Buno Home Decor's Happy Return policy — please inspect your order before accepting delivery. " +
  "When a return may be considered, product condition, review and approval, and how to request one."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/returns" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/returns`,
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
    title: "Check Your Order Before Accepting Delivery",
    body: (
      <>
        <p>
          <strong>This is the most important part of our return policy.</strong>
        </p>
        <p>
          We strongly recommend that you{" "}
          <strong>
            check your package and product while the delivery person is present and before accepting
            the delivery
          </strong>
          . If you notice an obvious issue such as:
        </p>
        <ul>
          <li>A damaged product</li>
          <li>The wrong product</li>
          <li>Missing parts or items</li>
          <li>Serious visible defects</li>
          <li>Significant damage to the package</li>
        </ul>
        <p>
          please inform the delivery person immediately and contact Buno Home Decor before accepting
          the order whenever possible.
        </p>
        <p>
          <strong>Why is this important?</strong>
        </p>
        <p>
          Once a customer accepts and receives an order, the opportunity to return or exchange the
          product becomes significantly limited. For this reason, customers should carefully inspect
          their order at the time of delivery.
        </p>
        <p>
          <strong>
            After an order has been accepted, Buno Home Decor does not guarantee that a return or
            exchange request will be accepted. All such requests are subject to our review and
            approval.
          </strong>
        </p>
      </>
    ),
  },
  {
    id: "when-can-i-return",
    title: "When Can I Request a Return?",
    body: (
      <>
        <p>A return may be considered in situations such as:</p>
        <ul>
          <li>You received a different product from what you ordered.</li>
          <li>You received a product with significant damage caused before delivery.</li>
          <li>The product has a qualifying manufacturing or quality issue.</li>
          <li>An item or essential component is missing from the order.</li>
          <li>Another situation is specifically approved by Buno Home Decor.</li>
        </ul>
        <p>
          A return request is <strong>not automatically approved</strong> simply because a customer
          requests one. Buno Home Decor reserves the right to review and approve or reject each return
          request based on the circumstances and condition of the product.
        </p>
      </>
    ),
  },
  {
    id: "returns-after-acceptance",
    title: "Returns After Delivery Has Been Accepted",
    body: (
      <>
        <p>
          Once you have accepted the order from the delivery person, returns or exchanges may be
          difficult or unavailable. Buno Home Decor may refuse a return or exchange request where:
        </p>
        <ul>
          <li>The product was accepted without reporting an obvious issue.</li>
          <li>The product has been used.</li>
          <li>The product has been installed or assembled.</li>
          <li>The product has been modified or altered.</li>
          <li>The product has been damaged after delivery.</li>
          <li>The product is missing its original components or packaging where required.</li>
          <li>The issue is caused by improper use, handling, installation, or storage.</li>
          <li>The customer simply changes their mind after accepting the product.</li>
          <li>The request does not meet our return conditions.</li>
        </ul>
        <p>
          <strong>
            Acceptance of a delivery indicates that the customer has received the order. It does not
            create an automatic right to return or exchange the product.
          </strong>
        </p>
      </>
    ),
  },
  {
    id: "inspect-before-accept",
    title: "Inspect Before You Accept",
    body: (
      <>
        <p>
          For the best possible experience, we recommend following these steps when your order
          arrives:
        </p>
        <ol>
          <li>Check the package before accepting the delivery.</li>
          <li>Open and inspect the product where reasonably possible.</li>
          <li>Check that you received the correct product.</li>
          <li>Check for visible damage or missing components.</li>
          <li>Take photographs or video if you notice an issue.</li>
          <li>Inform the delivery person immediately.</li>
          <li>Contact Buno Home Decor as soon as possible.</li>
        </ol>
        <p>
          If the delivery person cannot wait for a complete inspection, check the package and product
          as soon as reasonably possible and contact us immediately if you identify a serious issue.
        </p>
      </>
    ),
  },
  {
    id: "product-condition",
    title: "Product Condition for an Approved Return",
    body: (
      <>
        <p>
          If Buno Home Decor approves a return, the product may need to meet the applicable return
          conditions. Depending on the reason for the return, the product should generally be:
        </p>
        <ul>
          <li>Unused</li>
          <li>In its original condition</li>
          <li>Free from customer-caused damage</li>
          <li>Accompanied by relevant accessories or components</li>
          <li>Returned with original packaging where required</li>
        </ul>
        <p>
          Products that have been used, installed, modified, painted, altered, damaged, or otherwise
          changed after delivery may not be eligible for return or exchange.
        </p>
      </>
    ),
  },
  {
    id: "wooden-handcrafted",
    title: "Wooden & Handcrafted Products",
    body: (
      <>
        <p>Many Buno Home Decor products are made from wood or involve handcrafted processes.</p>
        <p>Natural variations in:</p>
        <ul>
          <li>Wood grain</li>
          <li>Texture</li>
          <li>Knots</li>
          <li>Shade</li>
          <li>Finish</li>
          <li>Minor surface characteristics</li>
        </ul>
        <p>
          can occur from one product to another. These natural characteristics are part of wooden and
          handcrafted products and are generally{" "}
          <strong>not considered defects or valid reasons for return or exchange</strong>.
        </p>
        <p>
          Similarly, slight differences between product photographs and the physical product may occur
          because of lighting, photography, and individual screen settings.
        </p>
      </>
    ),
  },
  {
    id: "review-approval",
    title: "Return Review & Approval",
    body: (
      <>
        <p>When you contact us about a return, our team may ask for:</p>
        <ul>
          <li>Order number</li>
          <li>Customer name</li>
          <li>Phone number</li>
          <li>Product photographs</li>
          <li>Packaging photographs</li>
          <li>Video of the issue</li>
          <li>Other information necessary to assess the request</li>
        </ul>
        <p>
          Our team will review the information and determine whether the request qualifies under our
          policy.
        </p>
        <p>
          <strong>
            Buno Home Decor reserves the right to approve or reject any return request based on the
            condition of the product, reason for return, timing of the request, and other relevant
            circumstances.
          </strong>
        </p>
      </>
    ),
  },
  {
    id: "return-delivery",
    title: "Return Delivery",
    body: (
      <>
        <p>
          If a return is approved, Buno Home Decor will provide instructions regarding how the product
          should be returned. Return delivery charges may vary depending on the reason for the return.
        </p>
        <p>
          Where the issue is confirmed to have resulted from an error by Buno Home Decor, such as
          sending the wrong product, we may provide an appropriate return solution. For other approved
          returns, the customer may be responsible for applicable return delivery costs.
        </p>
      </>
    ),
  },
  {
    id: "refund-replacement-exchange",
    title: "Refund, Replacement or Exchange",
    body: (
      <>
        <p>
          An approved return does not necessarily mean that a cash refund will be provided. Depending
          on the circumstances, Buno Home Decor may offer:
        </p>
        <ul>
          <li>Replacement</li>
          <li>Exchange</li>
          <li>Refund</li>
          <li>Another appropriate solution</li>
        </ul>
        <p>
          The final resolution may depend on product availability, the reason for the return, product
          condition, and the original payment method. Please see our{" "}
          <LocalizedClientLink href="/refund-policy">Refund Policy</LocalizedClientLink> and{" "}
          <LocalizedClientLink href="/exchange">Exchange Policy</LocalizedClientLink> for additional
          information.
        </p>
      </>
    ),
  },
  {
    id: "not-eligible",
    title: "Products That May Not Be Eligible",
    body: (
      <>
        <p>Returns or exchanges may not be accepted for products that:</p>
        <ul>
          <li>Have been used or damaged by the customer</li>
          <li>Have been installed or assembled</li>
          <li>Have been modified or altered</li>
          <li>Have been returned without required components</li>
          <li>Have been damaged because of improper handling or use</li>
          <li>Are custom-made or personalized, unless the issue is caused by Buno Home Decor</li>
          <li>Are returned outside the applicable return conditions</li>
          <li>Are specifically identified as non-returnable at the time of purchase</li>
          <li>Are returned because the customer simply changed their mind after accepting the delivery</li>
        </ul>
      </>
    ),
  },
  {
    id: "social-media-orders",
    title: "Orders Through Facebook, Instagram & TikTok",
    body: (
      <>
        <p>The same return conditions apply to orders placed through our social media channels.</p>
        <p>
          If you ordered through <strong>Facebook, Instagram, or TikTok</strong>, please contact us
          with your order details if you identify an issue. You should still inspect your product at
          the time of delivery and report any obvious problem immediately.
        </p>
      </>
    ),
  },
  {
    id: "how-to-request",
    title: "How to Request a Return",
    body: (
      <>
        <p>If you believe your order qualifies for a return, contact Buno Home Decor:</p>
        <ContactBlock />
        <p>
          Please provide your order number, phone number, and a clear description of the issue.
          Photographs or videos may be required before a return request can be evaluated.
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
          <strong>Please inspect your order before accepting the delivery.</strong>
        </p>
        <p>
          Once the delivery has been accepted,{" "}
          <strong>return and exchange opportunities are very limited and are not guaranteed</strong>.
          Buno Home Decor reserves the right to{" "}
          <strong>refuse any return or exchange request that does not meet our policy requirements</strong>.
        </p>
        <p>
          Our goal is to protect both our customers and our business while ensuring that genuine
          product or fulfillment issues are handled fairly.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact Buno Home Decor",
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
        <p>For related information, please also see our:</p>
        <ul>
          <li>
            <LocalizedClientLink href="/refund-policy">Refund Policy</LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/exchange">Exchange Policy</LocalizedClientLink>
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
]

export default function ReturnsPage() {
  return (
    <LegalDoc
      title={PAGE_TITLE}
      lastUpdated={LAST_UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <>
          <p>
            At <strong>Buno Home Decor</strong>, we want you to shop for home décor and home
            decoration products with confidence. We carefully prepare and check products before
            dispatch, but we understand that an issue can occasionally occur during fulfillment or
            delivery.
          </p>
          <p>
            Our Happy Return Policy explains when a return may be considered and what customers should
            do if there is a problem with an order.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  )
}
