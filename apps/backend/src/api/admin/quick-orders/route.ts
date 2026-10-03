import { createOrderWorkflow } from "@medusajs/core-flows"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { requireSellableLocation } from "../../../lib/inventory/stock-location"
import { checkAvailability, checkShortages, reserveOrderItems, type AvailabilityProblem } from "../../../lib/orders/reserve"
import { ORDER_PROCESSING_MODULE } from "../../../modules/orderProcessing"
import { ORDER_TYPES, type OrderType } from "../../../modules/orderProcessing/constants"
import {
  captureAdvanceWorkflow,
  setProductionCostWorkflow,
} from "../../../workflows/orderProcessing"

/**
 * POST /admin/quick-orders — place an order for a customer (social / phone / in-store).
 *
 * Three types, and the type changes what happens to stock:
 *
 *   ready_stock — off the shelf. Refuse it if the stock isn't there, then reserve it (exactly
 *                 what storefront cart-completion does; createOrderWorkflow does NOT reserve, so
 *                 without this manual orders drove stock negative).
 *   pre_order   — sold before it's made. Line items carry NO variant_id, so Medusa never touches
 *                 stock. No availability check, no reservation. Cost is the production cost.
 *   custom      — like pre_order but free-form items.
 *
 * Manual orders are COD by default; an optional advance is captured up front.
 */

type LineInput = {
  variant_id?: string
  product_id?: string
  title: string
  quantity: number | string
  unit_price: number | string
}

type Body = {
  order_type?: OrderType
  customer: {
    name: string
    phone: string
    email?: string
    address_1: string
    city?: string
    postal_code?: string
    country_code?: string
  }
  items: LineInput[]
  region_id: string
  sales_channel_id: string
  shipping?: { name?: string; amount: number | string; shipping_option_id?: string }
  currency_code?: string
  note?: string
  advance_amount?: number | string
  /**
   * Money off the ITEMS subtotal (delivery is never discounted — it's a real cost we pay out).
   * Sent as an absolute amount; a percentage is worked out in the UI so the server only ever
   * deals in taka and the two can't disagree about rounding.
   */
  discount_amount?: number | string
  production_cost?: number | string
  /** Freight on a made-to-order item — part of its cost of goods. */
  production_freight?: number | string
}

function syntheticEmail(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "")
  return `p${digits || Date.now()}@manual.local`
}

/**
 * Temporarily toggle allow_backorder for variants so that Medusa's createOrderWorkflow
 * (confirmVariantInventoryWorkflow) does not block manual backorder placement.
 * Uses direct PostgreSQL update via Knex for 100% reliability, plus product module service.
 */
