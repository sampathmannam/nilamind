// MoodBar — a horizontal bar showing a single metric (0–max) with label.
// Used for glanceable per-domain scores on Dashboard and TodayScreen.
// Pure CSS, no Recharts dependency.

interface MoodBarProps {
  /** Current value. */
  value: number;
  /** Maximum value (default 10). */
  max?: number;
  /** Label shown beside the bar. */
  label: string;
  /** Show numeric value as "n/max" after label. */
  showValue?: boolean;
  className?: string;
}

export default function MoodBar({ value, max = 10, label, showValue = false, className = "" }: MoodBarProps) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label={`${label}: ${clamped} of ${max}`}>
      <span className="text-xs text-ink-muted w-16 shrink-0 text-right truncate">{label}</span>
      <div
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-semibold text-ink w-10 text-left tabular-nums">{clamped}/{max}</span>
      )}
    </div>
  );
}

/** Vertical stack of MoodBars with consistent spacing. */
export function MoodBarRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} role="group">
      {children}
    </div>
  );
}
