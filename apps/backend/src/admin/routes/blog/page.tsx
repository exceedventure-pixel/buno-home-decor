import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Newspaper, PencilSquare, Plus, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Prompt,
  Select,
  Tabs,
  Text,
  Textarea,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { usePermissions } from "../../lib/permissions"

// ── Fetch helpers (token + FormData-aware) ─────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("_medusa_auth_token") || localStorage.getItem("medusa_auth_token") || ""
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function bfetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/admin${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init?.headers as any) },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(json?.message || `Request failed: ${res.status}`)
  return json as T
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch("/admin/blog/upload", { method: "POST", headers: authHeaders(), body: fd })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || "Upload failed")
  return json.url as string
}

// ── Types ──────────────────────────────────────────────────────────────────────

type PostStatus = "draft" | "published"
type Category = { id: string; name: string; slug: string; description: string | null; post_count: number }
type PostRow = {
  id: string
  title: string
  slug: string
  status: PostStatus
  cover_image: string | null
  excerpt: string | null
  author_name: string | null
  published_at: string | null
  created_at: string
  category_ids: string[]
  category_names: string[]
}
type FullPost = PostRow & { content: string; seo_title: string | null; seo_description: string | null }

const MD_PROSE =
  "text-sm leading-7 text-ui-fg-subtle " +
  "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-ui-fg-base [&_h1]:mt-4 [&_h1]:mb-2 " +
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ui-fg-base [&_h2]:mt-4 [&_h2]:mb-2 " +
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ui-fg-base [&_h3]:mt-3 [&_h3]:mb-1.5 " +
  "[&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-ui-fg-base [&_em]:italic " +
  "[&_a]:text-ui-fg-interactive [&_a]:underline " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-ui-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-ui-fg-muted [&_blockquote]:my-2 " +
  "[&_img]:rounded-lg [&_img]:my-3 [&_img]:max-w-full " +
  "[&_code]:rounded [&_code]:bg-ui-bg-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"

// ── Markdown editor (toolbar + textarea + live preview) ────────────────────────

