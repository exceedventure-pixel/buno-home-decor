import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

// Nav and Footer call this on every request, so it must never throw: a failure
// here would take down every page under the (main) layout, not just the nav.
// Callers get [] and render without categories instead.
export const listCategories = async (
  query?: Record<string, unknown>
): Promise<HttpTypes.StoreProductCategory[]> => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  const limit = query?.limit || 100

  try {
    const { product_categories } = await sdk.client.fetch<{
      product_categories: HttpTypes.StoreProductCategory[]
    }>("/store/product-categories", {
      query: {
        // No *products here — nothing that lists categories reads it, and
        // expanding every product of every category grows with the catalogue.
        fields: "*category_children, *parent_category, *parent_category.parent_category",
        limit,
        ...query,
      },
      next: { ...next, revalidate: 0 },
    })

    return product_categories ?? []
  } catch (error) {
    console.error(
      `Failed to load product categories: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next: { ...next, revalidate: 0 },
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
