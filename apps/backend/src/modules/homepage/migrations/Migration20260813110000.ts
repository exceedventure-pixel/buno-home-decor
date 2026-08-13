import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Allow the `review_showcase` home-section type — a manual testimonials section with photos.
 *
 * `home_section.type` is a text column guarded by a CHECK constraint listing the allowed values, so
 * a new section type is a constraint swap (the same way brand_showcase was added). Reversible.
 */
export class Migration20260813110000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "home_section" DROP CONSTRAINT IF EXISTS "home_section_type_check";`)
    this.addSql(`ALTER TABLE "home_section" ADD CONSTRAINT "home_section_type_check" CHECK ("type" IN ('hero_carousel', 'featured_categories', 'product_showcase', 'brand_showcase', 'review_showcase'));`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "home_section" DROP CONSTRAINT IF EXISTS "home_section_type_check";`)
    this.addSql(`ALTER TABLE "home_section" ADD CONSTRAINT "home_section_type_check" CHECK ("type" IN ('hero_carousel', 'featured_categories', 'product_showcase', 'brand_showcase'));`)
  }

}
