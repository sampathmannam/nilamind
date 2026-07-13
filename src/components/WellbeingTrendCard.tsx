import React from "react";
import { TrendingUp, TrendingDown, TrendingUpDown, LineChart } from "lucide-react";
import { t } from "../services/i18n";
import { loadAssessments } from "../services/assessments";
import { wellbeingLongitudinal } from "../services/wellbeingTrack";

/** Compact Dashboard card surfacing the longitudinal wellbeing trend + cadence. Reuses the validated
 *  WHO-5 history via wellbeingLongitudinal; never stores its own data. */
export default function WellbeingTrendCard({ onOpen }: { onOpen: () => void }) {
  const wb = wellbeingLongitudinal(loadAssessments());
  const trendKey =
    wb.trajectory === "reliably_improved" ? "improving" : wb.trajectory === "reliably_deteriorated" ? "deteriorating" : "steady";
  const TrendIcon = trendKey === "improving" ? TrendingUp : trendKey === "deteriorating" ? TrendingDown : TrendingUpDown;
  const tone =
    trendKey === "improving" ? "text-emerald-300" : trendKey === "deteriorating" ? "text-rose-300" : "text-sky-300";
  const trendLabel = t(trendKey === "improving" ? "wellbeing_improving" : trendKey === "deteriorating" ? "wellbeing_deteriorating" : "wellbeing_steady");
  const cadence = wb.isDue ? t("wellbeing_due_now") : `${t("wellbeing_next_due_prefix")} ${wb.dueInDays} ${t("wellbeing_days")}`;

  return (
    <button
      onClick={onOpen}
      id="dashboard-wellbeing-card"
      className="w-full glass hover:brightness-125 hover:bg-raised p-4 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3"
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-slate-100">{t("you_wellbeing_label")}</span>
        </div>
        {wb.taken ? (
          <p className="text-[11px] text-slate-400">
            Last: <span className="font-semibold text-slate-200">{wb.latest?.total ?? 0}/100 · {trendLabel}</span> · {cadence}
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">{t("wellbeing_none")}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {wb.taken && <span className="text-lg font-bold font-mono text-slate-100">{wb.latest?.total ?? 0}</span>}
        <TrendIcon className={`w-5 h-5 ${tone}`} />
      </div>
    </button>
  );
}
