import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight } from "lucide-react"

/**
 * LEGAL DOC — the shared layout for policy pages (terms, privacy, refund, shipping…).
 *
 * One place owns the reading experience these pages all need: a compact branded header with a
 * "last updated" stamp, a sticky "on this page" navigator, deep-linkable numbered sections, and a
 * closing "still have questions" card. A page just supplies its sections as data, so they stay
 * consistent and none of them re-invents the scaffolding.
 *
 * Sections are numbered by the layout from their order, so a page's section titles carry no
 * numbers — reordering or inserting one can never leave the list mislabelled.
 */

const GOLD = "#F5B301"
const goldTint = (a: number) => `rgba(245, 179, 1, ${a})`

export type LegalSection = {
  /** Stable anchor id used by the on-this-page links and deep links. */
  id: string
  title: string
  body: React.ReactNode
}

/**
 * Shared prose styling for section bodies. Bodies are written as plain semantic JSX
 * (<p>, <ul>, <strong>, <a>) and inherit their look from here, so no page repeats class strings.
 */
const PROSE =
  "space-y-4 text-[15px] leading-7 text-ui-fg-subtle " +
  "[&_strong]:font-semibold [&_strong]:text-ui-fg-base " +
  "[&_a]:font-medium [&_a]:text-[color:var(--brand-primary)] [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[rgba(245,179,1,0.7)] hover:[&_a]:decoration-[color:var(--brand-primary)] " +
  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:space-y-2 [&_ol]:space-y-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:pl-1 [&_li]:marker:font-semibold [&_li]:marker:text-[#F5B301]"

/** The numbered anchor list, shared by the mobile disclosure and the desktop rail. */
function TocList({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="flex flex-col gap-0.5">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-ui-fg-subtle transition-colors hover:bg-ui-bg-base hover:text-ui-fg-base"
          >
            <span
              className="w-4 shrink-0 text-right text-xs font-semibold tabular-nums"
              style={{ color: GOLD }}
            >
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
  /** Human date, e.g. "August 12, 2026". */
  lastUpdated: string
  /** ISO date for the <time> element (SEO / machine-readable). Falls back to no dateTime. */
  updatedIso?: string
  intro?: React.ReactNode
  sections: LegalSection[]
}) {
  return (
    <div
      style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}
      className="overflow-hidden"
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-ui-border-base">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${GOLD} 20%, ${GOLD} 80%, transparent)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(55% 60% at 50% 0%, ${goldTint(0.1)} 0%, transparent 70%)` }}
        />
        <div className="content-container relative py-14 medium:py-20 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em]"
            style={{ borderColor: goldTint(0.5), color: "var(--brand-primary)", backgroundColor: goldTint(0.1) }}
          >
            <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: GOLD }} />
            Legal
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-tight tracking-tight small:text-4xl medium:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm" style={{ color: "var(--brand-secondary)" }}>
            Last updated:{" "}
            <time dateTime={updatedIso} className="font-semibold text-ui-fg-base">
              {lastUpdated}
            </time>
          </p>
        </div>
      </section>

      {/* ── Body: sticky nav + sections ──────────────────────────────────────── */}
      <div className="content-container py-12 medium:py-16">
        {intro && <div className={`mx-auto mb-10 max-w-3xl ${PROSE}`}>{intro}</div>}

        <div className="grid gap-10 medium:grid-cols-[minmax(0,240px)_minmax(0,1fr)] medium:gap-14">
          {/* On this page — a collapsed disclosure on mobile, a sticky rail on desktop.
              Two elements (not one <details> toggled by CSS) so it stays open on desktop and
              collapsed on mobile with no JavaScript. */}
          <aside className="medium:sticky medium:top-24 medium:self-start">
            {/* Mobile */}
            <details className="group rounded-2xl border border-ui-border-base bg-ui-bg-subtle p-4 medium:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ui-fg-muted">
                On this page
                <span className="text-ui-fg-subtle transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-4">
                <TocList sections={sections} />
              </div>
            </details>
            {/* Desktop */}
            <nav aria-label="On this page" className="hidden medium:block">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ui-fg-muted">
                On this page
              </p>
              <TocList sections={sections} />
            </nav>
          </aside>

          {/* Sections */}
          <div className="min-w-0 max-w-3xl">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-28 border-b border-ui-border-base pb-9 pt-9 first:pt-0 last:border-0"
              >
                <h2 className="mb-4 flex items-baseline gap-3 text-xl font-semibold tracking-tight medium:text-2xl">
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: GOLD }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </h2>
                <div className={PROSE}>{s.body}</div>
              </section>
            ))}
          </div>
        </div>

        {/* Closing help card */}
        <div
          className="mx-auto mt-14 flex max-w-3xl flex-col items-start gap-4 rounded-2xl border p-6 medium:flex-row medium:items-center medium:justify-between"
          style={{ borderColor: goldTint(0.3), backgroundColor: goldTint(0.07) }}
        >
          <div>
            <p className="text-base font-semibold text-ui-fg-base">Still have questions?</p>
            <p className="mt-1 text-sm" style={{ color: "var(--brand-secondary)" }}>
              Our team is happy to help with anything on this page.
            </p>
          </div>
          <LocalizedClientLink
            href="/contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: GOLD, color: "var(--brand-primary)" }}
          >
            Contact us <ArrowRight className="h-4 w-4" />
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}
