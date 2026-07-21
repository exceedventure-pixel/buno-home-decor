import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_SETTINGS_MODULE } from "../../../modules/storeSettings"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORE_SETTINGS_MODULE)
  const [setting] = await svc.listStoreSettings({}, { take: 1 })
  res.json({
    whatsapp_number: setting?.whatsapp_number ?? null,
    order_phone: setting?.order_phone ?? null,
    // Footer contact + hotline + socials — public, so the storefront can render them.
    store_phone: setting?.store_phone ?? null,
    store_email: setting?.store_email ?? null,
    store_address: setting?.store_address ?? null,
    hotline: setting?.hotline ?? null,
    social_links: setting?.social_links ?? null,
  })
}
