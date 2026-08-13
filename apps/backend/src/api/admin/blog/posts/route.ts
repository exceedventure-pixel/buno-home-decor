import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BLOG_MODULE } from "../../../../modules/blog"
import { POST_STATUSES } from "../../../../modules/blog/constants"

/** kebab-case a title into a URL slug. */
export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** A slug that isn't already taken by another post (appends -2, -3, …). */
export async function uniqueSlug(svc: any, base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "post"
  let candidate = root
  let n = 1
  // Small blog — a handful of lookups at most.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await svc.listBlogPosts({ slug: candidate }, { take: 1 })
    if (!existing || existing.id === excludeId) return candidate
    n += 1
    candidate = `${root}-${n}`
  }
}

/** GET /admin/blog/posts — every post (newest first) + per-status counts for the tabs. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const { status } = req.query as { status?: string }

  const filters: Record<string, unknown> = {}
  if (status && POST_STATUSES.includes(status as any)) filters.status = status

  const [posts, all, categories] = await Promise.all([
    svc.listBlogPosts(filters, { order: { created_at: "DESC" }, take: 10000 }),
    svc.listBlogPosts({}, { take: 10000 }),
    svc.listBlogCategories({}, { take: 1000 }),
  ])

  const catById = new Map<string, string>(categories.map((c: any) => [c.id, c.name]))
  const counts = { draft: 0, published: 0 } as Record<string, number>
  for (const p of all) counts[p.status] = (counts[p.status] ?? 0) + 1

  res.json({
    counts,
    posts: posts.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      cover_image: p.cover_image ?? null,
      excerpt: p.excerpt ?? null,
      author_name: p.author_name ?? null,
      published_at: p.published_at ?? null,
      created_at: p.created_at,
      category_ids: p.category_ids ?? [],
      category_names: (p.category_ids ?? []).map((id: string) => catById.get(id)).filter(Boolean),
    })),
  })
}

/** POST /admin/blog/posts — create a post. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const b = (req.body ?? {}) as Record<string, any>

  const title = (b.title ?? "").trim()
  if (!title) return res.status(400).json({ message: "A title is required." })

  const status = POST_STATUSES.includes(b.status) ? b.status : "draft"
  const slug = await uniqueSlug(svc, b.slug || title)

  const [post] = await svc.createBlogPosts([
    {
      title,
      slug,
      excerpt: (b.excerpt ?? "").trim() || null,
      content: b.content ?? "",
      cover_image: (b.cover_image ?? "").trim() || null,
      author_name: (b.author_name ?? "").trim() || null,
      status,
      published_at: status === "published" ? b.published_at ?? new Date() : b.published_at ?? null,
      category_ids: Array.isArray(b.category_ids) ? b.category_ids : [],
      seo_title: (b.seo_title ?? "").trim() || null,
      seo_description: (b.seo_description ?? "").trim() || null,
    },
  ])

  res.status(201).json({ post })
}
