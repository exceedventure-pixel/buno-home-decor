import { POST } from "../route"

/**
 * The IPN endpoint is public and marks a payment session `validated`, which is what
 * authorizePayment turns into an authorized order. Everything here is about refusing
 * to do that unless the validated transaction really belongs to this cart's session.
 */

const EXPENSIVE_CART = "cart_expensive"
const SESSION_TRAN_ID = "ssl_1000_abcdef" // generated server-side in initiatePayment

type Validation = {
  status: string
  tran_id: string
  amount: string
  currency_type: string
}

const run = async ({
  body,
  validation,
  sessionAmount = 5000,
  sessionTranId = SESSION_TRAN_ID,
}: {
  body: Record<string, string>
  validation: Validation
  sessionAmount?: number
  // null = session carries no tran_id at all (default params only fire on undefined)
  sessionTranId?: string | null
}) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => validation,
  }) as any

  const updatePaymentSession = jest.fn().mockResolvedValue({})

  const session = {
    id: "payses_1",
    provider_id: "pp_sslcommerz_sslcommerz",
    amount: sessionAmount,
    currency_code: "bdt",
    data: sessionTranId ? { tran_id: sessionTranId } : {},
  }

  const req: any = {
    body,
    scope: {
      resolve: (name: string) => {
        if (name === "logger") {
          return { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
        }
        if (name === "cart") {
          return {
            retrieveCart: async () => ({
              id: EXPENSIVE_CART,
              payment_collection: { payment_sessions: [session] },
            }),
          }
        }
        if (name === "payment") {
          return { updatePaymentSession }
        }
        return {}
      },
    },
  }

  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.send = jest.fn().mockReturnValue(res)

  await POST(req, res)

  return {
    reply: res.send.mock.calls[0]?.[0],
    authorized: updatePaymentSession.mock.calls.some(
      (c: any[]) => c[0]?.data?.validated === true
    ),
  }
}

beforeEach(() => {
  process.env.SSLCOMMERZ_STORE_ID = "store"
  process.env.SSLCOMMERZ_STORE_PASSWORD = "pass"
})

describe("sslcommerz IPN", () => {
  it("authorizes a genuine callback for this cart", async () => {
    const r = await run({
      body: { val_id: "val_1", tran_id: SESSION_TRAN_ID, value_a: EXPENSIVE_CART, amount: "5000" },
      validation: { status: "VALID", tran_id: SESSION_TRAN_ID, amount: "5000", currency_type: "BDT" },
    })
    expect(r.reply).toBe("OK")
    expect(r.authorized).toBe(true)
  })

  it("refuses a val_id validated for a different transaction (replayed onto this cart)", async () => {
    // Attacker pays 10 BDT on their own order, then replays that val_id with
    // value_a pointing at an expensive cart and a matching amount in the body.
    const r = await run({
      body: { val_id: "val_attacker", tran_id: "ssl_9_attacker", value_a: EXPENSIVE_CART, amount: "10" },
      validation: { status: "VALID", tran_id: "ssl_9_attacker", amount: "10", currency_type: "BDT" },
    })
    expect(r.reply).toBe("TRAN_MISMATCH")
    expect(r.authorized).toBe(false)
  })

  it("refuses when the paid amount does not cover the session amount", async () => {
    const r = await run({
      body: { val_id: "val_1", tran_id: SESSION_TRAN_ID, value_a: EXPENSIVE_CART, amount: "10" },
      validation: { status: "VALID", tran_id: SESSION_TRAN_ID, amount: "10", currency_type: "BDT" },
    })
    expect(r.reply).toBe("AMOUNT_MISMATCH")
    expect(r.authorized).toBe(false)
  })

  it("refuses when the session has no tran_id to bind against", async () => {
    const r = await run({
      body: { val_id: "val_1", tran_id: SESSION_TRAN_ID, value_a: EXPENSIVE_CART, amount: "5000" },
      validation: { status: "VALID", tran_id: SESSION_TRAN_ID, amount: "5000", currency_type: "BDT" },
      sessionTranId: null,
    })
    expect(r.reply).toBe("TRAN_MISMATCH")
    expect(r.authorized).toBe(false)
  })

  it("refuses a currency swap", async () => {
    const r = await run({
      body: { val_id: "val_1", tran_id: SESSION_TRAN_ID, value_a: EXPENSIVE_CART, amount: "5000" },
      validation: { status: "VALID", tran_id: SESSION_TRAN_ID, amount: "5000", currency_type: "USD" },
    })
    expect(r.reply).toBe("CURRENCY_MISMATCH")
    expect(r.authorized).toBe(false)
  })

  it("refuses when the gateway says the payment is not valid", async () => {
    const r = await run({
      body: { val_id: "val_1", tran_id: SESSION_TRAN_ID, value_a: EXPENSIVE_CART, amount: "5000" },
      validation: { status: "FAILED", tran_id: SESSION_TRAN_ID, amount: "5000", currency_type: "BDT" },
    })
    expect(r.reply).toBe("INVALID")
    expect(r.authorized).toBe(false)
  })

  it("tolerates ±1 BDT gateway rounding", async () => {
    const r = await run({
      body: { val_id: "val_1", tran_id: SESSION_TRAN_ID, value_a: EXPENSIVE_CART, amount: "5000" },
      validation: { status: "VALIDATED", tran_id: SESSION_TRAN_ID, amount: "4999.5", currency_type: "BDT" },
    })
    expect(r.reply).toBe("OK")
    expect(r.authorized).toBe(true)
  })
})
