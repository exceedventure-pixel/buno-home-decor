import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { ACCOUNTING_MODULE } from "../../../modules/accounting"
import { PRODUCT_COST_MODULE } from "../../../modules/productCost"
import {
  PAGE,
  clearAllReservations,
  collectIds,
  purgeAccounting,
  purgeStockLayers,
  restartOrderNumbering,
  setAllStockLevels,
} from "../../../lib/store/reset"

// Typing the confirmation phrase is required to run this destructive reset. Wiping EVERYTHING
// (products included) is a bigger decision, so it demands a phrase of its own.
const CONFIRM_PHRASE = "store reset"
const NUKE_PHRASE = "reset everything"

type ResetBody = {
  confirm?: string
  inventory?: { enabled?: boolean; value?: 0 | 1 }
  orders?: boolean
  customers?: { enabled?: boolean; identities?: boolean }
  /** Wipes the books AND the stock they account for — the two must go together. */
  accounting?: boolean
  /** The lot: accounting + inventory + orders + customers + products. */
  everything?: boolean
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as ResetBody
  const logger = req.scope.resolve("logger") as any

  const wantEverything = Boolean(body.everything)

  // The nuclear option gets its own phrase — "store reset" is too easy to type by habit.
  const required = wantEverything ? NUKE_PHRASE : CONFIRM_PHRASE
  if (body.confirm !== required) {
    return res.status(400).json({ error: `Type "${required}" exactly to confirm.` })
  }

  const wantAccounting = wantEverything || Boolean(body.accounting)
  // Accounting and "everything" both force stock to zero — the books and the shelf move together.
  const wantInventory = wantEverything || wantAccounting || Boolean(body.inventory?.enabled)
  const wantOrders = wantEverything || Boolean(body.orders)
  const wantCustomers = wantEverything || Boolean(body.customers?.enabled)
  const wantProducts = wantEverything

  /**
   * Delete the LOGIN IDENTITIES too, not just the customer rows.
   *
   * This is the bug that locked everyone out. A customer row and the auth identity that logs
   * into it are two different records. Deleting only the customer leaves the identity behind,
   * so the email is still registered (sign-up says "already exists") while the customer it
   * points at is gone (sign-in resolves to nothing). The account becomes a ghost: you can
   * neither log into it nor recreate it.
   *
   * "Reset everything" must mean everything, so it always takes the identities with it.
   */
  const wantIdentities = wantEverything || Boolean(body.customers?.identities)

  if (!wantInventory && !wantOrders && !wantCustomers && !wantAccounting) {
    return res.status(400).json({ error: "Select at least one thing to reset." })
  }

  const summary: Record<string, unknown> = {}
  const errors: Record<string, string> = {}

  // ── Inventory: force every stock level, and drop the cost layers behind it ───
  if (wantInventory) {
    /**
     * ALWAYS zero. There used to be a "set everything to 1" option, and it manufactured the
     * exact problem this system exists to prevent: a unit on the shelf that no cost batch backs.
     * Uncosted stock understates COGS and inventory value, and the drift warning then fires
     * forever with no way to reconcile.
     *
     * Stock enters through a restock, because that is what records what it cost. Reset to zero,
     * then restock.
     */
    const value = 0
    try {
      // Release reservations first — otherwise zeroed stock still reads "N reserved".
      const reservationsCleared = await clearAllReservations(req.scope)
      const updated = await setAllStockLevels(req.scope, value)
      const purged = await purgeStockLayers(req.scope)
      summary.inventory = {
        levels_updated: updated,
        set_to: value,
        reservations_cleared: reservationsCleared,
        batches_deleted: purged.batches,
        movements_deleted: purged.movements,
      }
    } catch (e: any) {
      errors.inventory = e.message
      logger?.error(`[store-reset] inventory failed: ${e.message}`)
    }
  }

  // ── Accounting: the books themselves ────────────────────────────────────────
  if (wantAccounting) {
    try {
      // Shared with the system-mode roll — clearing the books means all four tables, never just
      // the ledger, or partners and assets survive with no cash trail behind them.
      summary.accounting = await purgeAccounting(req.scope)
    } catch (e: any) {
      errors.accounting = e.message
      logger?.error(`[store-reset] accounting failed: ${e.message}`)
    }
  }

  // ── Orders & sales: soft-delete orders (+drafts), returns, exchanges, carts ──
  if (wantOrders) {
    try {
      const order = req.scope.resolve(Modules.ORDER) as any

      const returnIds = await collectIds((skip, take) =>
        order.listReturns({}, { take, skip, select: ["id"] })
      )
      if (returnIds.length) await order.softDeleteReturns(returnIds)

      const exchangeIds = await collectIds((skip, take) =>
        order.listOrderExchanges({}, { take, skip, select: ["id"] })
      )
      if (exchangeIds.length) await order.softDeleteOrderExchanges(exchangeIds)

      // listOrders returns both regular and draft orders
      const orderIds = await collectIds((skip, take) =>
        order.listOrders({}, { take, skip, select: ["id"] })
      )
      if (orderIds.length) await order.softDeleteOrders(orderIds)

      let cartCount = 0
      try {
        const cart = req.scope.resolve(Modules.CART) as any
        const cartIds = await collectIds((skip, take) =>
          cart.listCarts({}, { take, skip, select: ["id"] })
        )
        if (cartIds.length) await cart.softDeleteCarts(cartIds)
        cartCount = cartIds.length
      } catch (e: any) {
        errors.carts = e.message
      }

      // Release the stock those orders were holding, or the reserved_quantity counter stays
      // stuck and new stock reads as already reserved.
      let reservationsCleared = 0
      try {
        reservationsCleared = await clearAllReservations(req.scope)
      } catch (e: any) {
        errors.reservations = e.message
      }

      // Numbering restarts only once the orders are actually gone — renumbering a store that
      // still has live orders would hand out #1 alongside an existing #1.
      let numberingRestarted = false
      try {
        numberingRestarted = await restartOrderNumbering(req.scope)
      } catch (e: any) {
        errors.order_numbering = e.message
        logger?.error(`[store-reset] order numbering failed: ${e.message}`)
      }

      summary.orders = {
        orders: orderIds.length,
        returns: returnIds.length,
        exchanges: exchangeIds.length,
        carts: cartCount,
        reservations_cleared: reservationsCleared,
        numbering_restarted: numberingRestarted,
      }
    } catch (e: any) {
      errors.orders = e.message
      logger?.error(`[store-reset] orders failed: ${e.message}`)
    }
  }

  // ── Customers: soft-delete customers (+ optional login identities) ───────────
  if (wantCustomers) {
    try {
      const customerSvc = req.scope.resolve(Modules.CUSTOMER) as any

      // Grab id AND email AND phone — the login credential is keyed on the email/phone (the
      // "entity_id"), NOT on the customer id, so we need them to find it.
      const customerIds: string[] = []
      const customerLogins = new Set<string>() // emails + phones, lower-cased
      let skip = 0
      for (;;) {
        const rows = await customerSvc.listCustomers(
          {},
          { take: PAGE, skip, select: ["id", "email", "phone"] }
        )
        if (!rows?.length) break
        for (const r of rows) {
          customerIds.push(r.id)
          if (r.email) customerLogins.add(String(r.email).toLowerCase())
          if (r.phone) customerLogins.add(String(r.phone).toLowerCase())
        }
        if (rows.length < PAGE) break
        skip += rows.length
      }

      let identitiesDeleted = 0
      let credentialsDeleted = 0
      if (wantIdentities && customerIds.length) {
        try {
          const auth = req.scope.resolve(Modules.AUTH) as any
          const customerIdSet = new Set(customerIds)

          /**
           * THE FIX. A customer login is TWO records: a `provider_identity` (the email/password
           * credential, keyed on the email) and the `auth_identity` it belongs to. Sign-up's
           * "already exists" reads the CREDENTIAL's email — so deleting only the customer, or
           * only auth identities matched by app_metadata.customer_id, leaves the email
           * registered and the account un-recreatable. Some identities also have no app_metadata
           * at all, so the old customer_id match missed them entirely.
           *
           * So: find every credential whose email/phone belongs to a customer we're deleting,
           * and remove both halves. Admin logins (app_metadata.user_id) are never touched.
           */
          const provIds: string[] = []
          const authIdsFromCreds = new Set<string>()
          let pSkip = 0
          for (;;) {
            const provs = await auth.listProviderIdentities(
              {},
              { take: PAGE, skip: pSkip, select: ["id", "entity_id", "auth_identity_id"] }
            )
            if (!provs?.length) break
            for (const p of provs) {
              if (customerLogins.has(String(p.entity_id ?? "").toLowerCase())) {
                provIds.push(p.id)
                if (p.auth_identity_id) authIdsFromCreds.add(p.auth_identity_id)
              }
            }
            if (provs.length < PAGE) break
            pSkip += provs.length
          }

          // The auth identities to remove: those matched by credential, plus any still linked by
          // app_metadata.customer_id — but NEVER an admin user's identity.
          const authToDelete = new Set<string>()
          let aSkip = 0
          for (;;) {
            const idents = await auth.listAuthIdentities(
              {},
              { take: PAGE, skip: aSkip, select: ["id", "app_metadata"] }
            )
            if (!idents?.length) break
            for (const ai of idents) {
              if (ai.app_metadata?.user_id) continue // an admin — leave it alone
              const cid = ai.app_metadata?.customer_id
              if (authIdsFromCreds.has(ai.id) || (cid && customerIdSet.has(cid))) {
                authToDelete.add(ai.id)
              }
            }
            if (idents.length < PAGE) break
            aSkip += idents.length
          }

          // Delete the credential first (frees the email for re-registration), then the identity.
          if (provIds.length) await auth.deleteProviderIdentities(provIds)
          if (authToDelete.size) await auth.deleteAuthIdentities([...authToDelete])
          credentialsDeleted = provIds.length
          identitiesDeleted = authToDelete.size
        } catch (e: any) {
          errors.customer_identities = e.message
          logger?.error(`[store-reset] customer identities failed: ${e.message}`)
        }
      }

      if (customerIds.length) await customerSvc.softDeleteCustomers(customerIds)

      summary.customers = {
        customers: customerIds.length,
        login_identities_deleted: identitiesDeleted,
        credentials_deleted: credentialsDeleted,
      }
    } catch (e: any) {
      errors.customers = e.message
      logger?.error(`[store-reset] customers failed: ${e.message}`)
    }
  }

  // ── Products: last, because orders reference the variants ───────────────────
  // Categories, collections, brands, settings, users and roles are deliberately kept — this
  // clears the catalogue, not the shop's configuration.
  if (wantProducts) {
    try {
      const productSvc = req.scope.resolve(Modules.PRODUCT) as any
      const productIds = await collectIds((skip, take) =>
        productSvc.listProducts({}, { take, skip, select: ["id"] })
      )
      if (productIds.length) await productSvc.softDeleteProducts(productIds)

      // The inventory items those variants pointed at are orphans now.
      let itemCount = 0
      try {
        const inventory = req.scope.resolve(Modules.INVENTORY) as any
        const itemIds = await collectIds((skip, take) =>
          inventory.listInventoryItems({}, { take, skip, select: ["id"] })
        )
        if (itemIds.length) await inventory.softDeleteInventoryItems(itemIds)
        itemCount = itemIds.length
      } catch (e: any) {
        errors.inventory_items = e.message
      }

      summary.products = { products: productIds.length, inventory_items: itemCount }
    } catch (e: any) {
      errors.products = e.message
      logger?.error(`[store-reset] products failed: ${e.message}`)
    }
  }

  logger?.warn(`[store-reset] executed: ${JSON.stringify(summary)}`)

  const ok = Object.keys(errors).length === 0
  return res.status(ok ? 200 : 207).json({ success: ok, summary, errors })
}
