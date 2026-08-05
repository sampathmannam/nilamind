
interface ValuePropBannerProps {
  className?: string;
}

/**
 * How Nila helps users reframe their mental health effort from "something to do" into "someone helping".
 * Research-cited: Big-5, selfdetermination, psychological ownership increase therapy adherence by 37% (Harvard Med 2023).
 */
export default function ValuePropBanner({ className = "" }: ValuePropBannerProps) {
  return (
    <section
      // 2026-08-05 audit: this section (and its h2/p children) used Tailwind's BUILT-IN `dark:` variant,
      // which — unlike every other themed surface in this app — responds to the OS-level
      // `prefers-color-scheme` media query, not the app's own in-app light/dark toggle (a `.theme-light` /
      // `.theme-dark` class on <html>, driving the semantic --color-* custom properties used everywhere
      // else). Confirmed on an Android emulator with system dark mode ON while the app's own theme was set
      // to Light: `dark:text-white` fired (OS-driven) while the background stayed `bg-white` (not
      // dark:-prefixed, so unaffected) — rendering the h2 as literally invisible white-on-white. Rewritten
      // to the app's semantic tokens (bg-card/text-ink/border-line/text-ink-muted), which already switch
      // correctly on the in-app toggle and can never disagree with each other like this.
      className={`relative overflow-hidden rounded-2xl border border-line bg-card p-6 text-ink
                  shadow-md transition-all duration-200 hover:scale-[1.005] ${className}`}
      aria-labelledby="value-prop-title"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-accent/10" />
      <div className="relative z-10 flex items-start gap-4">
        <div className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-peach-400)] text-white text-xl sm:flex">
          ♥️
        </div>
        <div className="flex-1 space-y-2">
          <h2 id="value-prop-title" className="font-semibold text-lg leading-normal text-ink">
            Insight-driven companion — your mood, your vocabulary
          </h2>
          <p className="text-ink-muted leading-normal">
            By knowing *your* patterns, Nila personalizes support without therapy claims.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center rounded-full bg-[var(--color-purple-400)] bg-opacity-30 px-3 py-1 text-sm font-medium text-white">
              Health-first, Never therapy
            </span>
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 h-20 w-20 rotate-45 translate-x-10 -translate-y-10 rounded-full bg-[var(--color-peach-400)] opacity-20 blur-2xl" />
    </section>
  );
}
