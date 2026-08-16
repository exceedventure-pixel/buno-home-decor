import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { receiveReturnedGoods } from "../../../../../lib/returns"
import { adjustStockWorkflow } from "../../../../../workflows/accounting"

/**
 * POST /admin/orders/:id/receive-return — the goods are physically back.
 *
 * This is the moment stock returns to the shelf and cost of goods reverses. Marking an order
 * returned only says the parcel turned around; until it is received, those units are still in a
 * courier's van and must not be sellable.
 *
 * `damaged: true` means it arrived broken. The units are still received first — they physically
 * exist and their cost must come off the dead sale — and are then written off as shrinkage, so the
 * loss reads as damage against inventory rather than a phantom sale. Judging condition here rather
 * than when the return was raised matches how it actually goes: you cannot know a parcel is broken
 * until you open it.
 *
 * Returns 200 with `created:false` + a reason for the expected refusals (nothing to receive,
 * already received) so the message reaches the operator instead of a bare status code.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve("logger") as any
  const body = (req.body ?? {}) as { damaged?: boolean; note?: string }
  const damaged = body.damaged === true

  try {
    const result = await receiveReturnedGoods(req.scope, orderId)

    /**
     * Write off only what THIS call actually took back. Nothing was received (already received, or
     * nothing outstanding) means there is nothing to write off — writing off anyway on a repeat
     * press would book the same shrinkage twice.
     */
    let writtenOff = 0
    if (damaged && result.created) {
      for (const { variant_id, quantity } of result.received ?? []) {
        await adjustStockWorkflow(req.scope).run({
          input: {
            variant_id,
            direction: "shrinkage",
            quantity,
            reason: "damage",
            note: body.note?.trim() || "Came back damaged",
          },
        })
        writtenOff += quantity
      }
    }

    return res.json({
      success: result.created,
      created: result.created,
      items: result.items,
      message: result.reason,
      damaged,
      written_off: writtenOff,
    })
  } catch (err: any) {
    logger?.error(`[orders:receive-return] ${orderId} failed: ${err.message}`)
    return res.status(200).json({ success: false, created: false, message: err.message })
  }
}
