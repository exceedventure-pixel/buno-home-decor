import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { computeOrderEconomics } from "../../../../lib/orders/order-economics"
import { allowedTransitions } from "../../../../modules/orderProcessing/constants"
import { ORDER_PROCESSING_MODULE } from "../../../../modules/orderProcessing"
import {
  captureAdvanceWorkflow,
  setCourierFeeWorkflow,
  setDeliveryChargedWorkflow,
  setOrderIssueWorkflow,
  setProductionCostWorkflow,
  transitionOrderWorkflow,
} from "../../../../workflows/orderProcessing"

/** GET /admin/order-processing/:id — one order's status, P&L and history. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const svc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)

  const [econ] = await computeOrderEconomics(req.scope, { order_id: orderId })
  if (!econ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order "${orderId}" not found.`)
  }

  const events = await svc.listOrderStatusEvents(
    { order_id: orderId },
    { order: { created_at: "DESC" }, take: 50 }
  )

  res.json({
    order: econ,
    // What this order may legally do next — type-aware, so a ready-stock order isn't offered
    // "in production" and a pre-order is.
    allowed_next: allowedTransitions(econ.order_type, econ.order_status),
    events,
  })
}

/**
 * POST /admin/order-processing/:id — move the order, flag an issue, or set the courier fee.
 * Each of these performs the real action; see workflows/orderProcessing/steps/transition.ts.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const actorId = req.auth_context?.actor_id ?? null
  const body = (req.body ?? {}) as {
    order_status?: string
    issue_status?: string
    courier_fee?: number
    production_cost?: number
    delivery_charged?: number | null
    advance_amount?: number
    cod_amount?: number
    /** The note recorded ON THIS transition — history, tied to the status event. */
    note?: string | null
    /**
     * The order's STANDING note — a persistent scratchpad on the order itself ("customer asked to
     * deliver after 5pm"). Deliberately separate from `note` above, which belongs to one moment in
     * the timeline and would be lost as soon as the next status change wrote its own.
     */
    order_note?: string | null
  }

  if (body.order_note !== undefined) {
    const svc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)
    const [wf] = await svc.listOrderWorkflows({ order_id: orderId })
    const value = (body.order_note ?? "").trim() || null
    if (wf) await svc.updateOrderWorkflows([{ id: wf.id, note: value }])
    else await svc.createOrderWorkflows([{ order_id: orderId, note: value }])
  }

  if (body.courier_fee !== undefined) {
    await setCourierFeeWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        fee: Number(body.courier_fee),
        actor_id: actorId,
      },
    })
  }

  // Editable at any time — every edit re-flows through the P&L because it's all derived.
  if (body.production_cost !== undefined) {
    await setProductionCostWorkflow(req.scope).run({
      input: { order_id: orderId, cost: Number(body.production_cost), actor_id: actorId },
    })
  }

  if (body.delivery_charged !== undefined) {
    await setDeliveryChargedWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        amount: body.delivery_charged == null ? null : Number(body.delivery_charged),
      },
    })
  }

  // A later advance/part-payment (e.g. customer sends a deposit after the order is placed).
  if (body.advance_amount !== undefined && Number(body.advance_amount) > 0) {
    await captureAdvanceWorkflow(req.scope).run({
      input: { order_id: orderId, amount: Number(body.advance_amount) },
    })
  }

  if (body.issue_status) {
    await setOrderIssueWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        issue: body.issue_status as any,
        actor_id: actorId,
        note: body.note ?? null,
      },
    })
  }

  // Last, because it's the one that ships goods or moves cash — if the cheaper updates were
  // going to fail, better they fail before a parcel goes out the door.
  if (body.order_status) {
    await transitionOrderWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        to: body.order_status as any,
        actor_id: actorId,
        note: body.note ?? null,
        // Only consumed when booking a courier (to === "courier_booked"): the COD to collect,
        // defaulting to the order's outstanding when omitted.
        cod_amount: body.cod_amount,
      },
    })
  }

  const [econ] = await computeOrderEconomics(req.scope, { order_id: orderId })
  res.json({
    order: econ,
    allowed_next: econ ? allowedTransitions(econ.order_type, econ.order_status) : [],
  })
}
