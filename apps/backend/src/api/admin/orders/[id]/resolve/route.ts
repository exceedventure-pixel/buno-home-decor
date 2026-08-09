import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolveOrderIssueWorkflow } from "../../../../../workflows/orderProcessing"
import type { ReplacementItem } from "../../../../../lib/orders/exchange"
import type { Fault, ResolutionType } from "../../../../../modules/orderProcessing/constants"

/**
 * POST /admin/orders/:id/resolve — the single after-sales action.
 *
 * Picks a resolution (return, refund, exchange, RTO, damaged, rebook, slip-correction) and a fault,
 * performs the real work, and records the outcome. Returns a human message on refusal, matching the
 * exchange/refund routes.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any
  const body = (req.body ?? {}) as {
    resolution?: ResolutionType
    fault?: Fault | null
    note?: string | null
    receive_now?: boolean
    customer_return_paid?: number
    refund_amount?: number
    items?: ReplacementItem[]
    replacement_delivery_charged?: number
  }

  if (!body.resolution) {
    return res.status(200).json({ success: false, message: "Choose how to resolve this issue." })
  }

  try {
    const { result } = await resolveOrderIssueWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        resolution: body.resolution,
        fault: body.fault ?? null,
        note: body.note ?? null,
        receive_now: body.receive_now,
        customer_return_paid: body.customer_return_paid,
        refund_amount: body.refund_amount,
        items: body.items,
        replacement_delivery_charged: body.replacement_delivery_charged,
        actor_id: req.auth_context?.actor_id ?? null,
      },
    })
    logger?.info(
      `[orders:resolve] ${orderId} → ${body.resolution} by ${req.auth_context?.actor_id ?? "unknown"}`
    )
    return res.json({ success: true, ...result })
  } catch (err: any) {
    logger?.warn(`[orders:resolve] ${orderId} refused: ${err.message}`)
    return res.status(200).json({ success: false, message: err.message })
  }
}
