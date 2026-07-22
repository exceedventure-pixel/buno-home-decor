import { returnAndRestockOrder } from "../returns"

/**
 * WHAT A RETURN IS ALLOWED TO SEND BACK.
 *
 * The bug this pins: quantities live on the line item's DETAIL, not the item. Reading
 * `items.quantity` gave undefined, every line was filtered out, and a perfectly returnable parcel
 * reported "no returnable items" — which is why returns looked broken.
 *
 * The rule is fulfilled − already-returned: ordered quantity would try to send back units that
 * never left the shelf, and restocking those would invent stock out of nothing.
 */

const workflowRun = jest.fn()
jest.mock("@medusajs/core-flows", () => ({
  createAndCompleteReturnOrderWorkflow: () => ({ run: workflowRun }),
}))

const containerWith = (order: any) =>
  ({
    resolve: () => ({
      graph: async () => ({ data: order ? [order] : [] }),
    }),
  }) as any

const line = (id: string, quantity: number, fulfilled: number, returned = 0) => ({
  id,
  detail: {
    quantity,
    fulfilled_quantity: fulfilled,
    return_received_quantity: returned,
  },
})

beforeEach(() => workflowRun.mockReset())

describe("returnAndRestockOrder", () => {
  it("returns the shipped units of a dispatched order", async () => {
    const c = containerWith({ id: "o1", status: "pending", returns: [], items: [line("i1", 2, 2)] })

    const r = await returnAndRestockOrder(c, "o1")

    expect(r.created).toBe(true)
    expect(workflowRun).toHaveBeenCalledWith({
      input: { order_id: "o1", items: [{ id: "i1", quantity: 2 }] },
    })
  })

  it("only sends back what actually shipped on a part-shipped order", async () => {
    // 5 ordered, 2 shipped — returning 5 would restock 3 units that never left.
    const c = containerWith({ id: "o1", status: "pending", returns: [], items: [line("i1", 5, 2)] })

    await returnAndRestockOrder(c, "o1")

    expect(workflowRun).toHaveBeenCalledWith({
      input: { order_id: "o1", items: [{ id: "i1", quantity: 2 }] },
    })
  })

  it("excludes units that have already come back", async () => {
    const c = containerWith({
      id: "o1",
      status: "pending",
      returns: [],
      items: [line("i1", 4, 4, 1), line("i2", 2, 2, 2)],
    })

    await returnAndRestockOrder(c, "o1")

    // i1: 4 shipped − 1 back = 3. i2 is fully back already, so it drops out entirely.
    expect(workflowRun).toHaveBeenCalledWith({
      input: { order_id: "o1", items: [{ id: "i1", quantity: 3 }] },
    })
  })

  it("refuses when nothing has shipped, and says so in plain terms", async () => {
    const c = containerWith({ id: "o1", status: "pending", returns: [], items: [line("i1", 3, 0)] })

    const r = await returnAndRestockOrder(c, "o1")

    expect(r.created).toBe(false)
    expect(r.reason).toMatch(/nothing has shipped/i)
    expect(workflowRun).not.toHaveBeenCalled()
  })

  it("is idempotent — an order that already has a return is left alone", async () => {
    const c = containerWith({
      id: "o1",
      status: "pending",
      returns: [{ id: "ret_1" }],
      items: [line("i1", 2, 2)],
    })

    const r = await returnAndRestockOrder(c, "o1")

    expect(r.created).toBe(false)
    expect(r.reason).toMatch(/already has a return/i)
    expect(workflowRun).not.toHaveBeenCalled()
  })

  it("never returns a cancelled order", async () => {
    const c = containerWith({ id: "o1", status: "canceled", returns: [], items: [line("i1", 2, 2)] })

    const r = await returnAndRestockOrder(c, "o1")

    expect(r.created).toBe(false)
    expect(workflowRun).not.toHaveBeenCalled()
  })
})
