// StatCard — a compact card for displaying a single KPI with optional sparkline.
// Part of the standardized card taxonomy (StatCard / ActionCard / InfoCard).
// Design: one question per card, large number, optional trend context.

import Sparkline from "./Sparkline";

interface StatCardProps {
  /** The main stat value. */
  value: number | string;
  /** Label for the stat. */
  label: string;
  /** Optional icon. */
  icon?: React.ReactNode;
  /** Optional sparkline data. */
  sparkData?: number[];
  /** Sparkline color. */
  sparkColor?: string;
  /** Optional tap handler. */
  onTap?: () => void;
  className?: string;
}

export default function StatCard({
  value,
  label,
  icon,
  sparkData,
  sparkColor = "var(--color-accent-hi)",
  onTap,
  className = "",
}: StatCardProps) {
  return (
    <button
      onClick={onTap}
      disabled={!onTap}
      className={`glass rounded-2xl p-4 text-left space-y-2 ${onTap ? "active:scale-[0.99] transition-transform cursor-pointer hover:brightness-110" : "cursor-default"} ${className}`}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-ink-muted">{icon}</span>}
          <p className="text-xs text-ink-muted font-medium">{label}</p>
        </div>
        {sparkData && sparkData.length >= 2 && (
          <Sparkline data={sparkData} width={60} height={16} color={sparkColor} />
        )}
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
    </button>
  );
}
