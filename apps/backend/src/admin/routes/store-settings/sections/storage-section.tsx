import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  IconButton,
  Input,
  Prompt,
  Select,
  Text,
  Tooltip,
  toast,
} from "@medusajs/ui"
import {
  ArrowPath,
  ArrowUpRightOnBox,
  CircleStack,
  DocumentText,
  ExclamationCircle,
  FolderIllustration,
  Link as LinkIcon,
  ListBullet,
  MagnifyingGlass,
  Photo,
  ServerStack,
  SquaresPlus,
  Trash,
  XMarkMini,
} from "@medusajs/icons"
import { useCallback, useEffect, useMemo, useState } from "react"
import { adminFetch } from "../../../lib/api"

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE — the advanced media manager (its own tab under Store Settings).
//
// Backed entirely by the existing endpoints: GET /media (list + summary),
// DELETE /media (multi-key, refuses in-use unless forced), POST /media/cleanup
// (delete all orphans). Everything below — search, filter, sort, multi-select,
// bulk delete, grid/list views — is client-side over the one fetched listing.
// ─────────────────────────────────────────────────────────────────────────────

type MediaFile = {
  key: string
  url: string
  size: number
  last_modified: string | null
  referenced: boolean
}

type MediaResponse = {
  s3_configured: boolean
  error?: string
  debug?: { endpoint: string | null; bucket: string; region: string }
  files: MediaFile[]
  summary: {
    total: number
    referenced: number
    orphans: number
    total_bytes: number
    orphan_bytes: number
  }
}

type FilterKey = "all" | "referenced" | "orphan"
type SortKey = "largest" | "smallest" | "newest" | "oldest" | "name"
type ViewKey = "grid" | "list"

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "svg", "bmp", "ico"])
const PAGE = 48

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function fileName(key: string): string {
  return key.substring(key.lastIndexOf("/") + 1) || key
}

function isImage(key: string): boolean {
  const ext = key.split("?")[0].split(".").pop()?.toLowerCase() ?? ""
  return IMAGE_EXT.has(ext)
}

function relativeDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// ── Small building blocks ─────────────────────────────────────────────────────

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<any>
  label: string
  value: string
  sub?: string
  tone?: "danger" | "success"
}) {
  const valueClass =
    tone === "danger" ? "text-ui-fg-error" : tone === "success" ? "text-ui-tag-green-text" : ""
  return (
    <div className="flex flex-col gap-y-1 rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3">
      <div className="flex items-center gap-x-1.5 text-ui-fg-muted">
        <Icon className="h-3.5 w-3.5" />
        <Text size="xsmall" className="uppercase tracking-wider">{label}</Text>
      </div>
      <Text size="large" weight="plus" className={valueClass}>{value}</Text>
      {sub && <Text size="xsmall" className="text-ui-fg-subtle">{sub}</Text>}
    </div>
  )
}

