import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Per-product customer reviews.
 *
 * Anyone may submit; every row starts `pending` and shows on the storefront only once approved.
 * `product_id` is a plain text id (no FK) so a product deletion never cascade-wipes its review
 * history, matching the variant_cost / stock_batch convention.
 */
export class Migration20260813100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_review" ("id" text not null, "product_id" text not null, "customer_id" text null, "author_name" text not null, "rating" integer not null, "title" text null, "content" text not null, "images" jsonb null, "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_product_id" ON "product_review" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_status" ON "product_review" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_deleted_at" ON "product_review" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_review" cascade;`);
  }

}
