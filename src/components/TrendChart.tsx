import React from "react";
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "../services/i18n";

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  score: number;
  severity?: string;
}

interface SeverityBand {
  min: number;
  max: number;
  label: string;
  color: string; // CSS variable or hex
}

interface Props {
  data: TrendPoint[];
  title: string;
  /** Severity bands for the instrument (e.g., PHQ-9: 0-4 minimal, 5-9 mild, ...). */
  bands?: SeverityBand[];
  /** Maximum possible score for the Y-axis. */
  maxScore?: number;
  /** Clinical significance threshold (e.g., 10 for PHQ-9). */
  threshold?: number;
  ariaLabel?: string;
}

/** Default PHQ-9 severity bands. */
export const PHQ9_BANDS: SeverityBand[] = [
  { min: 0, max: 4, label: "Minimal", color: "var(--color-emerald-400)" },
  { min: 5, max: 9, label: "Mild", color: "var(--color-amber-400)" },
  { min: 10, max: 14, label: "Moderate", color: "var(--color-peach-400)" },
  { min: 15, max: 19, label: "Mod. severe", color: "var(--color-rose-400)" },
  { min: 20, max: 27, label: "Severe", color: "var(--color-rose-600)" },
];

/** Default GAD-7 severity bands. */
export const GAD7_BANDS: SeverityBand[] = [
  { min: 0, max: 4, label: "Minimal", color: "var(--color-emerald-400)" },
  { min: 5, max: 9, label: "Mild", color: "var(--color-amber-400)" },
  { min: 10, max: 14, label: "Moderate", color: "var(--color-peach-400)" },
  { min: 15, max: 21, label: "Severe", color: "var(--color-rose-400)" },
];

/** Default WHO-5 severity bands (inverted: higher = better). */
export const WHO5_BANDS: SeverityBand[] = [
  { min: 0, max: 25, label: "Poor", color: "var(--color-rose-400)" },
  { min: 26, max: 50, label: "Below avg", color: "var(--color-amber-400)" },
  { min: 51, max: 75, label: "Average", color: "var(--color-peach-400)" },
  { min: 76, max: 100, label: "Good", color: "var(--color-emerald-400)" },
];

/**
 * TrendChart — a warm, accessible line chart showing assessment scores over time.
 * Uses Recharts with severity-colored background bands.
 */
function TrendChart({
  data,
  title,
  bands = PHQ9_BANDS,
  maxScore = 27,
  threshold,
  ariaLabel,
}: Props) {
  useLanguage();

  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-4 space-y-2">
        <p className="text-sm font-semibold text-ink-2">{title}</p>
        <p className="text-[11px] text-ink-faint">No data yet — complete an assessment to see your trend.</p>
      </div>
    );
  }

  // Format dates for display
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as TrendPoint;
    return (
      <div className="bg-fill border border-line-strong rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-ink-2 font-semibold">{point.date}</p>
        <p className="text-ink-2">Score: {point.score}</p>
        {point.severity && <p className="text-ink-muted">{point.severity}</p>}
      </div>
    );
  };

  return (
    <div
      className="glass rounded-2xl p-4 space-y-3"
      role="img"
      aria-label={ariaLabel ?? `${title} trend chart`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-2">{title}</p>
        {data.length >= 2 && (
          <TrendBadge first={data[0].score} last={data[data.length - 1].score} />
        )}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
          {/* Severity band backgrounds */}
          {bands.map((band, i) => (
            <ReferenceLine
              key={i}
              y={band.min}
              stroke={band.color}
              strokeDasharray="3 3"
              strokeOpacity={0.3}
            />
          ))}

          {/* Threshold line */}
          {threshold != null && (
            <ReferenceLine
              y={threshold}
              stroke="var(--color-rose-400)"
              strokeDasharray="6 3"
              strokeOpacity={0.6}
              label={{ value: "Clinical", position: "right", fontSize: 9, fill: "var(--color-ink-faint)" }}
            />
          )}

          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "var(--color-ink-faint)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, maxScore]}
            tick={{ fontSize: 9, fill: "var(--color-ink-faint)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--color-blue-400)"
            strokeWidth={2}
            fill="var(--color-blue-400)"
            fillOpacity={0.15}
            dot={{ r: 3, fill: "var(--color-blue-400)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--color-blue-300)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-ink-faint">
        {bands.map((band, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: band.color }} />
            <span>{band.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small badge showing if the trend is improving, stable, or worsening. */
function TrendBadge({ first, last }: { first: number; last: number }) {
  const diff = last - first;
  const absDiff = Math.abs(diff);
  if (absDiff < 3) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-line-strong text-ink-muted">Stable</span>;
  }
  if (diff < 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Improving ↓</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">Worsening ↑</span>;
}

export default React.memo(TrendChart);
