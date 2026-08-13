import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BLOG_MODULE } from "../../../../../modules/blog"
import { POST_STATUSES } from "../../../../../modules/blog/constants"
import { uniqueSlug } from "../route"

/** GET /admin/blog/posts/:id — one post, full body (for the editor). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const [post] = await svc.listBlogPosts({ id: req.params.id }, { take: 1 })
  if (!post) return res.status(404).json({ message: "Post not found." })
  res.json({ post })
}

/** POST /admin/blog/posts/:id — update a post. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const id = req.params.id
  const b = (req.body ?? {}) as Record<string, any>

  const [current] = await svc.listBlogPosts({ id }, { take: 1 })
  if (!current) return res.status(404).json({ message: "Post not found." })

  const update: Record<string, any> = { id }

  if (b.title !== undefined) update.title = String(b.title).trim()
  if (b.slug !== undefined || b.title !== undefined) {
    // Re-slug only when the slug field was explicitly set, else keep the stable existing one.
    if (b.slug) update.slug = await uniqueSlug(svc, b.slug, id)
  }
  if (b.excerpt !== undefined) update.excerpt = String(b.excerpt).trim() || null
  if (b.content !== undefined) update.content = b.content ?? ""
  if (b.cover_image !== undefined) update.cover_image = String(b.cover_image).trim() || null
  if (b.author_name !== undefined) update.author_name = String(b.author_name).trim() || null
  if (b.category_ids !== undefined) update.category_ids = Array.isArray(b.category_ids) ? b.category_ids : []
  if (b.seo_title !== undefined) update.seo_title = String(b.seo_title).trim() || null
  if (b.seo_description !== undefined) update.seo_description = String(b.seo_description).trim() || null

  if (b.status !== undefined && POST_STATUSES.includes(b.status)) {
    update.status = b.status
    // First time it goes live, stamp a publish date if none was given.
    if (b.status === "published" && !current.published_at && b.published_at === undefined) {
      update.published_at = new Date()
    }
  }
  if (b.published_at !== undefined) update.published_at = b.published_at || null

  await svc.updateBlogPosts(update)
  const [post] = await svc.listBlogPosts({ id }, { take: 1 })
  res.json({ post })
}

/** DELETE /admin/blog/posts/:id */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  await svc.deleteBlogPosts(req.params.id)
  res.json({ success: true, id: req.params.id, deleted: true })
}