function MarkdownField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [uploading, setUploading] = useState(false)

  /** Wrap the current selection with `before`/`after` (or insert at cursor). */
  const surround = (before: string, after = before, placeholder = "") => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value: v } = el
    const sel = v.slice(s, e) || placeholder
    const next = v.slice(0, s) + before + sel + after + v.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }

  /** Prefix the current line(s), e.g. "## " for a heading or "- " for a list. */
  const prefixLine = (prefix: string) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, value: v } = el
    const lineStart = v.lastIndexOf("\n", s - 1) + 1
    const next = v.slice(0, lineStart) + prefix + v.slice(lineStart)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + prefix.length, s + prefix.length)
    })
  }

  const insert = (text: string) => {
    const el = ref.current
    if (!el) {
      onChange(value + text)
      return
    }
    const { selectionStart: s, selectionEnd: e, value: v } = el
    const next = v.slice(0, s) + text + v.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + text.length, s + text.length)
    })
  }

  const onPickImage = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadImage(file)
      insert(`\n![](${url})\n`)
    } catch (e: any) {
      toast.error(e.message || "Image upload failed")
    } finally {
      setUploading(false)
    }
  }

  const Btn = ({ label, onClick, title }: { label: string; onClick: () => void; title: string }) => (
    <Tooltip content={title}>
      <button type="button" onClick={onClick} className="rounded-md px-2 py-1 text-xs font-semibold text-ui-fg-subtle hover:bg-ui-bg-base-hover">
        {label}
      </button>
    </Tooltip>
  )

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-1">
        <Btn label="B" title="Bold" onClick={() => surround("**", "**", "bold")} />
        <Btn label="I" title="Italic" onClick={() => surround("_", "_", "italic")} />
        <span className="mx-1 h-4 w-px bg-ui-border-base" />
        <Btn label="H2" title="Heading" onClick={() => prefixLine("## ")} />
        <Btn label="H3" title="Sub-heading" onClick={() => prefixLine("### ")} />
        <Btn label="• List" title="Bullet list" onClick={() => prefixLine("- ")} />
        <Btn label="1. List" title="Numbered list" onClick={() => prefixLine("1. ")} />
        <Btn label="❝ Quote" title="Quote" onClick={() => prefixLine("> ")} />
        <span className="mx-1 h-4 w-px bg-ui-border-base" />
        <Btn label="Link" title="Insert link" onClick={() => surround("[", "](https://)", "text")} />
        <label className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-ui-fg-subtle hover:bg-ui-bg-base-hover">
          {uploading ? "Uploading…" : "Image"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = "" }} />
        </label>
      </div>

      <div className="grid gap-3 medium:grid-cols-2">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={20}
          placeholder="Write your post in Markdown…"
          className="font-mono text-xs"
        />
        <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-ui-border-base bg-ui-bg-base p-4">
          {value.trim() ? (
            <div className={MD_PROSE}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <Text size="small" className="text-ui-fg-muted">Live preview appears here.</Text>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Post editor (full-screen) ──────────────────────────────────────────────────

function toDateInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function PostEditor({
  postId,
  categories,
  onClose,
  onSaved,
}: {
  postId: string | "new"
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = postId === "new"
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [cover, setCover] = useState("")
  const [author, setAuthor] = useState("")
  const [status, setStatus] = useState<PostStatus>("draft")
  const [publishedAt, setPublishedAt] = useState("")
  const [catIds, setCatIds] = useState<string[]>([])
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDesc, setSeoDesc] = useState("")

  useEffect(() => {
    if (isNew) return
    bfetch<{ post: FullPost }>(`/blog/posts/${postId}`)
      .then(({ post }) => {
        setTitle(post.title)
        setSlug(post.slug)
        setSlugTouched(true)
        setExcerpt(post.excerpt ?? "")
        setContent(post.content ?? "")
        setCover(post.cover_image ?? "")
        setAuthor(post.author_name ?? "")
        setStatus(post.status)
        setPublishedAt(toDateInput(post.published_at))
        setCatIds(post.category_ids ?? [])
        setSeoTitle(post.seo_title ?? "")
        setSeoDesc(post.seo_description ?? "")
      })
      .catch((e: any) => toast.error(e.message || "Failed to load post"))
      .finally(() => setLoading(false))
  }, [postId, isNew])

  const autoSlug = (t: string) =>
    t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "")

  const onTitle = (v: string) => {
    setTitle(v)
    if (!slugTouched) setSlug(autoSlug(v))
  }

  const toggleCat = (id: string) => setCatIds((ids) => (ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]))

  const pickCover = async (file: File) => {
    setUploadingCover(true)
    try {
      setCover(await uploadImage(file))
    } catch (e: any) {
      toast.error(e.message || "Cover upload failed")
    } finally {
      setUploadingCover(false)
    }
  }

  const save = async (nextStatus?: PostStatus) => {
    if (!title.trim()) return toast.error("Please add a title.")
    const finalStatus = nextStatus ?? status
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt,
        content,
        cover_image: cover,
        author_name: author,
        status: finalStatus,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : (finalStatus === "published" ? undefined : null),
        category_ids: catIds,
        seo_title: seoTitle,
        seo_description: seoDesc,
      }
      if (isNew) {
        await bfetch("/blog/posts", { method: "POST", body: JSON.stringify(body) })
      } else {
        await bfetch(`/blog/posts/${postId}`, { method: "POST", body: JSON.stringify(body) })
      }
      toast.success(finalStatus === "published" ? "Post published" : "Post saved")
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FocusModal open onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center gap-x-2">
            <Button size="small" variant="secondary" onClick={() => save("draft")} isLoading={saving} disabled={loading}>
              Save draft
            </Button>
            <Button size="small" onClick={() => save("published")} isLoading={saving} disabled={loading}>
              {status === "published" ? "Update" : "Publish"}
            </Button>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="overflow-y-auto">
          {loading ? (
            <div className="p-8"><Text className="text-ui-fg-muted">Loading…</Text></div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-y-5 px-6 py-8">
              <div className="flex flex-col gap-y-1.5">
                <Label size="small">Title</Label>
                <Input value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Styling a small living room" />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <Label size="small">Slug <Text as="span" size="xsmall" className="text-ui-fg-muted">(the URL: /blog/…)</Text></Label>
                <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }} placeholder="styling-a-small-living-room" />
              </div>

              {/* Cover */}
              <div className="flex flex-col gap-y-1.5">
                <Label size="small">Cover image</Label>
                <div className="flex items-center gap-3">
                  {cover ? (
                    <img src={cover} alt="" className="h-20 w-32 rounded-lg border border-ui-border-base object-cover" />
                  ) : (
                    <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-ui-border-strong bg-ui-bg-subtle text-ui-fg-muted">
                      <Plus />
                    </div>
                  )}
                  <div className="flex flex-col gap-y-1">
                    <label className="cursor-pointer">
                      <Button size="small" variant="secondary" isLoading={uploadingCover} asChild>
                        <span>{uploadingCover ? "Uploading…" : "Upload cover"}</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickCover(f); e.target.value = "" }} />
                    </label>
                    {cover && <Button size="small" variant="transparent" onClick={() => setCover("")}>Remove</Button>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-y-1.5">
                <Label size="small">Excerpt <Text as="span" size="xsmall" className="text-ui-fg-muted">(short summary for cards & SEO)</Text></Label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="A one or two line summary of the post." />
              </div>

              {/* Body */}
              <div className="flex flex-col gap-y-1.5">
                <Label size="small">Content</Label>
                <MarkdownField value={content} onChange={setContent} />
              </div>

              {/* Categories */}
              <div className="flex flex-col gap-y-1.5">
                <Label size="small">Categories</Label>
                {categories.length === 0 ? (
                  <Text size="xsmall" className="text-ui-fg-muted">No categories yet — add some in the Categories tab.</Text>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const on = catIds.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCat(c.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-ui-fg-interactive bg-ui-bg-highlight text-ui-fg-base" : "border-ui-border-base text-ui-fg-subtle hover:bg-ui-bg-base-hover"}`}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Meta row */}
              <div className="grid gap-4 medium:grid-cols-2">
                <div className="flex flex-col gap-y-1.5">
                  <Label size="small">Author <Text as="span" size="xsmall" className="text-ui-fg-muted">(optional)</Text></Label>
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Buno Team" />
                </div>
                <div className="flex flex-col gap-y-1.5">
                  <Label size="small">Publish date</Label>
                  <Input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                </div>
              </div>

              {/* SEO */}
              <div className="flex flex-col gap-y-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                <Text size="small" weight="plus">SEO <Text as="span" size="xsmall" className="text-ui-fg-muted">(optional — falls back to title & excerpt)</Text></Text>
                <div className="flex flex-col gap-y-1.5">
                  <Label size="small">Meta title</Label>
                  <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title || "Post title for search results"} />
                </div>
                <div className="flex flex-col gap-y-1.5">
                  <Label size="small">Meta description</Label>
                  <Textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} placeholder={excerpt || "Short description for search results"} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                  <Select.Trigger className="w-40"><Select.Value /></Select.Trigger>
                  <Select.Content>
                    <Select.Item value="draft">Draft</Select.Item>
                    <Select.Item value="published">Published</Select.Item>
                  </Select.Content>
                </Select>
                <Text size="xsmall" className="text-ui-fg-muted">
                  {status === "published" ? "Live on the storefront." : "Hidden until you publish."}
                </Text>
              </div>
            </div>
          )}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

