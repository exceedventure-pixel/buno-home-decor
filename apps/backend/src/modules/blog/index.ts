import { Module } from "@medusajs/framework/utils"

import BlogModuleService from "./service"
import { BLOG_MODULE } from "./constants"

export { BLOG_MODULE } from "./constants"

export default Module(BLOG_MODULE, {
  service: BlogModuleService,
})
