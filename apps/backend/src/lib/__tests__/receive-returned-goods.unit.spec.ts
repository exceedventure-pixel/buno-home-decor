import { receiveReturnedGoods } from "../returns"

/**
 * WHAT COMES BACK ONTO THE SHELF, AND WHAT A DAMAGED PARCEL WRITES OFF.
 *
 * Receiving reports the variants it actually took back so the caller can write them off when the
 * parcel turns up broken. That list has to be exact: it drives a shrinkage adjustment, so counting
 * a unit that was not received invents a loss, and missing one leaves damaged stock sellable.
 *
 * The mapping is the fiddly part — return items reference the ORDER LINE by item_id and carry no
 * variant of their own, so the variant has to be resolved through the order's items.
 */

const workflowRun = jest.fn()
jest.mock("@medusajs/core-flows", () => ({
  receiveAndCompleteReturnOrderWorkflow: () => ({ run: workflowRun }),
}))

const containerWith = (order: any) =>
  ({
    resolve: () => ({
      graph: async () => ({ data: order ? [order] : [] }),
    }),
  }) as any

/** An order with one open return; `ret` lines are [item_id, quantity, alreadyReceived]. */
const orderWith = (
  items: [string, string | null][],
  ret: [string, number, number][]
) => ({
  id: "order_1",
  items: items.map(([id, variant_id]) => ({ id, variant_id })),
  returns: [
    {
      id: "ret_1",
      canceled_at: null,
      items: ret.map(([item_id, quantity, received_quantity]) => ({
        id: `ri_${item_id}`,
        item_id,
        quantity,
        received_quantity,
      })),
    },
  ],
})

beforeEach(() => workflowRun.mockReset())

describe("receiveReturnedGoods — what actually landed", () => {
  it("reports the received units against their variant", async () => {
    const r = await receiveReturnedGoods(
      containerWith(orderWith([["li_1", "var_mug"]], [["li_1", 2, 0]])),
      "order_1"
    )
    expect(r.created).toBe(true)
    expect(r.received).toEqual([{ variant_id: "var_mug", quantity: 2 }])
  })

  it("reports only the OUTSTANDING units on a partial receive", async () => {
    // 3 on the return, 1 already in hand — this call takes back 2, so only 2 may be written off.
    const r = await receiveReturnedGoods(
      containerWith(orderWith([["li_1", "var_mug"]], [["li_1", 3, 1]])),
      "order_1"
    )
    expect(r.received).toEqual([{ variant_id: "var_mug", quantity: 2 }])
  })

  it("sums lines that share a variant", async () => {
    const r = await receiveReturnedGoods(
      containerWith(
        orderWith(
          [
            ["li_1", "var_mug"],
            ["li_2", "var_mug"],
          ],
          [
            ["li_1", 1, 0],
            ["li_2", 2, 0],
          ]
        )
      ),
      "order_1"
    )
    expect(r.received).toEqual([{ variant_id: "var_mug", quantity: 3 }])
  })

  it("keeps distinct variants apart", async () => {
    const r = await receiveReturnedGoods(
      containerWith(
        orderWith(
          [
            ["li_1", "var_mug"],
            ["li_2", "var_lamp"],
          ],
          [
            ["li_1", 1, 0],
            ["li_2", 4, 0],
          ]
        )
      ),
      "order_1"
    )
    expect(r.received).toEqual([
      { variant_id: "var_mug", quantity: 1 },
      { variant_id: "var_lamp", quantity: 4 },
    ])
  })

  it("drops lines with no variant — custom/pre-order never touched inventory", async () => {
    // Writing these off would book shrinkage against stock that was never on a shelf.
    const r = await receiveReturnedGoods(
      containerWith(
        orderWith(
          [
            ["li_1", "var_mug"],
            ["li_2", null],
          ],
          [
            ["li_1", 1, 0],
            ["li_2", 5, 0],
          ]
        )
      ),
      "order_1"
    )
    expect(r.received).toEqual([{ variant_id: "var_mug", quantity: 1 }])
  })

  it("receives nothing — and so offers nothing to write off — when already received", async () => {
    // The repeat-press case: a second write-off here would double the shrinkage.
    const r = await receiveReturnedGoods(
      containerWith(orderWith([["li_1", "var_mug"]], [["li_1", 2, 2]])),
      "order_1"
    )
    expect(r.created).toBe(false)
    expect(r.reason).toMatch(/already been received/i)
    expect(r.received).toBeUndefined()
    expect(workflowRun).not.toHaveBeenCalled()
  })

  it("refuses when the order has no return raised yet", async () => {
    const r = await receiveReturnedGoods(
      containerWith({ id: "order_1", items: [], returns: [] }),
      "order_1"
    )
    expect(r.created).toBe(false)
    expect(r.reason).toMatch(/no return to receive/i)
    expect(workflowRun).not.toHaveBeenCalled()
  })

  it("ignores a canceled return", async () => {
    const order = orderWith([["li_1", "var_mug"]], [["li_1", 2, 0]])
    order.returns[0].canceled_at = new Date() as any
    const r = await receiveReturnedGoods(containerWith(order), "order_1")
    expect(r.created).toBe(false)
    expect(workflowRun).not.toHaveBeenCalled()
  })
})
