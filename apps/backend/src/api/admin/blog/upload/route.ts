import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadFilesWorkflow } from "@medusajs/core-flows"

/**
 * POST /admin/blog/upload — upload a blog image (cover or inline). Gated by the `blog` resource.
 *
 * Multer (middlewares.ts) parses the multipart body and exposes the file on req.file. Same image
 * pipeline as the homepage/brands uploads; returns the public URL to drop into markdown or set as
 * the cover.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) {
    return res.status(400).json({ message: "No file uploaded. Send multipart/form-data with field 'file'." })
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename: file.originalname,
          mimeType: file.mimetype,
          content: file.buffer.toString("base64"),
          access: "public" as const,
        },
      ],
    },
  })

  res.json({ url: result[0].url })
}
