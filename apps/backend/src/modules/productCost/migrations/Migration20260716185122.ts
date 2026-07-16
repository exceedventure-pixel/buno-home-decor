import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Drop the per-variant packaging preset.
 *
 * Packaging is no longer allocated per unit out of a pool — it is expensed straight to cash on
 * the day it is bought (ledger category `packaging_purchase`, now klass "expense"). With no pool
 * to draw from, the preset has nothing to do.
 */
export class Migration20260716185122 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "variant_cost" drop column if exists "packaging_cost", drop column if exists "raw_packaging_cost";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "variant_cost" add column if not exists "packaging_cost" numeric not null default 0, add column if not exists "raw_packaging_cost" jsonb not null default '{"value":"0","precision":20}';`);
  }

}
