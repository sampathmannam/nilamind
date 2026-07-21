import { localDateKey } from "../services/storageUtils";
import { useState, useMemo } from "react";
import { ChevronLeft, CalendarRange, Check } from "lucide-react";
import { t, useLanguage, type I18nKey } from "../services/i18n";
import { hapticSuccess } from "../hooks/useHaptics";
import { tryUnlockAchievement } from "../services/achievements";
import {
  addEpisodeMarker,
  readEpisodeMarkers,
  type EpisodeMarker,
  type EpisodePhase,
} from "../services/episodeMarker";

import EmptyState from "./EmptyState";

interface Props {
  onClose: () => void;
}

const PHASES: EpisodePhase[] = ["elevated", "depressed", "mixed", "stable"];
const phaseKey = (p: EpisodePhase): I18nKey =>
  p === "elevated" ? "em_phase_elevated" : p === "depressed" ? "em_phase_depressed" : p === "mixed" ? "em_phase_mixed" : "em_phase_stable";

const today = () => localDateKey();

export default function EpisodeMarkerScreen({ onClose }: Props) {
  useLanguage();
  const [phase, setPhase] = useState<EpisodePhase | null>(null);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const markers = useMemo(() => readEpisodeMarkers(), [phase, from, to, note]);
  const sorted = useMemo(
    () => [...markers].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt)),
    [markers],
  );

  const save = () => {
    if (!phase) {
      setError(t("em_phase"));
      return;
    }
    try {
      addEpisodeMarker({
        id: "em_" + Date.now(),
        startDate: from,
        endDate: to,
        phase,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      });
      hapticSuccess(); // UX-5: tactile confirmation on episode marker save
      tryUnlockAchievement("first_episode"); // Retention: unlock achievement
      setPhase(null);
      setNote("");
      setFrom(today());
      setTo(today());
      setError(null);
    } catch {
      setError(t("em_from") + " / " + t("em_to"));
    }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="episode-marker-screen">
      <button
        onClick={onClose}
        className="text-xs font-semibold text-ink-muted hover:text-ink flex items-center gap-1 cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-ink flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-amber-400" /> {t("you_episode_marker_label")}
        </h1>
        <p className="text-xs text-ink-muted leading-relaxed">{t("em_intro")}</p>
      </header>

      {/* Add marker */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-xs uppercase font-mono tracking-widest text-ink-muted">{t("em_add_marker")}</p>

        <div className="grid grid-cols-2 gap-2">
          {PHASES.map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`py-2.5 rounded-xl text-sm font-medium border cursor-pointer transition-all active:scale-95 ${
                phase === p
                  ? "bg-amber-600/20 border-amber-500/50 text-amber-200"
                  : "bg-page border-line text-ink-2 hover:border-line-strong hover:text-ink"
              }`}
            >
              {t(phaseKey(p))}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[11px] text-ink-muted">{t("em_from")}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-page border border-line rounded-lg px-2 py-1.5 text-sm text-ink-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-ink-muted">{t("em_to")}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-page border border-line rounded-lg px-2 py-1.5 text-sm text-ink-2"
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-[11px] text-ink-muted">{t("em_note_optional")}</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            placeholder="…"
            className="w-full bg-page border border-line rounded-lg px-2 py-1.5 text-sm text-ink-2"
          />
        </label>

        {error && <p className="text-[11px] text-rose-300">{error}</p>}

        <button
          onClick={save}
          id="episode-marker-save"
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> {t("em_save")}
        </button>
      </div>

      {/* Past markers */}
      <div className="space-y-2">
        <p className="text-xs uppercase font-mono tracking-widest text-ink-muted">{t("em_past")}</p>
        {sorted.length === 0 ? (
          <EmptyState
            illustration="🌿"
            title={t("em_none")}
            body="Track your bipolar phases over time. This helps you and your clinician see patterns."
          />
        ) : (
          sorted.map((m) => (
            <div key={m.id} className="bg-fill/50 border border-line-strong rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{t(phaseKey(m.phase))}</span>
                <span className="text-[11px] text-ink-faint">
                  {m.startDate === m.endDate ? m.startDate : `${m.startDate} – ${m.endDate}`}
                </span>
              </div>
              {m.note && <p className="text-[11px] text-ink-muted">{m.note}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
