import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Supplier list for restocking.
 *
 * Replaces the free-text supplier box on the restock form, which produced "Rahim", "rahim" and
 * "Rahim Traders" as three different suppliers so spend could never be totalled per supplier.
 *
 * `stock_batch.supplier` deliberately stays a TEXT name rather than becoming a foreign key: a
 * batch is a historical record of what was paid to whom, so renaming or retiring a supplier must
 * not rewrite past purchases or orphan them.
 */
export class Migration20260720120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "supplier" ("id" text not null, "name" text not null, "phone" text null, "note" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_name" ON "supplier" ("name") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_deleted_at" ON "supplier" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "supplier" cascade;`);
  }

}
