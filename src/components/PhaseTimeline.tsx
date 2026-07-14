import React, { useMemo } from "react";
import { useLanguage } from "../services/i18n";
import type { EpisodeMarker, EpisodePhase } from "../services/episodeMarker";

interface Props {
  markers: EpisodeMarker[];
  /** Number of days to show (default 365). */
  days?: number;
}

const PHASE_COLORS: Record<EpisodePhase, { bg: string; text: string; label: string }> = {
  elevated: { bg: "var(--color-amber-400)", text: "var(--color-slate-950)", label: "Elevated" },
  depressed: { bg: "var(--color-blue-400)", text: "var(--color-slate-100)", label: "Depressed" },
  mixed: { bg: "var(--color-purple-400)", text: "var(--color-slate-100)", label: "Mixed" },
  stable: { bg: "var(--color-emerald-400)", text: "var(--color-slate-950)", label: "Stable" },
};

const PHASE_I18N: Record<EpisodePhase, string> = {
  elevated: "em_phase_elevated",
  depressed: "em_phase_depressed",
  mixed: "em_phase_mixed",
  stable: "em_phase_stable",
};

/**
 * PhaseTimeline — a horizontal bar showing episode phases over time.
 * Each phase is a colored segment proportional to its duration.
 * Inspired by mood-tracking apps like Daylio and eMoods.
 */
export default function PhaseTimeline({ markers, days = 365 }: Props) {
  useLanguage();

  const { segments, totalDays } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    // Filter markers to the visible range and sort by start date
    const visible = markers
      .filter((m) => m.startDate <= today.toISOString().split("T")[0] && m.endDate >= startDate.toISOString().split("T")[0])
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Build segments: each phase occupies a percentage of the timeline
    const segments: { phase: EpisodePhase; startPct: number; widthPct: number; label: string }[] = [];
    const totalMs = days * 86_400_000;

    for (const m of visible) {
      const mStart = new Date(m.startDate);
      const mEnd = new Date(m.endDate);
      const startMs = Math.max(0, mStart.getTime() - startDate.getTime());
      const endMs = Math.min(totalMs, mEnd.getTime() - startDate.getTime());
      if (endMs <= startMs) continue;

      segments.push({
        phase: m.phase,
        startPct: (startMs / totalMs) * 100,
        widthPct: ((endMs - startMs) / totalMs) * 100,
        label: PHASE_I18N[m.phase],
      });
    }

    return { segments, totalDays: days };
  }, [markers, days]);

  if (markers.length === 0) {
    return (
      <div className="glass rounded-2xl p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-200">Episode Timeline</p>
        <p className="text-[11px] text-slate-500">No episodes logged yet — this will show your course over time.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3" role="img" aria-label="Episode phase timeline">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Episode Timeline</p>
        <span className="text-[10px] text-slate-500">{totalDays} days</span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-6 rounded-full overflow-hidden bg-slate-800">
        {segments.map((seg, i) => {
          const colors = PHASE_COLORS[seg.phase];
          return (
            <div
              key={i}
              title={`${seg.label}: ${seg.widthPct.toFixed(0)}% of timeline`}
              className="absolute top-0 h-full transition-all"
              style={{
                left: `${seg.startPct}%`,
                width: `${Math.max(seg.widthPct, 0.5)}%`,
                backgroundColor: colors.bg,
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px]">
        {(Object.keys(PHASE_COLORS) as EpisodePhase[]).map((phase) => {
          const colors = PHASE_COLORS[phase];
          return (
            <div key={phase} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.bg }} />
              <span className="text-slate-400">{colors.label}</span>
            </div>
          );
        })}
      </div>

      {/* Recent markers list */}
      <div className="space-y-1.5">
        {markers
          .slice()
          .sort((a, b) => b.startDate.localeCompare(a.startDate))
          .slice(0, 3)
          .map((m) => {
            const colors = PHASE_COLORS[m.phase];
            const range = m.startDate === m.endDate
              ? m.startDate
              : `${m.startDate} – ${m.endDate}`;
            return (
              <div key={m.id} className="flex items-center gap-2 text-[11px]">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.bg }} />
                <span className="text-slate-300 font-medium">{colors.label}</span>
                <span className="text-slate-500">{range}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
