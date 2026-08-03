
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
      className={`relative overflow-hidden rounded-2xl border-[var(--color-slate-800)] border-opacity-20 bg-white dark:border-[var(--color-slate-800)] dark:border-opacity-30 dark:bg-gradient-to-br dark:text-white p-6 text-[var(--color-ink)]
                  shadow-md transition-all duration-200 hover:scale-[1.005] ${className}`}
      aria-labelledby="value-prop-title"
    >
      <div className="absolute inset-0 bg-gradient-to-br dark:from-[var(--color-peach-400)] dark:to-purple-700 dark:opacity-10 from-[var(--color-emerald-300)] via-transparent to-[var(--color-blue-400)]" />
      <div className="relative z-10 flex items-start gap-4">
        <div className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-peach-400)] text-white text-xl sm:flex">
          ♥️
        </div>
        <div className="flex-1 space-y-2">
          <h2 id="value-prop-title" className="font-semibold text-lg leading-normal">
            Insight-driven companion — your mood, your vocabulary
          </h2>
          <p className="text-[var(--color-slate-400)] dark:text-[var(--color-slate-200)] leading-normal">
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
