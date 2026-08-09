import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260810100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "order_workflow"
        add column if not exists "customer_return_paid" numeric not null default 0,
        add column if not exists "raw_customer_return_paid" jsonb not null default '{"value":"0","precision":20}',
        add column if not exists "resolution_type" text check ("resolution_type" in ('rebook_courier', 'return_only', 'return_refund', 'exchange', 'rto_refused', 'damaged_in_transit', 'damaged_on_return', 'wrong_slip_correction')) null,
        add column if not exists "fault" text check ("fault" in ('our_fault', 'customer')) null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table if exists "order_workflow"
        drop column if exists "customer_return_paid",
        drop column if exists "raw_customer_return_paid",
        drop column if exists "resolution_type",
        drop column if exists "fault";
    `);
  }

}
