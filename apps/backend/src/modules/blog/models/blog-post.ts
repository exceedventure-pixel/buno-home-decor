import { model } from "@medusajs/framework/utils"

import { POST_STATUSES } from "../constants"

/**
 * A BLOG POST.
 *
 * Body is stored as MARKDOWN (`content`) and rendered on the storefront — portable, safe (no raw
 * HTML), and easy to author with a live preview. Categories are kept as an ARRAY of category ids
 * (`category_ids`) rather than a join table: a store blog has few posts, so filtering in memory is
 * simpler than maintaining a link table, and a category rename never rewrites posts.
 *
 * `published_at` + `status` together drive visibility: only a `published` post with a date in the
 * past shows on the storefront, which is what lets a post be scheduled or held back as a draft.
 */
const BlogPost = model
  .define("blog_post", {
    id: model.id({ prefix: "bpost" }).primaryKey(),

    title: model.text(),
    // URL slug, e.g. /blog/styling-a-small-living-room. Unique, lower-kebab.
    slug: model.text().unique(),
    excerpt: model.text().nullable(),
    // Markdown.
    content: model.text().default(""),
    cover_image: model.text().nullable(),
    author_name: model.text().nullable(),

    status: model.enum([...POST_STATUSES]).default("draft"),
    published_at: model.dateTime().nullable(),

    // Category ids this post belongs to.
    category_ids: model.json().nullable(),

    // SEO overrides — fall back to title/excerpt when blank.
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
  })
  .indexes([{ on: ["slug"] }, { on: ["status"] }])

export default BlogPost
