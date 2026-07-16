import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, Prompt, Text, toast } from "@medusajs/ui"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { rbacFetch, usePermissions } from "../lib/permissions"

/**
 * Erase a mistaken order.
 *
 * Two gates before anything happens, because this cannot be undone from the UI:
 *   1. a confirmation that spells out exactly what will be erased (fetched from the server, so it
 *      names the real shipped units / captured cash rather than guessing);
 *   2. typing the phrase.
 *
 * ONE dialog drives both phases. An earlier version used two <Prompt>s toggled by a shared state,
 * but Prompt.Action auto-closes its dialog, whose onOpenChange then reset the state — so the
 * second dialog never opened. Here the phase advances with a PLAIN button that doesn't close the
 * dialog; only Cancel / Esc close it. The button only renders for someone holding the high-risk
 * `orders:delete-order` grant — UI gating only; the server enforces the permission and the phrase.
 */
const CONFIRM_PHRASE = "delete order"

type Precheck = {
  order_id: string
  display_id: number
  units_shipped: number
  captured: number
  warnings: string[]
}

function OrderDeleteWidget({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) {
  const orderId = (order as any).id
  const { can, isLoading: permsLoading } = usePermissions()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<"confirm" | "type">("confirm")
  const [typed, setTyped] = useState("")

  const allowed = can("orders", "delete-order")

  const { data: precheck } = useQuery<Precheck>({
    queryKey: ["order-delete-precheck", orderId],
    queryFn: () => rbacFetch<Precheck>(`/orders/${orderId}/delete-order`),
    enabled: allowed && open,
  })

  const del = useMutation({
    mutationFn: () =>
      rbacFetch(`/orders/${orderId}/delete-order`, {
        method: "POST",
        body: JSON.stringify({ confirm: typed.trim().toLowerCase() }),
      }),
    onSuccess: () => {
      toast.success("Order deleted")
      // It no longer exists — there is nothing left on this page to show.
      window.location.href = "/app/orders"
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (permsLoading || !allowed) return null

  const openFlow = () => {
    setPhase("confirm")
    setTyped("")
    setOpen(true)
  }

  const phraseOk = typed.trim().toLowerCase() === CONFIRM_PHRASE

  return (
    <Container className="flex flex-col gap-y-3 px-6 py-6">
      <div>
        <Heading level="h2">Delete order</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Removes this order from every report and from your books. Use it for an order that
          should never have existed — it does not reverse a real shipment or refund a customer.
        </Text>
      </div>

      <div className="flex justify-end">
        <Button size="small" variant="danger" onClick={openFlow}>
          Delete this order
        </Button>
      </div>

      <Prompt open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <Prompt.Content>
          {phase === "confirm" ? (
            <>
              <Prompt.Header>
                <Prompt.Title>Delete order #{precheck?.display_id ?? ""}?</Prompt.Title>
                <Prompt.Description>
                  This erases the order from Sales Insights, the Accounting dashboard and the Cash
                  Book. It cannot be undone from here.
                </Prompt.Description>
              </Prompt.Header>

              {!!precheck?.warnings?.length && (
                <div className="flex flex-col gap-y-2 px-6 pb-2">
                  {precheck.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-ui-tag-red-border bg-ui-tag-red-bg p-2.5"
                    >
                      <Text size="xsmall" className="text-ui-tag-red-text">
                        {w}
                      </Text>
                    </div>
                  ))}
                </div>
              )}

              <Prompt.Footer>
                <Prompt.Cancel>Cancel</Prompt.Cancel>
                {/* Plain button — must NOT close the dialog, just advance the phase. */}
                <Button size="small" variant="danger" onClick={() => setPhase("type")}>
                  Continue
                </Button>
              </Prompt.Footer>
            </>
          ) : (
            <>
              <Prompt.Header>
                <Prompt.Title>Type “{CONFIRM_PHRASE}” to confirm</Prompt.Title>
                <Prompt.Description>
                  Order #{precheck?.display_id ?? ""} will be erased from your books.
                </Prompt.Description>
              </Prompt.Header>

              <div className="flex flex-col gap-y-2 px-6 pb-2">
                <Label size="small">Confirmation</Label>
                <Input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && phraseOk && !del.isPending) del.mutate()
                  }}
                />
              </div>

              <Prompt.Footer>
                <Prompt.Cancel>Cancel</Prompt.Cancel>
                <Button
                  size="small"
                  variant="danger"
                  disabled={!phraseOk || del.isPending}
                  onClick={() => phraseOk && del.mutate()}
                >
                  {del.isPending ? "Deleting…" : "Delete permanently"}
                </Button>
              </Prompt.Footer>
            </>
          )}
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderDeleteWidget
