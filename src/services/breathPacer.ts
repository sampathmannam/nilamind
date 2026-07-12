// Breath-pacing engine — pure timing logic, no DOM/React.
// Box breathing (4-4-4-4) is evidence-based for anxiety regulation (Ma et al. 2017;
// Navy SEALs tactical breathing). Also supports 4-7-8 (relaxation), "55" as resonance-frequency
// breathing (~6 breaths/min — the best-characterized HRV-biofeedback dose, g=0.81-0.83, per Goessl,
// Curtiss & Hofmann 2017, Psychological Medicine; Lehrer & Gevirtz 2014, Frontiers in Psychology),
// and cyclic sighing (double inhale, long exhale) — a direct head-to-head RCT found it beat box
// breathing on mood while matching it on physiological arousal reduction, per Balban, Neri, Kogon
// et al. (2023), Cell Reports Medicine. Cyclic sighing is listed first (prioritized) for the
// highest-intensity/acute-episode path. Its phase timings below are an approximate, self-paced
// rendering of the technique (short inhale, sharp top-up inhale, long exhale) — the study's key
// manipulation was the double-inhale + extended-exhale shape, not a specific second-by-second protocol.

export type BreathPattern = "cyclicSighing" | "box" | "478" | "55";

export interface BreathPatternConfig {
  name: string;
  inhale: number;
  inhale2: number; // second, sharp "top-up" inhale — 0 for every pattern except cyclic sighing
  hold: number;
  exhale: number;
  hold2: number; // post-exhale hold (0 for 5-5)
  label: string;
}

const PATTERNS: Record<BreathPattern, BreathPatternConfig> = {
  cyclicSighing: {
    name: "Cyclic sighing (double inhale, long exhale)",
    inhale: 2,
    inhale2: 1,
    hold: 0,
    exhale: 6,
    hold2: 0,
    label: "Cyclic sighing",
  },
  box: { name: "Box breathing (4-4-4-4)", inhale: 4, inhale2: 0, hold: 4, exhale: 4, hold2: 4, label: "Box" },
  "478": { name: "4-7-8 breathing", inhale: 4, inhale2: 0, hold: 7, exhale: 8, hold2: 0, label: "4-7-8" },
  "55": {
    name: "Resonance-frequency breathing (5-5, ~6/min)",
    inhale: 5,
    inhale2: 0,
    hold: 0,
    exhale: 5,
    hold2: 0,
    label: "Resonance",
  },
};

export function getBreathPattern(p: BreathPattern): BreathPatternConfig {
  return PATTERNS[p];
}

export type BreathPhase = "inhale" | "inhale2" | "hold" | "exhale" | "hold2";

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
  const out: [BreathPhase, number][] = [["inhale", p.inhale * 1000]];
  if (p.inhale2 > 0) out.push(["inhale2", p.inhale2 * 1000]);
  out.push(["hold", p.hold * 1000]);
  out.push(["exhale", p.exhale * 1000]);
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
    case "inhale2": return "Breathe in again";
    case "hold": return "Hold";
    case "exhale": return "Breathe out";
    case "hold2": return "Hold";
  }
}

/** Compute the circle progress 0–1 for a full cycle (for the outer ring). */
export function cycleProgress(elapsedMs: number, pattern: BreathPattern): number {
  const p = getBreathPattern(pattern);
  const totalMs = (p.inhale + p.inhale2 + p.hold + p.exhale + p.hold2) * 1000;
  if (totalMs <= 0) return 0;
  return ((elapsedMs % totalMs) + totalMs) % totalMs / totalMs;
}

/** All available patterns for the picker. Cyclic sighing is listed first — it's prioritized for the
 *  highest-intensity/acute-episode use case (Balban et al. 2023). */
export function allBreathPatterns(): BreathPattern[] {
  return ["cyclicSighing", "box", "478", "55"];
}
