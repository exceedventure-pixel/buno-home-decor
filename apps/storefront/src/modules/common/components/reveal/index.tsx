"use client"

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react"

/**
 * Reveals its children with a gentle fade-and-rise the first time they scroll into view.
 *
 * Apple-style motion: subtle, once, and never in the way. Uses IntersectionObserver so nothing
 * animates off-screen; `delay` staggers siblings. Respects prefers-reduced-motion (the CSS classes
 * collapse the animation) and, if IntersectionObserver is missing, shows content immediately.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
  once = true,
}: {
  children: ReactNode
  as?: ElementType
  /** Stagger, in ms. */
  delay?: number
  className?: string
  once?: boolean
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            if (once) io.disconnect()
          } else if (!once) {
            setShown(false)
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once])

  return (
    <Tag
      ref={ref as any}
      className={`${shown ? "reveal-in" : "reveal-init"} ${className}`}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
