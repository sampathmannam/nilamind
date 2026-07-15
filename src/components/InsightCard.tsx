import React from "react";
import { TrendingUp, TrendingDown, Minus, Lightbulb, type LucideIcon } from "lucide-react";
import { useLanguage } from "../services/i18n";

export interface InsightData {
  title: string;
  body: string;
  /** Optional trend direction for visual indicator. */
  trend?: "improving" | "declining" | "stable";
  /** Optional icon override. */
  icon?: LucideIcon;
  /** Optional color class for the icon (e.g., "text-emerald-400"). */
  iconColor?: string;
  /** Optional source citation. */
  citation?: string;
  /** Optional small chart data (10 or fewer points). */
  sparkline?: number[];
}

interface Props {
  insight: InsightData;
  onClick?: () => void;
}

const TREND_ICONS = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

const TREND_COLORS = {
  improving: "text-emerald-400",
  declining: "text-rose-400",
  stable: "text-slate-400",
};

/**
 * InsightCard — a warm, accessible card showing a pattern Nila noticed.
 * Combines a trend indicator, descriptive text, optional sparkline, and citation.
 * Designed to feel like a friend pointing out something helpful, not a clinical report.
 */
export default function InsightCard({ insight, onClick }: Props) {
  useLanguage();

  const Icon = insight.icon ?? Lightbulb;
  const TrendIcon = insight.trend ? TREND_ICONS[insight.trend] : null;
  const trendColor = insight.trend ? TREND_COLORS[insight.trend] : "";

  const Wrapper = onClick ? "button" : "div";
  const wrapperProps = onClick
    ? { onClick, className: "w-full text-left glass hover:brightness-110 rounded-2xl p-4 space-y-2 transition-all cursor-pointer active:scale-[0.99]" }
    : { className: "glass rounded-2xl p-4 space-y-2" };

  return (
    <Wrapper {...wrapperProps}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${insight.iconColor ?? "text-amber-400"}`} />
        <p className="text-sm font-semibold text-slate-200 flex-1">{insight.title}</p>
        {TrendIcon && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
      </div>

      {/* Body */}
      <p className="text-[11px] text-slate-400 leading-relaxed">{insight.body}</p>

      {/* Sparkline (mini chart) */}
      {insight.sparkline && insight.sparkline.length >= 2 && (
        <div className="pt-1">
          <MiniSparkline data={insight.sparkline} trend={insight.trend} />
        </div>
      )}

      {/* Citation */}
      {insight.citation && (
        <p className="text-xs text-slate-500 italic">Source: {insight.citation}</p>
      )}
    </Wrapper>
  );
}

/** Tiny SVG sparkline — no library dependency. */
function MiniSparkline({ data, trend }: { data: number[]; trend?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const strokeColor =
    trend === "improving" ? "var(--color-emerald-400)" :
    trend === "declining" ? "var(--color-rose-400)" :
    "var(--color-blue-400)";

  return (
    <svg width={width} height={height} className="opacity-70" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
