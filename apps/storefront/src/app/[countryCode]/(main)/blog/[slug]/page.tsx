import { Metadata } from "next"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import brand from "brand.config"
import { getBaseURL } from "@lib/util/env"
import { GOLD, goldTint } from "@lib/brand-ui"
import { getBlogPost, getBlogPosts } from "@lib/data/blog"
import Reveal from "@modules/common/components/reveal"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowLeft, ArrowRight } from "lucide-react"

type Props = { params: Promise<{ countryCode: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) return { title: "Post not found" }
  const title = post.seo_title || post.title
  const description = post.seo_description || post.excerpt || `${post.title} — from the ${brand.storeName} blog.`
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${title} | ${brand.storeName}`,
      description,
      type: "article",
      url: `${getBaseURL()}/blog/${post.slug}`,
      siteName: brand.storeName,
      publishedTime: post.published_at,
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: post.cover_image ? [post.cover_image] : undefined },
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

const ARTICLE_PROSE =
  "text-[17px] leading-8 text-gray-700 " +
  "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-gray-900 " +
  "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 " +
  "[&_p]:my-5 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_em]:italic " +
  "[&_a]:font-medium [&_a]:text-gray-900 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[rgba(240,180,0,0.8)] " +
  "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 " +
  "[&_li]:marker:text-[#F0B400] " +
  "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:border-[#F0B400] " +
  "[&_img]:my-8 [&_img]:w-full [&_img]:rounded-2xl " +
  "[&_hr]:my-10 [&_hr]:border-gray-200 " +
  "[&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] " +
  "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-gray-900 [&_pre]:p-5 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100"

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) notFound()

  // A few more recent posts to read next (exclude the current one).
  const { posts: more } = await getBlogPosts({ limit: 4 })
  const related = more.filter((p) => p.slug !== post.slug).slice(0, 3)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description || post.excerpt || undefined,
    image: post.cover_image || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: post.author_name || brand.storeName },
    publisher: {
      "@type": "Organization",
      name: brand.storeName,
      logo: { "@type": "ImageObject", url: `${getBaseURL()}${brand.logoPath}` },
    },
    mainEntityOfPage: `${getBaseURL()}/blog/${post.slug}`,
  }

  return (
    <div className="bg-white text-gray-900">
      <article className="mx-auto max-w-3xl px-6 pb-24 pt-12 medium:pt-16">
        <Reveal>
          <LocalizedClientLink href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> All posts
          </LocalizedClientLink>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {post.categories.map((c) => (
              <LocalizedClientLink key={c.slug} href={`/blog?category=${c.slug}`} className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-opacity hover:opacity-80" style={{ backgroundColor: goldTint(0.16), color: "#8a6a00" }}>
                {c.name}
              </LocalizedClientLink>
            ))}
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] medium:text-5xl">{post.title}</h1>
          <p className="mt-4 text-sm text-gray-500">
            {post.author_name ? `${post.author_name} · ` : ""}
            {fmtDate(post.published_at)}
          </p>
        </Reveal>

        {post.cover_image && (
          <Reveal delay={100}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_image} alt={post.title} className="mt-8 w-full rounded-3xl object-cover" />
          </Reveal>
        )}

        <Reveal delay={120}>
          <div className={`mt-10 ${ARTICLE_PROSE}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-12 flex items-center justify-between gap-4 border-t border-gray-100 pt-8">
            <LocalizedClientLink href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <ArrowLeft className="h-4 w-4" /> Back to the blog
            </LocalizedClientLink>
            <LocalizedClientLink href="/store" className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
              Shop the collection <ArrowRight className="h-4 w-4" style={{ color: GOLD }} />
            </LocalizedClientLink>
          </div>
        </Reveal>
      </article>

      {/* ── Read next ────────────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50/70">
          <div className="mx-auto max-w-6xl px-6 py-16 medium:py-20">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">Read next</h2>
            </Reveal>
            <div className="mt-8 grid gap-6 small:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.slug} delay={i * 70}>
                  <LocalizedClientLink href={`/blog/${p.slug}`} className="card-soft card-hover group flex h-full flex-col overflow-hidden">
                    <div className="overflow-hidden bg-gray-100">
                      {p.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.cover_image} alt={p.title} loading="lazy" className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="h-40 w-full" style={{ background: `linear-gradient(135deg, ${goldTint(0.18)}, ${goldTint(0.04)})` }} />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <span className="text-xs text-gray-400">{fmtDate(p.published_at)}</span>
                      <h3 className="mt-1.5 text-base font-semibold leading-snug tracking-[-0.01em] text-gray-900">{p.title}</h3>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        Read more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: GOLD }} />
                      </span>
                    </div>
                  </LocalizedClientLink>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  )
}
