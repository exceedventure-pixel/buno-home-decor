import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  ValidateFulfillmentDataContext,
} from "@medusajs/types"

import { calcDeliveryCharge } from "../../lib/shipping/delivery-pricing"

type InjectedDependencies = {
  logger?: { info: (...a: any[]) => void; warn: (...a: any[]) => void; error: (...a: any[]) => void }
}

/**
 * StandardDeliveryProvider — a pricing-only fulfillment provider for Buno's single "Standard
 * Delivery" option.
 *
 * Its whole job is `calculatePrice`: the charge is derived from the cart's district (Dhaka vs
 * elsewhere) and total quantity. Everything to do with actually shipping the parcel is a DELIBERATE
 * no-op — `createFulfillment` returns empty data, exactly like the manual provider — so dispatch,
 * courier booking ("Send to Steadfast") and the actual-charge entry all stay the manual Order
 * Processing steps they are today. This provider never books a courier on its own.
 */
export class StandardDeliveryProvider extends AbstractFulfillmentProviderService {
  static identifier = "delivery"

  protected logger_: InjectedDependencies["logger"]

  constructor({ logger }: InjectedDependencies, _options: Record<string, unknown>) {
    super()
    this.logger_ = logger
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [{ id: "standard-delivery", name: "Standard Delivery" }]
  }

  async validateOption(_data: Record<string, unknown>): Promise<boolean> {
    return true
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    return data
  }

  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    // Yes — the price is computed per cart from district + quantity.
    return true
  }

  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const city = context?.shipping_address?.city
    const items = (context?.items ?? []) as Array<{ quantity?: number }>
    const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)

    const amount = calcDeliveryCharge(city, totalQty)

    return {
      calculated_amount: amount,
      // Delivery is charged on top; no tax folded into this number.
      is_calculated_price_tax_inclusive: false,
    }
  }

  async createFulfillment(
    _data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    _order: Partial<FulfillmentOrderDTO> | undefined,
    _fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    // No-op on purpose — courier booking is a manual Order Processing action, not something this
    // pricing provider should trigger. Mirrors the manual provider's behaviour.
    return { data: {}, labels: [] }
  }

  async cancelFulfillment(_data: Record<string, unknown>): Promise<void> {
    // Nothing to cancel — this provider never books anything.
  }

  async createReturnFulfillment(_fulfillment: Record<string, unknown>): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  async getFulfillmentDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async getReturnDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async getShipmentDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async retrieveDocuments(_fulfillmentData: Record<string, unknown>, _documentType: string): Promise<void> {
    // No document retrieval supported.
  }
}

// Medusa fulfillment module provider export format.
export default {
  services: [StandardDeliveryProvider],
}
