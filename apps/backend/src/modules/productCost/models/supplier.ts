import { model } from "@medusajs/framework/utils"

/**
 * A supplier you buy stock from — set up once, then picked from a list when restocking.
 *
 * Why a table rather than the free-text field it replaces: typing the name every restock produced
 * "Rahim", "rahim", "Rahim Traders" as three different suppliers, so spend-per-supplier could never
 * be totalled. A managed list makes the name consistent.
 *
 * The batch still records the supplier NAME (stock_batch.supplier), not a foreign key, on purpose:
 * a batch is a historical record of what was paid to whom. Renaming a supplier later must not
 * silently rewrite last year's purchases, and deleting one must not orphan them.
 */
const Supplier = model
  .define("supplier", {
    id: model.id({ prefix: "sup" }).primaryKey(),
    name: model.text(),
    phone: model.text().nullable(),
    note: model.text().nullable(),
    /** Retired suppliers stay for history but drop out of the restock picker. */
    is_active: model.boolean().default(true),
  })
  .indexes([{ on: ["name"] }])

export default Supplier
