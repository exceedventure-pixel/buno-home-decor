import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * `system_mode` — which shape of the system this store runs: `basic` or `advanced`.
 *
 * The column defaults to `basic` so a FRESH install starts simple, but every EXISTING row is then
 * backfilled to `advanced`: those stores are already running accounting + FIFO, and adding this
 * column must not silently downgrade them. The two are mixed in one migration on purpose — a
 * default alone would have flipped live stores to basic on deploy.
 */
export class Migration20260721090000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_setting" add column if not exists "system_mode" text not null default 'basic';`);
    // Existing stores are already on the advanced system — keep them there.
    this.addSql(`update "store_setting" set "system_mode" = 'advanced' where "system_mode" = 'basic';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "store_setting" drop column if exists "system_mode";`);
  }

}
