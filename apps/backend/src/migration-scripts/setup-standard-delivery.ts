import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  deleteShippingOptionsWorkflow,
} from "@medusajs/core-flows"

/**
 * SET UP the single calculated "Standard Delivery" shipping option and retire the old flat
 * "Standard Shipping" / "Express Shipping" options.
 *
 * Delivery is priced by the StandardDeliveryProvider (district + quantity). This script:
 *   1. finds that provider (must be registered + enabled in medusa-config),
 *   2. reads the store's service zone + shipping profile from an existing option,
 *   3. creates "Standard Delivery" (price_type: "calculated") if it isn't there yet,
 *   4. only THEN deletes the old flat options — so checkout is never left with zero options.
 *
 * Idempotent: safe to run more than once. Run:
 *   npx medusa exec ./src/migration-scripts/setup-standard-delivery.ts
 */
export default async function setup_standard_delivery({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillment: any = container.resolve(Modules.FULFILLMENT)

  const NEW_NAME = "Standard Delivery"
  const OLD_NAMES = ["Standard Shipping", "Express Shipping"]

  // 1. Find the pricing provider (id looks like "delivery_delivery"; match defensively).
  const providers = await fulfillment.listFulfillmentProviders({}, {})
  const provider = providers.find(
    (p: any) => typeof p.id === "string" && p.id.includes("delivery") && p.is_enabled
  )
  if (!provider) {
    logger.error(
      `[standard-delivery] Pricing provider not found/enabled. Available: ${providers
        .map((p: any) => `${p.id}${p.is_enabled ? "" : " (disabled)"}`)
        .join(", ")}. Is "./src/modules/standardDelivery/provider" registered in medusa-config and the server restarted?`
    )
    return
  }

  // 2. Read every store shipping option — to find the zone/profile and the options to retire.
  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "price_type", "provider_id", "service_zone_id", "shipping_profile_id"],
  })

  const already = options.find((o: any) => o.name === NEW_NAME && o.provider_id === provider.id)

  // 3. Create the calculated option if it isn't there.
  if (already) {
    logger.info(`[standard-delivery] "${NEW_NAME}" already exists (${already.id}). Skipping create.`)
  } else {
    // Borrow the service zone + shipping profile from any existing option — they define the BD
    // fulfillment set the store already ships from.
    const template = options.find((o: any) => o.service_zone_id && o.shipping_profile_id)
    if (!template) {
      logger.error(
        "[standard-delivery] No existing shipping option to read the service zone / shipping " +
          "profile from. Run the Bangladesh seed first, then re-run this script."
      )
      return
    }

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: NEW_NAME,
          price_type: "calculated",
          provider_id: provider.id,
          service_zone_id: template.service_zone_id,
          shipping_profile_id: template.shipping_profile_id,
          type: {
            label: "Standard",
            description: "Delivery charge by district and quantity.",
            code: "standard-delivery",
          },
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ] as any,
    })
    logger.info(`[standard-delivery] Created calculated "${NEW_NAME}" on ${provider.id}.`)
  }

  // 4. Retire the old flat options — only now that the new one is guaranteed to exist.
  const toDelete = options.filter((o: any) => OLD_NAMES.includes(o.name)).map((o: any) => o.id)
  if (toDelete.length) {
    await deleteShippingOptionsWorkflow(container).run({ input: { ids: toDelete } })
    logger.info(`[standard-delivery] Removed ${toDelete.length} old flat option(s): ${OLD_NAMES.join(", ")}.`)
  } else {
    logger.info("[standard-delivery] No old flat options to remove.")
  }

  logger.info("[standard-delivery] Done. Checkout now shows a single, district-priced Standard Delivery.")
}
