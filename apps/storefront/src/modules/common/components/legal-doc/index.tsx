import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Reveal from "@modules/common/components/reveal"
import { GOLD, goldTint } from "@lib/brand-ui"
import { ArrowRight } from "lucide-react"

/**
 * LEGAL DOC — the shared layout for policy pages (terms, privacy, refund, shipping…).
 *
 * Apple-style: a calm, spacious document with a soft-card body, a sticky "on this page" rail, and
 * gently revealed sections. A page supplies its sections as data; this owns numbering, the nav,
 * deep-link anchors and styling, so every policy reads and behaves identically.
 *
 * Sections are numbered by the layout from their order, so a page's titles carry no numbers —
 * reordering or inserting one can never leave the list mislabelled.
 */

export type LegalSection = {
  /** Stable anchor id used by the on-this-page links and deep links. */
  id: string
  title: string
  body: React.ReactNode
}

/** Shared prose styling for section bodies — plain semantic JSX inherits its look from here. */
const PROSE =
  "space-y-4 text-[15px] leading-7 text-gray-600 " +
  "[&_strong]:font-semibold [&_strong]:text-gray-900 " +
  "[&_a]:font-medium [&_a]:text-gray-900 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[rgba(240,180,0,0.8)] hover:[&_a]:decoration-gray-900 " +
  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:space-y-2 [&_ol]:space-y-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:pl-1 [&_li]:marker:font-semibold [&_li]:marker:text-[#F0B400]"

function TocList({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="flex flex-col gap-0.5">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex gap-3 rounded-xl px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-white hover:text-gray-900"
          >
            <span className="w-4 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: GOLD }}>
              {i + 1}
            </span>
            <span className="leading-snug">{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}

export default function LegalDoc({
  title,
  lastUpdated,
  updatedIso,
  intro,
  sections,
}: {
  title: string
  lastUpdated: string
  updatedIso?: string
  intro?: React.ReactNode
  sections: LegalSection[]
}) {
  return (
    <div className="bg-white text-gray-900">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% -20%, ${goldTint(0.18)} 0%, transparent 60%)` }} />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center medium:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700" style={{ borderColor: goldTint(0.5), backgroundColor: goldTint(0.12) }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
              Legal
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] small:text-5xl medium:text-6xl">
              {title}
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 text-sm text-gray-500">
              Last updated:{" "}
              <time dateTime={updatedIso} className="font-semibold text-gray-900">{lastUpdated}</time>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        {intro && (
          <Reveal className={`mx-auto mb-12 max-w-3xl text-lg leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-900 [&_a]:font-medium [&_a]:text-gray-900 [&_a]:underline space-y-4 text-gray-500`}>
            {intro}
          </Reveal>
        )}

        <div className="grid gap-10 medium:grid-cols-[minmax(0,260px)_minmax(0,1fr)] medium:gap-14">
          {/* On this page */}
          <aside className="medium:sticky medium:top-24 medium:self-start">
            <details className="group rounded-2xl border border-gray-200 bg-gray-50 p-4 medium:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                On this page
                <span className="text-gray-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-4">
                <TocList sections={sections} />
              </div>
            </details>
            <nav aria-label="On this page" className="hidden rounded-2xl bg-gray-50 p-4 medium:block">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">On this page</p>
              <TocList sections={sections} />
            </nav>
          </aside>

          {/* Sections */}
          <div className="min-w-0 max-w-3xl">
            {sections.map((s, i) => (
              <Reveal key={s.id}>
                <section id={s.id} className="scroll-mt-28 border-b border-gray-100 pb-10 pt-10 first:pt-0 last:border-0">
                  <h2 className="mb-4 flex items-baseline gap-3 text-2xl font-semibold tracking-[-0.02em] medium:text-[1.7rem]">
                    <span className="text-sm font-bold tabular-nums" style={{ color: GOLD }}>{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </h2>
                  <div className={PROSE}>{s.body}</div>
                </section>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Closing help card */}
        <Reveal className="mx-auto mt-16 block max-w-3xl">
          <div className="flex flex-col items-start gap-5 rounded-3xl p-8 medium:flex-row medium:items-center medium:justify-between" style={{ backgroundColor: goldTint(0.1) }}>
            <div>
              <p className="text-lg font-semibold text-gray-900">Still have questions?</p>
              <p className="mt-1 text-sm text-gray-600">Our team is happy to help with anything on this page.</p>
            </div>
            <LocalizedClientLink href="/contact" className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
              Contact us <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </LocalizedClientLink>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
