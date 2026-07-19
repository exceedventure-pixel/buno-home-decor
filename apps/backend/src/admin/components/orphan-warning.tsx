import { Button, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { adminFetch } from "../lib/api"
import { money } from "../lib/kpi"

type Orphans = {
  ledger_rows: number
  ledger_amount: number
  workflows: number
  status_events: number
}

/**
 * DELETED ORDERS THAT ARE STILL BEING COUNTED.
 *
 * Everything derived from live orders corrects itself the moment one is deleted, but its Cash Book
 * rows (courier fee, production cost) are real ledger entries that it OWNS — strand one and the
 * P&L keeps charging for an order nobody can open. That's silent and wrong, so it gets a banner
 * rather than a quiet number, and one button to clear it.
 */
export function OrphanWarning() {
  const qc = useQueryClient()

  const { data } = useQuery<Orphans & { success: boolean }>({
    queryKey: ["accounting", "orphans"],
    queryFn: () => adminFetch("/accounting/purge-orphans"),
    refetchOnWindowFocus: true,
  })

  const purge = useMutation({
    mutationFn: () =>
      adminFetch<{ success: boolean; message?: string } & Orphans>(
        "/accounting/purge-orphans",
        { method: "POST" }
      ),
    onSuccess: (r) => {
      if (!r.success) {
        toast.error(r.message || "Cleanup failed")
        return
      }
      toast.success(
        `Removed ${r.ledger_rows} Cash Book row(s) worth ${money(r.ledger_amount, "bdt")} from deleted orders`
      )
      // The books just changed — refetch every accounting figure and the queue.
      qc.invalidateQueries({ queryKey: ["accounting"] })
      qc.invalidateQueries({ queryKey: ["order-processing"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rows = data?.ledger_rows ?? 0
  const others = (data?.workflows ?? 0) + (data?.status_events ?? 0)
  if (rows === 0 && others === 0) return null

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ui-tag-orange-border bg-ui-tag-orange-bg p-3">
      <div className="flex flex-col">
        <Text size="small" weight="plus" className="text-ui-tag-orange-text">
          Deleted orders are still being counted
        </Text>
        <Text size="xsmall" className="text-ui-tag-orange-text">
          {rows > 0
            ? `${rows} Cash Book row(s) worth ${money(data?.ledger_amount ?? 0, "bdt")} belong to orders that no longer exist — they're still in your expenses and P&L.`
            : `${others} leftover record(s) belong to orders that no longer exist.`}
        </Text>
      </div>
      <Button
        size="small"
        variant="secondary"
        disabled={purge.isPending}
        onClick={() => purge.mutate()}
      >
        {purge.isPending ? "Removing…" : "Remove them"}
      </Button>
    </div>
  )
}
