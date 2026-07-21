import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * `store_phone` — the footer's own contact number.
 *
 * The footer previously borrowed `order_phone` (the storefront's "Call for Order" button), so the
 * two could never differ and there was no way to give the footer a contact number of its own.
 */
export class Migration20260721140000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_setting" add column if not exists "store_phone" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "store_setting" drop column if exists "store_phone";`);
  }

}
