import React from "react";
import { Wind } from "lucide-react";
import { getBreathPattern, type BreathPattern } from "../services/breathPacer";

// Shared "pattern info" footer (name + Inhale/Hold/Exhale line), extracted 2026-07-17 QA from the identical
// block in BreathingScreen and BreathingTimer. `className` styles the outer container so each caller keeps
// its own spacing (the screen uses `mt-6 … space-y-1`, the timer `… space-y-0.5`).
export default function BreathPatternInfo({
  pattern,
  className = "text-[11px] text-slate-500 text-center space-y-0.5",
}: {
  pattern: BreathPattern;
  className?: string;
}) {
  const cfg = getBreathPattern(pattern);
  return (
    <div className={className}>
      <p className="flex items-center justify-center gap-1.5">
        <Wind className="w-3 h-3" /> {cfg.name}
      </p>
      <p>
        Inhale {cfg.inhale}s{cfg.inhale2 > 0 ? ` · Inhale again ${cfg.inhale2}s` : ""}
        {cfg.hold > 0 ? ` · Hold ${cfg.hold}s` : ""} · Exhale {cfg.exhale}s
        {cfg.hold2 > 0 ? ` · Hold ${cfg.hold2}s` : ""}
      </p>
    </div>
  );
}
