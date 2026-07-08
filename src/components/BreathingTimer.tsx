import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Wind } from "lucide-react";
import {
  breathState,
  cycleProgress,
  type BreathPattern,
  type BreathPhase,
  allBreathPatterns,
  getBreathPattern,
} from "../services/breathPacer";

const CIRCLE_R = 80;
const CIRCLE_C = 100;
const STROKE_W = 6;

function phaseColor(phase: BreathPhase): string {
  switch (phase) {
    case "inhale": return "#60A5FA"; // blue-400
    case "hold": return "#F59E0B"; // amber-400
    case "exhale": return "#34D399"; // emerald-400
    case "hold2": return "#F59E0B";
  }
}

/** Animated SVG circle with breath pacing. Uses requestAnimationFrame for smooth rendering. */
export default function BreathingTimer() {
  const [playing, setPlaying] = useState(false);
  const [pattern, setPattern] = useState<BreathPattern>("box");
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
    const totalMs = (p.inhale + p.hold + p.exhale + p.hold2) * 1000;
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

  const totalCycles = Math.floor(elapsed / (getBreathPattern(pattern).inhale + getBreathPattern(pattern).hold + getBreathPattern(pattern).exhale + getBreathPattern(pattern).hold2) / 1000 + 1);

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
        <svg viewBox={`0 0 ${CIRCLE_C * 2} ${CIRCLE_C * 2}`} className="w-48 h-48 -rotate-90" aria-label={`Breathing exercise: ${state.label}`} role="img">
          <circle cx={CIRCLE_C} cy={CIRCLE_C} r={CIRCLE_R} fill="none" stroke="#1E293B" strokeWidth={STROKE_W} />
          <circle
            cx={CIRCLE_C}
            cy={CIRCLE_C}
            r={CIRCLE_R}
            fill="none"
            stroke={phaseColor(state.phase)}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * CIRCLE_R}`}
            strokeDashoffset={`${2 * Math.PI * CIRCLE_R * (1 - cycled)}`}
            style={{ transition: "stroke 0.4s ease" }}
          />
        </svg>

        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-slate-100" style={{ color: phaseColor(state.phase) }}>
            {state.label}
          </p>
          <p className="text-[11px] text-slate-400">
            Cycle {totalCycles}
          </p>
        </div>
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
        <p>Inhale {getBreathPattern(pattern).inhale}s · Hold {getBreathPattern(pattern).hold}s · Exhale {getBreathPattern(pattern).exhale}s{getBreathPattern(pattern).hold2 > 0 ? ` · Hold ${getBreathPattern(pattern).hold2}s` : ""}</p>
      </div>
    </div>
  );
}
