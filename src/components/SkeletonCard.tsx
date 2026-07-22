
interface SkeletonCardProps {
  /** Number of shimmer lines to render inside the card. */
  lines?: number;
  className?: string;
}

/** SkeletonCard — a shimmering placeholder used while dashboard/data sections load.
 *  Uses the existing `nila-shimmer` keyframe so it matches the app's calm motion language. */
export default function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`bg-page border border-line rounded-2xl p-4 space-y-3 ${className}`}
      aria-hidden="true"
      data-testid="skeleton-card"
    >
      <div className="h-4 w-1/3 rounded bg-slate-800 shimmer" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-slate-850 shimmer"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

/** Shimmer utility class — references the app's `nila-shimmer` keyframe. */
export const shimmerClass = "shimmer";
