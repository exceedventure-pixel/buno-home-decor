import { useQuery } from "@tanstack/react-query"

import { adminFetch } from "./api"

export type SystemMode = "basic" | "advanced"

export type RollCounts = {
  orders: number
  ledger_rows: number
  batches: number
  suppliers: number
  customers: number
}

/**
 * WHICH SHAPE OF THE SYSTEM THIS STORE RUNS — the admin's single source for gating UI.
 *
 *   basic    — default Medusa stock, one cost price per variant, no Cash Book or FIFO.
 *   advanced — accounting, FIFO batches, restocking, suppliers.
 *
 * `isAdvanced` defaults to TRUE while loading, so the accounting-heavy screens don't flash their
 * "turned off" state on every page load before the answer arrives.
 */
export function useSystemMode() {
  const { data, isLoading } = useQuery<{ mode: SystemMode; counts: RollCounts }>({
    queryKey: ["system-mode"],
    queryFn: () => adminFetch("/system-mode"),
    staleTime: 60000,
  })

  return {
    mode: data?.mode,
    counts: data?.counts,
    isLoading,
    isAdvanced: data?.mode ? data.mode === "advanced" : true,
    isBasic: data?.mode === "basic",
  }
}
