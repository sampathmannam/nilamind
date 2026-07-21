import { useState, useEffect } from "react";
import { ChevronLeft, Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import {
  breathState,
  cycleProgress,
  getBreathPattern,
  allBreathPatterns,
  type BreathPattern,
  type BreathPhase,
} from "../services/breathPacer";
import { useBreathAnimation } from "../hooks/useBreathAnimation";
import BreathPatternInfo from "./BreathPatternInfo";
import { hapticLight, hapticCelebration } from "../hooks/useHaptics";
import { useLanguage } from "../services/i18n";

interface Props {
  onClose: () => void;
  defaultPattern?: BreathPattern;
}

const SESSION_TARGET_MS = 5 * 60 * 1000;

/** Phase-aware ambient gradient colors. Soft, warm, calming. */
const PHASE_GRADIENTS: Record<BreathPhase, string> = {
  inhale: "radial-gradient(ellipse at 50% 50%, rgba(96,165,250,0.12) 0%, rgba(22,18,30,0) 70%)",
  inhale2: "radial-gradient(ellipse at 50% 50%, rgba(96,165,250,0.10) 0%, rgba(22,18,30,0) 70%)",
  hold: "radial-gradient(ellipse at 50% 50%, rgba(245,158,11,0.10) 0%, rgba(22,18,30,0) 70%)",
  exhale: "radial-gradient(ellipse at 50% 50%, rgba(52,211,153,0.12) 0%, rgba(22,18,30,0) 70%)",
  hold2: "radial-gradient(ellipse at 50% 50%, rgba(245,158,11,0.08) 0%, rgba(22,18,30,0) 70%)",
};

/** Phase-aware circle colors (matching BreathingTimer). */
const PHASE_COLORS: Record<BreathPhase, string> = {
  inhale: "var(--color-blue-400)",
  inhale2: "var(--color-blue-400)",
  hold: "var(--color-amber-400)",
  exhale: "var(--color-emerald-400)",
  hold2: "var(--color-amber-400)",
};

/** Breathing circle scale per phase (inhale expands, exhale contracts). */
const PHASE_SCALES: Record<BreathPhase, [number, number]> = {
  inhale: [0.6, 1.0],
  inhale2: [1.0, 1.05],
  hold: [1.05, 1.05],
  exhale: [1.05, 0.6],
  hold2: [0.6, 0.6],
};

/**
 * BreathingScreen — full-screen immersive breathing experience.
 * Research basis: Headspace's breathing circle, Calm's Breathe Bubble.
 * A 5-minute session produces vagal-activity gains statistically indistinguishable
 * from longer sessions (You, Laborde et al. 2021).
 */
export default function BreathingScreen({ onClose, defaultPattern = "box" }: Props) {
  useLanguage();
  const [playing, setPlaying] = useState(false);
  const [pattern, setPattern] = useState<BreathPattern>(defaultPattern);
  const [lastPhase, setLastPhase] = useState<BreathPhase | null>(null);
  const [sessionDone, setSessionDone] = useState(false);
  const { elapsed, cycleIdx, reset: resetAnim } = useBreathAnimation(pattern, playing);

  const state = breathState(pattern, elapsed, cycleIdx);
  const cfg = getBreathPattern(pattern);
  const totalCycleMs = (cfg.inhale + cfg.inhale2 + cfg.hold + cfg.exhale + cfg.hold2) * 1000;
  const totalCycles = Math.floor(elapsed / totalCycleMs) + 1;
  const targetReached = elapsed >= SESSION_TARGET_MS;

  // Haptic feedback on phase transitions
  useEffect(() => {
    if (playing && state.phase !== lastPhase) {
      setLastPhase(state.phase);
      if (lastPhase !== null) hapticLight();
    }
  }, [state.phase, playing, lastPhase]);

  // Session target celebration
  useEffect(() => {
    if (targetReached && !sessionDone && playing) {
      setSessionDone(true);
      hapticCelebration();
    }
  }, [targetReached, sessionDone, playing]);

  // Starting a session clears the phase-transition + celebration state (the timing itself is reset inside
  // useBreathAnimation). Mirrors the pre-extraction play effect, which reset these alongside the clock.
  useEffect(() => {
    if (playing) {
      setLastPhase(null);
      setSessionDone(false);
    }
  }, [playing]);

  const toggle = () => setPlaying((p) => !p);
  const reset = () => {
    setPlaying(false);
    resetAnim();
    setLastPhase(null);
    setSessionDone(false);
  };

  // Compute breathing circle scale
  const [scaleMin, scaleMax] = PHASE_SCALES[state.phase];
  const scale = scaleMin + (scaleMax - scaleMin) * state.progress;
  const circleColor = PHASE_COLORS[state.phase];
  const gradient = PHASE_GRADIENTS[state.phase];

  const cycleProgressPct = cycleProgress(elapsed, pattern);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden"
      id="breathing-screen"
      style={{
        background: "var(--color-page)",
        transition: "background 0.8s ease",
      }}
    >
      {/* Ambient gradient — shifts with breathing phase */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: gradient }}
      />

      {/* Back button */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3" style={{ paddingTop: "var(--safe-top)" }}>
        <button
          onClick={onClose}
          className="text-xs font-semibold text-ink-muted hover:text-ink flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex items-center gap-2">
          {allBreathPatterns().map((p) => (
            <button
              key={p}
              onClick={() => { reset(); setPattern(p); }}
              disabled={playing}
              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                pattern === p ? "bg-blue-500/20 text-blue-300" : "text-ink-faint hover:text-ink-2"
              }`}
            >
              {getBreathPattern(p).label}
            </button>
          ))}
        </div>
      </div>

      {/* Main breathing circle — expands/contracts with breath */}
      <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
        {/* Outer glow ring */}
        <div
          className="absolute rounded-full transition-transform duration-700 ease-in-out"
          style={{
            width: 280,
            height: 280,
            background: `radial-gradient(circle, ${circleColor}15 0%, transparent 70%)`,
            transform: `scale(${scale * 1.2})`,
          }}
        />

        {/* Main circle */}
        <div
          className="absolute rounded-full border-2 transition-all duration-700 ease-in-out flex items-center justify-center"
          style={{
            width: 200,
            height: 200,
            borderColor: circleColor,
            transform: `scale(${scale})`,
            background: `radial-gradient(circle, ${circleColor}08 0%, transparent 70%)`,
          }}
        >
          {/* Inner dot */}
          <div
            className="w-3 h-3 rounded-full transition-all duration-500"
            style={{
              backgroundColor: circleColor,
              opacity: 0.6 + state.progress * 0.4,
              transform: `scale(${0.8 + state.progress * 0.4})`,
            }}
          />
        </div>

        {/* Progress ring */}
        <svg
          className="absolute -rotate-90"
          width={280}
          height={280}
          viewBox="0 0 280 280"
        >
          <circle
            cx={140}
            cy={140}
            r={130}
            fill="none"
            stroke="var(--color-slate-800)"
            strokeWidth={2}
          />
          <circle
            cx={140}
            cy={140}
            r={130}
            fill="none"
            stroke={circleColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 130}
            strokeDashoffset={2 * Math.PI * 130 * (1 - cycleProgressPct)}
            style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.4s ease" }}
          />
        </svg>
      </div>

      {/* Phase label */}
      <div className="mt-8 text-center space-y-2">
        <p
          className="text-2xl font-semibold transition-colors duration-500"
          style={{ color: circleColor }}
        >
          {state.label}
        </p>
        <p className="text-sm text-ink-faint">
          Cycle {totalCycles}
        </p>
      </div>

      {/* Session target */}
      {targetReached && (
        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>5 minutes — a good stopping point, or keep going.</span>
        </div>
      )}

      {/* Controls */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="p-3 rounded-full bg-fill/80 text-ink-2 hover:bg-line-strong transition-colors cursor-pointer"
          aria-label="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={toggle}
          className={`p-5 rounded-full transition-all cursor-pointer ${
            playing
              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          }`}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
      </div>

      {/* Pattern info */}
      <BreathPatternInfo pattern={pattern} className="mt-6 text-center text-[11px] text-ink-faint space-y-1" />
    </div>
  );
}
