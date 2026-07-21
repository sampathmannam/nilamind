
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-line-strong/50 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-fill/50 border border-line-strong rounded-xl p-4 ${className}`}>
      <Skeleton className="h-5 w-3/4 rounded mb-3" />
      <Skeleton className="h-4 w-1/2 rounded mb-2" />
      <Skeleton className="h-4 w-5/6 rounded mb-2" />
      <Skeleton className="h-4 w-1/3 rounded" />
    </div>
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