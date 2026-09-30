import { Container, Heading, Text } from "@modules/common/components/ui"

import { isStripeLike, paymentInfoMap } from "@lib/constants"
import Divider from "@modules/common/components/divider"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0]?.payments?.[0]
  const paymentSession = (order.payment_collections?.[0] as any)?.payment_sessions?.[0]
  const providerId = payment?.provider_id || paymentSession?.provider_id || "pp_system_default"
  const isPaid = !!payment?.captured_at

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        Payment
      </Heading>
      <div>
        <div className="flex items-start gap-x-1 w-full">
          <div className="flex flex-col w-1/3">
            <Text className="txt-medium-plus text-ui-fg-base mb-1">
              Payment method
            </Text>
            <Text
              className="txt-medium text-ui-fg-subtle"
              data-testid="payment-method"
            >
              {paymentInfoMap[providerId]?.title ?? "Cash on Delivery (COD)"}
            </Text>
          </div>
          <div className="flex flex-col w-2/3">
            <Text className="txt-medium-plus text-ui-fg-base mb-1">
              Payment details
            </Text>
            <div className="flex gap-2 txt-medium text-ui-fg-subtle items-center">
              {paymentInfoMap[providerId]?.icon && (
                <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                  {paymentInfoMap[providerId]?.icon}
                </Container>
              )}
              <Text data-testid="payment-amount">
                {isStripeLike(providerId) && payment?.data?.card_last4
                  ? `**** **** **** ${payment.data.card_last4}`
                  : isPaid && payment?.created_at
                  ? `${convertToLocale({
                      amount: payment.amount ?? order.total ?? 0,
                      currency_code: order.currency_code,
                    })} paid at ${new Date(payment.created_at).toLocaleString()}`
                  : `To be paid upon delivery (${convertToLocale({
                      amount: order.total ?? 0,
                      currency_code: order.currency_code,
                    })})`}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <Divider className="mt-8" />
    </div>
  )
}

export default PaymentDetails
