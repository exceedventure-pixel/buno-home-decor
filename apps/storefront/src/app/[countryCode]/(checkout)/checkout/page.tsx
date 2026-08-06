import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import InitiateCheckoutTracker from "@modules/checkout/components/initiate-checkout-tracker"
import CheckoutFlat from "@modules/checkout/templates/checkout-flat"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()
  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  const currency = cart.currency_code ?? "usd"
  const total = cart.total ?? 0
  const numItems = cart.items?.reduce((n, i) => n + (i.quantity ?? 0), 0) ?? 0

  return (
    <>
      <InitiateCheckoutTracker value={total} currency={currency} numItems={numItems} />
      <CheckoutFlat
        cart={cart}
        customer={customer}
        availableShippingMethods={shippingMethods}
        availablePaymentMethods={paymentMethods ?? []}
      />
    </>
  )
}
