import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight, StarSolid, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Prompt,
  Tabs,
  Text,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { adminFetch } from "../../lib/api"
import { usePermissions } from "../../lib/permissions"

type ReviewStatus = "pending" | "approved" | "rejected"

type Review = {
  id: string
  product_id: string
  product: { title: string; thumbnail: string | null; handle: string } | null
  author_name: string
  rating: number
  title: string | null
  content: string
  images: string[]
  status: ReviewStatus
  created_at: string
}

type ListResponse = {
  counts: Record<ReviewStatus, number>
  total: number
  reviews: Review[]
}

const STATUS_META: Record<ReviewStatus, { label: string; color: "orange" | "green" | "red" }> = {
  pending: { label: "Pending", color: "orange" },
  approved: { label: "Approved", color: "green" },
  rejected: { label: "Rejected", color: "red" },
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarSolid
          key={i}
          className={i <= rating ? "text-ui-tag-orange-icon" : "text-ui-fg-disabled"}
        />
      ))}
    </span>
  )
}

const ProductReviewsPage = () => {
  const { can, isLoading: permsLoading } = usePermissions()
  const qc = useQueryClient()
  const [tab, setTab] = useState<ReviewStatus>("pending")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const canRead = can("product_reviews", "read")
  const canWrite = can("product_reviews", "write")
  const canDelete = can("product_reviews", "delete")

  const { data, isLoading } = useQuery({
    queryKey: ["product-reviews", tab],
    queryFn: () => adminFetch<ListResponse>(`/product-reviews?status=${tab}`),
    enabled: canRead,
  })

  const counts = data?.counts ?? { pending: 0, approved: 0, rejected: 0 }

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) =>
      adminFetch(`/product-reviews/${id}`, { method: "POST", body: JSON.stringify({ status }) }),
    onSuccess: (_r, { status }) => {
      toast.success(
        status === "approved"
          ? "Review approved — it's now live"
          : status === "rejected"
            ? "Review rejected — hidden from the storefront"
            : "Review moved back to pending"
      )
      qc.invalidateQueries({ queryKey: ["product-reviews"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => adminFetch(`/product-reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Review deleted")
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ["product-reviews"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (permsLoading) return null
  if (!canRead) {
    return (
      <Container className="p-8">
        <Text className="text-ui-fg-subtle">You don&apos;t have access to Product Reviews.</Text>
      </Container>
    )
  }

  const reviews = data?.reviews ?? []
  const busy = moderate.isPending || remove.isPending

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <div>
        <Heading level="h1">Product Reviews</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Customer reviews are hidden until you approve them. Approve to publish, reject to hide, or
          delete to remove.
        </Text>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReviewStatus)}>
        <Tabs.List>
          {(["pending", "approved", "rejected"] as ReviewStatus[]).map((s) => (
            <Tabs.Trigger key={s} value={s}>
              <span className="flex items-center gap-x-2">
                {STATUS_META[s].label}
                <Badge size="2xsmall" color={s === "pending" && counts[s] ? "orange" : "grey"}>
                  {counts[s] ?? 0}
                </Badge>
              </span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="mt-4">
          <Tabs.Content value={tab}>
            {isLoading ? (
              <Text size="small" className="text-ui-fg-muted">Loading…</Text>
            ) : reviews.length === 0 ? (
              <Container className="flex flex-col items-center gap-y-2 py-12 text-center">
                <ChatBubbleLeftRight className="text-ui-fg-muted" />
                <Text size="small" className="text-ui-fg-muted">
                  No {STATUS_META[tab].label.toLowerCase()} reviews.
                </Text>
              </Container>
            ) : (
              <div className="flex flex-col gap-y-3">
                {reviews.map((r) => (
                  <Container key={r.id} className="flex flex-col gap-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* Product + author */}
                      <div className="flex items-start gap-3">
                        {r.product?.thumbnail ? (
                          <img
                            src={r.product.thumbnail}
                            alt={r.product.title}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-ui-bg-subtle" />
                        )}
                        <div className="min-w-0">
                          <Text size="small" weight="plus" className="truncate">
                            {r.product?.title ?? r.product_id}
                          </Text>
                          <div className="flex items-center gap-x-2">
                            <Stars rating={r.rating} />
                            <Text size="xsmall" className="text-ui-fg-subtle">
                              {r.author_name}
                            </Text>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <Badge size="2xsmall" color={STATUS_META[r.status].color}>
                          {STATUS_META[r.status].label}
                        </Badge>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {new Date(r.created_at).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex flex-col gap-y-1">
                      {r.title && <Text size="small" weight="plus">{r.title}</Text>}
                      <Text size="small" className="text-ui-fg-subtle whitespace-pre-wrap">
                        {r.content}
                      </Text>
                    </div>

                    {/* Photos */}
                    {r.images.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {r.images.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer noopener">
                            <img
                              src={url}
                              alt="Review photo"
                              className="h-16 w-16 rounded-lg border border-ui-border-base object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-ui-border-base pt-3">
                      {r.status !== "approved" && (
                        <Button
                          size="small"
                          variant="primary"
                          disabled={!canWrite || busy}
                          onClick={() => moderate.mutate({ id: r.id, status: "approved" })}
                        >
                          Approve
                        </Button>
                      )}
                      {r.status !== "rejected" && (
                        <Button
                          size="small"
                          variant="secondary"
                          disabled={!canWrite || busy}
                          onClick={() => moderate.mutate({ id: r.id, status: "rejected" })}
                        >
                          Reject
                        </Button>
                      )}
                      {r.status !== "pending" && (
                        <Button
                          size="small"
                          variant="transparent"
                          disabled={!canWrite || busy}
                          onClick={() => moderate.mutate({ id: r.id, status: "pending" })}
                        >
                          Move to pending
                        </Button>
                      )}
                      <div className="ml-auto">
                        <Tooltip content="Delete permanently">
                          <IconButton
                            size="small"
                            variant="transparent"
                            disabled={!canDelete || busy}
                            onClick={() => setConfirmDelete(r.id)}
                          >
                            <Trash className="text-ui-fg-error" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </div>
                  </Container>
                ))}
              </div>
            )}
          </Tabs.Content>
        </div>
      </Tabs>

      <Prompt open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)} variant="danger">
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Delete this review?</Prompt.Title>
            <Prompt.Description>
              This permanently removes the review and its photos reference. This can&apos;t be undone.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel disabled={remove.isPending}>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={() => confirmDelete && remove.mutate(confirmDelete)}>
              Delete
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Product Reviews",
  icon: ChatBubbleLeftRight,
  rank: 6,
})

export default ProductReviewsPage
