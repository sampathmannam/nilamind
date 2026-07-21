// HeroMetric — a glanceable, large-format metric with sparkline and trend indicator.
// Design: progressive disclosure Level 1 — answers "How am I doing?" in 2 seconds.
// Research: Boundev AI (2026) mobile dashboard best practices — hero numbers at top,
// sparklines for trend context, trend arrows for direction.

import Sparkline from "./Sparkline";

interface HeroMetricProps {
  /** The main number to display (e.g., mood score 7.2). */
  value: number | string;
  /** Label below the number (e.g., "mood score today"). */
  label: string;
  /** Optional sparkline data for 7-day trend. */
  sparkData?: number[];
  /** Trend percentage (positive = up, negative = down). */
  trend?: number;
  /** Human-readable trend label (e.g., "from last week"). */
  trendLabel?: string;
  /** Color for the sparkline. */
  sparkColor?: string;
  /** Fixed scale floor for sparkline. */
  sparkMin?: number;
  /** Fixed scale ceiling for sparkline. */
  sparkMax?: number;
  /** Optional tap handler. */
  onTap?: () => void;
  /** Screen reader label for the full metric. */
  ariaLabel?: string;
  className?: string;
}

export default function HeroMetric({
  value,
  label,
  sparkData,
  trend,
  trendLabel,
  sparkColor = "var(--color-accent-hi)",
  sparkMin,
  sparkMax,
  onTap,
  ariaLabel,
  className = "",
}: HeroMetricProps) {
  const trendPositive = trend != null && trend > 0;
  const trendNegative = trend != null && trend < 0;
  const trendNeutral = trend != null && trend === 0;

  return (
    <button
      onClick={onTap}
      disabled={!onTap}
      className={`w-full glass rounded-2xl p-5 text-left space-y-3 ${onTap ? "active:scale-[0.99] transition-transform cursor-pointer" : "cursor-default"} ${className}`}
      aria-label={ariaLabel ?? `${label}: ${value}`}
    >
      {/* Main number + label */}
      <div className="space-y-1">
        <p className="text-4xl font-bold text-ink tracking-tight leading-none">{value}</p>
        <p className="text-xs text-ink-muted font-medium">{label}</p>
      </div>

      {/* Sparkline + trend row */}
      {(sparkData || trend != null) && (
        <div className="flex items-center gap-3">
          {sparkData && sparkData.length >= 2 && (
            <Sparkline
              data={sparkData}
              width={100}
              height={24}
              min={sparkMin}
              max={sparkMax}
              color={sparkColor}
              label={`${label} trend`}
            />
          )}
          {trend != null && (
            <span
              className={`text-xs font-semibold flex items-center gap-1 ${
                trendPositive ? "text-emerald-400" : trendNegative ? "text-rose-400" : "text-ink-muted"
              }`}
              aria-label={`Trend: ${trendPositive ? "up" : trendNegative ? "down" : "stable"} ${Math.abs(trend)}%`}
            >
              {trendPositive && "↑"}
              {trendNegative && "↓"}
              {trendNeutral && "—"}
              {Math.abs(trend)}%
              {trendLabel && <span className="text-ink-faint font-normal">{trendLabel}</span>}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
