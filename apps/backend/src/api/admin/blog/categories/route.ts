import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BLOG_MODULE } from "../../../../modules/blog"
import { slugify } from "../posts/route"

/** A category slug that isn't already taken (appends -2, -3, …). */
async function uniqueCatSlug(svc: any, base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "category"
  let candidate = root
  let n = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await svc.listBlogCategories({ slug: candidate }, { take: 1 })
    if (!existing || existing.id === excludeId) return candidate
    n += 1
    candidate = `${root}-${n}`
  }
}

/** GET /admin/blog/categories — all categories with post counts. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const [categories, posts] = await Promise.all([
    svc.listBlogCategories({}, { order: { position: "ASC" }, take: 1000 }),
    svc.listBlogPosts({}, { take: 10000 }),
  ])
  res.json({
    categories: categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      position: c.position ?? 0,
      post_count: posts.filter((p: any) => (p.category_ids ?? []).includes(c.id)).length,
    })),
  })
}

/** POST /admin/blog/categories — create a category. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const b = (req.body ?? {}) as Record<string, any>
  const name = (b.name ?? "").trim()
  if (!name) return res.status(400).json({ message: "A category name is required." })

  const slug = await uniqueCatSlug(svc, b.slug || name)
  const [category] = await svc.createBlogCategories([
    { name, slug, description: (b.description ?? "").trim() || null, position: Number(b.position) || 0 },
  ])
  res.status(201).json({ category })
}
