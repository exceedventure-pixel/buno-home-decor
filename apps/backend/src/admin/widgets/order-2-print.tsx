import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"

import { printOrder, type PrintMode } from "../lib/print"

/**
 * Print an order's documents.
 *
 * The templates themselves live in lib/print.ts, because the order-processing queue prints the
 * same documents — keeping one copy is what stops the invoice on the order page and the invoice
 * from the queue quietly diverging.
 */
const OrderInvoiceWidget = ({ data: order }: { data: { id: string } }) => {
  const [busy, setBusy] = useState(false)

  const print = async (mode: PrintMode) => {
    setBusy(true)
    try {
      await printOrder(order.id, mode)
    } catch (e: any) {
      toast.error(e?.message || "Failed to build the document")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="px-6 py-4 flex flex-col gap-y-3">
      <Heading level="h2">Print</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        Branded invoice, a packing slip, the combined A4 (invoice on top, packing slip below), or a
        small A6 packing slip for the parcel.
      </Text>
      <div className="flex flex-wrap gap-2">
        <Button size="small" disabled={busy} onClick={() => print("invoice")}>
          Invoice
        </Button>
        <Button size="small" variant="secondary" disabled={busy} onClick={() => print("packing")}>
          Packing slip
        </Button>
        <Button size="small" variant="secondary" disabled={busy} onClick={() => print("combined")}>
          Combined A4
        </Button>
        <Button size="small" variant="secondary" disabled={busy} onClick={() => print("a6")}>
          A6 Packing slip
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  // Sidebar top (above Medusa's Customer card), with the courier + processing widgets.
  zone: "order.details.side.before",
})

export default OrderInvoiceWidget
