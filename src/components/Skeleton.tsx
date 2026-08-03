
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-line-strong/50 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-fill/50 border border-line-strong rounded-xl p-4 ${className}`}>
      <Skeleton className="h-5 w-1/4 rounded mb-4" />
      <Skeleton className="h-48 w-full rounded" />
    </div>
  );
}

interface SkeletonCardProps {
  /** Number of shimmer lines to render inside the card. */
  lines?: number;
  className?: string;
}

/** SkeletonCard — a shimmering placeholder used while dashboard/data sections load.
 *  Uses the existing `nila-shimmer` keyframe so it matches the app's calm motion language. */
export function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
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