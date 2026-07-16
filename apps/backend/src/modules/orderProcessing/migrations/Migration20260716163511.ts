import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Courier shipment on order_workflow, and removal of the zone/courier-rate system.
 *
 * ADD: courier shipment fields — set when an order is booked with a courier ("Send to Steadfast").
 * They live here rather than on the Medusa fulfilment because the parcel is booked before it ships
 * (no fulfilment exists yet). All nullable; a manual shipment leaves them null. bigNumber fields
 * carry the paired raw_* jsonb column, matching delivery_charged.
 *
 * DROP: the zone preset system (courier_rate table + order_workflow.courier_rate_id). The courier
 * cost is now captured from the courier's API when available, or typed manually — the zone presets
 * are redundant.
 */
export class Migration20260716163511 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_workflow" add column if not exists "courier_id" text null, add column if not exists "consignment_id" text null, add column if not exists "tracking_id" text null, add column if not exists "courier_status" text null, add column if not exists "cod_amount" numeric null, add column if not exists "actual_delivery_charge" numeric null, add column if not exists "raw_cod_amount" jsonb null, add column if not exists "raw_actual_delivery_charge" jsonb null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_workflow_consignment_id" ON "order_workflow" ("consignment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`alter table if exists "order_workflow" drop column if exists "courier_rate_id";`);
    this.addSql(`drop table if exists "courier_rate" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_order_workflow_consignment_id";`);
    this.addSql(`alter table if exists "order_workflow" drop column if exists "courier_id", drop column if exists "consignment_id", drop column if exists "tracking_id", drop column if exists "courier_status", drop column if exists "cod_amount", drop column if exists "actual_delivery_charge", drop column if exists "raw_cod_amount", drop column if exists "raw_actual_delivery_charge";`);
    this.addSql(`alter table if exists "order_workflow" add column if not exists "courier_rate_id" text null;`);
    this.addSql(`create table if not exists "courier_rate" ("id" text not null, "name" text not null, "fee" numeric not null default 0, "cod_fee_pct" numeric not null default 0, "is_default" boolean not null default false, "is_active" boolean not null default true, "raw_fee" jsonb not null default '{"value":"0","precision":20}', "raw_cod_fee_pct" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "courier_rate_pkey" primary key ("id"));`);
  }

}
