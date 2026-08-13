"use client"

import { useState } from "react"
import { Star, X } from "lucide-react"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
const MAX_PHOTOS = 5

/**
 * The "write a review" form. Client component: it uploads any photos to the store upload endpoint
 * first, then submits the review. Anyone can post — the review lands as pending and appears once an
 * admin approves it, which is what the success message says.
 */
export default function ReviewForm({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"))
    setFiles((prev) => [...prev, ...imgs].slice(0, MAX_PHOTOS))
  }
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const submit = async () => {
    setError(null)
    if (rating < 1) return setError("Please choose a star rating.")
    if (!name.trim()) return setError("Please add your name.")
    if (!content.trim()) return setError("Please write your review.")

    setSubmitting(true)
    try {
      // 1) Upload photos (if any) → URLs.
      let images: string[] = []
      if (files.length) {
        const fd = new FormData()
        files.forEach((f) => fd.append("files", f))
        const up = await fetch(`${BACKEND}/store/product-reviews/upload`, {
          method: "POST",
          headers: { "x-publishable-api-key": PK },
          body: fd,
        })
        if (!up.ok) throw new Error("Couldn't upload your photos. Try smaller images.")
        images = ((await up.json()) as { urls: string[] }).urls ?? []
      }

      // 2) Submit the review.
      const res = await fetch(`${BACKEND}/store/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
        body: JSON.stringify({
          author_name: name.trim(),
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
          images,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.message || "Something went wrong. Please try again.")

      setDone(true)
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
        Thanks! Your review was submitted and will appear once it&apos;s approved.
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
      >
        Write a review
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-y-4 rounded-2xl border border-gray-200 p-5">
      <h3 className="text-base font-semibold text-gray-900">Write a review</h3>

      {/* Rating */}
      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium text-gray-600">Your rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              className="p-0.5"
            >
              <Star
                width={26}
                height={26}
                className={i <= (hover || rating) ? "text-amber-400" : "text-gray-300"}
                fill={i <= (hover || rating) ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-y-1">
          <label className="text-xs font-medium text-gray-600">Your name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ayesha R."
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </div>
        <div className="flex flex-col gap-y-1">
          <label className="text-xs font-medium text-gray-600">Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sums up your review"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </div>
      </div>

      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium text-gray-600">Your review</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="What did you think of the product?"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
      </div>

      {/* Photos */}
      <div className="flex flex-col gap-y-2">
        <label className="text-xs font-medium text-gray-600">
          Add photos (optional, up to {MAX_PHOTOS})
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative h-16 w-16">
              <img
                src={URL.createObjectURL(f)}
                alt=""
                className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white"
                aria-label="Remove photo"
              >
                <X width={12} height={12} />
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-gray-400">
              +
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ""
                }}
              />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