/** A thumbnail with a graceful fallback for non-images / dead links. */
function Thumb({ file, className }: { file: MediaFile; className?: string }) {
  const [failed, setFailed] = useState(false)
  const showImg = isImage(file.key) && !failed
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-ui-bg-subtle ${className ?? ""}`}>
      {showImg ? (
        <img
          src={file.url}
          alt={fileName(file.key)}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <DocumentText className="text-ui-fg-muted" />
      )}
    </div>
  )
}

type PromptState =
  | { open: false }
  | { open: true; mode: "cleanup"; orphans: number; bytes: number }
  | { open: true; mode: "single"; key: string; referenced: boolean }
  | { open: true; mode: "bulk"; keys: string[]; orphans: number; inUse: number; bytes: number }

// ── Main ──────────────────────────────────────────────────────────────────────

export function StorageSection() {
  const [data, setData] = useState<MediaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [prompt, setPrompt] = useState<PromptState>({ open: false })
  const [forceReferenced, setForceReferenced] = useState(false)

  // View state
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [sort, setSort] = useState<SortKey>("largest")
  const [view, setView] = useState<ViewKey>("grid")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(PAGE)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await adminFetch<MediaResponse>("/media"))
      setSelected(new Set())
    } catch {
      toast.error("Failed to load storage")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const files = data?.files ?? []

  // Filter → search → sort, all client-side over the one listing.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let out = files.filter((f) => {
      if (filter === "referenced" && !f.referenced) return false
      if (filter === "orphan" && f.referenced) return false
      if (q && !f.key.toLowerCase().includes(q)) return false
      return true
    })
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "largest": return b.size - a.size
        case "smallest": return a.size - b.size
        case "newest": return (b.last_modified || "").localeCompare(a.last_modified || "")
        case "oldest": return (a.last_modified || "").localeCompare(b.last_modified || "")
        case "name": return fileName(a.key).localeCompare(fileName(b.key))
      }
    })
    return out
  }, [files, filter, search, sort])

  // Reset how many rows are shown whenever the view narrows.
  useEffect(() => {
    setVisibleCount(PAGE)
  }, [filter, search, sort])

  const visible = filtered.slice(0, visibleCount)

  // Selection helpers
  const toggleOne = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const allVisibleSelected = visible.length > 0 && visible.every((f) => selected.has(f.key))
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visible.forEach((f) => next.delete(f.key))
      else visible.forEach((f) => next.add(f.key))
      return next
    })

  const selectAllOrphans = () => setSelected(new Set(files.filter((f) => !f.referenced).map((f) => f.key)))
  const clearSelection = () => setSelected(new Set())

  const selectedFiles = useMemo(() => files.filter((f) => selected.has(f.key)), [files, selected])
  const selectedBytes = selectedFiles.reduce((s, f) => s + f.size, 0)
  const selectedInUse = selectedFiles.filter((f) => f.referenced).length

  // ── Actions ─────────────────────────────────────────────────────────────────

  const runCleanup = async () => {
    setBusy(true)
    try {
      const r = await adminFetch<{ deleted: number; freed_bytes: number }>("/media/cleanup", {
        method: "POST",
        body: JSON.stringify({}),
      })
      toast.success(`Deleted ${r.deleted} orphan file(s) — freed ${formatBytes(r.freed_bytes)}`)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Cleanup failed")
    } finally {
      setBusy(false)
      setPrompt({ open: false })
    }
  }

  const deleteKeys = async (keys: string[], allowReferenced: boolean) => {
    setBusy(true)
    try {
      await adminFetch("/media", {
        method: "DELETE",
        body: JSON.stringify({ keys, allow_referenced: allowReferenced }),
      })
      toast.success(`Deleted ${keys.length} file${keys.length === 1 ? "" : "s"}`)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Could not delete (some files may still be in use)")
    } finally {
      setBusy(false)
      setPrompt({ open: false })
      setForceReferenced(false)
    }
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("URL copied")
    } catch {
      toast.error("Couldn't copy")
    }
  }

  // ── Early states ──────────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <Container className="flex items-center gap-x-2 px-6 py-10">
        <ArrowPath className="animate-spin text-ui-fg-muted" />
        <Text size="small" className="text-ui-fg-muted">Reading your storage bucket…</Text>
      </Container>
    )
  }

  if (!data?.s3_configured) {
    return (
      <Container className="flex flex-col items-center gap-y-3 px-6 py-12 text-center">
        <CircleStack className="text-ui-fg-muted" />
        <Heading level="h3">Storage isn&apos;t configured</Heading>
        <Text size="small" className="max-w-md text-ui-fg-subtle">
          The Storage manager needs S3 / R2 storage. Set the <code>S3_*</code> environment variables
          on the backend to enable it. Local-disk dev storage isn&apos;t browsable here.
        </Text>
      </Container>
    )
  }

  if (data.error) {
    return (
      <Container className="flex flex-col gap-y-3 px-6 py-8">
        <div className="flex items-center gap-x-2 text-ui-fg-error">
          <ExclamationCircle />
          <Text size="small" weight="plus">Couldn&apos;t read the storage bucket</Text>
        </div>
        <Text size="small" className="text-ui-fg-subtle">{data.error}</Text>
        <Text size="xsmall" className="text-ui-fg-muted">
          Check the backend S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY and
          that the bucket is reachable from the backend, then retry.
        </Text>
        {data.debug && (
          <Text size="xsmall" className="text-ui-fg-muted">
            Using → endpoint: <b>{data.debug.endpoint ?? "(none)"}</b> · bucket: <b>{data.debug.bucket}</b> · region: <b>{data.debug.region}</b>
          </Text>
        )}
        <div>
          <Button size="small" variant="secondary" onClick={load}>Retry</Button>
        </div>
      </Container>
    )
  }

  const s = data.summary
  const usedPct = s.total_bytes ? Math.round(((s.total_bytes - s.orphan_bytes) / s.total_bytes) * 100) : 0

  return (
    <div className="flex flex-col gap-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level="h2">Storage</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Every file in your bucket. <b>Orphans</b> are no longer used by any product, category,
            brand, or homepage section and can be safely removed.
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Tooltip content="Reload from the bucket">
            <IconButton variant="transparent" onClick={load} disabled={loading || busy}>
              <ArrowPath className={loading ? "animate-spin" : ""} />
            </IconButton>
          </Tooltip>
          <Button
            variant="danger"
            size="small"
            disabled={busy || s.orphans === 0}
            onClick={() => setPrompt({ open: true, mode: "cleanup", orphans: s.orphans, bytes: s.orphan_bytes })}
          >
            <Trash />
            Clean up {s.orphans} orphan{s.orphans === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ServerStack} label="Total files" value={String(s.total)} sub={formatBytes(s.total_bytes)} />
        <Stat icon={Photo} label="In use" value={String(s.referenced)} sub={formatBytes(s.total_bytes - s.orphan_bytes)} tone="success" />
        <Stat icon={ExclamationCircle} label="Orphans" value={String(s.orphans)} sub={formatBytes(s.orphan_bytes)} tone={s.orphans ? "danger" : undefined} />
        <Stat icon={CircleStack} label="Reclaimable" value={formatBytes(s.orphan_bytes)} sub={s.total_bytes ? `${100 - usedPct}% of storage` : undefined} tone={s.orphan_bytes ? "danger" : undefined} />
      </div>

      {/* Usage bar */}
      {s.total_bytes > 0 && (
        <div className="flex flex-col gap-y-1.5">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ui-bg-subtle">
            <div className="h-full bg-ui-tag-green-icon" style={{ width: `${usedPct}%` }} />
            <div className="h-full bg-ui-tag-red-icon" style={{ width: `${100 - usedPct}%` }} />
          </div>
          <div className="flex items-center gap-x-4">
            <span className="flex items-center gap-x-1.5">
              <span className="h-2 w-2 rounded-full bg-ui-tag-green-icon" />
              <Text size="xsmall" className="text-ui-fg-subtle">In use · {formatBytes(s.total_bytes - s.orphan_bytes)}</Text>
            </span>
            <span className="flex items-center gap-x-1.5">
              <span className="h-2 w-2 rounded-full bg-ui-tag-red-icon" />
              <Text size="xsmall" className="text-ui-fg-subtle">Orphaned · {formatBytes(s.orphan_bytes)}</Text>
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by filename…"
              className="pl-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ui-fg-muted hover:text-ui-fg-base"
              >
                <XMarkMini />
              </button>
            )}
          </div>

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)} size="small">
            <Select.Trigger className="w-[150px]">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="largest">Largest first</Select.Item>
              <Select.Item value="smallest">Smallest first</Select.Item>
              <Select.Item value="newest">Newest first</Select.Item>
              <Select.Item value="oldest">Oldest first</Select.Item>
              <Select.Item value="name">Name (A–Z)</Select.Item>
            </Select.Content>
          </Select>

          {/* View toggle */}
          <div className="flex overflow-hidden rounded-lg border border-ui-border-base">
            <Tooltip content="Grid view">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`flex h-8 w-8 items-center justify-center ${view === "grid" ? "bg-ui-bg-base-pressed text-ui-fg-base" : "bg-ui-bg-base text-ui-fg-muted hover:text-ui-fg-base"}`}
              >
                <SquaresPlus />
              </button>
            </Tooltip>
            <Tooltip content="List view">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`flex h-8 w-8 items-center justify-center border-l border-ui-border-base ${view === "list" ? "bg-ui-bg-base-pressed text-ui-fg-base" : "bg-ui-bg-base text-ui-fg-muted hover:text-ui-fg-base"}`}
              >
                <ListBullet />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Filter segmented + quick select */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-ui-border-base">
            {([
              ["all", "All", s.total],
              ["referenced", "In use", s.referenced],
              ["orphan", "Orphans", s.orphans],
            ] as [FilterKey, string, number][]).map(([key, label, count], i) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`flex items-center gap-x-1.5 px-3 py-1.5 text-xs font-medium ${i > 0 ? "border-l border-ui-border-base" : ""} ${filter === key ? "bg-ui-bg-base-pressed text-ui-fg-base" : "bg-ui-bg-base text-ui-fg-subtle hover:text-ui-fg-base"}`}
              >
                {label}
                <Badge size="2xsmall" color={key === "orphan" && count ? "red" : "grey"}>{count}</Badge>
              </button>
            ))}
          </div>
          {s.orphans > 0 && (
            <Button size="small" variant="transparent" onClick={selectAllOrphans}>
              Select all orphans
            </Button>
          )}
        </div>

        {/* Selection action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ui-border-strong bg-ui-bg-base px-3 py-2">
            <Text size="small">
              <b>{selected.size}</b> selected · {formatBytes(selectedBytes)}
              {selectedInUse > 0 && (
                <span className="text-ui-fg-error"> · {selectedInUse} in use</span>
              )}
            </Text>
            <div className="flex items-center gap-x-2">
              <Button size="small" variant="transparent" onClick={clearSelection}>Clear</Button>
              <Button
                size="small"
                variant="danger"
                disabled={busy}
                onClick={() =>
                  setPrompt({
                    open: true,
                    mode: "bulk",
                    keys: [...selected],
                    orphans: selected.size - selectedInUse,
                    inUse: selectedInUse,
                    bytes: selectedBytes,
                  })
                }
              >
                <Trash />
                Delete selected
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Container className="flex flex-col items-center gap-y-2 py-12 text-center">
          <FolderIllustration />
          <Text size="small" className="text-ui-fg-muted">
            {files.length === 0 ? "No files in the bucket yet." : "No files match your filters."}
          </Text>
        </Container>
      ) : (
        <>
          {/* Select-all-visible + count */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-x-2">
              <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} />
              <Text size="small" className="text-ui-fg-subtle">
                Select all shown
              </Text>
            </label>
            <Text size="small" className="text-ui-fg-muted">
              Showing {visible.length} of {filtered.length}
            </Text>
          </div>

          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visible.map((f) => {
                const sel = selected.has(f.key)
                return (
                  <div
                    key={f.key}
                    className={`group relative overflow-hidden rounded-lg border bg-ui-bg-base transition-shadow hover:shadow-elevation-card-rest ${sel ? "border-ui-fg-interactive ring-1 ring-ui-fg-interactive" : "border-ui-border-base"}`}
                  >
                    <Thumb file={f} className="aspect-square w-full" />

                    {/* checkbox */}
                    <div className={`absolute left-2 top-2 ${sel ? "" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                      <div className="rounded bg-ui-bg-base/90 p-0.5">
                        <Checkbox checked={sel} onCheckedChange={() => toggleOne(f.key)} />
                      </div>
                    </div>

                    {/* status */}
                    <div className="absolute right-2 top-2">
                      {f.referenced ? (
                        <Badge size="2xsmall" color="green">In use</Badge>
                      ) : (
                        <Badge size="2xsmall" color="red">Orphan</Badge>
                      )}
                    </div>

                    {/* hover actions */}
                    <div className="absolute inset-x-0 bottom-[52px] flex justify-end gap-1 px-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip content="Copy URL">
                        <IconButton size="2xsmall" variant="transparent" className="bg-ui-bg-base/90" onClick={() => copyUrl(f.url)}>
                          <LinkIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Open in new tab">
                        <a href={f.url} target="_blank" rel="noreferrer">
                          <IconButton size="2xsmall" variant="transparent" className="bg-ui-bg-base/90">
                            <ArrowUpRightOnBox />
                          </IconButton>
                        </a>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <IconButton
                          size="2xsmall"
                          variant="transparent"
                          className="bg-ui-bg-base/90"
                          disabled={busy}
                          onClick={() => setPrompt({ open: true, mode: "single", key: f.key, referenced: f.referenced })}
                        >
                          <Trash className="text-ui-fg-error" />
                        </IconButton>
                      </Tooltip>
                    </div>

                    <div className="flex flex-col gap-y-0.5 p-2">
                      <Text size="xsmall" className="truncate" title={f.key}>{fileName(f.key)}</Text>
                      <div className="flex items-center justify-between">
                        <Text size="xsmall" className="text-ui-fg-muted">{formatBytes(f.size)}</Text>
                        <Text size="xsmall" className="text-ui-fg-muted">{relativeDate(f.last_modified)}</Text>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* List view */
            <div className="overflow-hidden rounded-lg border border-ui-border-base">
              {visible.map((f, i) => {
                const sel = selected.has(f.key)
                return (
                  <div
                    key={f.key}
                    className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? "border-t border-ui-border-base" : ""} ${sel ? "bg-ui-bg-highlight" : "bg-ui-bg-base hover:bg-ui-bg-base-hover"}`}
                  >
                    <Checkbox checked={sel} onCheckedChange={() => toggleOne(f.key)} />
                    <Thumb file={f} className="h-10 w-10 shrink-0 rounded" />
                    <div className="min-w-0 flex-1">
                      <Text size="small" className="truncate" title={f.key}>{fileName(f.key)}</Text>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {formatBytes(f.size)} · {relativeDate(f.last_modified)}
                      </Text>
                    </div>
                    {f.referenced ? (
                      <Badge size="2xsmall" color="green">In use</Badge>
                    ) : (
                      <Badge size="2xsmall" color="red">Orphan</Badge>
                    )}
                    <div className="flex items-center gap-x-1">
                      <Tooltip content="Copy URL">
                        <IconButton size="small" variant="transparent" onClick={() => copyUrl(f.url)}>
                          <LinkIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Open in new tab">
                        <a href={f.url} target="_blank" rel="noreferrer">
                          <IconButton size="small" variant="transparent">
                            <ArrowUpRightOnBox />
                          </IconButton>
                        </a>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <IconButton
                          size="small"
                          variant="transparent"
                          disabled={busy}
                          onClick={() => setPrompt({ open: true, mode: "single", key: f.key, referenced: f.referenced })}
                        >
                          <Trash className="text-ui-fg-error" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {visibleCount < filtered.length && (
            <div className="flex justify-center">
              <Button size="small" variant="secondary" onClick={() => setVisibleCount((c) => c + PAGE)}>
                Show {Math.min(PAGE, filtered.length - visibleCount)} more
              </Button>
            </div>
          )}
        </>
      )}

      {/* Confirm prompts */}
      <Prompt open={prompt.open} onOpenChange={(o) => !o && (setPrompt({ open: false }), setForceReferenced(false))}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>
              {prompt.open && prompt.mode === "cleanup" && "Delete all orphan files?"}
              {prompt.open && prompt.mode === "single" && "Delete this file?"}
              {prompt.open && prompt.mode === "bulk" && `Delete ${prompt.keys.length} selected file${prompt.keys.length === 1 ? "" : "s"}?`}
            </Prompt.Title>
            <Prompt.Description>
              {prompt.open && prompt.mode === "cleanup" &&
                `This permanently deletes ${prompt.orphans} unused file(s) (${formatBytes(prompt.bytes)}) from your storage bucket. Files in use are kept. This cannot be undone.`}
              {prompt.open && prompt.mode === "single" &&
                (prompt.referenced
                  ? "This file is still IN USE by a product, category, brand, or page. Deleting it will break wherever it appears. This cannot be undone."
                  : "This permanently deletes the file from your storage bucket. This cannot be undone.")}
              {prompt.open && prompt.mode === "bulk" &&
                `This permanently deletes ${prompt.orphans} orphan file(s) (${formatBytes(prompt.bytes)}) from your storage bucket. This cannot be undone.`}
            </Prompt.Description>
          </Prompt.Header>

          {/* Force option when the deletion touches in-use files */}
          {prompt.open &&
            ((prompt.mode === "bulk" && prompt.inUse > 0) || (prompt.mode === "single" && prompt.referenced)) && (
              <div className="px-6 pb-2">
                <label className="flex items-start gap-x-2 rounded-lg border border-ui-tag-red-border bg-ui-tag-red-bg p-3">
                  <Checkbox checked={forceReferenced} onCheckedChange={(v) => setForceReferenced(Boolean(v))} />
                  <span className="flex flex-col">
                    <Text size="small" weight="plus" className="text-ui-fg-error">
                      {prompt.mode === "bulk"
                        ? `Also delete ${prompt.inUse} file(s) that are still in use`
                        : "Delete this in-use file anyway"}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      They will disappear from wherever they&apos;re shown on the storefront. Only do
                      this if you&apos;ve already replaced them.
                    </Text>
                  </span>
                </label>
              </div>
            )}

          <Prompt.Footer>
            <Prompt.Cancel disabled={busy}>Cancel</Prompt.Cancel>
            <Prompt.Action
              onClick={() => {
                if (!prompt.open) return
                if (prompt.mode === "cleanup") return runCleanup()
                if (prompt.mode === "single") {
                  if (prompt.referenced && !forceReferenced) {
                    toast.error("Tick the box to confirm deleting an in-use file.")
                    return
                  }
                  return deleteKeys([prompt.key], prompt.referenced)
                }
                // bulk
                const keys = forceReferenced
                  ? prompt.keys
                  : selectedFiles.filter((f) => !f.referenced).map((f) => f.key)
                if (keys.length === 0) {
                  toast.error("Nothing to delete — all selected files are in use.")
                  return
                }
                return deleteKeys(keys, forceReferenced)
              }}
            >
              Delete
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}
