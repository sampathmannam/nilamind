import React, { useMemo } from "react";
import { useLanguage } from "../services/i18n";
import type { MoodPoint } from "../services/patternInsights";

interface Props {
  moods: MoodPoint[];
  /** Number of days to show (default 182 ≈ 6 months). */
  days?: number;
}

/** Map mood intensity (1–10) to a warm color. Lower = calmer, higher = more distressed. */
function intensityColor(intensity: number | null | undefined): string {
  if (intensity == null) return "var(--color-slate-800)"; // no data = dark slot
  const clamped = Math.max(1, Math.min(10, Math.round(intensity)));
  // Warm gradient: 1 = soft sage (calm) → 5 = amber (moderate) → 10 = terracotta (distressed)
  const colors = [
    "", // 0 unused
    "var(--color-emerald-500)",   // 1 — very calm
    "var(--color-emerald-400)",   // 2
    "var(--color-emerald-300)",   // 3
    "var(--color-amber-400)",     // 4
    "var(--color-amber-300)",     // 5 — moderate
    "var(--color-peach-400)",     // 6
    "var(--color-rose-300)",      // 7
    "var(--color-rose-400)",      // 8
    "var(--color-rose-500)",      // 9
    "var(--color-rose-600)",      // 10 — very distressed
  ];
  return colors[clamped] ?? "var(--color-slate-800)";
}

/** Month labels for the grid header. */
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * MoodHeatmap — "Year in Pixels" inspired by Daylio.
 * Renders a grid of colored dots, one per day, where color = mood intensity.
 * The grid flows left-to-right, top-to-bottom, with week columns and day rows.
 */
function MoodHeatmap({ moods, days = 182 }: Props) {
  useLanguage();

  const { grid, monthHeaders } = useMemo(() => {
    // Build a map of date → intensity for fast lookup
    const byDate = new Map<string, number>();
    for (const m of moods) {
      if (m.date && m.intensity != null) byDate.set(m.date, m.intensity);
    }

    // Generate the last N days
    const today = new Date();
    const dates: { date: string; dayOfWeek: number; month: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push({
        date: `${yyyy}-${mm}-${dd}`,
        dayOfWeek: d.getDay(), // 0=Sun
        month: d.getMonth(),
      });
    }

    // Build grid: weeks as columns, days as rows
    // Start from the first day's week
    const grid: { date: string; intensity: number | null; col: number; row: number }[] = [];
    const monthHeaders: { label: string; col: number }[] = [];
    let currentMonth = -1;
    let col = 0;
    let prevDayOfWeek = -1;

    for (const { date, dayOfWeek, month } of dates) {
      // New week starts on Sunday (or first day)
      if (dayOfWeek <= prevDayOfWeek) col++;
      prevDayOfWeek = dayOfWeek;

      // Track month changes for headers
      if (month !== currentMonth) {
        currentMonth = month;
        monthHeaders.push({ label: MONTH_LABELS[month], col });
      }

      grid.push({ date, intensity: byDate.get(date) ?? null, col, row: dayOfWeek });
    }

    return { grid, monthHeaders };
  }, [moods, days]);

  const maxCol = grid.length > 0 ? Math.max(...grid.map((d) => d.col)) : 0;
  const cellSize = 12;
  const gap = 3;
  const headerHeight = 16;
  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="overflow-x-auto" role="img" aria-label="Mood heatmap showing daily mood intensity over time">
      <div className="min-w-fit">
        {/* Month headers */}
        <div className="flex" style={{ paddingLeft: 28, height: headerHeight }}>
          {monthHeaders.map((mh, i) => (
            <div
              key={i}
              className="text-xs text-ink-faint absolute"
              style={{ left: 28 + mh.col * (cellSize + gap) }}
            >
              {mh.label}
            </div>
          ))}
        </div>

        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col" style={{ gap, width: 24 }}>
            {dayLabels.map((label, i) => (
              <div
                key={i}
                className="text-xs text-ink-faint flex items-center"
                style={{ height: cellSize }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            className="relative"
            style={{
              display: "grid",
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
              gridTemplateColumns: `repeat(${maxCol + 1}, ${cellSize}px)`,
              gap,
            }}
          >
            {grid.map((d, i) => (
              <div
                key={i}
                title={`${d.date}: ${d.intensity != null ? `${d.intensity}/10` : "no data"}`}
                className="rounded-sm transition-transform hover:scale-150 cursor-default"
                style={{
                  gridRow: d.row + 1,
                  gridColumn: d.col + 1,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: intensityColor(d.intensity),
                }}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-2 text-xs text-ink-faint">
          <span>Calm</span>
          {[1, 3, 5, 7, 10].map((v) => (
            <div
              key={v}
              className="rounded-sm"
              style={{ width: cellSize, height: cellSize, backgroundColor: intensityColor(v) }}
            />
          ))}
          <span>Distressed</span>
          <div
            className="rounded-sm ml-2"
            style={{ width: cellSize, height: cellSize, backgroundColor: intensityColor(null) }}
          />
          <span>No data</span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MoodHeatmap);
