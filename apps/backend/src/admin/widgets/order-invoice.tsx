import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"

async function adminFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token =
    localStorage.getItem("_medusa_auth_token") ||
    localStorage.getItem("medusa_auth_token") ||
    ""
  const res = await fetch(`/admin${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string)
  )

function money(n: number, cur: string): string {
  const sym = cur.toLowerCase() === "bdt" ? "৳" : `${cur.toUpperCase()} `
  return `${sym}${(Number(n) || 0).toLocaleString()}`
}

/**
 * FIXED BRAND ASSETS — the store name, tagline and logo. These are baked in (the storefront's own
 * brand.config); only email / phone / address are editable in admin, and those come from settings.
 * The logo is inlined so the print is self-contained and vector-sharp with no network fetch.
 */
const BRAND = {
  name: "BUNO HOME DECOR",
  tagline: "Quality crafted wooden products, delivered fast.",
  accent: "#fdc904",
  logo: `<svg viewBox="0 0 589.14 368.8" xmlns="http://www.w3.org/2000/svg" style="height:100%;width:auto;display:block"><path fill="#fdc904" d="M142.36,67.49L19.37,162.94c-4.38,3.4-5.18,9.69-1.79,14.08l122.99,159.1c5.86,7.58,17.99,3.43,17.99-6.14V75.42c0-8.35-9.6-13.06-16.2-7.93Z"/><path d="M176.57,271.12L19.09,130.19c-6.95-6.22-2.96-13.11,4.34-17.31L176.77,24.59c3.87-2.23,10.67-3.17,14.02-2.26,4.55,1.23,10.01,5.92,10.01,10.21v229.91c0,4.08-4.07,8.88-7.35,10.36-3.28,1.48-13.12,1.67-16.89-1.69ZM171.53,232.09l.42-177.13L50.64,124.79l120.89,107.3Z"/><circle fill="#fdc904" cx="377.54" cy="165.57" r="80.52"/><path d="M500.21,339.58l-28.69-.24h-.02l-.15-91.48-.1-61.13c-.05-27.79-18.26-49.82-41.58-57.99-6.35-2.24-13.11-3.45-19.96-3.45-33.39-.05-60.3,26.58-61.54,59.4-1.26,33.7,24.95,62.81,60.86,63.73l.12,28.42c-42.33-.02-75.62-28.33-86.64-65.51-11.65-39.39,5.98-79.95,39.08-101.2,20.98-13.5,45.23-16.85,68.08-11.31,14.91,3.6,29.2,10.97,41.68,21.76V31.36l.02-18.94,28.81-.07.02,327.24Z"/><path d="M327.68,11.84h-42.27c-39.15,46.71-60.65,107.59-60.65,172.09,0,57.09,16.82,111.31,47.83,155.4h38.86c-34.66-39.85-56.12-94.82-56.12-155.4,0-69.57,28.28-131.7,72.36-172.09Z"/><polygon points="564.49 12.83 564.49 339.14 535.99 339.41 535.99 322.02 536.09 159.66 535.99 159.54 535.99 47.13 536.16 12.34 564.49 12.83"/><path d="M104.22,317.45c1.03,2.82,5.79,11.16,8.12,9.59l12.17-8.18,9.69,15.71-32.17,22.38-28.78-49.43c20.99-20.64,53.24-30.73,81.79-24.96,29.62,5.99,52.58,26.95,65.79,56.14l-20.44,16.53c-9.52-13.8-16.2-23.58-25.36-34.78-18.48-22.59-51.27-22.56-70.81-2.99Z"/></svg>`,
}

type Store = { address: string; email: string; phone: string }
type Econ = {
  captured: number
  outstanding: number
  payment_status: string
  total: number
  // Courier shipment, when the order was booked with one (Steadfast etc.). Null for manual.
  consignment_id?: string | null
  courier_id?: string | null
} | null

const custName = (o: any) => {
  const a = o.shipping_address || {}
  return [a.first_name, a.last_name].filter(Boolean).join(" ") || o.email || "Customer"
}
const custAddr = (o: any) => {
  const a = o.shipping_address || {}
  return [a.address_1, a.address_2, a.city, a.postal_code, (a.country_code || "").toUpperCase()]
    .filter(Boolean)
    .join(", ")
}

/** The store's "from" contact line for documents — the invoice contact, not the storefront one. */
function fromLine(store: Store): string {
  return [store.phone && `Phone ${store.phone}`, store.email]
    .filter(Boolean)
    .map(esc)
    .join(" · ")
}

/** Branded masthead shared by every document. */
function masthead(store: Store, docLabel: string, order: any): string {
  const cur = order.currency_code || "bdt"
  return `<div class="mast">
    <div class="brand">
      <div class="logo">${BRAND.logo}</div>
      <div>
        <div class="bname">${esc(BRAND.name)}</div>
        <div class="tag">${esc(BRAND.tagline)}</div>
        <div class="contact">${[store.address, fromLine(store)].filter(Boolean).map(esc).join(" — ")}</div>
      </div>
    </div>
    <div class="docmeta">
      <div class="doclabel">${esc(docLabel)}</div>
      <div class="ord">#${esc(order.display_id)}</div>
      <div class="date">${new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
      ${cur ? "" : ""}
    </div>
  </div>`
}

/** The payment / advance block — this is where an advance must be spelled out. */
function paymentBlock(order: any, econ: Econ): string {
  const cur = order.currency_code || "bdt"
  const total = Number(econ?.total ?? order.total) || 0
  const captured = Number(econ?.captured) || 0
  const outstanding = Number(econ?.outstanding ?? total) || 0
  const status = econ?.payment_status || ""

  if (status === "paid" || (captured > 0 && outstanding <= 0)) {
    return `<div class="pay paid"><span>Payment</span><span class="big">PAID IN FULL</span></div>`
  }
  if (captured > 0) {
    // Advance taken — say so, and make the remaining COD unmissable.
    return `<div class="pay">
      <div class="payrow"><span>Advance paid</span><span>${money(captured, cur)}</span></div>
      <div class="payrow due"><span>Amount due — Cash on Delivery</span><span class="big">${money(outstanding, cur)}</span></div>
    </div>`
  }
  return `<div class="pay"><div class="payrow due"><span>Cash on Delivery — collect</span><span class="big">${money(outstanding || total, cur)}</span></div></div>`
}

/** The INVOICE body (branded, priced, with the payment/advance block). `compact` = combined page. */
function invoiceBody(order: any, econ: Econ, store: Store, compact: boolean): string {
  const cur = order.currency_code || "bdt"
  const rows = (order.items || [])
    .map((it: any) => {
      const label = it.product_title
        ? it.product_title +
          (it.variant_title && it.variant_title !== "Default variant" ? " — " + it.variant_title : "")
        : it.title
      const qty = Number(it.quantity) || 0
      const price = Number(it.unit_price) || 0
      return `<tr><td>${esc(label)}</td><td class="num">${qty}</td><td class="num">${money(price, cur)}</td><td class="num">${money(price * qty, cur)}</td></tr>`
    })
    .join("")

  const itemTotal = Number(order.item_total ?? order.subtotal) || 0
  const shipping = Number(order.shipping_total) || 0
  const total = Number(order.total) || 0

  return `<section class="doc invoice ${compact ? "compact" : ""}">
    ${masthead(store, "Invoice", order)}
    <div class="ship">
      <div class="shipto">
        <div class="lbl">Bill / Deliver to</div>
        <div class="name">${esc(custName(order))}</div>
        <div>${esc((order.shipping_address || {}).phone || order.email || "")}</div>
        <div>${esc(custAddr(order))}</div>
      </div>
    </div>
    <table class="items">
      <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tail">
      <div class="totals">
        <div class="line"><span>Subtotal</span><span>${money(itemTotal, cur)}</span></div>
        <div class="line"><span>Delivery</span><span>${money(shipping, cur)}</span></div>
        <div class="line grand"><span>Total</span><span>${money(total, cur)}</span></div>
      </div>
      ${paymentBlock(order, econ)}
    </div>
    ${order.metadata?.manual_note ? `<div class="note">Note: ${esc(order.metadata.manual_note)}</div>` : ""}
    <div class="foot">Thank you for shopping with ${esc(BRAND.name)}!</div>
  </section>`
}

/** A professional PACKING SLIP: ship-to first, item checklist, COD to collect. No prices/subtotals. */
function packingBody(order: any, econ: Econ, store: Store, compact: boolean): string {
  const cur = order.currency_code || "bdt"
  const rows = (order.items || [])
    .map((it: any) => {
      const label = it.product_title
        ? it.product_title +
          (it.variant_title && it.variant_title !== "Default variant" ? " — " + it.variant_title : "")
        : it.title
      return `<tr><td class="chk">☐</td><td>${esc(label)}</td><td class="num">${Number(it.quantity) || 0}</td></tr>`
    })
    .join("")

  const cod = Number(econ?.outstanding ?? order.total) || 0
  const codLine =
    econ?.payment_status === "paid" || cod <= 0
      ? `<div class="cod paidcod"><span>Payment</span><b>PREPAID — collect nothing</b></div>`
      : `<div class="cod"><span>COD to collect</span><b>${money(cod, cur)}</b></div>`

  // Courier's parcel/order id — auto-filled from the courier booking (e.g. Steadfast's
  // consignment), left as a blank writable line for a manual shipment so it can be hand-written.
  const orderId = econ?.consignment_id ? esc(econ.consignment_id) : ""

  return `<section class="doc packing ${compact ? "compact" : ""}">
    ${masthead(store, "Packing Slip", order)}
    <div class="orderid">
      <span class="oid-lbl">Order ID</span>
      <span class="oid-val">${orderId}</span>
    </div>
    <div class="shipbig">
      <div class="lbl">Ship to</div>
      <div class="name">${esc(custName(order))}</div>
      <div class="ph">${esc((order.shipping_address || {}).phone || "")}</div>
      <div class="addr">${esc(custAddr(order))}</div>
    </div>
    ${codLine}
    <table class="items">
      <thead><tr><th class="chk"></th><th>Item</th><th class="num">Qty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="packfoot">
      <span>Packed by ____________</span>
      <span>Checked ____________</span>
    </div>
  </section>`
}

const STYLES = `
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:#111; font-size:12.5px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .doc { padding:14mm; }
  .mast { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:3px solid #111; padding-bottom:10px; }
  .brand { display:flex; gap:12px; align-items:center; }
  .logo { height:42px; }
  .bname { font-size:19px; font-weight:800; letter-spacing:.5px; }
  .tag { font-size:11px; color:#555; }
  .contact { font-size:10.5px; color:#666; margin-top:3px; max-width:340px; }
  .docmeta { text-align:right; white-space:nowrap; }
  .doclabel { display:inline-block; background:${BRAND.accent}; color:#111; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:1px; padding:3px 10px; border-radius:4px; }
  .ord { font-size:17px; font-weight:800; margin-top:6px; }
  .date { font-size:11px; color:#666; }
  .ship { margin-top:14px; }
  .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:#999; margin-bottom:3px; }
  .shipto .name, .shipbig .name { font-weight:700; font-size:14px; }
  .orderid { display:flex; align-items:flex-end; gap:10px; margin-top:14px; }
  .orderid .oid-lbl { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:#999; padding-bottom:3px; white-space:nowrap; }
  .orderid .oid-val { flex:1; border-bottom:1.5px solid #111; min-height:22px; font-family:ui-monospace, "SFMono-Regular", Menlo, monospace; font-weight:700; font-size:14px; padding:0 4px 3px; }
  .shipbig { margin-top:14px; border:1px solid #ddd; border-radius:8px; padding:12px 14px; background:#fafafa; }
  .shipbig .name { font-size:16px; }
  .shipbig .ph { font-size:13px; font-weight:600; }
  .shipbig .addr { margin-top:2px; font-size:13px; }
  table.items { width:100%; border-collapse:collapse; margin-top:14px; }
  table.items th, table.items td { text-align:left; padding:7px 8px; border-bottom:1px solid #e5e5e5; }
  table.items thead th { background:#f4f4f4; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#555; border-bottom:1.5px solid #ccc; }
  td.num, th.num { text-align:right; }
  td.chk, th.chk { width:22px; text-align:center; font-size:15px; color:#888; }
  .tail { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-top:14px; }
  .totals { margin-left:auto; width:250px; }
  .totals .line { display:flex; justify-content:space-between; padding:4px 0; }
  .totals .grand { border-top:1.5px solid #111; margin-top:3px; padding-top:6px; font-weight:800; font-size:14px; }
  .pay { min-width:230px; border:2px solid #111; border-radius:8px; padding:8px 12px; }
  .pay .payrow { display:flex; justify-content:space-between; padding:3px 0; }
  .pay .due { border-top:1px dashed #bbb; margin-top:3px; padding-top:6px; font-weight:700; }
  .pay.paid { display:flex; justify-content:space-between; align-items:center; border-color:#127a3d; color:#127a3d; }
  .big { font-size:16px; font-weight:800; }
  .cod { margin-top:12px; display:flex; justify-content:space-between; align-items:center; border:2px solid #111; border-radius:8px; padding:8px 14px; font-size:15px; }
  .cod b { font-size:18px; }
  .cod.paidcod { border-color:#127a3d; color:#127a3d; }
  .note { margin-top:12px; font-size:11px; color:#555; }
  .foot { margin-top:20px; text-align:center; color:#999; font-size:10.5px; }
  .packfoot { display:flex; justify-content:space-between; margin-top:22px; font-size:11px; color:#666; }

  /* Compact = used on the combined page where space is tight. */
  .doc.compact { padding:0; font-size:11px; }
  .doc.compact .logo { height:28px; }
  .doc.compact .bname { font-size:12px; }
  .doc.compact .tag { display:none; }
  .doc.compact .mast { padding-bottom:6px; border-bottom-width:2px; gap:6px; }
  /* The slip is only half the page wide, so shrink the doc badge + meta or the label clips. */
  .doc.compact .doclabel { font-size:8px; padding:2px 5px; letter-spacing:.3px; }
  .doc.compact .ord { font-size:12px; margin-top:2px; }
  .doc.compact .date { font-size:9px; }
  .doc.compact table.items th, .doc.compact table.items td { padding:4px 6px; }
  .doc.compact .foot { display:none; }
  .doc.compact .shipbig { padding:8px 10px; margin-top:8px; }
  .doc.compact .orderid { margin-top:8px; gap:6px; }
  .doc.compact .orderid .oid-val { min-height:18px; font-size:12px; }
  .doc.compact .ship { margin-top:8px; }
`

/** Full-page single document (Invoice OR Packing slip) on its own A4. */
function singleDoc(order: any, econ: Econ, store: Store, mode: "invoice" | "packing"): string {
  const body = mode === "invoice" ? invoiceBody(order, econ, store, false) : packingBody(order, econ, store, false)
  return `<!doctype html><html><head><meta charset="utf-8"><title>${mode === "invoice" ? "Invoice" : "Packing Slip"} #${esc(order.display_id)}</title>
  <style>${STYLES} @page { size:A4; margin:0; }</style></head><body>${body}</body></html>`
}

/**
 * COMBINED A4: invoice on the top half, TWO identical packing slips side-by-side on the bottom
 * half (one for the parcel, one to keep). Dashed guides show where to cut.
 */
function combinedDoc(order: any, econ: Econ, store: Store): string {
  const slip = packingBody(order, econ, store, true)
  return `<!doctype html><html><head><meta charset="utf-8"><title>Order #${esc(order.display_id)}</title>
  <style>
    ${STYLES}
    @page { size:A4; margin:0; }
    .sheet { width:210mm; height:297mm; display:flex; flex-direction:column; }
    .top { height:149mm; padding:12mm 12mm 6mm; overflow:hidden; }
    .cut { border-top:1.5px dashed #999; position:relative; }
    .cut::after { content:"✂  cut here"; position:absolute; top:-8px; left:12mm; background:#fff; padding:0 6px; font-size:9px; color:#999; }
    .bottom { flex:1; display:flex; padding:6mm 12mm 12mm; gap:8mm; }
    .slip { flex:1; width:50%; border:1px dashed #ccc; border-radius:6px; padding:8mm 7mm; overflow:hidden; }
  </style></head><body>
    <div class="sheet">
      <div class="top">${invoiceBody(order, econ, store, true)}</div>
      <div class="cut"></div>
      <div class="bottom">
        <div class="slip">${slip}</div>
        <div class="slip">${slip}</div>
      </div>
    </div>
  </body></html>`
}

async function loadStore(): Promise<Store> {
  const store: Store = { address: "", email: "", phone: "" }
  try {
    const { setting } = await adminFetch<{ setting: any }>("/store-settings")
    // Invoice contact is its own set of fields; each falls back to the footer / order value.
    store.address = setting?.invoice_address || setting?.store_address || ""
    store.email = setting?.invoice_email || setting?.store_email || ""
    store.phone = setting?.invoice_phone || setting?.order_phone || ""
  } catch {
    /* editable details are optional — the fixed brand still prints */
  }
  return store
}

const OrderInvoiceWidget = ({ data: order }: { data: { id: string } }) => {
  const [busy, setBusy] = useState(false)

  const print = async (mode: "invoice" | "packing" | "combined") => {
    setBusy(true)
    try {
      const { order: full } = await adminFetch<{ order: any }>(
        `/orders/${order.id}?fields=id,display_id,created_at,email,currency_code,payment_status,fulfillment_status,total,item_total,subtotal,shipping_total,metadata,*items,*shipping_address`
      )
      // Advance / outstanding come from the order-processing economics, the one source that
      // knows what was actually captured vs still owed.
      let econ: Econ = null
      try {
        const { order: e } = await adminFetch<{ order: Econ }>(`/order-processing/${order.id}`)
        econ = e
      } catch {
        /* fall back to order totals if economics is unavailable */
      }
      const store = await loadStore()

      const html =
        mode === "combined"
          ? combinedDoc(full, econ, store)
          : singleDoc(full, econ, store, mode)

      const w = window.open("", "_blank", "width=900,height=1000")
      if (!w) {
        toast.error("Allow pop-ups to print")
        return
      }
      w.document.write(html)
      w.document.close()
      w.focus()
      setTimeout(() => w.print(), 400)
    } catch {
      toast.error("Failed to build the document")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="px-6 py-4 flex flex-col gap-y-3">
      <Heading level="h2">Print</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        Branded invoice (prices, advance &amp; COD), a packing slip, or the combined A4 — invoice on
        top, two packing slips below.
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
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderInvoiceWidget
