import { retrieveOrder, retrieveOrderTracking } from "@lib/data/orders"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}
export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "You purchase was successful",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  // Courier delivery status, if this order has been booked with a courier. Null (renders nothing)
  // for manual shipments or orders not yet booked — which is every order right at checkout.
  const tracking = await retrieveOrderTracking(params.id).catch(() => null)

  return <OrderCompletedTemplate order={order} tracking={tracking} />
}
