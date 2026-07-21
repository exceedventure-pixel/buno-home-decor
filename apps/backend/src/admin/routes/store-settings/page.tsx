import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  AdjustmentsDone,
  CreditCardSolid,
  TruckFast,
  ChartBar,
  Key,
  EnvelopeSolid,
  Photo,
  ExclamationCircle,
  Trash,
  ChevronDownMini,
  ChevronUpMini,
} from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Tabs,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { adminFetch } from "../../lib/api"
import { usePermissions } from "../../lib/permissions"
import AccessControlPage from "../access-control/page"
import BrandsPage from "../brands/page"
import HomepagePage from "../homepage/page"
import ProductCardsPage from "../product-cards/page"
import { PaymentsSection } from "./sections/payments-section"
import { CouriersSection } from "./sections/couriers-section"
import { TrackingSection } from "./sections/tracking-section"
import { AuthSection } from "./sections/auth-section"
import { NotificationsSection } from "./sections/notifications-section"
import { StorageSection } from "./sections/storage-section"
import { ErrorLogSection } from "./sections/error-log-section"
import { DangerZoneSection } from "./sections/danger-zone-section"
import { SystemModeSection } from "./sections/system-mode-section"

// ── Collapsible category wrapper ───────────────────────────────────────────────

function CategorySection({
  title,
  description,
  icon: Icon,
  defaultOpen,
  children,
}: {
  title: string
  description: string
  icon: ComponentType<any>
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <Container className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-ui-bg-base-hover transition-colors"
      >
        <div className="flex items-center gap-x-3">
          <Icon className="text-ui-fg-subtle" />
          <div>
            <Text size="base" weight="plus">{title}</Text>
            <Text size="small" className="text-ui-fg-subtle">{description}</Text>
          </div>
        </div>
        {open ? <ChevronUpMini className="text-ui-fg-muted" /> : <ChevronDownMini className="text-ui-fg-muted" />}
      </button>
      {open && (
        <div className="border-t border-ui-border-base bg-ui-bg-subtle px-4 py-4">
          {children}
        </div>
      )}
    </Container>
  )
}

// ── Contact & Invoice tab ───────────────────────────────────────────────────────

type Social = { facebook: string; instagram: string; tiktok: string; youtube: string }

