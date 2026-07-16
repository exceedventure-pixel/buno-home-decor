import type { FulfillmentOrderDTO } from "@medusajs/types"

export type NormalizedStatus =
  | "pending"
  | "in_transit"
  | "delivered"
  | "returned"
  | "cancelled"
  | "unknown"

export type ParcelResult = {
  tracking_id: string
  consignment_id: string
  /**
   * The courier's own per-consignment delivery charge, IF its create response exposes one.
   * Left undefined when the courier doesn't return it — callers must not assume it's present.
   */
  delivery_charge?: number
  raw?: Record<string, unknown>
}

export type CreateParcelOptions = {
  /**
   * Exact amount to collect on delivery. When provided this is used verbatim and the adapter's
   * payment-status heuristic is bypassed — this is how the caller sends "remaining payable"
   * (order total minus any advance) rather than the full total. See order-economics `outstanding`.
   */
  cod_amount?: number
  /** Overrides the default parcel note/instruction. */
  note?: string
}

export interface CourierAdapter {
  createParcel(
    order: Partial<FulfillmentOrderDTO>,
    credentials: Record<string, string>,
    opts?: CreateParcelOptions
  ): Promise<ParcelResult>

  getStatus(
    consignment_id: string,
    credentials: Record<string, string>
  ): Promise<NormalizedStatus>

  cancelParcel?(
    consignment_id: string,
    credentials: Record<string, string>
  ): Promise<void>
}
