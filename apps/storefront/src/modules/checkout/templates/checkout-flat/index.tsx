"use client"

import {
  deleteLineItem,
  initiatePaymentSession,
  placeOrder,
  setShippingMethod,
  updateCart,
  updateLineItem,
} from "@lib/data/cart"
import {
  isManual,
  isRedirectProvider,
  isStripeLike,
  paymentInfoMap,
} from "@lib/constants"
import { calcDeliveryCharge } from "@lib/delivery-pricing"
import { isDhakaCity } from "@lib/bd-districts"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button, clx } from "@modules/common/components/ui"
import DiscountCode from "@modules/checkout/components/discount-code"
import CitySelect from "@modules/checkout/components/city-select"
import LineItemOptions from "@modules/common/components/line-item-options"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import brand from "brand.config"
import { useParams, useRouter } from "next/navigation"
import { ReactNode, useMemo, useState } from "react"

/**
 * Single-page ("flat") checkout — everything on one screen, one Place Order button, no step hops.
 * Supports Cash on Delivery (manual) and the redirect gateways (SSLCommerz / bKash). Card/Stripe is
 * intentionally not offered here (needs an inline card element — a separate follow-up).
 */

type Props = {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
  availablePaymentMethods: { id: string }[]
}

type AddressState = {
  first_name: string
  last_name: string
  phone: string
  address_1: string
  city: string
  postal_code: string
}

