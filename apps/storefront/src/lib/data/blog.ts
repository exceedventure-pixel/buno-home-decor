const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type BlogCategoryRef = { name: string; slug: string }
export type BlogCategory = BlogCategoryRef & { count: number }

export type BlogPostCard = {
  slug: string
  title: string
  excerpt: string | null
  cover_image: string | null
  author_name: string | null
  published_at: string
  categories: BlogCategoryRef[]
}

export type BlogPost = BlogPostCard & {
  content: string
  updated_at: string
  seo_title: string | null
  seo_description: string | null
}

export type BlogList = { total: number; posts: BlogPostCard[]; categories: BlogCategory[] }

const EMPTY: BlogList = { total: 0, posts: [], categories: [] }

/** Published posts (+ categories with counts), optionally filtered by category slug. Server-side. */
export async function getBlogPosts(params?: {
  category?: string
  limit?: number
  offset?: number
}): Promise<BlogList> {
  try {
    const q = new URLSearchParams()
    if (params?.category) q.set("category", params.category)
    if (params?.limit != null) q.set("limit", String(params.limit))
    if (params?.offset != null) q.set("offset", String(params.offset))
    const res = await fetch(`${BACKEND}/store/blog${q.toString() ? `?${q}` : ""}`, {
      headers: { "x-publishable-api-key": PK },
      next: { revalidate: 60 },
    })
    if (!res.ok) return EMPTY
    return (await res.json()) as BlogList
  } catch {
    return EMPTY
  }
}

/** One published post by slug, or null if it doesn't exist / isn't published. */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${BACKEND}/store/blog/${encodeURIComponent(slug)}`, {
      headers: { "x-publishable-api-key": PK },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const { post } = (await res.json()) as { post: BlogPost }
    return post ?? null
  } catch {
    return null
  }
}
