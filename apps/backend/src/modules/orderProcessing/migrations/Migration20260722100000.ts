import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Exchange links between an order and its replacement.
 *
 * An exchange ships the correct item as its OWN order, so each parcel keeps its own courier cost
 * and P&L — the first delivery is our loss, the replacement is charged normally. These two columns
 * are what stop the pair becoming unrelated orders nobody can connect afterwards.
 */
export class Migration20260722100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_workflow" add column if not exists "replaces_order_id" text null, add column if not exists "replaced_by_order_id" text null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_workflow_replaces_order_id" ON "order_workflow" ("replaces_order_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_order_workflow_replaces_order_id";`);
    this.addSql(`alter table if exists "order_workflow" drop column if exists "replaces_order_id", drop column if exists "replaced_by_order_id";`);
  }

}
