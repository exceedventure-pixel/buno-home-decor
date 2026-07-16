import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import multer from "multer"
import { accountingMiddlewares } from "./admin/accounting/middlewares"
import { variantStockMiddlewares } from "./admin/variant-stock/middlewares"
import { inventoryStockGuard } from "./inventory-stock-guard"
import { rbacGuard } from "./rbac-guard"
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  AssignRolesSchema,
} from "./admin/rbac/validators"

// The upload routes buffer the whole file in memory before handing it to the File
// module, so an unbounded upload is an easy way to exhaust the process. The admin
// UI already declares accept="image/*"; enforce that server-side too, since the
// attribute is only a client-side hint.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Images only.`))
      return
    }
    cb(null, true)
  },
})

export default defineMiddlewares([
  // RBAC authorization for every admin route. Admin authentication itself is
  // applied automatically by the framework; this guard enforces per-role access.
  {
    matcher: "/admin/*",
    middlewares: [rbacGuard],
  },
  /**
   * Stock quantity is owned by the FIFO batch system — these block the native editors from
   * writing `stocked_quantity` straight through Medusa's core API. Attaching/detaching a
   * location still works; only the quantity is refused. See inventory-stock-guard.ts.
   */
  {
    method: ["POST"],
    matcher: "/admin/inventory-items/location-levels/batch",
    middlewares: [inventoryStockGuard],
  },
  {
    method: ["POST"],
    matcher: "/admin/inventory-items/:id/location-levels",
    middlewares: [inventoryStockGuard],
  },
  {
    method: ["POST"],
    matcher: "/admin/inventory-items/:id/location-levels/batch",
    middlewares: [inventoryStockGuard],
  },
  {
    method: ["POST"],
    matcher: "/admin/inventory-items/:id/location-levels/:location_id",
    middlewares: [inventoryStockGuard],
  },
  // Multer parses multipart/form-data for the image upload endpoints.
  {
    method: ["POST"],
    matcher: "/admin/homepage/upload",
    middlewares: [upload.single("file")],
  },
  {
    method: ["POST"],
    matcher: "/admin/brands/upload",
    middlewares: [upload.single("file")],
  },
  // RBAC write-route validation.
  {
    method: ["POST"],
    matcher: "/admin/rbac/roles",
    middlewares: [validateAndTransformBody(CreateRoleSchema)],
  },
  {
    method: ["POST"],
    matcher: "/admin/rbac/roles/:id",
    middlewares: [validateAndTransformBody(UpdateRoleSchema)],
  },
  {
    method: ["POST"],
    matcher: "/admin/rbac/users/:id/roles",
    middlewares: [validateAndTransformBody(AssignRolesSchema)],
  },
  // Accounting & marketing validation. The rbacGuard above still gates every one of these.
  ...accountingMiddlewares,
  // Product-page stock endpoints (restock/adjust/edit from the product widget).
  ...variantStockMiddlewares,
])
