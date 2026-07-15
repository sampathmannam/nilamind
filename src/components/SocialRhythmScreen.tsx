import React, { useMemo, useState } from "react";
import { Clock3, Sunrise } from "lucide-react";
import {
  RHYTHM_ANCHORS,
  MIN_RHYTHM_DAYS,
  loadRhythm,
  recordRhythm,
  computeRhythmRegularity,
  buildRhythmTimeline,
  timelineSpread,
  type AnchorKey,
  type RhythmAnchors,
  type RhythmBand,
} from "../services/socialRhythm";
import { dayKey } from "../services/retentionMetrics";
import { hapticLight } from "../hooks/useHaptics";
import { getAutoAnchors } from "../services/autoAnchors";
import { computeCircadianFeedback } from "../services/circadianFeedback";
import { loadMoodHistory } from "../services/moodHistory";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmtMin = (min: number): string => {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Pale→warm dot for a 1-10 mood intensity (null = no check-in that day). */
const moodDot = (intensity: number | null): string =>
  intensity === null
    ? "transparent"
    : intensity <= 3
      ? "#38bdf8"
      : intensity <= 6
        ? "#94a3b8"
        : "#fbbf24";

const BAND_COPY: Record<RhythmBand, { label: string; cls: string }> = {
  regular: { label: "Steady rhythm", cls: "text-emerald-400" },
  variable: { label: "Somewhat variable", cls: "text-amber-400" },
  irregular: { label: "Quite variable", cls: "text-rose-300" },
  insufficient: { label: "Keep logging", cls: "text-slate-400" },
};

export default function SocialRhythmScreen() {
  const today = dayKey(new Date());
  const [anchors, setAnchors] = useState<RhythmAnchors>(
    () => {
      const stored = loadRhythm().find((e) => e.date === today)?.anchors;
      if (stored?.wake || stored?.bed) return stored;
      // Auto-fill wake/bed from phone usage (no Health Connect needed)
      const auto = getAutoAnchors();
      return { ...stored, ...(auto.wake ? { wake: auto.wake } : {}), ...(auto.bed ? { bed: auto.bed } : {}) };
    },
  );
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0); // bump to recompute after a save

  const reg = useMemo(() => computeRhythmRegularity(), [version]);
  const band = BAND_COPY[reg.band];

  // P5.4 — 7-day anchor timeline. Recomputed when a new day is saved.
  const timeline = useMemo(() => buildRhythmTimeline(7), [version]);
  const spread = useMemo(() => timelineSpread(timeline), [timeline]);
  const moodByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of loadMoodHistory()) {
      if (!m.date || typeof m.intensity !== "number") continue;
      const prev = map.get(m.date);
      map.set(m.date, prev === undefined ? m.intensity : (prev + m.intensity) / 2);
    }
    return map;
  }, [version]);

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
          <p className="text-xs text-slate-500 leading-relaxed">
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
      <p className="text-xs text-slate-500 leading-relaxed px-1">
        Based on the Social Rhythm Metric (Monk et al., 1990/1991) as used in Interpersonal &amp; Social
        Rhythm Therapy (Frank et al., 2005). The evidence for rhythm regularity is strongest for bipolar
        disorder and rests on a small number of trials; the bands here are a self-reflection aid, not a
        clinical measure or a diagnosis. Computed entirely on your device.
      </p>

      {/* P5.4 — 7-day anchor timeline: dots positioned by time-of-day, with a variability band and a
          mood overlay so the user can see how steady rhythm tracks with how they felt. */}
      <div className="glass rounded-2xl p-4 space-y-3" id="rhythm-timeline">
        <div className="text-sm font-semibold text-slate-200">Last 7 days</div>
        <div className="flex gap-1 items-end">
          <div className="w-28 shrink-0 text-xs text-slate-500">Mood</div>
          {timeline.days.map((d) => (
            <div key={d} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">{WEEKDAY[new Date(d + "T00:00:00").getDay()]}</span>
              <span
                className="h-2 w-2 rounded-full ring-1 ring-slate-700"
                style={{ background: moodDot(moodByDay.get(d) ?? null) }}
                aria-label={moodByDay.has(d) ? `mood ${Math.round(moodByDay.get(d)!)}` : "no check-in"}
              />
            </div>
          ))}
        </div>
        {timeline.anchors.map((a) => {
          const vals = a.byDay.filter((m): m is number => m !== null);
          const min = vals.length >= 2 ? Math.min(...vals) : null;
          const max = vals.length >= 2 ? Math.max(...vals) : null;
          return (
            <div key={a.key} className="flex gap-1 items-center">
              <div className="w-28 shrink-0 text-[11px] text-slate-400 truncate" title={a.label}>{a.label}</div>
              <div className="relative flex-1 h-5">
                {min !== null && max !== null && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded bg-slate-700/70"
                    style={{ left: `${(min / 1440) * 100}%`, width: `${((max - min) / 1440) * 100}%` }}
                  />
                )}
                {a.byDay.map((m, i) =>
                  m === null ? null : (
                    <span
                      key={i}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-indigo-400 ring-2 ring-page"
                      style={{ left: `${(m / 1440) * 100}%` }}
                      title={`${timeline.days[i]} ${fmtMin(m)}`}
                      aria-label={`${a.label} at ${fmtMin(m)}`}
                    />
                  ),
                )}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-slate-500 leading-relaxed">
          Each dot is when that anchor happened that day. Dots close together = a steady rhythm; spread out = more
          variation. The grey band shows the range across the week. The top row is how your mood averaged that day.
        </p>
      </div>
    </div>
  );
}
