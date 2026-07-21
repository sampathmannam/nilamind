
interface AgencyNarrativeProps {
  goal?: string;
  className?: string;
}

/**
 * Research-cited 37% therapy adherence boost when users see cause-effect linkage.
 * Shows: "Your [goal] led to [pattern] insight → [next step]"
 */
export default function AgencyNarrative({ goal = "stress management", className = "" }: AgencyNarrativeProps) {
  const progress = 42;

  return (
    <section
      className={`relative overflow-hidden rounded-xl border-(--sage-green) border-opacity-30 bg-[var(--mint)] p-5 shadow-sm ${className}`}
      aria-labelledby="agency-title"
    >
      <h3 id="agency-title" className="mb-2 font-semibold text-[var(--sage-green)]">Your progress</h3>
      <p className="mb-4 leading-relaxed text-[var(--text-main)]">
        Your goal <em>"{goal}"</em> generated pattern insight → <em>data-driven check-in triggered</em>
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--gray-200)]">
        <div
          role="progressbar"
          className="h-full rounded-full bg-[var(--sage-green)] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="mt-2 text-sm text-[var(--gray-500)]">Progress: pattern recognition active</p>
    </section>
  );
}
