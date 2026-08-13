import { Module } from "@medusajs/framework/utils"

import ProductReviewModuleService from "./service"
import { PRODUCT_REVIEW_MODULE } from "./constants"

export { PRODUCT_REVIEW_MODULE } from "./constants"

export default Module(PRODUCT_REVIEW_MODULE, {
  service: ProductReviewModuleService,
})