async function setVariantsAllowBackorder(
  scope: any,
  ids: string[],
  allow: boolean
): Promise<void> {
  if (!ids.length) return
  const logger: any = scope.resolve("logger")

  // 1. Direct DB update via PG_CONNECTION (Knex) — 100% reliable, zero DTO quirks
  try {
    const pg = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
    if (pg) {
      await pg("product_variant")
        .whereIn("id", ids)
        .update({ allow_backorder: allow })
    }
  } catch (pgErr: any) {
    logger?.warn(`[quick-orders] Direct DB allow_backorder update failed: ${pgErr.message}`)
  }

  // 2. Also update via Product Module Service so internal caches/entity manager reflect it
  try {
    const productSvc = scope.resolve(Modules.PRODUCT) as any
    if (productSvc?.updateProductVariants) {
      await productSvc.updateProductVariants({ id: ids }, { allow_backorder: allow })
    }
  } catch {
    try {
      const productSvc = scope.resolve(Modules.PRODUCT) as any
      for (const id of ids) {
        await productSvc.updateProductVariants(id, { allow_backorder: allow })
      }
    } catch (svcErr: any) {
      // Direct DB update already succeeded
    }
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const b = (req.body ?? {}) as Body
    const c = b.customer

    const orderType: OrderType = ORDER_TYPES.includes(b.order_type as OrderType)
      ? (b.order_type as OrderType)
      : "ready_stock"
    const isReadyStock = orderType === "ready_stock"

    if (!c?.phone?.trim() || !c?.name?.trim() || !c?.address_1?.trim()) {
      return res.status(400).json({ error: "Customer name, phone and address are required." })
    }
    if (!b.items?.length) {
      return res.status(400).json({ error: "Add at least one item." })
    }
    if (isReadyStock && b.items.some((it) => !it.variant_id)) {
      return res.status(400).json({ error: "Ready-stock items must be picked from your products." })
    }
    if (!b.region_id || !b.sales_channel_id) {
      return res.status(400).json({ error: "region_id and sales_channel_id are required." })
    }

    const [first_name, ...rest] = c.name.trim().split(/\s+/)
    const last_name = rest.join(" ") || undefined
    const email = (c.email && c.email.trim()) || syntheticEmail(c.phone)

    // Resolve or create the customer (by phone, then email)
    const customerSvc: any = req.scope.resolve(Modules.CUSTOMER)
    let customerId: string | undefined
    const byPhone = await customerSvc.listCustomers({ phone: c.phone.trim() }, { take: 1 })
    if (byPhone?.length) {
      customerId = byPhone[0].id
    } else {
      const byEmail = await customerSvc.listCustomers({ email }, { take: 1 })
      if (byEmail?.length) {
        customerId = byEmail[0].id
      } else {
        const [created] = await customerSvc.createCustomers([
          { email, phone: c.phone.trim(), first_name, last_name },
        ])
        customerId = created.id
      }
    }

    const address = {
      first_name,
      last_name,
      phone: c.phone.trim(),
      address_1: c.address_1.trim(),
      city: c.city?.trim() || undefined,
      postal_code: c.postal_code?.trim() || undefined,
      country_code: (c.country_code || "bd").toLowerCase(),
    }

    /**
     * Pre-order/custom items are deliberately created WITHOUT a variant_id. That is the whole
     * mechanism that stops Medusa reserving or deducting stock for goods that don't exist yet.
     * We keep product_id for identity where we have it, but never the variant.
     */
    const rawItems = b.items.map((it) => ({
      title: it.title,
      quantity: Math.max(1, Number(it.quantity) || 1),
      unit_price: Math.max(0, Number(it.unit_price) || 0),
      variant_id: it.variant_id,
      product_id: it.product_id,
    }))

    /**
     * A DISCOUNT REDUCES WHAT WE ACTUALLY CHARGED, so it is applied to the line prices themselves
     * and the original is kept in `compare_at_unit_price`.
     *
     * Medusa's order-creation DTO has no line-item `adjustments`, so there is no promotion object to
     * hang it on. Baking it into the price is not a shortcut — it is the honest option: revenue,
     * profit and the customer's invoice all reflect the money that changed hands. A discount that
     * left `item_total` untouched would overstate revenue on every discounted order.
     *
     * Spread PROPORTIONALLY across lines, with the rounding remainder pushed onto the largest line
     * so the discount given is exactly the discount asked for — never a taka more or less.
     */
    const subtotal = rawItems.reduce((s, it) => s + it.unit_price * it.quantity, 0)
    const discount = Math.min(Math.max(0, Number(b.discount_amount) || 0), subtotal)

    const discountByIndex = new Array(rawItems.length).fill(0)
    if (discount > 0 && subtotal > 0) {
      let assigned = 0
      let largest = 0
      rawItems.forEach((it, i) => {
        const lineTotal = it.unit_price * it.quantity
        const share = Math.round((discount * lineTotal) / subtotal)
        discountByIndex[i] = share
        assigned += share
        if (lineTotal > rawItems[largest].unit_price * rawItems[largest].quantity) largest = i
      })
      // Rounding drift lands on the biggest line, where it's proportionally smallest.
      discountByIndex[largest] += discount - assigned
    }

    const items = rawItems.map((it, i) => {
      const lineDiscount = discountByIndex[i]
      const discounted =
        lineDiscount > 0
          ? Math.max(0, (it.unit_price * it.quantity - lineDiscount) / it.quantity)
          : it.unit_price

      const base: Record<string, unknown> = {
        title: it.title,
        quantity: it.quantity,
        unit_price: discounted,
        // Keeps the pre-discount price on the order, so the saving stays visible and auditable.
        ...(lineDiscount > 0 ? { compare_at_unit_price: it.unit_price } : {}),
      }
      if (isReadyStock) {
        return { ...base, variant_id: it.variant_id, product_id: it.product_id }
      }
      return it.product_id ? { ...base, product_id: it.product_id } : base
    })

    // Check inventory shortage. Manual orders are allowed even when out of stock;
    // they automatically enter the Backorders queue until stock is restocked and allocated.
    let shortages: AvailabilityProblem[] = []
    if (isReadyStock) {
      shortages = await checkShortages(
        req.scope,
        items.map((i: any) => ({ variant_id: i.variant_id, quantity: i.quantity, title: i.title }))
      )
    }
    const isBackorder = shortages.length > 0

    const shipping_methods = b.shipping
      ? [
          {
            name: b.shipping.name || "Delivery",
            amount: Math.max(0, Number(b.shipping.amount) || 0),
            shipping_option_id: b.shipping.shipping_option_id,
          },
        ]
      : []

    // If this order contains variants with allow_backorder: false, Medusa's createOrderWorkflow
    // validates inventory availability and rejects them if out of stock.
    // For manual admin orders, staff must be able to place backorders even if backorder is not
    // activated for the product yet. We temporarily set allow_backorder: true during order creation
    // and restore immediately afterwards in finally block.
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const allVariantIds = Array.from(
      new Set(items.map((it: any) => it.variant_id).filter(Boolean))
    ) as string[]

    let variantsToRevert: string[] = []
    if (isReadyStock && allVariantIds.length) {
      try {
        const { data: vData } = await query.graph({
          entity: "product_variant",
          fields: ["id", "allow_backorder"],
          filters: { id: allVariantIds },
        })
        variantsToRevert = (vData ?? [])
          .filter((v: any) => !v.allow_backorder)
          .map((v: any) => v.id)
      } catch (err: any) {
        const logger: any = req.scope.resolve("logger")
        logger?.warn(`[quick-orders] Could not query variants for allow_backorder: ${err.message}`)
      }
    }

    let order: any
    try {
      if (variantsToRevert.length) {
        await setVariantsAllowBackorder(req.scope, variantsToRevert, true)
      }

      const { result } = await createOrderWorkflow(req.scope).run({
        input: {
          region_id: b.region_id,
          sales_channel_id: b.sales_channel_id,
          customer_id: customerId,
          email,
          currency_code: (b.currency_code || "bdt").toLowerCase(),
          status: "pending",
          no_notification: true,
          shipping_address: address,
          billing_address: address,
          items,
          shipping_methods,
          metadata: {
            ...(b.note ? { manual_note: b.note } : {}),
            is_backorder: isBackorder,
            ...(isBackorder ? { backorder_shortages: shortages } : {}),
          },
        } as any,
      })
      order = result
    } finally {
      if (variantsToRevert.length) {
        try {
          await setVariantsAllowBackorder(req.scope, variantsToRevert, false)
        } catch (err: any) {
          const logger: any = req.scope.resolve("logger")
          logger?.error(`[quick-orders] Failed to revert allow_backorder: ${err.message}`)
        }
      }
    }

    const orderId = (order as any)?.id
    const advance = Math.max(0, Number(b.advance_amount) || 0)
    const production = Math.max(0, Number(b.production_cost) || 0)
    const productionFreight = Math.max(0, Number(b.production_freight) || 0)
    const warnings: string[] = []

    // Record the order's type + COD intent. Upsert, because the order.placed subscriber may have
    // already created the row (it defaults to ready_stock — we correct it here).
    try {
      const opSvc: any = req.scope.resolve(ORDER_PROCESSING_MODULE)
      const [existing] = await opSvc.listOrderWorkflows({ order_id: orderId })
      if (existing) {
        await opSvc.updateOrderWorkflows([
          {
            id: existing.id,
            order_type: orderType,
            // Placed by staff, not through the storefront. The sync subscriber created this row as
            // "website" on order.placed; correct it here (both branches, so it's right whichever ran).
            source: "manual",
            is_cod: true,
            advance_amount: advance,
            production_freight: productionFreight,
          },
        ])
      } else {
        await opSvc.createOrderWorkflows([
          {
            order_id: orderId,
            order_type: orderType,
            source: "manual",
            is_cod: true,
            advance_amount: advance,
            production_freight: productionFreight,
          },
        ])
      }
    } catch (e: any) {
      warnings.push(`Order type not recorded: ${e.message}`)
    }

    // Production cost (pre-order/custom) — stored on the order AND booked to the Cash Book.
    if (!isReadyStock && production > 0) {
      try {
        await setProductionCostWorkflow(req.scope).run({
          input: { order_id: orderId, cost: production },
        })
      } catch (e: any) {
        warnings.push(`Production cost not recorded: ${e.message}`)
      }
    }

    // Reserve stock — ready-stock only. createOrderWorkflow doesn't, so this is what prevents the
    // negative-stock bug for admin orders.
    let reservation: { reserved: number; skipped: number } | null = null
    if (isReadyStock) {
      try {
        reservation = await reserveOrderItems(req.scope, orderId)
      } catch (e: any) {
        const logger: any = req.scope.resolve("logger")
        logger?.error(`[quick-orders] ${orderId} created but NOT reserved: ${e.message}`)
        warnings.push(
          `Stock could NOT be reserved (${e.message}). Allocate it before fulfilling, or the ` +
            `quantity may go negative.`
        )
      }
    }

    // Take the advance up front (COD balance is collected later at Delivered).
    if (advance > 0) {
      try {
        await captureAdvanceWorkflow(req.scope).run({ input: { order_id: orderId, amount: advance } })
      } catch (e: any) {
        warnings.push(`Advance of ${advance} could not be captured: ${e.message}`)
      }
    }

    return res.json({
      order_id: orderId,
      order,
      order_type: orderType,
      is_backorder: isBackorder,
      shortages: isBackorder ? shortages : undefined,
      reservation,
      warning: isBackorder
        ? `Placed as Backorder: ${shortages.map((s) => `${s.title} (${s.requested} needed, only ${s.available} in stock)`).join("; ")}. This order is waiting in the Backorders tab for restock.`
        : (warnings.length ? warnings.join(" ") : undefined),
    })
  } catch (err: any) {
    const logger: any = req.scope.resolve("logger")
    logger?.error(`[quick-orders] Failed to create manual order: ${err.message}`, err)
    return res.status(400).json({
      error: err.message || "Failed to create order",
      message: err.message || "Failed to create order",
    })
  }
}

