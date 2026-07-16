import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Store contact details shown on printed invoices & packing slips: email + postal address.
 * Nullable text; the print template falls back to sensible brand defaults when they're empty.
 */
export class Migration20260716205448 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_setting" add column if not exists "store_email" text null, add column if not exists "store_address" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "store_setting" drop column if exists "store_email", drop column if exists "store_address";`);
  }

}
