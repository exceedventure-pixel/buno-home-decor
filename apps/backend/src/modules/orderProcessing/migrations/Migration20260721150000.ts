import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * `production_freight` — freight on a made-to-order item.
 *
 * Ready-stock carries its freight inside the restock batch's landed cost. A pre-order/custom order
 * never goes through a restock, so freight on those had nowhere to be recorded and the cost simply
 * disappeared from the order's P&L. It is counted inside cost of goods next to production cost.
 *
 * bigNumber, so the paired raw_* jsonb column comes with it — matching production_cost.
 */
export class Migration20260721150000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_workflow" add column if not exists "production_freight" numeric not null default 0, add column if not exists "raw_production_freight" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_workflow" drop column if exists "production_freight", drop column if exists "raw_production_freight";`);
  }

}
