import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * THE FRESH-INSTALL SEED. It builds the smallest store that can actually take an order in
 * Bangladesh, and nothing else.
 *
 * ---------------------------------------------------------------------------------
 * RULE: one country, one currency.
 * ---------------------------------------------------------------------------------
 *
 * This used to be Medusa's starter seed — a Europe region, EUR + USD, a Copenhagen warehouse and
 * four demo t-shirts. Every one of those is a trap for a Dhaka home-decor shop: an order placed
 * against the wrong region is stamped with that region's currency FOREVER (Medusa never lets an
 * order change currency), so a stray EUR order is a permanently wrong row in the books.
 *
 * So the store is BDT-only and the only region is Asia, holding Bangladesh. Adding India or Nepal
 * later means adding a country to that region — not a second currency.
 *
 * No products are seeded. This is a real shop's catalogue, not a demo's.
 */
export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );

  // Idempotency guard — this seed is for a FRESH install only. If a region already
  // exists the store is already set up, so skip. Without this, the script errors
  // partway (data already exists), never gets marked complete, and re-runs on every
  // `db:migrate` — creating duplicate sales channels / stock locations each time.
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id"],
    pagination: { take: 1 },
  });
  if (existingRegions.length > 0) {
    logger.info("Store already seeded — skipping initial-data-seed.");
    return;
  }

  // This runs during `db:migrate`, which the container executes on startup — a failure here must
  // NOT block boot. Log and return so the migration script is still marked complete (never
  // re-runs, no duplicate channels/locations).
  try {
    logger.info("Seeding store data...");
    const {
      result: [defaultSalesChannel],
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
            description: "Created by Medusa",
          },
        ],
      },
    });

    const {
      result: [publishableApiKey],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Default Publishable API Key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel.id],
      },
    });

    // BDT is the ONLY supported currency. A second one here is what lets an order be priced in
    // something the books can't account for.
    await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: "Default Store",
            supported_currencies: [
              {
                currency_code: "bdt",
                is_default: true,
              },
            ],
            default_sales_channel_id: defaultSalesChannel.id,
          },
        ],
      },
    });

    logger.info("Seeding region data...");
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            // Named for the region, not the country, so India/Nepal can join it later without a
            // second region (and without a second currency).
            name: "Asia",
            currency_code: "bdt",
            countries: ["bd"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    const region = regionResult[0];
    logger.info("Finished seeding regions.");

    logger.info("Seeding tax regions...");
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "bd", provider_id: "tp_system" }],
    });
    logger.info("Finished seeding tax regions.");

    logger.info("Seeding stock location data...");
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "Dhaka Warehouse",
            address: {
              city: "Dhaka",
              country_code: "BD",
              address_1: "",
            },
          },
        ],
      },
    });
    const stockLocation = stockLocationResult[0];

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });

    logger.info("Seeding fulfillment data...");
    // This is created by a migration script in core.
    const { data: shippingProfileResult } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
    });
    const shippingProfile = shippingProfileResult[0];

    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Bangladesh delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Bangladesh",
          geo_zones: [
            {
              country_code: "bd",
              type: "country",
            },
          ],
        },
      ],
    });

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });

    /**
     * Starting prices only — what the CUSTOMER pays for delivery. They mirror the Inside/Outside
     * Dhaka courier zones in modules/orderProcessing/constants.ts so delivery margin starts at
     * roughly break-even rather than at a silent loss. Edit them in Admin → Shipping.
     */
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Inside Dhaka",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Delivered inside Dhaka in 1-2 days.",
            code: "standard",
          },
          prices: [
            {
              currency_code: "bdt",
              amount: 60,
            },
            {
              region_id: region.id,
              amount: 60,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
        {
          name: "Outside Dhaka",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Delivered outside Dhaka in 2-4 days.",
            code: "outside-dhaka",
          },
          prices: [
            {
              currency_code: "bdt",
              amount: 120,
            },
            {
              region_id: region.id,
              amount: 120,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    });
    logger.info("Finished seeding fulfillment data.");

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel.id],
      },
    });
    logger.info("Finished seeding stock location data.");

    /**
     * No products, and therefore no inventory levels. That is deliberate on both counts.
     *
     * Stock must ENTER through a restock, because that is what records what it cost. Seeding a
     * product with stock already on the shelf invents inventory that no cash ever bought, and the
     * books can never say what those units cost.
     *
     * First jobs on a fresh store: add your products, then restock them.
     */
    logger.info(
      "🇧🇩  Bangladesh store seeded (Asia / BDT). Add your products, then restock to bring in costed stock."
    );
  } catch (e: any) {
    logger.error(
      `initial-data-seed did not complete (the store still boots — create region/products in the admin): ${e?.message ?? e}`
    );
  }
}
