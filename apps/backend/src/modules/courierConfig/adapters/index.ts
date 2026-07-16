import type { CourierAdapter } from "./interface"
import { steadfastAdapter } from "./steadfast"
import { redxAdapter } from "./redx"
import { pathaoAdapter } from "./pathao"

/**
 * The one registry of courier adapters, keyed by the courier_id stored on courier_config.
 * Booking, the fulfilment subscriber, and the status-sync job all resolve adapters through here
 * so a new courier is wired up in exactly one place.
 */
export const ADAPTER_MAP: Record<string, CourierAdapter> = {
  steadfast: steadfastAdapter,
  redx: redxAdapter,
  pathao: pathaoAdapter,
}

export function getCourierAdapter(courierId: string): CourierAdapter | undefined {
  return ADAPTER_MAP[courierId]
}
