import { model } from "@medusajs/framework/utils"

const StoreSetting = model.define("store_setting", {
  id: model.id().primaryKey(),
  whatsapp_number: model.text().nullable(),
  order_phone: model.text().nullable(),
  // Shown on printed invoices & packing slips (the store name, tagline and logo are fixed brand
  // assets baked into the print template; these are the parts that change per store).
  // FOOTER contact — phone + email + address shown in the storefront footer. The phone is its own
  // field rather than reusing `order_phone`: the "Call for Order" button and the address block a
  // customer writes to are not necessarily the same number.
  store_phone: model.text().nullable(),
  store_email: model.text().nullable(),
  store_address: model.text().nullable(),
  // INVOICE / PACKING contact — printed on documents, kept separate from the footer AND from the
  // storefront order phone, so the shop's public contact and its warehouse/return details can all
  // differ. Falls back to the footer values (and order phone) when left blank.
  invoice_phone: model.text().nullable(),
  invoice_email: model.text().nullable(),
  invoice_address: model.text().nullable(),
  // Customer-service hotline number(s), shown on the storefront.
  hotline: model.text().nullable(),
  // Social profile URLs shown in the storefront footer. Shape: { facebook, instagram, tiktok,
  // youtube } — any left blank is hidden. Matches brand.config.social, which is the fallback.
  social_links: model.json().nullable(),
  product_card_style: model.text().nullable(),
  product_card_fields: model.json().nullable(),
  card_button_layout: model.text().nullable(),
  card_action_mode: model.text().nullable(),
  card_badge_settings: model.json().nullable(),
  card_text_align: model.text().nullable(),
  card_grid_columns: model.json().nullable(),
  email_enabled: model.boolean().default(true),
  email_order_placed: model.boolean().default(true),
  email_order_shipped: model.boolean().default(true),
  email_order_canceled: model.boolean().default(true),
  email_password_reset: model.boolean().default(true),
  email_sender_name: model.text().nullable(),
  sms_order_placed: model.boolean().default(false),
  sms_order_shipped: model.boolean().default(false),
  sms_order_canceled: model.boolean().default(false),
  // Secrets (Resend / SMS API keys, Twilio token) live in environment variables.
  // These remaining fields are non-secret branding/routing, editable in admin.
  resend_from_email: model.text().nullable(),
  resend_from_name: model.text().nullable(),
  sms_sender_id: model.text().nullable(),
  sms_provider: model.text().nullable(),
  sms_api_url: model.text().nullable(),
  // Per-provider payment enable toggles, e.g. { stripe: true, sslcommerz: false }.
  // The provider must also be configured (env) and enabled per-region to appear at checkout.
  payment_enabled: model.json().nullable(),
  /**
   * WHICH SHAPE OF THE SYSTEM THIS STORE RUNS.
   *
   *   basic    — default Medusa: stock quantity typed up and down, one cost price per variant,
   *              no Cash Book, no FIFO batches, no restock flow. Sales Insights still works.
   *   advanced — Cash Book, partners, fixed assets, marketing, FIFO cost layers and suppliers.
   *
   * New installs start `basic`; the migration backfills existing stores to `advanced`, because
   * they are already running it and must not change underneath anyone. Switching is a deliberate
   * "roll" that RESETS the store (see api/admin/system-mode) — the modes are never mixed, which is
   * what keeps stock from existing with no cost layer behind it.
   */
  system_mode: model.enum(["basic", "advanced"]).default("basic"),
})

export default StoreSetting