const CheckoutFlat = ({
  cart,
  customer,
  availableShippingMethods,
  availablePaymentMethods,
}: Props) => {
  const router = useRouter()
  const countryCode = ((useParams().countryCode as string) || "bd").toLowerCase()
  const currency = cart.currency_code

  const sa = cart.shipping_address

  const [addr, setAddr] = useState<AddressState>({
    first_name: sa?.first_name || customer?.first_name || "",
    last_name: sa?.last_name || customer?.last_name || "",
    phone: sa?.phone || customer?.phone || "",
    address_1: sa?.address_1 || "",
    city: sa?.city || "",
    postal_code: sa?.postal_code || "",
  })
  const [email, setEmail] = useState(cart.email || customer?.email || "")
  const [notes, setNotes] = useState(
    (cart.metadata?.customer_note as string) || ""
  )
  const [terms, setTerms] = useState(false)

  const supportedMethods = useMemo(
    () => availablePaymentMethods.filter((m) => !isStripeLike(m.id)),
    [availablePaymentMethods]
  )
  const [payment, setPayment] = useState(
    supportedMethods.find((m) => isManual(m.id))?.id ||
      supportedMethods[0]?.id ||
      ""
  )

  const [pendingLine, setPendingLine] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const standardOption =
    availableShippingMethods?.find((o) => /standard/i.test(o.name)) ||
    availableShippingMethods?.[0] ||
    null

  const items = cart.items ?? []
  const totalQty = items.reduce((n, i) => n + i.quantity, 0)
  const itemSubtotal = cart.item_subtotal ?? cart.subtotal ?? 0
  const discount = cart.discount_total ?? 0
  const delivery = addr.city ? calcDeliveryCharge(addr.city, totalQty) : null
  const total = Math.max(0, itemSubtotal - discount) + (delivery ?? 0)

  const money = (amount: number) =>
    convertToLocale({ amount, currency_code: currency })

  const setField = (k: keyof AddressState, v: string) =>
    setAddr((p) => ({ ...p, [k]: v }))

  const changeQty = async (lineId: string, quantity: number) => {
    if (quantity < 1) return
    setPendingLine(lineId)
    try {
      await updateLineItem({ lineId, quantity })
      router.refresh()
    } catch (e: any) {
      setError(e?.message || "Could not update quantity.")
    } finally {
      setPendingLine(null)
    }
  }

  const removeLine = async (lineId: string) => {
    setPendingLine(lineId)
    try {
      await deleteLineItem(lineId)
      router.refresh()
    } catch (e: any) {
      setError(e?.message || "Could not remove item.")
    } finally {
      setPendingLine(null)
    }
  }

  const missing =
    !addr.first_name.trim() ||
    !addr.phone.trim() ||
    !email.trim() ||
    !addr.address_1.trim() ||
    !addr.city.trim()

  const canPlace =
    !submitting &&
    !missing &&
    !!payment &&
    terms &&
    !!standardOption &&
    items.length > 0

  const handlePlaceOrder = async () => {
    setError(null)

    if (missing) return setError("Please fill in all required fields.")
    if (!payment) return setError("Please choose a payment method.")
    if (!terms) return setError("Please accept the terms and conditions.")
    if (!standardOption)
      return setError("Delivery isn't available right now — please contact us.")
    if (!items.length) return setError("Your cart is empty.")

    setSubmitting(true)
    try {
      const address = {
        first_name: addr.first_name.trim(),
        last_name: addr.last_name.trim(),
        address_1: addr.address_1.trim(),
        address_2: "",
        company: "",
        postal_code: addr.postal_code.trim(),
        city: addr.city,
        country_code: countryCode,
        province: "",
        phone: addr.phone.trim(),
      }

      // 1. Save address, email and note onto the cart.
      await updateCart({
        email: email.trim(),
        shipping_address: address,
        billing_address: address,
        ...(notes.trim()
          ? { metadata: { ...(cart.metadata ?? {}), customer_note: notes.trim() } }
          : {}),
      } as HttpTypes.StoreUpdateCart)

      // 2. Apply the single Standard Delivery option (calculated: district + quantity).
      await setShippingMethod({
        cartId: cart.id,
        shippingMethodId: standardOption.id,
      })

      // 3. Start the payment session for the chosen method.
      const resp = await initiatePaymentSession(cart, {
        provider_id: payment,
        ...(isRedirectProvider(payment)
          ? { data: { cart_id: cart.id, country_code: countryCode } }
          : {}),
      } as any)

      // 4. Complete.
      if (isRedirectProvider(payment)) {
        const session = (resp as any)?.payment_collection?.payment_sessions?.find(
          (s: any) => s.provider_id === payment
        )
        const url = session?.data?.redirect_url as string | undefined
        if (!url) {
          setSubmitting(false)
          return setError("Could not start online payment. Please try again.")
        }
        window.location.href = url
        return
      }

      // Cash on delivery (manual): placeOrder redirects to the confirmation page on success.
      await placeOrder().catch((e: any) => {
        setError(e?.message || "Could not place the order. Please try again.")
        setSubmitting(false)
      })
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.")
      setSubmitting(false)
    }
  }

  if (!items.length) {
    return (
      <div className="content-container py-16 text-center">
        <p className="text-ui-fg-subtle">
          Your cart is empty.{" "}
          <LocalizedClientLink href="/store" className="underline font-medium">
            Continue shopping
          </LocalizedClientLink>
        </p>
      </div>
    )
  }

  return (
    <div className="content-container py-8">
      <h1 className="text-2xl font-bold mb-6 text-[var(--brand-text)]">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] xlarge:grid-cols-[minmax(0,1fr)_440px] gap-6 items-start">
        {/* LEFT — order review + address */}
        <div className="flex flex-col gap-6">
          {/* Order review */}
          <SectionCard
            title="Order review"
            icon={<BagIcon />}
            right={
              <LocalizedClientLink
                href="/cart"
                className="ml-auto flex items-center gap-1 text-sm font-semibold text-[var(--brand-primary)] hover:opacity-80"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Back to cart
              </LocalizedClientLink>
            }
          >
            <div className="flex flex-col divide-y divide-ui-border-base">
              {items
                .slice()
                .sort((a, b) =>
                  (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                )
                .map((item) => {
                  const busy = pendingLine === item.id
                  return (
                    <div
                      key={item.id}
                      className={clx(
                        "flex items-center gap-3 py-3 first:pt-0",
                        busy && "opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-ui-border-base">
                        <Thumbnail
                          thumbnail={item.thumbnail}
                          images={item.variant?.product?.images}
                          size="square"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ui-fg-base line-clamp-2">
                          {item.title}
                        </p>
                        <LineItemOptions variant={item.variant} />
                      </div>
                      <div className="flex items-center rounded-lg border border-ui-border-base overflow-hidden">
                        <button
                          type="button"
                          onClick={() => changeQty(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || busy}
                          className="w-8 h-8 flex items-center justify-center text-lg disabled:opacity-40 hover:bg-ui-bg-subtle"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-9 h-8 flex items-center justify-center text-sm font-semibold border-x border-ui-border-base">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(item.id, item.quantity + 1)}
                          disabled={busy}
                          className="w-8 h-8 flex items-center justify-center text-lg disabled:opacity-40 hover:bg-ui-bg-subtle"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <div className="w-24 text-right text-sm font-semibold shrink-0">
                        {money((item.unit_price ?? 0) * item.quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(item.id)}
                        disabled={busy}
                        className="text-ui-tag-red-text hover:opacity-80 shrink-0"
                        aria-label="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
            </div>
          </SectionCard>

          {/* Shipping address */}
          <SectionCard title="Shipping address" icon={<PinIcon />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="First name" required value={addr.first_name} onChange={(v) => setField("first_name", v)} />
              <Field label="Last name" value={addr.last_name} onChange={(v) => setField("last_name", v)} />
              <div className="sm:col-span-2">
                <Field label="Phone" required type="tel" value={addr.phone} onChange={(v) => setField("phone", v)} placeholder="01XXXXXXXXX" />
              </div>
              <div className="sm:col-span-2">
                <Field label="Email" required type="email" value={email} onChange={setEmail} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Full address" required value={addr.address_1} onChange={(v) => setField("address_1", v)} placeholder="House, road, area" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
                  District <span className="text-ui-tag-red-text">*</span>
                </label>
                <CitySelect
                  name="shipping_address.city"
                  value={addr.city}
                  onChange={(e) => setField("city", e.target.value)}
                  required
                />
              </div>
              <Field label="Postal code" value={addr.postal_code} onChange={(v) => setField("postal_code", v)} />
            </div>
          </SectionCard>
        </div>

        {/* RIGHT — payment, coupon, totals, notes, terms, place order */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-24">
          {/* Payment method */}
          <SectionCard title="Payment method" icon={<CardIcon />}>
            <div className="grid grid-cols-1 gap-2.5">
              {supportedMethods.map((m) => {
                const info = paymentInfoMap[m.id]
                const selected = payment === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayment(m.id)}
                    className={clx(
                      "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all",
                      selected
                        ? "border-[var(--brand-primary)] bg-[#fffdf5] ring-2 ring-[var(--brand-primary)]"
                        : "border-ui-border-base hover:border-ui-border-interactive hover:bg-ui-bg-subtle"
                    )}
                    aria-pressed={selected}
                  >
                    <span className="shrink-0">{info?.icon}</span>
                    <span className="text-sm font-medium flex-1">
                      {info?.title || m.id}
                    </span>
                    <span
                      className={clx(
                        "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                        selected
                          ? "border-[var(--brand-primary)]"
                          : "border-ui-border-strong"
                      )}
                    >
                      {selected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]" />
                      )}
                    </span>
                  </button>
                )
              })}
              {supportedMethods.length === 0 && (
                <p className="text-sm text-ui-fg-muted">
                  No payment method available. Please contact us.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Promo — deliberately prominent */}
          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-white">
                <TagIcon />
              </span>
              <div>
                <p className="text-sm font-bold text-amber-900">Have a promo code?</p>
                <p className="text-xs text-amber-700">Apply it to save on your order.</p>
              </div>
            </div>
            <DiscountCode cart={cart} />
          </div>

          {/* Totals */}
          <SectionCard title="Order summary" icon={<ReceiptIcon />}>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Sub total" value={money(itemSubtotal)} />
              {discount > 0 && (
                <Row label="Discount" value={`− ${money(discount)}`} accent />
              )}
              <Row
                label="Delivery cost"
                value={delivery === null ? "Select district" : money(delivery)}
                muted={delivery === null}
              />
              {addr.city && (
                <p className="text-xs text-ui-fg-muted -mt-1">
                  {isDhakaCity(addr.city) ? "Inside Dhaka" : "Outside Dhaka"} ·{" "}
                  {totalQty} item{totalQty === 1 ? "" : "s"}
                </p>
              )}
              <div className="border-t border-ui-border-base mt-2 pt-3 flex items-center justify-between">
                <span className="font-semibold text-base">Total</span>
                <span className="font-bold text-lg text-[var(--brand-primary)]">
                  {money(total)}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Special notes — sleek + colored */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-sky-900 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-white">
                <NoteIcon />
              </span>
              Special notes
              <span className="text-sky-500 font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 90))}
              rows={2}
              maxLength={90}
              placeholder="Any delivery instructions?"
              className="w-full rounded-xl border border-sky-200 bg-white p-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 resize-none"
            />
            <p className="text-xs text-sky-600 text-right mt-1">
              {notes.length} / 90 characters
            </p>
          </div>

          {/* Terms + place order */}
          <div className="flex flex-col gap-3 rounded-2xl border border-ui-border-base bg-white p-5 shadow-sm">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 accent-[var(--brand-primary)] w-4 h-4"
              />
              <span className="text-ui-fg-subtle">
                I have read and agree to the {brand.storeName} Terms &amp;
                Conditions, Privacy Policy &amp; Return Policy.
              </span>
            </label>

            {error && (
              <p className="text-sm text-ui-tag-red-text bg-ui-tag-red-bg rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              size="large"
              className="w-full !bg-[var(--brand-primary)] !text-gray-900 hover:!opacity-90"
              onClick={handlePlaceOrder}
              isLoading={submitting}
              disabled={!canPlace}
              data-testid="place-order-button"
            >
              Place order · {money(total)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Section shell ───────────────────────────────────────────────────────── */

function SectionCard({
  title,
  icon,
  right,
  children,
}: {
  title: string
  icon: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-ui-border-base bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand-primary)]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--brand-primary) 15%, white)",
          }}
        >
          {icon}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
        {label} {required && <span className="text-ui-tag-red-text">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ui-border-base bg-ui-bg-subtle px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
      />
    </div>
  )
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string
  value: string
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ui-fg-subtle">{label}</span>
      <span
        className={clx(
          "font-medium",
          accent && "text-ui-tag-green-text",
          muted && "text-ui-fg-muted font-normal"
        )}
      >
        {value}
      </span>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

const BagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
)
const PinIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const CardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path strokeLinecap="round" d="M3 10h18" />
  </svg>
)
const ReceiptIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h4M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3z" />
  </svg>
)
const TagIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
  </svg>
)
const NoteIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

export default CheckoutFlat
