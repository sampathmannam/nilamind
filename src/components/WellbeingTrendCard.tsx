import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, TrendingUpDown, LineChart as LineChartIcon, ClipboardCheck, Check } from "lucide-react";
import { t } from "../services/i18n";
import { loadAssessments } from "../services/assessments";
import { wellbeingLongitudinal } from "../services/wellbeingTrack";

/** Full WHO-5 wellbeing section embedded in DashboardScreen. Shows latest score, trajectory,
 *  sparkline chart, and a "Take the check" CTA. Replaces the compact WellbeingTrendCard
 *  + the standalone WellbeingScreen (Phase 4 consolidation). */
export default function WellbeingTrendCard({ onTakeCheck }: { onTakeCheck?: () => void }) {
  const [history, setHistory] = useState(() => loadAssessments());
  useEffect(() => { setHistory(loadAssessments()); }, []);

  const wb = useMemo(() => wellbeingLongitudinal(history), [history]);
  const trendKey =
    wb.trajectory === "reliably_improved" ? "improving" : wb.trajectory === "reliably_deteriorated" ? "deteriorating" : "steady";
  const TrendIcon = trendKey === "improving" ? TrendingUp : trendKey === "deteriorating" ? TrendingDown : TrendingUpDown;
  const tone =
    trendKey === "improving" ? "text-emerald-300" : trendKey === "deteriorating" ? "text-rose-300" : "text-sky-300";
  const bgTone =
    trendKey === "improving" ? "bg-emerald-500/10 border-emerald-500/40"
    : trendKey === "deteriorating" ? "bg-rose-500/10 border-rose-500/40"
    : "bg-sky-500/10 border-sky-500/40";
  const stroke = trendKey === "improving" ? "#10b981" : trendKey === "deteriorating" ? "#B5614E" : "#38bdf8";
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
            <span className="text-sm font-bold text-slate-100">{t("you_wellbeing_label")}</span>
          </div>
          {wb.taken && <span className="text-xs text-slate-500">{wb.latest?.date}</span>}
        </div>
        {wb.taken ? (
          <>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-black ${tone}`}>{wb.latest?.total ?? 0}</span>
              <span className="text-sm text-slate-500 mb-0.5">/ 100</span>
              <span className={`ml-auto text-sm font-bold ${tone} flex items-center gap-1`}>
                <TrendIcon className="w-4 h-4" /> {trendLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{cadence}</p>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">{t("wellbeing_none")}</p>
        )}
      </div>

      {/* Sparkline chart */}
      {wb.taken && chartData.length >= 2 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <h4 className="text-xs uppercase font-mono tracking-widest text-slate-400">
            {t("you_wellbeing_label")} · {chartData.length}
          </h4>
          <div className="h-36 -ml-2" role="img" aria-label="Wellbeing trend over time">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#948A7E" }} stroke="#2E2922" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#948A7E" }} stroke="#2E2922" width={24} />
                <Tooltip
                  contentStyle={{ background: "#171311", border: "1px solid #2E2922", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#A89D90" }}
                />
                <ReferenceLine y={50} stroke="#CE9A3A" strokeDasharray="4 4" label={{ value: "threshold", fontSize: 8, fill: "#CE9A3A", position: "insideTopRight" }} />
                <Line type="monotone" dataKey="total" stroke={stroke} strokeWidth={2} dot={{ r: 3, fill: stroke }} />
              </LineChart>
            </ResponsiveContainer>
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
