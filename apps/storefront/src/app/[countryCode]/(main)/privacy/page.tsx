import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import LegalDoc, { type LegalSection } from "@modules/common/components/legal-doc"

/**
 * PRIVACY POLICY — rendered through the shared LegalDoc layout.
 *
 * Content lives here as structured section data; the layout owns numbering, the on-this-page nav,
 * deep-link anchors and styling. Contact details come from brand.config so they never drift.
 */

const PAGE_TITLE = "Privacy Policy"
const LAST_UPDATED = "August 12, 2026"
const UPDATED_ISO = "2026-08-12"
const PAGE_DESCRIPTION =
  "How Buno Home Decor collects, uses, shares and protects your personal information when you " +
  "browse, order, or contact us — and the privacy choices available to you."

const phoneDisplay = brand.contact.phone.replace(/^\+?880/, "0")
const phoneTel = brand.contact.phone.startsWith("+")
  ? brand.contact.phone
  : `+${brand.contact.phone.replace(/[^\d]/g, "")}`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/privacy`,
    siteName: brand.storeName,
  },
}

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "About Buno Home Decor",
    body: (
      <>
        <p>
          Buno Home Decor is a Bangladesh-based home décor brand offering home decoration products
          including wooden and handcrafted décor, wall décor, shelves, organizers, kitchen racks, and
          other products for the home.
        </p>
        <p>
          Our website allows customers to browse products, place orders, and communicate with our
          team.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    body: (
      <>
        <p>
          We may collect information that you provide directly to us when you use our website or
          communicate with us.
        </p>
        <p>This may include:</p>
        <ul>
          <li>Full name</li>
          <li>Phone number</li>
          <li>Email address</li>
          <li>Delivery address</li>
          <li>Billing information, where applicable</li>
          <li>Order details</li>
          <li>Product preferences or enquiries</li>
          <li>Information provided when contacting customer support</li>
          <li>Reviews, feedback, photographs, or other content you voluntarily submit</li>
        </ul>
        <p>
          We only request information that is reasonably necessary to provide our products and
          services.
        </p>
      </>
    ),
  },
  {
    id: "information-collected-automatically",
    title: "Information Collected Automatically",
    body: (
      <>
        <p>
          When you visit our website, certain technical information may be collected automatically
          through your browser, device, or website technologies.
        </p>
        <p>This may include:</p>
        <ul>
          <li>IP address</li>
          <li>Browser type</li>
          <li>Device type</li>
          <li>Operating system</li>
          <li>Pages visited</li>
          <li>Approximate usage information</li>
          <li>Referring website or page</li>
          <li>Date and time of website visits</li>
        </ul>
        <p>
          This information may help us understand how visitors use our website, improve website
          performance, and identify technical problems.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How We Use Your Information",
    body: (
      <>
        <p>We may use your information to:</p>
        <ul>
          <li>Process and confirm your orders</li>
          <li>Deliver products to you</li>
          <li>Contact you about your orders</li>
          <li>Provide customer support</li>
          <li>Respond to questions and enquiries</li>
          <li>Process returns, exchanges, or refunds</li>
          <li>Improve our products and services</li>
          <li>Improve our website and shopping experience</li>
          <li>Prevent fraudulent or unauthorized activity</li>
          <li>Maintain website security</li>
          <li>Send relevant promotional communications where permitted and appropriate</li>
          <li>Comply with applicable legal and regulatory requirements</li>
        </ul>
        <p>
          We do not collect personal information simply for the purpose of collecting it. We use
          information primarily to operate and improve our business and serve our customers.
        </p>
      </>
    ),
  },
  {
    id: "order-delivery-information",
    title: "Order & Delivery Information",
    body: (
      <>
        <p>
          When you place an order, we need certain information to successfully process and deliver
          your purchase.
        </p>
        <p>
          For example, your name, phone number, and delivery address may be shared with the relevant
          delivery or courier service when necessary to complete your order.
        </p>
        <p>We only share information that is reasonably required for the relevant service.</p>
      </>
    ),
  },
  {
    id: "payment-information",
    title: "Payment Information",
    body: (
      <>
        <p>
          Depending on the payment method available on our website, payments may be processed through
          third-party payment providers.
        </p>
        <p>
          Where a third-party payment service is used, your payment information may be handled
          directly by that provider according to its own privacy policy and security practices.
        </p>
        <p>
          Buno Home Decor does not intentionally store sensitive payment credentials such as complete
          card passwords, PINs, or other authentication credentials that should be handled by the
          payment provider.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & Similar Technologies",
    body: (
      <>
        <p>
          Our website may use cookies and similar technologies to improve your browsing and shopping
          experience.
        </p>
        <p>Cookies may help us:</p>
        <ul>
          <li>Remember certain preferences</li>
          <li>Keep your shopping experience functional</li>
          <li>Understand how visitors use our website</li>
          <li>Improve website performance</li>
          <li>Measure marketing and website activity</li>
        </ul>
        <p>
          You can control or disable cookies through your browser settings. However, disabling
          certain cookies may affect some website functionality.
        </p>
      </>
    ),
  },
  {
    id: "marketing-communications",
    title: "Marketing Communications",
    body: (
      <>
        <p>
          If you provide your contact information, we may occasionally use it to communicate with you
          about products, offers, promotions, new collections, or other Buno Home Decor updates where
          permitted.
        </p>
        <p>You may request to stop receiving promotional communications from us.</p>
        <p>
          Please note that even if you opt out of marketing communications, we may still contact you
          when necessary to complete an order, provide customer support, or communicate important
          service-related information.
        </p>
      </>
    ),
  },
  {
    id: "how-we-share-information",
    title: "How We Share Your Information",
    body: (
      <>
        <p>We do not sell or rent your personal information to third parties.</p>
        <p>
          We may share necessary information with trusted service providers when required to operate
          our business, including:
        </p>
        <ul>
          <li>Courier and delivery services</li>
          <li>Payment service providers</li>
          <li>Website and hosting providers</li>
          <li>Technology and analytics providers</li>
          <li>Customer support or operational service providers</li>
        </ul>
        <p>
          We may also disclose information when required by applicable law, legal process, court
          order, or to protect our rights, customers, website, or business.
        </p>
      </>
    ),
  },
  {
    id: "data-security",
    title: "Data Security",
    body: (
      <>
        <p>
          We take reasonable measures to protect the personal information we handle against
          unauthorized access, misuse, alteration, disclosure, or loss.
        </p>
        <p>
          However, no website, online service, or method of electronic transmission can be guaranteed
          to be completely secure.
        </p>
        <p>
          You should also take reasonable precautions when using the internet, including keeping your
          account credentials and personal information secure.
        </p>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "Data Retention",
    body: (
      <>
        <p>
          We retain personal information only for as long as reasonably necessary for the purposes
          described in this Privacy Policy, including fulfilling orders, maintaining business records,
          resolving disputes, providing customer support, and meeting applicable legal or regulatory
          requirements.
        </p>
        <p>
          When information is no longer reasonably required, it may be deleted or securely disposed of
          where appropriate.
        </p>
      </>
    ),
  },
  {
    id: "third-party-websites",
    title: "Third-Party Websites & Services",
    body: (
      <>
        <p>
          Our website may contain links to third-party websites, payment services, social media
          platforms, or other external services.
        </p>
        <p>
          Buno Home Decor is not responsible for the privacy practices, content, or security of
          third-party websites.
        </p>
        <p>
          We encourage you to review the privacy policies of third-party services before providing
          them with personal information.
        </p>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "Children's Privacy",
    body: (
      <>
        <p>
          Our website is intended for general consumers and is not specifically directed toward
          children.
        </p>
        <p>
          We do not knowingly collect personal information from children for purposes that are
          prohibited by applicable law.
        </p>
        <p>
          If you believe that a child has provided personal information to us inappropriately, please
          contact us so that we can review the matter and take appropriate action.
        </p>
      </>
    ),
  },
  {
    id: "your-privacy-choices",
    title: "Your Privacy Choices",
    body: (
      <>
        <p>
          Depending on applicable law, you may have rights regarding your personal information,
          including the ability to:
        </p>
        <ul>
          <li>Ask what personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of certain information</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>Opt out of certain promotional communications</li>
          <li>Ask questions about how your information is used</li>
        </ul>
        <p>
          Some information may need to be retained where required for legal, accounting, security, or
          legitimate business purposes.
        </p>
        <p>To make a privacy-related request, please contact us using the details below.</p>
      </>
    ),
  },
  {
    id: "changes-to-policy",
    title: "Changes to This Privacy Policy",
    body: (
      <>
        <p>
          We may update this Privacy Policy from time to time as our business, website, services, or
          applicable requirements change.
        </p>
        <p>
          Any updates will be published on this page with a revised <strong>Last Updated</strong>{" "}
          date.
        </p>
        <p>
          We encourage you to review this page periodically to stay informed about how we handle
          personal information.
        </p>
      </>
    ),
  },
  {
    id: "contact-us",
    title: "Contact Us",
    body: (
      <>
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or your personal
          information, please contact us.
        </p>
        <p>
          <strong>Buno Home Decor</strong>
          <br />
          Phone: <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>
          <br />
          Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
          <br />
          Office Address: {brand.contact.address}
        </p>
        <p>
          We value your trust and are committed to providing a safe, reliable, and enjoyable shopping
          experience.
        </p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalDoc
      title={PAGE_TITLE}
      lastUpdated={LAST_UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <>
          <p>
            At <strong>Buno Home Decor</strong>, we respect your privacy and are committed to
            protecting the personal information you provide when you visit our website, place an
            order, or communicate with us.
          </p>
          <p>
            This Privacy Policy explains what information we may collect, how we use it, how we
            protect it, and the choices available to you. By using the Buno Home Decor website, you
            acknowledge the practices described in this Privacy Policy.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  )
}
