// ProactiveNudgeRail — surfaced on the TodayScreen below the hero action.
// Single line, icon + text, tappable. Shows the best passive-signal nudge.
// Pure presentational; data comes from proactiveSurfaceRouter.selectProactiveNudge.
import { AlertCircle, Activity, Moon, TrendingUp, ChevronRight, X } from "lucide-react";

export interface ProactiveNudgeRailProps {
  text: string;
  icon?: string;
  onTap?: () => void;
  onDismiss?: () => void;
}

const ICONS: Record<string, typeof AlertCircle> = {
  "alert-circle": AlertCircle,
  activity: Activity,
  moon: Moon,
  "trending-up": TrendingUp,
};

export default function ProactiveNudgeRail({
  text,
  icon = "alert-circle",
  onTap,
  onDismiss,
}: ProactiveNudgeRailProps) {
  if (!text) return null;

  const Icon = ICONS[icon] ?? AlertCircle; // honor the icon prop (was hardcoded to AlertCircle)

  return (
    <div
      data-testid="proactive-nudge-rail"
      className="flex items-center gap-2 px-3 py-2 rounded-xl glass cursor-pointer hover:brightness-125 transition-all"
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTap?.(); }}
    >
      <Icon className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="text-[12px] text-ink-2 leading-snug flex-1">{text}</p>
      <ChevronRight className="w-3 h-3 text-ink-faint shrink-0" />
      {onDismiss && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          aria-label="Dismiss"
          className="shrink-0 p-1 -mr-1 rounded-lg text-ink-faint hover:text-ink-2 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
