import { useState } from "react";
import { Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import {
  breathState,
  cycleProgress,
  type BreathPattern,
  type BreathPhase,
  allBreathPatterns,
  getBreathPattern,
} from "../services/breathPacer";
import { useBreathAnimation } from "../hooks/useBreathAnimation";
import BreathPatternInfo from "./BreathPatternInfo";
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
  const { elapsed, cycleIdx, reset: resetAnim } = useBreathAnimation(pattern, playing);

  const state = breathState(pattern, elapsed, cycleIdx);
  const cycled = cycleProgress(elapsed, pattern);

  const toggle = () => setPlaying((p) => !p);

  const reset = () => {
    setPlaying(false);
    resetAnim();
  };

  const cfg = getBreathPattern(pattern);
  const totalCycles = Math.floor(elapsed / ((cfg.inhale + cfg.inhale2 + cfg.hold + cfg.exhale + cfg.hold2) * 1000)) + 1;
  const targetReached = sessionTargetReached(elapsed);

  return (
    <div className="space-y-4" id="breathing-timer">
      {/* Pattern picker */}
      <div className="flex bg-fill border border-line-strong rounded-xl overflow-hidden p-0.5 w-fit">
        {allBreathPatterns().map((p) => (
          <button
            key={p}
            onClick={() => { reset(); setPattern(p); }}
            disabled={playing}
            className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              pattern === p ? "bg-accent/20 text-accent-hi" : "text-ink-muted hover:text-ink-2"
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

        <p className="text-[11px] text-ink-muted">
          Cycle {totalCycles}
        </p>

        {/* Soft ~5-minute session-target completion cue — a gentle stopping point, not a hard cutoff
            (You, Laborde, Zammit, Iskra & Borges et al. 2021). */}
        {targetReached && (
          <p className="flex items-center gap-1.5 text-[11px] text-success" role="status">
            <CheckCircle2 className="w-3.5 h-3.5" />
            You've reached the ~5-minute mark — a good stopping point if you'd like, or keep going.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="p-2.5 rounded-full bg-line-strong text-ink-2 hover:bg-slate-600 transition-colors cursor-pointer"
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={toggle}
          className={`p-4 rounded-full transition-colors cursor-pointer ${
            playing ? "bg-warn/20 text-warn hover:bg-warn/30" : "bg-accent/20 text-accent hover:bg-accent/30"
          }`}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
      </div>

      {/* Pattern info */}
      <BreathPatternInfo pattern={pattern} />
    </div>
  );
}
