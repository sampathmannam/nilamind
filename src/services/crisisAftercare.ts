/**
 * Post-crisis aftercare protocol
 *
 * Stanley & Brown (2012) Safety Plan Intervention follow-up cohort: a structured
 * contact after a crisis disclosure is associated with ≈ halving of subsequent
 * suicidal behaviour (Stanley et al. 2018, cohort N=31 130). APA 2024 suicide
 * prevention guidelines recommend contacting the person within 24–48 hours after
 * a crisis event.
 *
 * This module provides a deterministic aftercare protocol — surfaced when the
 * user opens a new session within 48 hours of a §9 crisis event — and never
 * delegates crisis judgment to the LLM.
 */
import { secureLocal } from "./secureLocal";

const STORAGE_KEY = "nilamind_crisis_aftercare";

interface CrisisAftercareState {
  /** ISO timestamp of the most recent §9 crisis event. */
  lastCrisisTs: string;
  /** ISO timestamp when aftercare was completed (or null). */
  completedTs: string | null;
}

/* ── Steps ─────────────────────────────────────────────────── */

export interface AftercareStep {
  id: string;
  title: string;
  prompt: string;
}

export const AFTERCARE_STEPS: AftercareStep[] = [
  {
    id: "ac-1",
    title: "Gentle check-in",
    prompt: "I remember things got really heavy when we last spoke. No pressure at all — but how are you doing right now, in this moment? Even a single word is enough.",
  },
  {
    id: "ac-2",
    title: "Safety plan",
    prompt: "Sometimes after a hard moment, it helps to revisit your safety plan — what's on it, and whether anything needs to change. Would you like to look at it together?",
  },
  {
    id: "ac-3",
    title: "Coping check",
    prompt: "When things felt that heavy, was there anything that helped — even a little? A person, a place, a small action? Noticing what works, even in small ways, is worth remembering.",
  },
  {
    id: "ac-4",
    title: "Resources",
    prompt: "And just in case — here's the reminder that trained listeners are available 24/7, free and confidential, if things ever feel like that again. Would you like me to show the numbers?",
  },
];

/* ── Core API ──────────────────────────────────────────────── */

function readState(): CrisisAftercareState | null {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CrisisAftercareState;
  } catch {
    return null;
  }
}

function writeState(s: CrisisAftercareState): void {
  try {
    secureLocal.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    console.error("[crisisAftercare] persist failed");
  }
}

/** Call when §9 fires (detected crisis event) — records the timestamp. */
export function recordCrisisEvent(): void {
  writeState({ lastCrisisTs: new Date().toISOString(), completedTs: null });
}

/** Mark the aftercare protocol as completed for this crisis event. */
export function markAftercareDone(): void {
  const state = readState();
  if (state) {
    state.completedTs = new Date().toISOString();
    writeState(state);
  }
}

/**
 * True when there is a recent (§9-detected) crisis that happened within the
 * follow-up window and aftercare has NOT yet been recorded as done.
 */
export function hasPendingAftercare(windowHours = 48): boolean {
  const state = readState();
  if (!state || state.completedTs) return false;
  const elapsed = Date.now() - new Date(state.lastCrisisTs).getTime();
  return elapsed >= 0 && elapsed < windowHours * 3_600_000;
}

/** Reset the aftercare state (for tests or explicit dismiss). */
export function clearAftercareState(): void {
  try { secureLocal.removeItem(STORAGE_KEY); } catch { /* best-effort */ }
}

/** Get a human-readable summary of the aftercare window. */
export function aftercareSummary(): string | null {
  const state = readState();
  if (!state) return null;
  if (state.completedTs) return "Aftercare completed";
  const elapsed = Date.now() - new Date(state.lastCrisisTs).getTime();
  const remaining = Math.max(0, Math.round((48 * 3_600_000 - elapsed) / 3_600_000));
  return `Aftercare window: ${remaining}h remaining`;
}
