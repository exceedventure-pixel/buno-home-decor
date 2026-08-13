import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadFilesWorkflow } from "@medusajs/core-flows"

/**
 * POST /store/product-reviews/upload — upload review photos (public).
 *
 * The storefront review form uploads the customer's photos here first, then submits the returned
 * URLs with the review. Multer (middlewares.ts) caps this to a handful of images ≤10 MB each and
 * rejects non-images. The photos only appear on the storefront once the review is APPROVED, so a
 * stray upload never shows publicly on its own.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const files = ((req as any).files as Express.Multer.File[] | undefined) ?? []

  if (!files.length) {
    return res.status(400).json({
      message: "No files uploaded. Send multipart/form-data with one or more 'files' fields.",
    })
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: files.map((f) => ({
        filename: f.originalname,
        mimeType: f.mimetype,
        content: f.buffer.toString("base64"),
        access: "public" as const,
      })),
    },
  })

  res.json({ urls: result.map((f: any) => f.url) })
}
