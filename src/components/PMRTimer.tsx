import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import { pmrState, pmrProgress, pmrTotalMs, type PMRPhase } from "../services/pmrPacer";
import CountdownRing from "./CountdownRing";

// Paired Muscle Relaxation timer — structural clone of BreathingTimer.tsx, consuming pmrPacer.ts
// instead of breathPacer.ts (2026-07-12 Wave 3, Group E: TIPP tool). Jacobson (1938); Manzoni et al.
// (2008, BMC Psychiatry) d≈0.57–0.68. Only caution: muscle/joint injury — skip a group if it hurts.

function phaseColor(phase: PMRPhase): string {
  // Rose = tense (effort), emerald = release (letting go) — mirrors BreathingTimer's inhale/exhale
  // color logic (warm for the "doing" phase, cool for the "releasing" phase).
  return phase === "tense" ? "#FB7185" /* rose-400 */ : "#34D399" /* emerald-400 */;
}

export interface PMRTimerProps {
  /** Called once, when all 6 muscle groups have been completed. */
  onComplete?: () => void;
}

export default function PMRTimer({ onComplete }: PMRTimerProps = {}) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const playingRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => { playingRef.current = playing; }, [playing]);

  const state = pmrState(elapsed);
  const overall = pmrProgress(elapsed);

  const animate = useCallback((now: number) => {
    if (!startTimeRef.current) startTimeRef.current = now;
    const t = now - startTimeRef.current;
    setElapsed(t);
    if (t >= pmrTotalMs()) {
      if (!completedRef.current) {
        completedRef.current = true;
        setPlaying(false);
        onComplete?.();
      }
      return; // stop the loop — PMR doesn't cycle forever
    }
    if (playingRef.current) rafRef.current = requestAnimationFrame(animate);
  }, [onComplete]);

  useEffect(() => {
    if (playing) {
      startTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, animate]);

  const toggle = () => setPlaying((p) => !p);

  const reset = () => {
    setPlaying(false);
    setElapsed(0);
    startTimeRef.current = 0;
    completedRef.current = false;
  };

  return (
    <div className="space-y-4" id="pmr-timer">
      <div className="flex flex-col items-center gap-3">
        <CountdownRing
          progress={overall}
          label={state.group.label}
          color={phaseColor(state.phase)}
          ariaLabel={`Paired muscle relaxation: ${state.group.label}, ${state.phase}`}
        />

        <p className="text-[11px] text-slate-400" id="pmr-group-counter">
          Group {state.groupIndex + 1} of 6
        </p>

        <p className="text-sm text-slate-300 text-center leading-relaxed max-w-xs" id="pmr-cue">
          {state.cue}
        </p>

        {state.done && (
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-400" role="status">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All done — you've worked through every muscle group.
          </p>
        )}
      </div>

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
          disabled={state.done}
          className={`p-4 rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            playing ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          }`}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        Tense on the in-breath, release on the out-breath. Skip a group if it hurts.
      </p>
    </div>
  );
}
