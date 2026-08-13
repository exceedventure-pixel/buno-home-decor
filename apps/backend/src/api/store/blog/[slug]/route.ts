import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BLOG_MODULE } from "../../../../modules/blog"

/**
 * GET /store/blog/:slug — one published post (full markdown content + categories). Public.
 *
 * A draft, or a post whose published_at is still in the future, 404s — so an unpublished post is
 * never reachable by guessing its slug.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(BLOG_MODULE)
  const slug = req.params.slug

  const [post] = await svc.listBlogPosts({ slug }, { take: 1 })

  if (
    !post ||
    post.status !== "published" ||
    (post.published_at && new Date(post.published_at).getTime() > Date.now())
  ) {
    return res.status(404).json({ message: "Post not found." })
  }

  const cats = post.category_ids?.length
    ? await svc.listBlogCategories({ id: post.category_ids }, { take: 1000 })
    : []

  res.json({
    post: {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt ?? null,
      content: post.content ?? "",
      cover_image: post.cover_image ?? null,
      author_name: post.author_name ?? null,
      published_at: post.published_at ?? post.created_at,
      updated_at: post.updated_at,
      seo_title: post.seo_title ?? null,
      seo_description: post.seo_description ?? null,
      categories: (cats as any[]).map((c) => ({ name: c.name, slug: c.slug })),
    },
  })
}