function ContactSettings() {
  const [whatsapp, setWhatsapp] = useState("")
  const [phone, setPhone] = useState("")
  const [footerEmail, setFooterEmail] = useState("")
  const [footerAddress, setFooterAddress] = useState("")
  const [invoicePhone, setInvoicePhone] = useState("")
  const [invoiceEmail, setInvoiceEmail] = useState("")
  const [invoiceAddress, setInvoiceAddress] = useState("")
  const [hotline, setHotline] = useState("")
  const [social, setSocial] = useState<Social>({ facebook: "", instagram: "", tiktok: "", youtube: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminFetch<{
      setting: {
        whatsapp_number: string | null
        order_phone: string | null
        store_email: string | null
        store_address: string | null
        invoice_phone: string | null
        invoice_email: string | null
        invoice_address: string | null
        hotline: string | null
        social_links: Partial<Social> | null
      }
    }>("/store-settings")
      .then(({ setting }) => {
        setWhatsapp(setting?.whatsapp_number ?? "")
        setPhone(setting?.order_phone ?? "")
        setFooterEmail(setting?.store_email ?? "")
        setFooterAddress(setting?.store_address ?? "")
        setInvoicePhone(setting?.invoice_phone ?? "")
        setInvoiceEmail(setting?.invoice_email ?? "")
        setInvoiceAddress(setting?.invoice_address ?? "")
        setHotline(setting?.hotline ?? "")
        const s = setting?.social_links ?? {}
        setSocial({
          facebook: s.facebook ?? "",
          instagram: s.instagram ?? "",
          tiktok: s.tiktok ?? "",
          youtube: s.youtube ?? "",
        })
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false))
  }, [])

  const setSoc = (k: keyof Social, v: string) => setSocial((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminFetch("/store-settings", {
        method: "POST",
        body: JSON.stringify({
          whatsapp_number: whatsapp.trim() || null,
          order_phone: phone.trim() || null,
          store_email: footerEmail.trim() || null,
          store_address: footerAddress.trim() || null,
          invoice_phone: invoicePhone.trim() || null,
          invoice_email: invoiceEmail.trim() || null,
          invoice_address: invoiceAddress.trim() || null,
          hotline: hotline.trim() || null,
          social_links: {
            facebook: social.facebook.trim(),
            instagram: social.instagram.trim(),
            tiktok: social.tiktok.trim(),
            youtube: social.youtube.trim(),
          },
        }),
      })
      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string, hint?: string) => (
    <div className="flex flex-col gap-y-1">
      <Label>{label}</Label>
      {hint && <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text>}
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={loading} />
    </div>
  )

  const group = (title: string, desc: string, children: ReactNode, first = false) => (
    <div className={`flex flex-col gap-y-4 ${first ? "" : "border-t border-ui-border-base pt-6"}`}>
      <div>
        <Text size="small" weight="plus">{title}</Text>
        <Text size="xsmall" className="text-ui-fg-muted">{desc}</Text>
      </div>
      {children}
    </div>
  )

  return (
    <Container className="px-6 py-6 flex flex-col gap-y-6 max-w-2xl">
      {group(
        "Order buttons",
        "The WhatsApp & call buttons customers use on the storefront to place an order.",
        <>
          {field("WhatsApp Number", whatsapp, setWhatsapp, "+8801712345678", "Include country code. Leave blank to hide the WhatsApp button.")}
          {field("Order Phone Number", phone, setPhone, "+8801712345678", 'For the "Call For Order" button. Leave blank to hide.')}
        </>,
        true
      )}

      {group(
        "Footer contact",
        "Email & address shown in the storefront footer.",
        <>
          {field("Footer Email", footerEmail, setFooterEmail, "hello@yourstore.com")}
          {field("Footer Address", footerAddress, setFooterAddress, "Banktown, Savar, Dhaka 1340, Bangladesh")}
        </>
      )}

      {group(
        "Invoice & packing contact",
        "Contact details printed on invoices & packing slips — independent of the footer. Blank fields fall back to the footer / order phone.",
        <>
          {field("Invoice Phone", invoicePhone, setInvoicePhone, "+8801xxxxxxxxx", "Falls back to the order phone if blank.")}
          {field("Invoice Email", invoiceEmail, setInvoiceEmail, "orders@yourstore.com", "Falls back to the footer email if blank.")}
          {field("Invoice / Return Address", invoiceAddress, setInvoiceAddress, "Warehouse, Savar, Dhaka", "Falls back to the footer address if blank.")}
        </>
      )}

      {group(
        "Hotline contacts",
        "Customer-service hotline number(s) shown on the storefront. Separate multiple numbers with a comma.",
        field("Hotline", hotline, setHotline, "16xxx, +8801xxxxxxxxx")
      )}

      {group(
        "Social media handles",
        "Full profile URLs for the storefront footer. Leave a field blank to hide its icon.",
        <>
          {field("Facebook", social.facebook, (v) => setSoc("facebook", v), "https://facebook.com/yourstore")}
          {field("Instagram", social.instagram, (v) => setSoc("instagram", v), "https://instagram.com/yourstore")}
          {field("TikTok", social.tiktok, (v) => setSoc("tiktok", v), "https://tiktok.com/@yourstore")}
          {field("YouTube", social.youtube, (v) => setSoc("youtube", v), "https://youtube.com/@yourstore")}
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saving} disabled={loading || saving}>
          Save Contact &amp; Invoice Details
        </Button>
      </div>
    </Container>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

// ── Integrations tab (the original Store Settings content) ────────────────────

function IntegrationSettings() {
  return (
    <div className="flex flex-col gap-y-4 max-w-3xl">
      <Text size="small" className="text-ui-fg-subtle">
        Integration secrets (API keys, tokens) are set as environment variables on your server.
        Each card shows whether it is configured and lets you turn it on or off.
      </Text>

      <CategorySection title="Payments" description="Stripe, SSLCommerz, bKash" icon={CreditCardSolid}>
        <PaymentsSection />
      </CategorySection>

      <CategorySection title="Couriers" description="Steadfast, RedX, Pathao" icon={TruckFast}>
        <CouriersSection />
      </CategorySection>

      <CategorySection title="Tracking & Analytics" description="Meta Pixel, GA4, Conversions API" icon={ChartBar}>
        <TrackingSection />
      </CategorySection>

      <CategorySection title="Authentication" description="Google Sign-In, Phone OTP" icon={Key}>
        <AuthSection />
      </CategorySection>

      <CategorySection title="Notifications" description="Email (Resend), SMS" icon={EnvelopeSolid}>
        <NotificationsSection />
      </CategorySection>

      <CategorySection title="Storage Cleanup" description="Remove unused files from your storage bucket" icon={Photo}>
        <StorageSection />
      </CategorySection>

      <CategorySection title="Error Log" description="Errors customers hit on the storefront" icon={ExclamationCircle}>
        <ErrorLogSection />
      </CategorySection>

      <CategorySection
        title="System Mode"
        description="Run the simple system or the full accounting one"
        icon={AdjustmentsDone}
      >
        <SystemModeSection />
      </CategorySection>

      <CategorySection title="Danger Zone" description="Hard reset inventory, orders, and customer data" icon={Trash}>
        <DangerZoneSection />
      </CategorySection>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

/**
 * One home for everything that configures the store: integrations, the storefront's
 * Homepage and Product Cards, Brands, and Access Control. These used to be five separate
 * sidebar entries; they are tabs here so the sidebar stays about running the business.
 *
 * Tabs are permission-gated the same way the Accounting page does it — the API is still the
 * real boundary (it 403s), but there is no reason to show someone a tab they can't use.
 */
const StoreSettingsPage = () => {
  const { can, isLoading } = usePermissions()
  const [tab, setTab] = useState<string | null>(null)

  const tabs = useMemo(
    () =>
      [
        can("store_settings", "read") && { value: "integrations", label: "Integrations" },
        can("store_settings", "read") && { value: "contact", label: "Contact & Invoice" },
        can("homepage", "read") && { value: "homepage", label: "Homepage" },
        can("store_settings", "read") && { value: "product-cards", label: "Product Cards" },
        can("brands", "read") && { value: "brands", label: "Brands" },
        can("rbac", "read") && { value: "access-control", label: "Access Control" },
      ].filter(Boolean) as { value: string; label: string }[],
    [can]
  )

  if (isLoading) return null

  if (!tabs.length) {
    return (
      <Container className="p-8">
        <Text className="text-ui-fg-subtle">
          You don't have access to the Store Settings section.
        </Text>
      </Container>
    )
  }

  // Fall back to the first tab the user can actually see.
  const active = tab && tabs.some((t) => t.value === tab) ? tab : tabs[0].value

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <div>
        <Heading level="h1">Store Settings</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Everything that configures the store and its storefront.
        </Text>
      </div>

      <Tabs value={active} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <Tabs.List className="w-max">
            {tabs.map((t) => (
              <Tabs.Trigger key={t.value} value={t.value}>
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        <div className="mt-4">
          <Tabs.Content value="integrations">
            <IntegrationSettings />
          </Tabs.Content>
          <Tabs.Content value="contact">
            <ContactSettings />
          </Tabs.Content>
          <Tabs.Content value="homepage">
            <HomepagePage />
          </Tabs.Content>
          <Tabs.Content value="product-cards">
            <ProductCardsPage />
          </Tabs.Content>
          <Tabs.Content value="brands">
            <BrandsPage />
          </Tabs.Content>
          <Tabs.Content value="access-control">
            <AccessControlPage />
          </Tabs.Content>
        </div>
      </Tabs>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Store Settings",
  icon: AdjustmentsDone,
  rank: 100, // last in the sidebar
})

export default StoreSettingsPage
