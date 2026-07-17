import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, Prompt, Text, toast } from "@medusajs/ui"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

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
  order_status: string
  units_out: number
  restock_lines: { title: string; qty: number }[]
  default_restock: boolean
  captured: number
  courier: { courier_id: string | null; consignment_id: string } | null
  confirm_phrase: string
}

const money = (n: number) => `৳${(Number(n) || 0).toLocaleString()}`

function OrderDeleteWidget({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) {
  const orderId = (order as any).id
  const { can, isLoading: permsLoading } = usePermissions()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<"confirm" | "type">("confirm")
  const [typed, setTyped] = useState("")
  // Whether to put the shipped units back on the shelf. Seeded from the server's smart default
  // (delivered → gone; otherwise → put back) once the pre-check loads.
  const [restock, setRestock] = useState(true)

  const allowed = can("orders", "delete-order")

  const { data: precheck } = useQuery<Precheck>({
    queryKey: ["order-delete-precheck", orderId],
    queryFn: () => rbacFetch<Precheck>(`/orders/${orderId}/delete-order`),
    enabled: allowed && open,
  })

  useEffect(() => {
    if (precheck) setRestock(precheck.default_restock)
  }, [precheck?.order_id, precheck?.default_restock]) // eslint-disable-line react-hooks/exhaustive-deps

  const del = useMutation({
    mutationFn: () =>
      rbacFetch(`/orders/${orderId}/delete-order`, {
        method: "POST",
        body: JSON.stringify({ confirm: typed.trim().toLowerCase(), restock }),
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

  const unitsOut = precheck?.units_out ?? 0

  const phraseOk = typed.trim().toLowerCase() === CONFIRM_PHRASE

  return (
    <Container className="flex flex-col gap-y-3 px-6 py-6">
      <div>
        <Heading level="h2">Delete order</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Removes this order from every report and from your books. Use it for an order that
          should never have existed — you choose whether shipped stock goes back on the shelf; it
          does not refund the customer.
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

              <div className="flex flex-col gap-y-3 px-6 pb-2">
                {/* The stock decision — only when units are actually out because of this order. */}
                {unitsOut > 0 && (
                  <div className="flex flex-col gap-y-2 rounded-lg border border-ui-border-base p-3">
                    <Text size="small" weight="plus">
                      {unitsOut} unit(s) are out of stock for this order
                    </Text>
                    {!!precheck?.restock_lines?.length && (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {precheck.restock_lines.map((l) => `${l.qty}× ${l.title}`).join(" · ")}
                      </Text>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setRestock(true)}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${
                          restock
                            ? "border-ui-fg-base bg-ui-bg-base"
                            : "border-ui-border-base bg-ui-bg-subtle"
                        }`}
                      >
                        <Text size="small" weight="plus">Put back in stock</Text>
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          We still have the goods (not really shipped / came back).
                        </Text>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRestock(false)}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${
                          !restock
                            ? "border-ui-fg-base bg-ui-bg-base"
                            : "border-ui-border-base bg-ui-bg-subtle"
                        }`}
                      >
                        <Text size="small" weight="plus">Don't restock</Text>
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          They shipped and are gone (with the customer / lost).
                        </Text>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cash + courier are settled by hand — surfaced, not automated. */}
                {(precheck?.captured ?? 0) > 0 && (
                  <div className="rounded-lg border border-ui-tag-orange-border bg-ui-tag-orange-bg p-2.5">
                    <Text size="xsmall" className="text-ui-tag-orange-text">
                      {money(precheck!.captured)} was collected — deleting removes it from the books.
                      Refund the customer separately if needed.
                    </Text>
                  </div>
                )}
                {precheck?.courier && (
                  <div className="rounded-lg border border-ui-tag-orange-border bg-ui-tag-orange-bg p-2.5">
                    <Text size="xsmall" className="text-ui-tag-orange-text">
                      Booked with {precheck.courier.courier_id ?? "a courier"} (consignment{" "}
                      {precheck.courier.consignment_id}) — cancel that parcel in their portal too.
                    </Text>
                  </div>
                )}
              </div>

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
                  {unitsOut > 0 &&
                    (restock
                      ? ` ${unitsOut} unit(s) go back on the shelf.`
                      : ` ${unitsOut} unit(s) stay out (not restocked).`)}
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
