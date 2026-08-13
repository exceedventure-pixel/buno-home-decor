import { model } from "@medusajs/framework/utils"

/** A blog category — the taxonomy posts are browsed by. A post may belong to several. */
const BlogCategory = model
  .define("blog_category", {
    id: model.id({ prefix: "bcat" }).primaryKey(),
    name: model.text(),
    // URL segment, e.g. /blog?category=buying-guides. Unique, lower-kebab.
    slug: model.text().unique(),
    description: model.text().nullable(),
    position: model.number().default(0),
  })
  .indexes([{ on: ["slug"] }])

export default BlogCategory
