import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const SANDBOX_VALIDATE_URL = "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
const LIVE_VALIDATE_URL = "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") as any
  const body = req.body as Record<string, string>

  const val_id = body.val_id
  const tran_id = body.tran_id
  const cart_id = body.value_a  // stored as value_a in initiatePayment

  if (!val_id || !cart_id) {
    logger.warn("[sslcommerz:ipn] Missing val_id or cart_id (value_a)")
    return res.status(400).send("Missing required fields")
  }

  const storeId = process.env.SSLCOMMERZ_STORE_ID
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD
  const sandbox = process.env.SSLCOMMERZ_SANDBOX !== "false"

  if (!storeId || !storePassword) {
    logger.error("[sslcommerz:ipn] Store credentials not configured")
    return res.status(500).send("Not configured")
  }

  try {
    // Server-side validation with SSLCommerz
    const validateBase = sandbox ? SANDBOX_VALIDATE_URL : LIVE_VALIDATE_URL
    const validateUrl = `${validateBase}?val_id=${encodeURIComponent(val_id)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePassword)}&format=json`

    const validateRes = await fetch(validateUrl)
    if (!validateRes.ok) {
      logger.error(`[sslcommerz:ipn] Validation API HTTP ${validateRes.status}`)
      return res.status(500).send("Validation failed")
    }

    const validation = (await validateRes.json()) as {
      status: string
      tran_id: string
      amount: string
      currency_type: string
      bank_tran_id?: string
    }

    if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
      logger.warn(`[sslcommerz:ipn] Invalid payment: status=${validation.status} tran_id=${tran_id}`)
      return res.send("INVALID")
    }

    // Find the payment session via cart
    const cartModule = req.scope.resolve(Modules.CART) as any
    const cart = await cartModule.retrieveCart(cart_id, {
      relations: ["payment_collection", "payment_collection.payment_sessions"],
    })

    if (!cart?.payment_collection) {
      logger.error(`[sslcommerz:ipn] No payment collection for cart ${cart_id}`)
      return res.send("NO_COLLECTION")
    }

    const session = cart.payment_collection.payment_sessions?.find(
      (s: any) => s.provider_id === "pp_sslcommerz_sslcommerz"
    )

    if (!session) {
      logger.error(`[sslcommerz:ipn] No SSLCommerz session for cart ${cart_id}`)
      return res.send("NO_SESSION")
    }

    // This endpoint is public and cart_id arrives in the request body, so the
    // validated transaction must be tied back to THIS session before we trust it.
    // tran_id is generated server-side in initiatePayment and stored on the session,
    // so a val_id issued for any other transaction cannot authorize this cart.
    const sessionTranId = (session.data as Record<string, unknown> | null)?.tran_id
    if (!sessionTranId || validation.tran_id !== sessionTranId) {
      logger.error(
        `[sslcommerz:ipn] tran_id mismatch for cart ${cart_id}: validated=${validation.tran_id} session=${sessionTranId}`
      )
      return res.send("TRAN_MISMATCH")
    }

    // Compare against the amount the session actually owes — never the request
    // body, which the caller controls. ±1 BDT tolerance for gateway rounding.
    const paidAmount = parseFloat(validation.amount)
    const expectedAmount = Number(session.amount)
    if (
      !Number.isFinite(paidAmount) ||
      !Number.isFinite(expectedAmount) ||
      Math.abs(paidAmount - expectedAmount) > 1
    ) {
      logger.error(
        `[sslcommerz:ipn] Amount mismatch for cart ${cart_id}: paid=${validation.amount} expected=${expectedAmount}`
      )
      return res.send("AMOUNT_MISMATCH")
    }

    const sessionCurrency = String(session.currency_code ?? "").toLowerCase()
    const paidCurrency = String(validation.currency_type ?? "").toLowerCase()
    if (sessionCurrency && paidCurrency && sessionCurrency !== paidCurrency) {
      logger.error(
        `[sslcommerz:ipn] Currency mismatch for cart ${cart_id}: paid=${paidCurrency} expected=${sessionCurrency}`
      )
      return res.send("CURRENCY_MISMATCH")
    }

    // Update session data to mark as validated
    const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
    await paymentModule.updatePaymentSession({
      id: session.id,
      data: {
        ...(session.data ?? {}),
        validated: true,
        val_id,
        tran_id,
        bank_tran_id: validation.bank_tran_id ?? "",
        validated_amount: validation.amount,
        validated_currency: validation.currency_type,
      },
      currency_code: session.currency_code,
      amount: session.amount,
    })

    logger.info(`[sslcommerz:ipn] Validated tran_id=${tran_id} cart=${cart_id} session=${session.id}`)
    return res.send("OK")
  } catch (err: any) {
    logger.error(`[sslcommerz:ipn] Error: ${err.message}`)
    return res.status(500).send("ERROR")
  }
}
