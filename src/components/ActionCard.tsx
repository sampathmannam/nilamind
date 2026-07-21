// ActionCard — a tappable card for navigation/CTAs with icon + title + subtitle + chevron.
// Part of the standardized card taxonomy (StatCard / ActionCard / InfoCard).
// Design: consistent placement, one primary action, ChevronRight indicator.

import { ChevronRight } from "lucide-react";

interface ActionCardProps {
  /** Icon displayed on the left. */
  icon: React.ReactNode;
  /** Primary title. */
  title: string;
  /** Secondary subtitle text. */
  subtitle?: string;
  /** Icon color class (e.g., "text-blue-400"). */
  iconColor?: string;
  /** Tap handler. */
  onTap: () => void;
  /** Optional accent border. */
  accent?: "none" | "crisis" | "warning" | "success";
  className?: string;
}

const ACCENT_MAP: Record<string, string> = {
  none: "",
  crisis: "border-l-4 border-l-rose-500",
  warning: "border-l-4 border-l-amber-500",
  success: "border-l-4 border-l-emerald-500",
};

export default function ActionCard({
  icon,
  title,
  subtitle,
  iconColor = "text-ink-muted",
  onTap,
  accent = "none",
  className = "",
}: ActionCardProps) {
  return (
    <button
      onClick={onTap}
      aria-label={subtitle ? `${title}: ${subtitle}` : title}
      className={`w-full glass hover:brightness-110 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3 ${ACCENT_MAP[accent]} ${className}`}
    >
      <span className={`shrink-0 ${iconColor}`} aria-hidden="true">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-ink">{title}</span>
        {subtitle && <span className="block text-[11px] text-ink-muted mt-0.5">{subtitle}</span>}
      </span>
      <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
    </button>
  );
}
