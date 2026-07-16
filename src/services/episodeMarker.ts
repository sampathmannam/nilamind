// episodeMarker — a longitudinal bipolar-PHASE tracker. Distinct from the per-episode distress log
// (EpisodeRecord: trigger/skills/intensity) and from momentary daily check-ins: a marker tags a
// STRETCH of time by how mood ran (elevated / depressed / mixed / steady). The user owns the label —
// we never auto-diagnose. Wellness framing throughout: a pattern over time, not a clinical verdict.
//
// RESEARCH BASIS:
//   - Faurholt-Jepsen et al. (2015, Psychol Medicine) — MONARCA I trial: daily electronic self-monitoring
//     in bipolar disorder using smartphones demonstrated feasibility and validity of app-based mood tracking
//   - Goulding et al. (2022, JAMA Psychiatry) — LiveWell: smartphone-based self-management for BD,
//     showed self-monitoring increases awareness and supports behavioral control processes
//   - Bauer et al. (2008, Psychiatry Research) — ChronoRecord validated for patient self-report of mood
//   - Morton et al. (2025, J Affect Disord) — qualitative study found self-monitoring increases awareness,
//     guides self-management, but users expressed frustration with repetitiveness
//   - ASERT questionnaire (validated Czech → English; Lynch et al. 2025, J Affect Disord) provides
//     structured symptom checklists for mood tracking — this module uses free-label self-tagging
//     which is less structured but more flexible
//
// ANOSOGNOSIA NOTE: Elevated states in bipolar disorder often involve reduced self-awareness (anosognosia).
// Users may not recognize manic symptoms because elevated states feel positive/productive. The validation
// prompts below are designed to gently surface prodrome indicators without being alarmist.
//
// The only consumer of the data is the user (and their clinician, via the device-local PDF). Nothing
// leaves the device.

import { appendToSecureArray, secureLocal } from "./secureLocal";

export type EpisodePhase = "elevated" | "depressed" | "mixed" | "stable";

export interface EpisodeMarker {
  id: string;
  /** Inclusive start, YYYY-MM-DD. */
  startDate: string;
  /** Inclusive end, YYYY-MM-DD (may equal startDate for a single day). */
  endDate: string;
  phase: EpisodePhase;
  note: string;
  createdAt: string; // ISO timestamp
}

const STORAGE_KEY = "nilamind_episode_markers";
const DAY_MS = 86_400_000;

const PHASES: readonly EpisodePhase[] = ["elevated", "depressed", "mixed", "stable"];

function parse(d: string): number {
  const t = new Date(d + "T00:00:00").getTime();
  return Number.isNaN(t) ? NaN : t;
}

/** True when the range is well-formed and the phase is known. */
export function validateMarker(m: EpisodeMarker): boolean {
  if (!PHASES.includes(m.phase)) return false;
  const s = parse(m.startDate);
  const e = parse(m.endDate);
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return s <= e;
}

export function readEpisodeMarkers(): EpisodeMarker[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EpisodeMarker[]) : [];
  } catch {
    return [];
  }
}

/** Append a marker. Throws (and persists nothing) on an invalid range/phase so callers can't write
 *  corrupt phase history. */
export function addEpisodeMarker(m: EpisodeMarker): EpisodeMarker[] {
  if (!validateMarker(m)) throw new Error("Invalid episode marker");
  return appendToSecureArray<EpisodeMarker>(STORAGE_KEY, m);
}

function contains(m: EpisodeMarker, today: string): boolean {
  const t = parse(today);
  if (Number.isNaN(t)) return false;
  return parse(m.startDate) <= t && t <= parse(m.endDate);
}

/** The marker covering `today` (most recently created wins on overlap), or null. */
export function currentPhase(all: EpisodeMarker[] = readEpisodeMarkers(), today: string = new Date().toISOString().split("T")[0]): EpisodeMarker | null {
  const covering = all.filter((m) => contains(m, today));
  if (covering.length === 0) return null;
  return covering.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function episodeMarkerSummary(all: EpisodeMarker[] = readEpisodeMarkers(), today: string = new Date().toISOString().split("T")[0]): string {
  const cur = currentPhase(all, today);
  if (!cur) return "";
  const range = cur.startDate === cur.endDate ? cur.startDate : `${cur.startDate}–${cur.endDate}`;
  return `- They've marked a ${cur.phase} period (${range})${cur.note ? `: "${cur.note}"` : ""}. This is their own phase tag — a pattern they noticed, not a verdict.`;
}

// ── Phase validation prompts (prodrome checks) ───────────────────────────────────
// When a user selects "elevated" or "depressed," these brief validation questions help
// confirm the self-assessment and surface prodrome indicators. Modeled after the ASERT
// questionnaire structure (Lynch et al. 2025) but kept minimal to avoid user burden.
//
// ANOSOGNOSIA DESIGN: For "elevated" phases, prompts focus on behavioral indicators
// (sleep, spending, racing) rather than mood valence, because elevated states feel
// positive and users may not endorse negative framing.

export interface PhaseValidationPrompt {
  phase: EpisodePhase;
  questions: string[];
}

/** Brief validation questions surfaced when a user selects a phase. */
export const PHASE_VALIDATION_PROMPTS: PhaseValidationPrompt[] = [
  {
    phase: "elevated",
    questions: [
      "How many hours of sleep have you been getting? (Elevated states often involve needing less sleep.)",
      "Have you noticed racing thoughts or speaking faster than usual?",
      "Have you been spending more than usual or making impulsive decisions?",
    ],
  },
  {
    phase: "depressed",
    questions: [
      "How's your energy level compared to your usual baseline?",
      "Have you been withdrawing from people or activities you normally enjoy?",
      "Has your sleep changed — either much more or much less than usual?",
    ],
  },
  {
    phase: "mixed",
    questions: [
      "Are you experiencing both low mood and racing/restless energy at the same time?",
      "Have you noticed irritability alongside sadness or hopelessness?",
      "Is this different from a purely 'up' or 'down' period?",
    ],
  },
];

/**
 * Get validation prompts for a given phase.
 * Returns empty array for "stable" (no validation needed).
 */
export function getPhaseValidationPrompts(phase: EpisodePhase): string[] {
  const found = PHASE_VALIDATION_PROMPTS.find((p) => p.phase === phase);
  return found?.questions ?? [];
}

/**
 * Cross-reference a phase marker with elevation guard data for consistency.
 * Returns a gentle note if the self-report conflicts with behavioral signals,
 * or null if consistent. This is informational, not authoritative.
 */
export function phaseConsistencyNote(
  phase: EpisodePhase,
  elevationSignals: { energy?: boolean; nap?: boolean; sleep?: boolean },
): string | null {
  if (phase === "stable") return null;

  const hasUpSignals = elevationSignals.energy || elevationSignals.nap || elevationSignals.sleep;
  const hasDownSignals = !hasUpSignals;

  if (phase === "elevated" && hasDownSignals) {
    return "You've marked this as elevated, but your recent data doesn't show elevated signals. " +
      "That's okay — sometimes we feel elevated before the data catches up, or the data is incomplete. " +
      "Either way, you know yourself best.";
  }

  if (phase === "depressed" && hasUpSignals) {
    return "You've marked this as depressed, but your recent data shows some elevated signals. " +
      "Sometimes what feels like low mood can coexist with restlessness or energy shifts. " +
      "Worth noting — no right or wrong answer.";
  }

  return null;
}
