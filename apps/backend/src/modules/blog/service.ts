import { MedusaService } from "@medusajs/framework/utils"

import BlogPost from "./models/blog-post"
import BlogCategory from "./models/blog-category"

class BlogModuleService extends MedusaService({
  BlogPost,
  BlogCategory,
}) {}

export default BlogModuleService