/**
 * GET /admin/quick-orders?variant_ids=id1,id2
 *
 * Returns live available warehouse stock and inventory tracking status for variants,
 * so the manual order screen can warn staff if an item will be placed on backorder.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { variant_ids } = req.query as { variant_ids?: string }
  if (!variant_ids) {
    return res.json({ stock: {} })
  }
  const ids = variant_ids
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!ids.length) {
    return res.json({ stock: {} })
  }

  const stock: Record<
    string,
    { available: number; stocked: number; reserved: number; manage_inventory: boolean; title: string }
  > = {}

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const inventory: any = req.scope.resolve(Modules.INVENTORY)
    const loc = await requireSellableLocation(req.scope)

    const { data: vData } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "title",
        "manage_inventory",
        "inventory_items.inventory_item_id",
        "inventory_items.required_quantity",
      ],
      filters: { id: ids },
    })

    const itemIds = (vData ?? [])
      .map((v: any) => v.inventory_items?.[0]?.inventory_item_id)
      .filter(Boolean)
    const levels = itemIds.length
      ? await inventory.listInventoryLevels({ inventory_item_id: itemIds, location_id: loc.id })
      : []
    const levelByItem = new Map<string, any>(levels.map((l: any) => [l.inventory_item_id, l]))

    for (const v of (vData ?? []) as any[]) {
      const itemId = v.inventory_items?.[0]?.inventory_item_id
      const reqQty = Number(v.inventory_items?.[0]?.required_quantity) || 1
      if (!itemId || v.manage_inventory === false) {
        stock[v.id] = {
          available: 999999,
          stocked: 999999,
          reserved: 0,
          manage_inventory: false,
          title: v.title ?? v.id,
        }
        continue
      }
      const lvl = levelByItem.get(itemId)
      const stocked = Number(lvl?.stocked_quantity) || 0
      const reserved = Number(lvl?.reserved_quantity) || 0
      const available = Math.max(0, Math.floor((stocked - reserved) / reqQty))
      stock[v.id] = {
        available,
        stocked,
        reserved,
        manage_inventory: true,
        title: v.title ?? v.id,
      }
    }
  } catch (err: any) {
    // Return graceful partial result on error
  }

  res.json({ stock })
}

