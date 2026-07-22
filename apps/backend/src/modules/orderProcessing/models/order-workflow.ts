import { model } from "@medusajs/framework/utils"

import { ISSUE_STATUSES, ORDER_TYPES, STORED_STAGES } from "../constants"

/**
 * The business layer on top of a Medusa order — and ONLY the parts Medusa doesn't already know.
 *
 * There is deliberately no `payment_status` column and no `order_status` column. Both would be
 * a second copy of the truth, and a copy is exactly what goes stale the moment someone fulfils
 * or captures a payment in Medusa's own screens. Payment status is derived from the payments;
 * the post-dispatch order statuses are derived from fulfilments, returns and cancellations.
 *
 * What IS stored here is the stuff Medusa has no concept of: whether the vase is in production,
 * what the courier is charging us, and whether the parcel came back smashed.
 */
const OrderWorkflow = model
  .define("order_workflow", {
    id: model.id({ prefix: "opw" }).primaryKey(),

    order_id: model.text().unique(),

    /**
     * HOW it was sold. Drives whether stock is touched, how COGS is worked out, and which
     * stages the pipeline offers. Website orders default to ready_stock. See constants.ts.
     */
    order_type: model.enum([...ORDER_TYPES]).default("ready_stock"),

    /**
     * The stored stage — a step that exists purely inside the business. Once goods physically
     * ship, the effective status is derived from Medusa instead and this stops mattering.
     */
    stage: model.enum([...STORED_STAGES]).default("new_order"),

    /** A human judgement Medusa can't make: did it come back damaged, or was it the wrong item? */
    issue_status: model.enum([...ISSUE_STATUSES]).default("none"),

    /** Cash on delivery. Decides whether an unpaid order reads "Unpaid" or "Cash on Delivery". */
    is_cod: model.boolean().default(true),

    /**
     * Money taken up front on a COD order. Stored as the INTENT; the actual cash is whatever
     * Medusa captured, which is what the books use. Money is as-is (800 = 800 BDT), never cents.
     */
    advance_amount: model.bigNumber().default(0),

    /**
     * What the courier actually charges US to carry this parcel. Auto-filled from the rate table
     * when the courier is booked, editable per order.
     *
     * Delivery margin = what the customer was charged (order.shipping_total) − this. That is the
     * "delivery overcharge" — and it's the only way to know whether delivery makes or loses money.
     */
    courier_fee: model.bigNumber().default(0),

    /**
     * PRE-ORDER & CUSTOM only: what it cost to produce. These never enter inventory, so there is
     * no FIFO batch to draw a cost from — this IS the order's cost of goods. Editable at any
     * time (a production estimate at order time, corrected once you know the real cost), and
     * every edit re-flows through the books because all the figures are derived.
     */
    production_cost: model.bigNumber().default(0),
    /**
     * Freight on a made-to-order item — bringing materials in, or the finished piece out of the
     * workshop. Ready-stock carries its freight on the restock batch's landed cost, but a
     * pre-order/custom order never goes through a restock, so it had nowhere to record it and the
     * cost silently vanished. Counted inside this order's cost of goods, alongside production.
     */
    production_freight: model.bigNumber().default(0),
    /**
     * EXCHANGE LINKS. When we ship the wrong item, the correct one goes out as its OWN order so
     * each parcel keeps its own courier cost and P&L — but the two must not become strangers.
     *
     *   replaces_order_id    — on the replacement, pointing back at the order that went wrong.
     *   replaced_by_order_id — on the original, pointing forward at the replacement.
     */
    replaces_order_id: model.text().nullable(),
    replaced_by_order_id: model.text().nullable(),

    /**
     * The delivery amount actually CHARGED to the customer (revenue side). Null means "use
     * Medusa's shipping_total". Set it when what you charged differs from the default — the
     * "delivery overcharge". Editable any time; revenue and delivery margin recompute from it.
     */
    delivery_charged: model.bigNumber().nullable(),

    /**
     * COURIER SHIPMENT — set when the order is booked with a courier ("Send to Steadfast").
     *
     * These live here, not on the Medusa fulfilment, because the parcel is booked BEFORE it
     * ships: at booking there is no fulfilment yet (stock only leaves at dispatch, which the
     * courier's pickup status triggers automatically). Once a fulfilment does exist, the
     * subscriber mirrors these onto `fulfillment.data` so the native admin widget keeps working.
     * A manual shipment leaves all of these null.
     */
    courier_id: model.text().nullable(),
    consignment_id: model.text().nullable(),
    tracking_id: model.text().nullable(),
    /** Normalised courier status: pending | in_transit | delivered | returned | cancelled. */
    courier_status: model.text().nullable(),
    /** The COD amount actually sent to the courier to collect (total − advance, delivery incl.). */
    cod_amount: model.bigNumber().nullable(),
    /** The courier's own delivery charge, captured from its API when it exposes one (else null). */
    actual_delivery_charge: model.bigNumber().nullable(),

    note: model.text().nullable(),
  })
  .indexes([{ on: ["stage"] }, { on: ["issue_status"] }, { on: ["consignment_id"] }])

export default OrderWorkflow
