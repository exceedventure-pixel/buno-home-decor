import { Metadata } from "next"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { GOLD, goldTint } from "@lib/brand-ui"
import { getBlogPosts, type BlogPostCard } from "@lib/data/blog"
import Reveal from "@modules/common/components/reveal"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight } from "lucide-react"

const PAGE_TITLE = "Blog"
const PAGE_DESCRIPTION =
  "Ideas, guides and inspiration from Buno Home Decor — styling tips, buying guides and stories to " +
  "help you create a home you love."
const PER_PAGE = 12

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `${PAGE_TITLE} | ${brand.storeName}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${getBaseURL()}/blog`,
    siteName: brand.storeName,
  },
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function PostCard({ post, featured }: { post: BlogPostCard; featured?: boolean }) {
  return (
    <LocalizedClientLink
      href={`/blog/${post.slug}`}
      className={`card-soft card-hover group flex flex-col overflow-hidden ${featured ? "medium:flex-row" : ""}`}
    >
      <div className={`relative overflow-hidden bg-gray-100 ${featured ? "medium:w-1/2" : ""}`}>
        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt={post.title}
            loading="lazy"
            className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${featured ? "h-56 medium:h-full" : "h-52"}`}
          />
        ) : (
          <div className={`w-full ${featured ? "h-56 medium:h-full" : "h-52"}`} style={{ background: `linear-gradient(135deg, ${goldTint(0.18)}, ${goldTint(0.04)})` }} />
        )}
      </div>
      <div className={`flex flex-1 flex-col p-6 ${featured ? "medium:p-10" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          {post.categories.slice(0, 2).map((c) => (
            <span key={c.slug} className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ backgroundColor: goldTint(0.16), color: "#8a6a00" }}>
              {c.name}
            </span>
          ))}
          <span className="text-xs text-gray-400">{fmtDate(post.published_at)}</span>
        </div>
        <h3 className={`mt-3 font-semibold tracking-[-0.01em] text-gray-900 ${featured ? "text-2xl medium:text-3xl" : "text-lg"}`}>
          {post.title}
        </h3>
        {post.excerpt && (
          <p className={`mt-2 flex-1 leading-relaxed text-gray-500 ${featured ? "text-base" : "text-sm line-clamp-3"}`}>
            {post.excerpt}
          </p>
        )}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          Read more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: GOLD }} />
        </span>
      </div>
    </LocalizedClientLink>
  )
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const sp = await searchParams
  const category = sp.category
  const page = Math.max(1, Number(sp.page) || 1)
  const offset = (page - 1) * PER_PAGE

  const { posts, total, categories } = await getBlogPosts({ category, limit: PER_PAGE, offset })
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const activeCat = categories.find((c) => c.slug === category)
  const catQ = (slug?: string, p?: number) => {
    const q = new URLSearchParams()
    if (slug) q.set("category", slug)
    if (p && p > 1) q.set("page", String(p))
    const s = q.toString()
    return `/blog${s ? `?${s}` : ""}`
  }

  // On the first unfiltered page, lead with a big featured post.
  const showFeatured = !category && page === 1 && posts.length > 0
  const featured = showFeatured ? posts[0] : null
  const rest = showFeatured ? posts.slice(1) : posts

  return (
    <div className="bg-white text-gray-900">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% -10%, ${goldTint(0.2)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center medium:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              The Buno Journal
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.03em] small:text-6xl medium:text-7xl">
              {activeCat ? activeCat.name : "Ideas for a home you love"}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-7 max-w-2xl text-xl leading-relaxed text-gray-500">
              {activeCat
                ? `Posts in ${activeCat.name}.`
                : "Styling tips, buying guides and stories to help you create beautiful, practical spaces."}
            </p>
          </Reveal>

          {/* Category filter */}
          {categories.length > 0 && (
            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
                <LocalizedClientLink
                  href={catQ()}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${!category ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
                >
                  All
                </LocalizedClientLink>
                {categories.map((c) => (
                  <LocalizedClientLink
                    key={c.slug}
                    href={catQ(c.slug)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${category === c.slug ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
                  >
                    {c.name} <span className="opacity-60">{c.count}</span>
                  </LocalizedClientLink>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── Posts ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        {posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 p-16 text-center text-gray-500">
            {category ? "No posts in this category yet." : "No posts yet — check back soon."}
          </div>
        ) : (
          <>
            {featured && (
              <Reveal className="mb-6 block">
                <PostCard post={featured} featured />
              </Reveal>
            )}
            <div className="grid gap-6 small:grid-cols-2 medium:grid-cols-3">
              {rest.map((p, i) => (
                <Reveal key={p.slug} delay={(i % 3) * 70}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-3">
                {page > 1 ? (
                  <LocalizedClientLink href={catQ(category, page - 1)} className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                    ← Newer
                  </LocalizedClientLink>
                ) : (
                  <span className="rounded-full border border-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-300">← Newer</span>
                )}
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                {page < totalPages ? (
                  <LocalizedClientLink href={catQ(category, page + 1)} className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                    Older →
                  </LocalizedClientLink>
                ) : (
                  <span className="rounded-full border border-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-300">Older →</span>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
