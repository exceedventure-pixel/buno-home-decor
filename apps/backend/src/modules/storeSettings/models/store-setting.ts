import { model } from "@medusajs/framework/utils"

const StoreSetting = model.define("store_setting", {
  id: model.id().primaryKey(),
  whatsapp_number: model.text().nullable(),
  order_phone: model.text().nullable(),
  // Shown on printed invoices & packing slips (the store name, tagline and logo are fixed brand
  // assets baked into the print template; these are the parts that change per store).
  // FOOTER contact — email + address shown in the storefront footer.
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
})

export default StoreSetting
