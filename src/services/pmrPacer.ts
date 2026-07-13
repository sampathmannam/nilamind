// PMR (Paired Muscle Relaxation) pacing engine — pure timing logic, no DOM/React. Same
// phases()/state-cursor shape as breathPacer.ts (2026-07-12 Wave 3, Group E: TIPP tool).
//
// Origin: Jacobson (1938) — tense-then-release cycling through muscle groups, paired with breath
// (tense on inhale, release on exhale) in DBT's adaptation. Evidence: Manzoni et al. (2008, BMC
// Psychiatry) 10-yr meta-analysis found the largest within-group effect size (d≈0.57–0.68) among
// relaxation techniques, outperforming meditation; Toussaint et al. (2021) reconfirms. Safety is
// essentially universal — the only caution is muscle/joint injury ("skip a group if it hurts").
//
// Unlike breathPacer (which loops forever for an ongoing breathing session), PMR here is a single
// finite pass through an ABBREVIATED muscle-group set (per spec doc §3, not the full body-scan
// protocol) — appropriate for TIPP's crisis-intensity use case, not a longer relaxation session.

export type PMRPhase = "tense" | "release";

export type MuscleGroup = "handsForearms" | "biceps" | "shouldersNeck" | "face" | "abdomen" | "legsFeet";

export interface MuscleGroupConfig {
  id: MuscleGroup;
  label: string;
  tenseCue: string;
  releaseCue: string;
}

/** Tense ~5s, release ~10s per spec doc §3's abbreviated TIPP-PMR design. */
export const TENSE_SECONDS = 5;
export const RELEASE_SECONDS = 10;

const GROUPS: MuscleGroupConfig[] = [
  {
    id: "handsForearms",
    label: "Hands & forearms",
    tenseCue: "Make tight fists and tense your forearms. Breathe in as you tense.",
    releaseCue: "Let go completely. Breathe out as you release — notice the difference.",
  },
  {
    id: "biceps",
    label: "Biceps",
    tenseCue: "Bend your elbows and tense your biceps. Breathe in as you tense.",
    releaseCue: "Let your arms fall loose and heavy. Breathe out as you release.",
  },
  {
    id: "shouldersNeck",
    label: "Shoulders & neck",
    tenseCue: "Raise your shoulders up toward your ears. Breathe in as you tense.",
    releaseCue: "Drop your shoulders and let your neck soften. Breathe out as you release.",
  },
  {
    id: "face",
    label: "Face",
    tenseCue: "Scrunch your whole face — eyes, jaw, forehead. Breathe in as you tense.",
    releaseCue: "Let your face go completely smooth and still. Breathe out as you release.",
  },
  {
    id: "abdomen",
    label: "Abdomen",
    tenseCue: "Tighten your stomach muscles. Breathe in as you tense.",
    releaseCue: "Let your belly soften and expand. Breathe out as you release.",
  },
  {
    id: "legsFeet",
    label: "Legs & feet",
    tenseCue: "Curl your toes and tense your calves and thighs. Breathe in as you tense.",
    releaseCue: "Let your legs go heavy and loose. Breathe out as you release.",
  },
];

export function allMuscleGroups(): MuscleGroup[] {
  return GROUPS.map((g) => g.id);
}

export function getMuscleGroup(id: MuscleGroup): MuscleGroupConfig {
  return GROUPS.find((g) => g.id === id) ?? GROUPS[0];
}

const GROUP_MS = (TENSE_SECONDS + RELEASE_SECONDS) * 1000;
const TENSE_MS = TENSE_SECONDS * 1000;

export function pmrTotalMs(): number {
  return GROUP_MS * GROUPS.length;
}

export interface PMRCycleState {
  groupIndex: number; // 0-based index into the muscle-group order
  group: MuscleGroupConfig;
  phase: PMRPhase;
  progress: number; // 0–1 within the current phase
  cue: string; // the tense or release cue for the current phase
  done: boolean; // true once all 6 groups have been walked through
}

/** Compute the PMR state at elapsedMs since the session started. Does not loop — once elapsedMs
 *  reaches the total duration, stays "done" on the last group's release phase. */
export function pmrState(elapsedMs: number): PMRCycleState {
  const total = pmrTotalMs();
  if (elapsedMs >= total) {
    const last = GROUPS[GROUPS.length - 1];
    return { groupIndex: GROUPS.length - 1, group: last, phase: "release", progress: 1, cue: last.releaseCue, done: true };
  }
  const groupIndex = Math.min(GROUPS.length - 1, Math.floor(elapsedMs / GROUP_MS));
  const withinGroup = elapsedMs - groupIndex * GROUP_MS;
  const group = GROUPS[groupIndex];

  if (withinGroup < TENSE_MS) {
    return { groupIndex, group, phase: "tense", progress: withinGroup / TENSE_MS, cue: group.tenseCue, done: false };
  }
  const releaseMs = RELEASE_SECONDS * 1000;
  const withinRelease = withinGroup - TENSE_MS;
  return { groupIndex, group, phase: "release", progress: withinRelease / releaseMs, cue: group.releaseCue, done: false };
}

/** Whole-session progress 0–1, clamped — for an overall progress ring. */
export function pmrProgress(elapsedMs: number): number {
  const total = pmrTotalMs();
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, elapsedMs / total));
}
