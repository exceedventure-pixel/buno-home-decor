import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BLOG_MODULE } from "../../../modules/blog"

/**
 * GET /store/blog[?category=<slug>&limit=&offset=] — published posts + the category list. Public.
 *
 * Only `published` posts with a `published_at` in the past are returned (newest first). Filtering
 * and pagination happen in memory — a store blog has few posts, so this stays simpler than a jsonb
 * "contains" query on category_ids.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const { category, limit, offset } = req.query as Record<string, string | undefined>

  const [posts, categories] = await Promise.all([
    svc.listBlogPosts({ status: "published" }, { take: 10000 }),
    svc.listBlogCategories({}, { order: { position: "ASC" }, take: 1000 }),
  ])

  const catById = new Map<string, { name: string; slug: string }>(
    categories.map((c: any) => [c.id, { name: c.name, slug: c.slug }])
  )

  const now = Date.now()
  let live = posts
    .filter((p: any) => !p.published_at || new Date(p.published_at).getTime() <= now)
    .sort(
      (a: any, b: any) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
    )

  if (category) {
    const cat = categories.find((c: any) => c.slug === category)
    live = cat ? live.filter((p: any) => (p.category_ids ?? []).includes(cat.id)) : []
  }

  const total = live.length
  const take = Math.min(Math.max(Number(limit) || 12, 1), 48)
  const skip = Math.max(Number(offset) || 0, 0)
  const page = live.slice(skip, skip + take)

  res.json({
    total,
    posts: page.map((p: any) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt ?? null,
      cover_image: p.cover_image ?? null,
      author_name: p.author_name ?? null,
      published_at: p.published_at ?? p.created_at,
      categories: (p.category_ids ?? []).map((id: string) => catById.get(id)).filter(Boolean),
    })),
    categories: categories.map((c: any) => ({
      name: c.name,
      slug: c.slug,
      // How many live posts sit in this category — powers the filter chips' counts.
      count: posts.filter(
        (p: any) =>
          (p.category_ids ?? []).includes(c.id) &&
          (!p.published_at || new Date(p.published_at).getTime() <= now)
      ).length,
    })),
  })
}
