import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/core-flows"

/**
 * SET UP a ৳0 "Return Delivery" shipping option (is_return = true).
 *
 * Medusa's native return workflow (createAndCompleteReturnOrderWorkflow) ALWAYS creates a return
 * fulfillment, which requires an is_return shipping option. The store only had outbound
 * (is_return=false) options, so every return threw "shippingOption - id must be defined" and no
 * return / RTO / exchange could be recorded. This creates the missing option.
 *
 * The option is flat ৳0 and enabled_in_store=false — it's an internal bookkeeping option, never
 * shown at checkout, and its provider's createReturnFulfillment is a no-op (no courier is
 * contacted). It borrows the same service zone + shipping profile as an existing outbound option so
 * returns land in the one canonical warehouse (see requireSellableLocation).
 *
 * Idempotent: safe to run more than once. Run:
 *   npx medusa exec ./src/migration-scripts/setup-return-delivery.ts
 */
export default async function setup_return_delivery({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const NEW_NAME = "Return Delivery"

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "provider_id",
      "service_zone_id",
      "shipping_profile_id",
      "rules.attribute",
      "rules.value",
    ],
  })

  // 1. Already there? An option carrying an is_return=true rule is our return option.
  const existing = options.find((o: any) =>
    (o.rules ?? []).some((r: any) => r.attribute === "is_return" && r.value === "true")
  )
  if (existing) {
    logger.info(`[return-delivery] Return option already exists (${existing.id}). Nothing to do.`)
    return
  }

  // 2. Borrow zone + profile + provider from an existing outbound option — the BD fulfillment set
  //    the store already ships from.
  const template = options.find(
    (o: any) => o.service_zone_id && o.shipping_profile_id && o.provider_id
  )
  if (!template) {
    logger.error(
      "[return-delivery] No existing shipping option to read the service zone / shipping profile " +
        "from. Run the Bangladesh seed and setup-standard-delivery first, then re-run this script."
    )
    return
  }

  // 3. Create the ৳0 return option.
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: NEW_NAME,
        price_type: "flat",
        provider_id: template.provider_id,
        service_zone_id: template.service_zone_id,
        shipping_profile_id: template.shipping_profile_id,
        type: {
          label: "Return",
          description: "Internal option for recording returns. Never shown at checkout.",
          code: "return-delivery",
        },
        prices: [{ currency_code: "bdt", amount: 0 }],
        rules: [
          { attribute: "is_return", value: "true", operator: "eq" },
          { attribute: "enabled_in_store", value: "false", operator: "eq" },
        ],
      },
    ] as any,
  })

  logger.info(`[return-delivery] Created "${NEW_NAME}" (৳0, is_return) on ${template.provider_id}.`)
}
