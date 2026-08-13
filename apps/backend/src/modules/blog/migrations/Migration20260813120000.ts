import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Blog: posts (markdown) + categories (taxonomy).
 *
 * `blog_post.category_ids` is a jsonb array of category ids rather than a join table — a store blog
 * has few posts, so filtering in memory is simpler and a category rename never rewrites posts.
 */
export class Migration20260813120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "blog_category" ("id" text not null, "name" text not null, "slug" text not null, "description" text null, "position" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_category_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_category_slug_unique" ON "blog_category" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_blog_category_deleted_at" ON "blog_category" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "blog_post" ("id" text not null, "title" text not null, "slug" text not null, "excerpt" text null, "content" text not null default '', "cover_image" text null, "author_name" text null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "published_at" timestamptz null, "category_ids" jsonb null, "seo_title" text null, "seo_description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_post_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_post_slug_unique" ON "blog_post" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_blog_post_status" ON "blog_post" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_blog_post_deleted_at" ON "blog_post" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "blog_post" cascade;`);
    this.addSql(`drop table if exists "blog_category" cascade;`);
  }

}
