// Breath-pacing engine — pure timing logic, no DOM/React.
// Box breathing (4-4-4-4) is evidence-based for anxiety regulation (Ma et al. 2017;
// Navy SEALs tactical breathing). Also supports 4-7-8 (relaxation) and simple 5-5 (calm).

export type BreathPattern = "box" | "478" | "55";

export interface BreathPatternConfig {
  name: string;
  inhale: number;
  hold: number;
  exhale: number;
  hold2: number; // post-exhale hold (0 for 5-5)
  label: string;
}

const PATTERNS: Record<BreathPattern, BreathPatternConfig> = {
  box: { name: "Box breathing (4-4-4-4)", inhale: 4, hold: 4, exhale: 4, hold2: 4, label: "Box" },
  "478": { name: "4-7-8 breathing", inhale: 4, hold: 7, exhale: 8, hold2: 0, label: "4-7-8" },
  "55": { name: "Equal breathing (5-5)", inhale: 5, hold: 0, exhale: 5, hold2: 0, label: "5-5" },
};

export function getBreathPattern(p: BreathPattern): BreathPatternConfig {
  return PATTERNS[p];
}

export type BreathPhase = "inhale" | "hold" | "exhale" | "hold2";

export interface BreathCycleState {
  phase: BreathPhase;
  phaseStartedAt: number; // ms into the cycle
  phaseDuration: number; // ms
  cycleIndex: number; // which cycle (0-based)
  progress: number; // 0–1 within the current phase
  label: string;
}

/** Build the phase list for a pattern [phase, duration-ms] in order. */
function phases(p: BreathPatternConfig): [BreathPhase, number][] {
  const out: [BreathPhase, number][] = [
    ["inhale", p.inhale * 1000],
    ["hold", p.hold * 1000],
    ["exhale", p.exhale * 1000],
  ];
  if (p.hold2 > 0) out.push(["hold2", p.hold2 * 1000]);
  return out;
}

/** Compute the breath state at elapsedMs since cycle start, for the given pattern. */
export function breathState(
  pattern: BreathPattern,
  elapsedMs: number,
  cycleIndex: number,
): BreathCycleState {
  const p = getBreathPattern(pattern);
  const ph = phases(p);
  const totalMs = ph.reduce((s, [, d]) => s + d, 0);
  const within = ((elapsedMs % totalMs) + totalMs) % totalMs;
  let cursor = 0;
  for (const [phase, dur] of ph) {
    if (within < cursor + dur) {
      const progress = dur > 0 ? (within - cursor) / dur : 1;
      return {
        phase,
        phaseStartedAt: cursor,
        phaseDuration: dur,
        cycleIndex,
        progress,
        label: phaseLabel(phase),
      };
    }
    cursor += dur;
  }
  return { phase: "inhale", phaseStartedAt: 0, phaseDuration: 4000, cycleIndex, progress: 0, label: "Breathe in" };
}

function phaseLabel(phase: BreathPhase): string {
  switch (phase) {
    case "inhale": return "Breathe in";
    case "hold": return "Hold";
    case "exhale": return "Breathe out";
    case "hold2": return "Hold";
  }
}

/** Compute the circle progress 0–1 for a full cycle (for the outer ring). */
export function cycleProgress(elapsedMs: number, pattern: BreathPattern): number {
  const p = getBreathPattern(pattern);
  const totalMs = (p.inhale + p.hold + p.exhale + p.hold2) * 1000;
  if (totalMs <= 0) return 0;
  return ((elapsedMs % totalMs) + totalMs) % totalMs / totalMs;
}

/** All available patterns for the picker. */
export function allBreathPatterns(): BreathPattern[] {
  return ["box", "478", "55"];
}
