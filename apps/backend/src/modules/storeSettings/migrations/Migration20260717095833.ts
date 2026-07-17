import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Two additions to store_setting:
 *   - invoice_phone: the contact number printed on invoices & packing slips, kept separate from
 *     order_phone (the storefront "Call for Order" button) so the two can differ.
 *   - social_links: JSON of the footer's social profile URLs (facebook/instagram/tiktok/youtube),
 *     so they're editable from admin instead of hard-coded in brand.config.
 */
export class Migration20260717095833 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_setting" add column if not exists "invoice_phone" text null, add column if not exists "social_links" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "store_setting" drop column if exists "invoice_phone", drop column if exists "social_links";`);
  }

}
