// BreathingInlineCard — compact box breathing exercise rendered inline in the stream.
// Animated breathing ball with inhale/hold/exhale/hold phases. No navigation needed.

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Check } from "lucide-react";

type Phase = "In" | "Hold1" | "Out" | "Hold2";
const PHASES: { phase: Phase; label: string; duration: number }[] = [
  { phase: "In", label: "Breathe in", duration: 4 },
  { phase: "Hold1", label: "Hold", duration: 4 },
  { phase: "Out", label: "Breathe out", duration: 4 },
  { phase: "Hold2", label: "Hold", duration: 4 },
];

const TOTAL_CYCLES = 4;

interface BreathingInlineCardProps {
  onComplete?: () => void;
}

export default function BreathingInlineCard({ onComplete }: BreathingInlineCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(1);
  const [cyclesDone, setCyclesDone] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCount((prev) => {
        const phase = PHASES[phaseIdx];
        if (prev >= phase.duration) {
          const nextPhaseIdx = (phaseIdx + 1) % 4;
          setPhaseIdx(nextPhaseIdx);
          if (nextPhaseIdx === 0) {
            setCyclesDone((c) => {
              const next = c + 1;
              if (next >= TOTAL_CYCLES) {
                setIsPlaying(false);
                setDone(true);
                onComplete?.();
              }
              return next;
            });
          }
          return 1;
        }
        return prev + 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, phaseIdx]);

  const handleReset = () => {
    setIsPlaying(false);
    setPhaseIdx(0);
    setCount(1);
    setCyclesDone(0);
    setDone(false);
  };

  const handlePlayPause = () => {
    if (done) { handleReset(); return; }
    setIsPlaying((p) => !p);
  };

  const currentPhase = PHASES[phaseIdx];
  const progress = count / currentPhase.duration;
  const breatheScale = currentPhase.phase === "In" ? 1 + progress * 0.3
    : currentPhase.phase === "Out" ? 1.3 - progress * 0.3
    : currentPhase.phase === "Hold1" ? 1.3
    : 1;

  if (done) {
    return (
      <div className="bg-violet-500/10 border border-violet-500/25 rounded-2xl p-4 text-center" id="breathing-inline-done">
        <Check className="w-6 h-6 text-violet-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-violet-200">Breathing complete</p>
        <p className="text-xs text-violet-300/70 mt-1">{TOTAL_CYCLES} cycles done. How do you feel now?</p>
      </div>
    );
  }

  return (
    <div className="bg-page border border-violet-500/25 rounded-2xl p-4" id="breathing-inline-card">
      <div className="text-center">
        {/* Breathing ball */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div
            className="absolute inset-0 rounded-full bg-violet-500/20 border-2 border-violet-400/40 transition-transform"
            style={{
              transform: `scale(${breatheScale})`,
              transitionDuration: isPlaying ? "1s" : "0.3s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-violet-200">{currentPhase.label}</span>
          </div>
        </div>

        {/* Cycle counter */}
        <p className="text-xs text-slate-400 mb-3">
          Cycle {Math.min(cyclesDone + 1, TOTAL_CYCLES)} of {TOTAL_CYCLES}
        </p>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          <button
            onClick={handlePlayPause}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500/20 text-violet-200 hover:bg-violet-500/30 border border-violet-500/30 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? "Pause" : "Start"}
          </button>
          {(isPlaying || cyclesDone > 0) && (
            <button
              onClick={handleReset}
              className="flex items-center justify-center px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
