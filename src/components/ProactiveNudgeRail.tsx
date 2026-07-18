// ProactiveNudgeRail — surfaced on the TodayScreen below the hero action.
// Single line, icon + text, tappable. Shows the best passive-signal nudge.
// Pure presentational; data comes from proactiveSurfaceRouter.selectProactiveNudge.
import React from "react";
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
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/40 cursor-pointer hover:bg-slate-800/70 transition-colors"
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTap?.(); }}
    >
      <Icon className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="text-[12px] text-slate-300 leading-snug flex-1">{text}</p>
      <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
      {onDismiss && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          aria-label="Dismiss"
          className="shrink-0 p-1 -mr-1 rounded-lg text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
