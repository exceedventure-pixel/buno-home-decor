import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260806120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_workflow" add column if not exists "source" text check ("source" in ('website', 'manual')) not null default 'website';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_workflow" drop column if exists "source";`);
  }

}
