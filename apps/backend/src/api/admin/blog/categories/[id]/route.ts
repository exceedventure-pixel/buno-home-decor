import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BLOG_MODULE } from "../../../../../modules/blog"
import { slugify } from "../../posts/route"

/** POST /admin/blog/categories/:id — update a category. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const id = req.params.id
  const b = (req.body ?? {}) as Record<string, any>

  const update: Record<string, any> = { id }
  if (b.name !== undefined) update.name = String(b.name).trim()
  if (b.description !== undefined) update.description = String(b.description).trim() || null
  if (b.position !== undefined) update.position = Number(b.position) || 0
  if (b.slug) {
    const root = slugify(b.slug)
    let candidate = root || "category"
    let n = 1
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [existing] = await svc.listBlogCategories({ slug: candidate }, { take: 1 })
      if (!existing || existing.id === id) break
      n += 1
      candidate = `${root}-${n}`
    }
    update.slug = candidate
  }

  await svc.updateBlogCategories(update)
  res.json({ success: true, id })
}

/**
 * DELETE /admin/blog/categories/:id — remove a category and strip it from any posts that
 * referenced it, so no post is left pointing at a category that no longer exists.
 */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const id = req.params.id

  const posts = await svc.listBlogPosts({}, { take: 10000 })
  const affected = posts.filter((p: any) => (p.category_ids ?? []).includes(id))
  for (const p of affected) {
    await svc.updateBlogPosts({ id: p.id, category_ids: (p.category_ids ?? []).filter((c: string) => c !== id) })
  }

  await svc.deleteBlogCategories(id)
  res.json({ success: true, id, deleted: true, posts_updated: affected.length })
}
