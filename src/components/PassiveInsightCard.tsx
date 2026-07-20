// PassiveInsightCard — surfaced on the Dashboard when compound analysis detects a pattern.
// Renders a ProactiveSurfaceCard with icon + title + body + action button + dismiss.
// Pure presentational; data comes from compoundDetector + proactiveSurfaceRouter.
import React from "react";
import { Eye, Activity, Clock, Users, Keyboard, Heart, Shield, Cloud, Sun, AlertCircle } from "lucide-react";

export interface PassiveInsightCardProps {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  color: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  eye: <Eye className="w-4 h-4" />,
  activity: <Activity className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  keyboard: <Keyboard className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
  cloud: <Cloud className="w-4 h-4" />,
  sun: <Sun className="w-4 h-4" />,
  "alert-circle": <AlertCircle className="w-4 h-4" />,
};

const COLOR_MAP: Record<string, string> = {
  amber: "border-amber-700/50 bg-amber-950/30 text-amber-200",
  orange: "border-orange-700/50 bg-orange-950/30 text-orange-200",
  blue: "border-blue-700/50 bg-blue-950/30 text-blue-200",
  purple: "border-purple-700/50 bg-purple-950/30 text-purple-200",
  green: "border-green-700/50 bg-green-950/30 text-green-200",
  teal: "border-teal-700/50 bg-teal-950/30 text-teal-200",
  indigo: "border-indigo-700/50 bg-indigo-950/30 text-indigo-200",
  yellow: "border-yellow-700/50 bg-yellow-950/30 text-yellow-200",
  gray: "border-line-strong/50 bg-slate-950/30 text-ink-2",
};

function PassiveInsightCard({
  id,
  type,
  title,
  body,
  icon,
  color,
  actionLabel,
  onAction,
  onDismiss,
}: PassiveInsightCardProps) {
  if (!title || !body) return null;

  const colorClasses = COLOR_MAP[color] ?? COLOR_MAP.gray;
  const iconEl = ICON_MAP[icon] ?? <AlertCircle className="w-4 h-4" />;

  return (
    <div
      data-testid={`passive-insight-card-${id}`}
      className={`rounded-xl border p-3 space-y-2 ${colorClasses}`}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">{iconEl}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
            {type.replace(/_/g, " ")}
          </p>
          <p className="text-[13px] font-medium leading-snug mt-0.5">{title}</p>
          <p className="text-[12px] opacity-80 leading-snug mt-1">{body}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-[11px] font-medium px-3 min-h-[44px] inline-flex items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[11px] px-3 min-h-[44px] inline-flex items-center opacity-60 hover:opacity-100 transition-opacity ml-auto"
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(PassiveInsightCard);
