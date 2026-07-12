import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Wind, CheckCircle2 } from "lucide-react";
import {
  breathState,
  cycleProgress,
  type BreathPattern,
  type BreathPhase,
  allBreathPatterns,
  getBreathPattern,
} from "../services/breathPacer";
import CountdownRing from "./CountdownRing";

/** A single 5-minute slow-paced-breathing session produces vagal-activity gains statistically
 *  indistinguishable from longer 10/15/20-minute sessions — so the timer offers a soft ~5-minute
 *  target rather than pushing for a longer session, per You, Laborde, Zammit, Iskra & Borges et al.
 *  (2021), Int'l J of Environmental Research and Public Health. It's a gentle stopping-point cue,
 *  not a hard cutoff — the timer keeps running if you want to continue. */
export const SESSION_TARGET_MS = 5 * 60 * 1000;

/** Pure: has the soft session target been reached? Exported for testing. */
export function sessionTargetReached(elapsedMs: number): boolean {
  return elapsedMs >= SESSION_TARGET_MS;
}

function phaseColor(phase: BreathPhase): string {
  switch (phase) {
    case "inhale": return "#60A5FA"; // blue-400
    case "inhale2": return "#60A5FA";
    case "hold": return "#F59E0B"; // amber-400
    case "exhale": return "#34D399"; // emerald-400
    case "hold2": return "#F59E0B";
  }
}

export interface BreathingTimerProps {
  /** Initial selected pattern. Defaults to "box" — existing callers (e.g. GroundingLibraryScreen's
   *  Box Breathing card) are unaffected. TIPP's Paced-breathing tab passes "cyclicSighing" so the tool
   *  opens on the pattern already prioritized for the highest-intensity/acute-episode path (see
   *  breathPacer.ts). The user can still switch patterns via the picker afterward. */
  defaultPattern?: BreathPattern;
}

/** Animated SVG circle with breath pacing. Uses requestAnimationFrame for smooth rendering. */
export default function BreathingTimer({ defaultPattern = "box" }: BreathingTimerProps = {}) {
  const [playing, setPlaying] = useState(false);
  const [pattern, setPattern] = useState<BreathPattern>(defaultPattern);
  const [elapsed, setElapsed] = useState(0);
  const [cycleIdx, setCycleIdx] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const playingRef = useRef(false);

  // Keep ref in sync so the animation loop never reads stale state.
  useEffect(() => { playingRef.current = playing; }, [playing]);

  const state = breathState(pattern, elapsed, cycleIdx);
  const cycled = cycleProgress(elapsed, pattern);

  const animate = useCallback((now: number) => {
    if (!startTimeRef.current) startTimeRef.current = now;
    const t = now - startTimeRef.current;
    const p = getBreathPattern(pattern);
    const totalMs = (p.inhale + p.inhale2 + p.hold + p.exhale + p.hold2) * 1000;
    const cyc = Math.floor(t / totalMs);
    setElapsed(t);
    setCycleIdx(cyc);
    if (playingRef.current) rafRef.current = requestAnimationFrame(animate);
  }, [pattern]);

  useEffect(() => {
    if (playing) {
      startTimeRef.current = 0;
      setElapsed(0);
      setCycleIdx(0);
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, animate]);

  const toggle = () => setPlaying((p) => !p);

  const reset = () => {
    setPlaying(false);
    setElapsed(0);
    setCycleIdx(0);
    startTimeRef.current = 0;
  };

  const cfg = getBreathPattern(pattern);
  const totalCycles = Math.floor(elapsed / ((cfg.inhale + cfg.inhale2 + cfg.hold + cfg.exhale + cfg.hold2) * 1000)) + 1;
  const targetReached = sessionTargetReached(elapsed);

  return (
    <div className="space-y-4" id="breathing-timer">
      {/* Pattern picker */}
      <div className="flex bg-slate-800 border border-slate-700 rounded-xl overflow-hidden p-0.5 w-fit">
        {allBreathPatterns().map((p) => (
          <button
            key={p}
            onClick={() => { reset(); setPattern(p); }}
            disabled={playing}
            className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              pattern === p ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {getBreathPattern(p).label}
          </button>
        ))}
      </div>

      {/* Animated circle */}
      <div className="flex flex-col items-center gap-3">
        <CountdownRing
          progress={cycled}
          label={state.label}
          color={phaseColor(state.phase)}
          ariaLabel={`Breathing exercise: ${state.label}`}
        />

        <p className="text-[11px] text-slate-400">
          Cycle {totalCycles}
        </p>

        {/* Soft ~5-minute session-target completion cue — a gentle stopping point, not a hard cutoff
            (You, Laborde, Zammit, Iskra & Borges et al. 2021). */}
        {targetReached && (
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-400" role="status">
            <CheckCircle2 className="w-3.5 h-3.5" />
            You've reached the ~5-minute mark — a good stopping point if you'd like, or keep going.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="p-2.5 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors cursor-pointer"
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={toggle}
          className={`p-4 rounded-full transition-colors cursor-pointer ${
            playing ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          }`}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
      </div>

      {/* Pattern info */}
      <div className="text-[11px] text-slate-500 text-center space-y-0.5">
        <p className="flex items-center justify-center gap-1.5">
          <Wind className="w-3 h-3" /> {getBreathPattern(pattern).name}
        </p>
        <p>
          Inhale {cfg.inhale}s{cfg.inhale2 > 0 ? ` · Inhale again ${cfg.inhale2}s` : ""}
          {cfg.hold > 0 ? ` · Hold ${cfg.hold}s` : ""} · Exhale {cfg.exhale}s
          {cfg.hold2 > 0 ? ` · Hold ${cfg.hold2}s` : ""}
        </p>
      </div>
    </div>
  );
}
