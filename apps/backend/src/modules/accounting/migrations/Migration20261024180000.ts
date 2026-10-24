import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261024180000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ledger_entry" drop constraint if exists "ledger_entry_category_check";`);

    this.addSql(`alter table if exists "ledger_entry" add constraint "ledger_entry_category_check" check("category" in ('capital_contribution', 'partner_drawing', 'inventory_purchase', 'packaging_purchase', 'fixed_asset', 'marketing', 'courier_fee', 'other_expense', 'refund', 'production_cost', 'salary', 'project_payment', 'other_income'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "ledger_entry" drop constraint if exists "ledger_entry_category_check";`);

    this.addSql(`alter table if exists "ledger_entry" add constraint "ledger_entry_category_check" check("category" in ('capital_contribution', 'partner_drawing', 'inventory_purchase', 'packaging_purchase', 'fixed_asset', 'marketing', 'courier_fee', 'other_expense', 'refund', 'production_cost', 'other_income'));`);
  }

}
