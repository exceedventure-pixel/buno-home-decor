import { steadfastAdapter } from "../steadfast"

/**
 * The one behaviour that matters for this store: the COD sent to Steadfast must be the amount the
 * caller passes (order total minus any advance), NOT the full order total. Getting this wrong
 * makes the courier collect money the customer already paid.
 */

const okResponse = (consignment: Record<string, unknown>) => ({
  ok: true,
  json: async () => ({ status: 200, consignment }),
})

const creds = { api_key: "k", secret_key: "s" }

const order = {
  display_id: 42,
  total: 1500,
  payment_status: "not_paid",
  shipping_address: { first_name: "A", last_name: "B", phone: "017", address_1: "x", city: "Dhaka" },
}

describe("steadfastAdapter.createParcel COD", () => {
  it("sends the explicit cod_amount, not the order total", async () => {
    let sentBody: any = null
    global.fetch = jest.fn(async (_url: any, init: any) => {
      sentBody = JSON.parse(init.body)
      return okResponse({ consignment_id: "c1", tracking_code: "T1" }) as any
    }) as any

    const result = await steadfastAdapter.createParcel(order as any, creds, { cod_amount: 1000 })

    expect(sentBody.cod_amount).toBe(1000) // remaining owed, not 1500
    expect(result.consignment_id).toBe("c1")
    expect(result.tracking_id).toBe("T1")
  })

  it("falls back to the order total when no cod_amount is given and the order is unpaid", async () => {
    let sentBody: any = null
    global.fetch = jest.fn(async (_url: any, init: any) => {
      sentBody = JSON.parse(init.body)
      return okResponse({ consignment_id: "c2", tracking_code: "T2" }) as any
    }) as any

    await steadfastAdapter.createParcel(order as any, creds)
    expect(sentBody.cod_amount).toBe(1500)
  })

  it("captures a delivery charge from the response when present", async () => {
    global.fetch = jest.fn(async () =>
      okResponse({ consignment_id: "c3", tracking_code: "T3", delivery_charge: 70 })
    ) as any

    const result = await steadfastAdapter.createParcel(order as any, creds, { cod_amount: 0 })
    expect(result.delivery_charge).toBe(70)
  })
})

/**
 * The status mapping decides when stock leaves and when COD is captured, so it is load-bearing.
 *
 * The subtle one is `pending`: Steadfast flips a consignment from `in_review` to `pending` when
 * they COLLECT it (observed: created 17:28 → pending 22:14 → their warehouses from 00:05), and it
 * then stays `pending` for the whole journey. Reading `pending` as "awaiting pickup" left shipped
 * orders stuck at Courier Booked forever, so it must normalise to in_transit.
 */
const statusResponse = (delivery_status: string) => ({
  ok: true,
  json: async () => ({ status: 200, delivery_status }),
})

describe("steadfastAdapter.getStatus mapping", () => {
  const expectStatus = async (raw: string, expected: string) => {
    global.fetch = jest.fn(async () => statusResponse(raw)) as any
    await expect(steadfastAdapter.getStatus("c1", creds)).resolves.toBe(expected)
  }

  it("treats in_review as still awaiting pickup", () => expectStatus("in_review", "pending"))

  it("treats pending as PICKED UP (in transit), so the order auto-dispatches", () =>
    expectStatus("pending", "in_transit"))

  it("treats hold as in transit — the courier already has the parcel", () =>
    expectStatus("hold", "in_transit"))

  it("only the final states move cash or stock", async () => {
    await expectStatus("delivered", "delivered")
    await expectStatus("returned", "returned")
    await expectStatus("cancelled", "cancelled")
  })

  it("does not finalise on approval-pending states", async () => {
    await expectStatus("delivered_approval_pending", "in_transit")
    await expectStatus("cancelled_approval_pending", "in_transit")
  })

  it("falls back to unknown for anything unrecognised", () => expectStatus("weird_new_status", "unknown"))
})
