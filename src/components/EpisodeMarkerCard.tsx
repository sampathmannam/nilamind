import React from "react";
import { Activity } from "lucide-react";
import { t, type I18nKey } from "../services/i18n";
import { currentPhase } from "../services/episodeMarker";

/** Compact Dashboard card showing the active episode-phase marker, if any. */
function EpisodeMarkerCard({ onOpen }: { onOpen: () => void }) {
  const cur = currentPhase();
  const phaseKey: I18nKey =
    cur?.phase === "elevated" ? "em_phase_elevated"
      : cur?.phase === "depressed" ? "em_phase_depressed"
        : cur?.phase === "mixed" ? "em_phase_mixed"
          : "em_phase_stable";

  return (
    <button
      onClick={onOpen}
      id="dashboard-episode-marker-card"
      className="w-full glass hover:brightness-125 hover:bg-raised p-4 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3"
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-ink">{t("you_episode_marker_label")}</span>
        </div>
        {cur ? (
          <p className="text-[11px] text-ink-muted">
            <span className="font-semibold text-ink-2">{t(phaseKey)}</span> · {cur.startDate === cur.endDate ? cur.startDate : `${cur.startDate} – ${cur.endDate}`}
          </p>
        ) : (
          <p className="text-[11px] text-ink-faint">{t("em_none")}</p>
        )}
      </div>
      <Activity className={`w-5 h-5 ${cur ? "text-amber-300" : "text-slate-600"}`} />
    </button>
  );
}

export default React.memo(EpisodeMarkerCard);
