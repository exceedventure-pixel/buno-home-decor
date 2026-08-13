export const BLOG_MODULE = "blog"

/** A post is a draft until it's published; only `published` posts appear on the storefront. */
export const POST_STATUSES = ["draft", "published"] as const
export type PostStatus = (typeof POST_STATUSES)[number]
