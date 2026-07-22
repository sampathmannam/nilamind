import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, TrendingUpDown, LineChart as LineChartIcon, ClipboardCheck, Check } from "lucide-react";
import { t } from "../services/i18n";
import { loadAssessments } from "../services/assessments";
import { wellbeingLongitudinal } from "../services/wellbeingTrack";
import Sparkline from "./Sparkline";

/** Full WHO-5 wellbeing section embedded in DashboardScreen. Shows latest score, trajectory,
 *  sparkline chart, and a "Take the check" CTA. Replaces the compact WellbeingTrendCard
 *  + the standalone WellbeingScreen (Phase 4 consolidation). */
function WellbeingTrendCard({ onTakeCheck }: { onTakeCheck?: () => void }) {
  const [history, setHistory] = useState(() => loadAssessments());
  useEffect(() => { setHistory(loadAssessments()); }, []);

  const wb = useMemo(() => wellbeingLongitudinal(history), [history]);
  const trendKey =
    wb.trajectory === "reliably_improved" ? "improving" : wb.trajectory === "reliably_deteriorated" ? "deteriorating" : "steady";
  const TrendIcon = trendKey === "improving" ? TrendingUp : trendKey === "deteriorating" ? TrendingDown : TrendingUpDown;
  {/* Design review (2026-07-19): "steady" previously used text-sky-300/bg-sky-500 and a raw #38bdf8
      stroke — a cold-blue leak of the same class the Reach-out icon had (index.css comment, 2026-07-18).
      `sky` is folded into the warm lavender/accent family app-wide; `blue` role tokens give the same
      warm treatment and re-theme correctly across dark/Sunrise/elevated/low. Chart strokes now reference
      CSS custom properties directly (SVG/recharts resolves var() at render) instead of hardcoded hex, so
      they track theme changes like TrendChart/MoodHeatmap already do — the old hex values (#10b981,
      #38bdf8) also didn't match this app's actual emerald/accent ramps, so this fixes a color drift too. */}
  const tone =
    trendKey === "improving" ? "text-emerald-300" : trendKey === "deteriorating" ? "text-rose-300" : "text-blue-300";
  const bgTone =
    trendKey === "improving" ? "bg-emerald-500/10 border-emerald-500/40"
    : trendKey === "deteriorating" ? "bg-rose-500/10 border-rose-500/40"
    : "bg-blue-500/10 border-accent/40";
  const stroke = trendKey === "improving" ? "var(--color-success)" : trendKey === "deteriorating" ? "var(--color-danger)" : "var(--color-accent)";
  const trendLabel = t(trendKey === "improving" ? "wellbeing_improving" : trendKey === "deteriorating" ? "wellbeing_deteriorating" : "wellbeing_steady");
  const cadence = wb.isDue ? t("wellbeing_due_now") : `${t("wellbeing_next_due_prefix")} ${wb.dueInDays} ${t("wellbeing_days")}`;
  const chartData = wb.series.map((s) => ({ date: s.date.slice(5), total: s.total }));

  return (
    <div className="space-y-3" id="dashboard-wellbeing">
      {/* Score + trajectory */}
      <div className={`rounded-2xl p-4 border ${bgTone} space-y-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-ink">{t("you_wellbeing_label")}</span>
          </div>
          {wb.taken && <span className="text-xs text-ink-faint">{wb.latest?.date}</span>}
        </div>
        {wb.taken ? (
          <>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-black ${tone}`}>{wb.latest?.total ?? 0}</span>
              <span className="text-sm text-ink-faint mb-0.5">/ 100</span>
              <span className={`ml-auto text-sm font-bold ${tone} flex items-center gap-1`}>
                <TrendIcon className="w-4 h-4" /> {trendLabel}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted">{cadence}</p>
          </>
        ) : (
          <p className="text-[11px] text-ink-faint">{t("wellbeing_none")}</p>
        )}
      </div>

      {/* Sparkline chart — lightweight SVG (no Recharts) */}
      {wb.taken && chartData.length >= 2 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <h4 className="text-xs uppercase font-mono tracking-widest text-ink-muted">
            {t("you_wellbeing_label")} · {chartData.length}
          </h4>
          <div className="relative h-36" role="img" aria-label="Wellbeing trend over time. Dashed line marks the 50 threshold; higher is better.">
            {/* threshold line at y=50 on a 0–100 scale */}
            <div
              className="absolute left-0 right-0 border-t border-dashed border-warn"
              style={{ bottom: "50%" }}
              aria-hidden="true"
            />
            <div className="absolute right-1 top-1 text-[8px] text-warn">threshold 50</div>
            <Sparkline
              data={chartData.map((d) => d.total)}
              min={0}
              max={100}
              width={260}
              height={140}
              color={stroke}
              className="w-full"
            />
          </div>
          <p className="text-xs text-slate-600">Dashed line = wellbeing threshold (50). Higher is better. This is a pattern over time, not a diagnosis.</p>
        </div>
      )}

      {/* Take the check CTA */}
      {onTakeCheck && (
        <button
          onClick={onTakeCheck}
          id="dashboard-wellbeing-take"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
        >
          {wb.taken ? <><Check className="w-4 h-4" /> {t("wellbeing_take")}</> : <><ClipboardCheck className="w-4 h-4" /> {t("wellbeing_take")}</>}
        </button>
      )}
    </div>
  );
}

export default React.memo(WellbeingTrendCard);
