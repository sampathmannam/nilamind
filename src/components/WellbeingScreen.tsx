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
import { ChevronLeft, ClipboardCheck, TrendingUp, TrendingDown, TrendingUpDown, Check } from "lucide-react";
import { t, useLanguage } from "../services/i18n";
import { loadAssessments } from "../services/assessments";
import { wellbeingLongitudinal } from "../services/wellbeingTrack";

interface Props {
  onClose: () => void;
  onActivateCrisis: () => void;
  /** Navigate to the Screenings hub to take the WHO-5 check. */
  onTake: () => void;
}

const TONE: Record<string, { text: string; bg: string; border: string; stroke: string }> = {
  improving: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/40", stroke: "#10b981" },
  deteriorating: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/40", stroke: "#B5614E" },
  steady: { text: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/40", stroke: "#38bdf8" },
};

export default function WellbeingScreen({ onClose, onTake }: Props) {
  useLanguage(); // re-render on language change
  const [history, setHistory] = useState(() => loadAssessments());

  useEffect(() => {
    setHistory(loadAssessments());
  }, []);

  const wb = useMemo(() => wellbeingLongitudinal(history), [history]);

  const trendKey =
    wb.trajectory === "reliably_improved" ? "improving" : wb.trajectory === "reliably_deteriorated" ? "deteriorating" : "steady";
  const tone = TONE[trendKey];
  const TrendIcon = trendKey === "improving" ? TrendingUp : trendKey === "deteriorating" ? TrendingDown : TrendingUpDown;
  const trendLabel = t(trendKey === "improving" ? "wellbeing_improving" : trendKey === "deteriorating" ? "wellbeing_deteriorating" : "wellbeing_steady");

  const chartData = wb.series.map((s) => ({ date: s.date.slice(5), total: s.total }));

  const cadenceLabel = wb.isDue
    ? t("wellbeing_due_now")
    : `${t("wellbeing_next_due_prefix")} ${wb.dueInDays} ${t("wellbeing_days")}`;

  return (
    <div className="space-y-5 max-w-md mx-auto" id="wellbeing-screen">
      <button
        onClick={onClose}
        className="text-xs font-semibold text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <LineChart className="w-5 h-5 text-emerald-400" /> {t("you_wellbeing_label")}
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">{t("wellbeing_screen_intro")}</p>
      </header>

      {!wb.taken ? (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
          <p className="text-sm text-slate-300">{t("wellbeing_none")}</p>
          <button
            onClick={onTake}
            id="wellbeing-take-first"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            <ClipboardCheck className="w-4 h-4" /> {t("wellbeing_take")}
          </button>
        </div>
      ) : (
        <>
          {/* Latest score + trajectory */}
          <div className={`rounded-2xl p-5 border ${tone.bg} ${tone.border} space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400">WHO-5 · wellbeing</span>
              <span className="text-[10px] text-slate-500">{wb.latest ? wb.latest.date : ""}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black ${tone.text}`}>{wb.latest ? wb.latest.total : 0}</span>
              <span className="text-sm text-slate-500 mb-1">/ 100</span>
              <span className={`ml-auto text-sm font-bold ${tone.text} flex items-center gap-1`}>
                <TrendIcon className="w-4 h-4" /> {trendLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{cadenceLabel}</p>
          </div>

          {/* Long-view sparkline */}
          {chartData.length >= 2 && (
            <div className="glass rounded-2xl p-4 space-y-2">
              <h4 className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                {t("you_wellbeing_label")} · {chartData.length}
              </h4>
              <div className="h-40 -ml-2" role="img" aria-label="Wellbeing trend over time">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#948A7E" }} stroke="#2E2922" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#948A7E" }} stroke="#2E2922" width={24} />
                    <Tooltip
                      contentStyle={{ background: "#171311", border: "1px solid #2E2922", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#A89D90" }}
                    />
                    <ReferenceLine y={50} stroke="#CE9A3A" strokeDasharray="4 4" label={{ value: "threshold", fontSize: 8, fill: "#CE9A3A", position: "insideTopRight" }} />
                    <Line type="monotone" dataKey="total" stroke={tone.stroke} strokeWidth={2} dot={{ r: 3, fill: tone.stroke }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-600">Dashed line = wellbeing threshold (50). Higher is better. This is a pattern over time, not a diagnosis.</p>
            </div>
          )}

          <button
            onClick={onTake}
            id="wellbeing-take"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> {t("wellbeing_take")}
          </button>
        </>
      )}
    </div>
  );
}
