import React, { useMemo, useState } from "react";
import { Clock3, Sunrise } from "lucide-react";
import {
  RHYTHM_ANCHORS,
  MIN_RHYTHM_DAYS,
  loadRhythm,
  recordRhythm,
  computeRhythmRegularity,
  type AnchorKey,
  type RhythmAnchors,
  type RhythmBand,
} from "../services/socialRhythm";
import { dayKey } from "../services/retentionMetrics";
import { hapticLight } from "../hooks/useHaptics";
import { computeCircadianFeedback } from "../services/circadianFeedback";
import { loadMoodHistory } from "../services/moodHistory";

const BAND_COPY: Record<RhythmBand, { label: string; cls: string }> = {
  regular: { label: "Steady rhythm", cls: "text-emerald-400" },
  variable: { label: "Somewhat variable", cls: "text-amber-400" },
  irregular: { label: "Quite variable", cls: "text-rose-300" },
  insufficient: { label: "Keep logging", cls: "text-slate-400" },
};

export default function SocialRhythmScreen() {
  const today = dayKey(new Date());
  const [anchors, setAnchors] = useState<RhythmAnchors>(
    () => loadRhythm().find((e) => e.date === today)?.anchors ?? {},
  );
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0); // bump to recompute after a save

  const reg = useMemo(() => computeRhythmRegularity(), [version]);
  const band = BAND_COPY[reg.band];

  const setAnchor = (key: AnchorKey, val: string) => {
    setAnchors((a) => ({ ...a, [key]: val }));
    setSaved(false);
  };

  const save = () => {
    recordRhythm(anchors);
    setSaved(true);
    setVersion((v) => v + 1);
    hapticLight();
  };

  // Wake-time-lever insight, surfaced right at the point of logging rather than two screens away on the
  // Dashboard. Wake time is the primary zeitgeber emphasized in the IPSRT clinical protocol (Frank et al.,
  // 2005; Monk, Frank, Potts & Kupfer, 2002) — reuses circadianFeedback.ts's combined sleep+rhythm guidance,
  // which already foregrounds a consistent wake time as the strongest single lever. Needs >=3 logged sleep
  // readings (from check-ins) before it has anything to say — otherwise it stays silent rather than guessing.
  const wakeInsight = useMemo(() => {
    if (!saved) return null;
    const sleeps = loadMoodHistory()
      .filter((m) => typeof m.sleepHours === "number" && (m.sleepHours as number) > 0)
      .map((m) => m.sleepHours as number);
    return computeCircadianFeedback({ sleeps, rhythmVariabilityMin: reg.overallVariabilityMin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, version]);

  return (
    <div className="space-y-6 max-w-md mx-auto" id="social-rhythm-screen">
      <div>
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Clock3 className="w-5 h-5 text-indigo-400" /> Social rhythm
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Keeping daily routines at steady times can help steady mood. Log when a few everyday anchors
          happened today.
        </p>
      </div>

      {/* Today's anchors */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-200">Today</div>
        {RHYTHM_ANCHORS.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-300">{label}</span>
            <input
              type="time"
              value={anchors[key] ?? ""}
              onChange={(e) => setAnchor(key, e.target.value)}
              className="bg-page border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              aria-label={label}
            />
          </label>
        ))}
        <button
          onClick={save}
          id="rhythm-save"
          className="w-full mt-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-page"
        >
          {saved ? "Saved" : "Save today's rhythm"}
        </button>
      </div>

      {/* Wake-time-lever insight — right at the point of logging */}
      {wakeInsight && (
        <div className="glass rounded-2xl p-4 space-y-2 border border-indigo-500/20" id="wake-time-insight">
          <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sunrise className="w-4 h-4 text-indigo-400" /> Wake-time insight
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{wakeInsight.guidance}</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Wake time is the anchor most emphasized in Interpersonal &amp; Social Rhythm Therapy (Frank et
            al., 2005; Monk, Frank, Potts &amp; Kupfer, 2002).
          </p>
        </div>
      )}

      {/* Regularity read */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">Your rhythm</div>
          <span className={`text-sm font-semibold ${band.cls}`}>{band.label}</span>
        </div>
        {reg.band === "insufficient" ? (
          <p className="text-xs text-slate-400 leading-relaxed">
            Logged {reg.daysLogged} of {MIN_RHYTHM_DAYS} days needed. Keep going for a few days and a gentle
            read of how steady your timing is will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              Over the last {reg.windowDays} days, your anchor times varied by about{" "}
              <span className="text-slate-200 font-medium">±{reg.overallVariabilityMin} min</span> on average.
              Smaller is steadier — many people aim to keep key anchors within ~45 minutes day to day.
            </p>
            <div className="space-y-1 pt-1">
              {reg.anchors.filter((a) => a.meanTime).map((a) => (
                <div key={a.key} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{a.label}</span>
                  <span className="text-slate-300 tabular-nums">
                    ~{a.meanTime}
                    {a.variabilityMin !== null && a.daysLogged >= MIN_RHYTHM_DAYS && (
                      <span className="text-slate-500"> · ±{a.variabilityMin}m</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Honest basis + limit */}
      <p className="text-[10px] text-slate-500 leading-relaxed px-1">
        Based on the Social Rhythm Metric (Monk et al., 1990/1991) as used in Interpersonal &amp; Social
        Rhythm Therapy (Frank et al., 2005). The evidence for rhythm regularity is strongest for bipolar
        disorder and rests on a small number of trials; the bands here are a self-reflection aid, not a
        clinical measure or a diagnosis. Computed entirely on your device.
      </p>
    </div>
  );
}
