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
import Thumbnail from "@modules/products/components/thumbnail"
import brand from "brand.config"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"

/**
 * Single-page ("flat") checkout — everything on one screen, one Place Order button, no step hops.
 *
 * Left column: order review (editable) + shipping address.
 * Right column: payment method, coupon, totals (with live delivery cost), notes, terms, Place Order.
 *
 * Supported payment methods here are Cash on Delivery (manual) and the redirect gateways
 * (SSLCommerz / bKash). Card/Stripe is intentionally not offered on this flat page — it needs an
 * inline card element + Elements context, which is a separate follow-up.
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

  // Cash on delivery selected by default — the common case for this store.
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

      // 2. Apply the single Standard Delivery option (its calculated price = district + quantity).
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
          <a href={`/${countryCode}/store`} className="underline font-medium">
            Continue shopping
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="content-container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* LEFT — order review + address */}
        <div className="flex flex-col gap-6">
          {/* Order review */}
          <section className="rounded-xl border border-ui-border-base bg-white p-5">
            <h2 className="text-lg font-semibold mb-4 border-l-4 border-[var(--brand-primary)] pl-2">
              Order review
            </h2>
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
                        "flex items-center gap-3 py-3",
                        busy && "opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="w-16 h-16 shrink-0">
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
                      {/* Qty stepper */}
                      <div className="flex items-center border border-ui-border-base rounded-lg overflow-hidden">
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
                        className="text-ui-tag-red-text hover:text-ui-tag-red-text/80 shrink-0"
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
          </section>

          {/* Shipping address */}
          <section className="rounded-xl border border-ui-border-base bg-white p-5">
            <h2 className="text-lg font-semibold mb-4 border-l-4 border-[var(--brand-primary)] pl-2">
              Shipping address
            </h2>
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
          </section>
        </div>

        {/* RIGHT — payment, coupon, totals, notes, terms, place order */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          {/* Payment method */}
          <section className="rounded-xl border border-ui-border-base bg-white p-5">
            <h2 className="text-lg font-semibold mb-4 border-l-4 border-[var(--brand-primary)] pl-2">
              Payment method
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {supportedMethods.map((m) => {
                const info = paymentInfoMap[m.id]
                const selected = payment === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayment(m.id)}
                    className={clx(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                      selected
                        ? "border-[var(--brand-primary)] bg-[#fffdf5] ring-2 ring-[var(--brand-primary)]/40"
                        : "border-ui-border-base hover:border-ui-border-interactive"
                    )}
                    aria-pressed={selected}
                  >
                    <span className="shrink-0">{info?.icon}</span>
                    <span className="text-sm font-medium flex-1">
                      {info?.title || m.id}
                    </span>
                    <span
                      className={clx(
                        "w-4 h-4 rounded-full border-2 shrink-0",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                          : "border-ui-border-strong"
                      )}
                    />
                  </button>
                )
              })}
              {supportedMethods.length === 0 && (
                <p className="text-sm text-ui-fg-muted">
                  No payment method available. Please contact us.
                </p>
              )}
            </div>
          </section>

          {/* Coupon */}
          <section className="rounded-xl border border-ui-border-base bg-white p-5">
            <DiscountCode cart={cart} />
          </section>

          {/* Totals */}
          <section className="rounded-xl border border-ui-border-base bg-white p-5">
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
              <div className="border-t border-ui-border-base mt-2 pt-2 flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-base">{money(total)}</span>
              </div>
            </div>
          </section>

          {/* Special notes */}
          <section className="rounded-xl border border-ui-border-base bg-white p-5">
            <label className="block text-sm font-semibold mb-2">
              Special notes <span className="text-ui-fg-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 90))}
              rows={2}
              maxLength={90}
              placeholder="Any delivery instructions?"
              className="w-full rounded-lg border border-ui-border-base p-2.5 text-sm outline-none focus:border-ui-border-interactive resize-none"
            />
            <p className="text-xs text-ui-fg-muted text-right mt-1">
              {notes.length} / 90 characters
            </p>
          </section>

          {/* Terms + place order */}
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 accent-[var(--brand-primary)]"
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
              className="w-full"
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
        className="w-full rounded-lg border border-ui-border-base bg-ui-bg-subtle px-3 py-2.5 text-sm outline-none focus:border-ui-border-interactive"
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

export default CheckoutFlat
