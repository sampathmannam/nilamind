import React from "react";
import { TrendingUp, TrendingDown, Minus, Lightbulb, type LucideIcon } from "lucide-react";
import { useLanguage } from "../services/i18n";
import Sparkline from "./Sparkline";
import Card from "./Card";

export interface InsightData {
  title: string;
  body: string;
  trend?: "improving" | "declining" | "stable";
  icon?: LucideIcon;
  iconColor?: string;
  citation?: string;
  sparkline?: number[];
}

interface Props {
  insight: InsightData;
}

const TREND_ICONS = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

const TREND_COLORS = {
  improving: "text-emerald-400",
  declining: "text-rose-400",
  stable: "text-ink-muted",
};

function InsightCard({ insight }: Props) {
  useLanguage();

  const Icon = insight.icon ?? Lightbulb;
  const TrendIcon = insight.trend ? TREND_ICONS[insight.trend] : null;
  const trendColor = insight.trend ? TREND_COLORS[insight.trend] : "";

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${insight.iconColor ?? "text-amber-400"}`} />
        <p className="text-sm font-semibold text-ink flex-1">{insight.title}</p>
        {TrendIcon && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
      </div>
      <p className="text-[11px] text-ink-muted leading-relaxed">{insight.body}</p>
      {insight.sparkline && insight.sparkline.length >= 2 && (
        <div className="pt-1">
          <Sparkline
            data={insight.sparkline}
            label={`${insight.title} trend (${insight.trend ?? "stable"})`}
            color={
              insight.trend === "improving"
                ? "var(--color-emerald-400)"
                : insight.trend === "declining"
                  ? "var(--color-rose-400)"
                  : "var(--color-accent-hi)"
            }
          />
        </div>
      )}
      {insight.citation && (
        <p className="text-xs text-ink-muted italic">Source: {insight.citation}</p>
      )}
    </Card>
  );
}

export default React.memo(InsightCard);