// ── Posts tab ──────────────────────────────────────────────────────────────────

function PostsTab({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<string | "new" | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: () => bfetch<{ posts: PostRow[]; counts: Record<string, number> }>("/blog/posts"),
  })
  const { data: catData } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: () => bfetch<{ categories: Category[] }>("/blog/categories"),
  })
  const categories = catData?.categories ?? []
  const posts = data?.posts ?? []

  const remove = useMutation({
    mutationFn: (id: string) => bfetch(`/blog/posts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Post deleted")
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ["blog-posts"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <Text size="small" className="text-ui-fg-subtle">
          {posts.length} post{posts.length === 1 ? "" : "s"}
        </Text>
        {canWrite && (
          <Button size="small" onClick={() => setEditing("new")}>
            <Plus /> New post
          </Button>
        )}
      </div>

      {isLoading ? (
        <Text size="small" className="text-ui-fg-muted">Loading…</Text>
      ) : posts.length === 0 ? (
        <Container className="flex flex-col items-center gap-y-2 py-12 text-center">
          <Newspaper className="text-ui-fg-muted" />
          <Text size="small" className="text-ui-fg-muted">No posts yet. Write your first one.</Text>
        </Container>
      ) : (
        <div className="flex flex-col gap-y-2">
          {posts.map((p) => (
            <Container key={p.id} className="flex items-center gap-4 p-3">
              {p.cover_image ? (
                <img src={p.cover_image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-14 w-20 shrink-0 rounded-lg bg-ui-bg-subtle" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Text size="small" weight="plus" className="truncate">{p.title}</Text>
                  <Badge size="2xsmall" color={p.status === "published" ? "green" : "grey"}>
                    {p.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Text size="xsmall" className="text-ui-fg-muted">/blog/{p.slug}</Text>
                  {p.category_names.map((n) => (
                    <span key={n} className="text-ui-fg-subtle text-xs">· {n}</span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canWrite && (
                  <Tooltip content="Edit">
                    <IconButton size="small" variant="transparent" onClick={() => setEditing(p.id)}>
                      <PencilSquare />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip content="Delete">
                    <IconButton size="small" variant="transparent" onClick={() => setConfirmDelete(p.id)}>
                      <Trash className="text-ui-fg-error" />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            </Container>
          ))}
        </div>
      )}

      {editing && (
        <PostEditor
          postId={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["blog-posts"] })}
        />
      )}

      <Prompt open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)} variant="danger">
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Delete this post?</Prompt.Title>
            <Prompt.Description>This permanently removes the post. This can&apos;t be undone.</Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel disabled={remove.isPending}>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={() => confirmDelete && remove.mutate(confirmDelete)}>Delete</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}

// ── Categories tab ─────────────────────────────────────────────────────────────

function CategoriesTab({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean }) {
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const { data } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: () => bfetch<{ categories: Category[] }>("/blog/categories"),
  })
  const categories = data?.categories ?? []

  const create = useMutation({
    mutationFn: () => bfetch("/blog/categories", { method: "POST", body: JSON.stringify({ name: name.trim() }) }),
    onSuccess: () => { toast.success("Category added"); setName(""); qc.invalidateQueries({ queryKey: ["blog-categories"] }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const rename = useMutation({
    mutationFn: () => bfetch(`/blog/categories/${editId}`, { method: "POST", body: JSON.stringify({ name: editName.trim() }) }),
    onSuccess: () => { toast.success("Category updated"); setEditId(null); qc.invalidateQueries({ queryKey: ["blog-categories"] }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => bfetch(`/blog/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Category deleted"); qc.invalidateQueries({ queryKey: ["blog-categories"] }); qc.invalidateQueries({ queryKey: ["blog-posts"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex max-w-2xl flex-col gap-y-4">
      {canWrite && (
        <Container className="flex items-end gap-2 p-4">
          <div className="flex flex-1 flex-col gap-y-1.5">
            <Label size="small">New category</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Buying Guides" onKeyDown={(e) => e.key === "Enter" && name.trim() && create.mutate()} />
          </div>
          <Button size="small" onClick={() => create.mutate()} isLoading={create.isPending} disabled={!name.trim()}>Add</Button>
        </Container>
      )}

      {categories.length === 0 ? (
        <Text size="small" className="text-ui-fg-muted">No categories yet.</Text>
      ) : (
        <div className="flex flex-col gap-y-2">
          {categories.map((c) => (
            <Container key={c.id} className="flex items-center gap-3 p-3">
              {editId === c.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" autoFocus />
                  <Button size="small" onClick={() => rename.mutate()} isLoading={rename.isPending}>Save</Button>
                  <Button size="small" variant="transparent" onClick={() => setEditId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <Text size="small" weight="plus" className="truncate">{c.name}</Text>
                    <Text size="xsmall" className="text-ui-fg-muted">/blog?category={c.slug} · {c.post_count} post{c.post_count === 1 ? "" : "s"}</Text>
                  </div>
                  {canWrite && (
                    <IconButton size="small" variant="transparent" onClick={() => { setEditId(c.id); setEditName(c.name) }}>
                      <PencilSquare />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton size="small" variant="transparent" onClick={() => remove.mutate(c.id)}>
                      <Trash className="text-ui-fg-error" />
                    </IconButton>
                  )}
                </>
              )}
            </Container>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

const BlogPage = () => {
  const { can, isLoading } = usePermissions()
  const [tab, setTab] = useState("posts")

  const canRead = can("blog", "read")
  const canWrite = can("blog", "write")
  const canDelete = can("blog", "delete")

  const tabs = useMemo(() => (canRead ? ["posts", "categories"] : []), [canRead])

  if (isLoading) return null
  if (!canRead) {
    return (
      <Container className="p-8">
        <Text className="text-ui-fg-subtle">You don&apos;t have access to the Blog.</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <div>
        <Heading level="h1">Blog</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Write posts in Markdown, organise them into categories, and publish to your storefront.
        </Text>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <Tabs.List>
          <Tabs.Trigger value="posts">Posts</Tabs.Trigger>
          <Tabs.Trigger value="categories">Categories</Tabs.Trigger>
        </Tabs.List>
        <div className="mt-4">
          <Tabs.Content value="posts">
            <PostsTab canWrite={canWrite} canDelete={canDelete} />
          </Tabs.Content>
          <Tabs.Content value="categories">
            <CategoriesTab canWrite={canWrite} canDelete={canDelete} />
          </Tabs.Content>
        </div>
      </Tabs>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Blog",
  icon: Newspaper,
  rank: 7,
})

export default BlogPage
