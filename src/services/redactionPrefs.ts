// Phase 20.2 — Per-category redaction preferences for the clinician PDF export.
// Mirrors the caregiverPreferences.ts pattern: a single secureLocal key stores the
// user's redaction profile. Two presets (Minimal / Full) + per-category overrides.
//
// The patient is the data principal (N10/N11): they control exactly which sections
// of their clinician report leave the device.

import { secureLocal } from "./secureLocal";

const STORAGE_KEY = "nilamind_redaction_prefs";

export const CATEGORY_KEYS = [
  "checkins",
  "sleep",
  "screenings",
  "medications",
  "episodes",
  "phaseMarkers",
  "diaryCard",
  "thoughtRecords",
  "safetyPlan",
  "relapsePlan",
  "connections",
  "supports",
  "voiceSignal",
  "behaviouralInsights",
  "doseChanges",
  "sideEffectDuration",
  "whatHelped",
  "whatDidntHelp",
] as const;

export type RedactionCategory = typeof CATEGORY_KEYS[number];

export interface RedactionPrefs {
  checkins: boolean;
  sleep: boolean;
  screenings: boolean;
  medications: boolean;
  episodes: boolean;
  phaseMarkers: boolean;
  diaryCard: boolean;
  thoughtRecords: boolean;
  safetyPlan: boolean;
  relapsePlan: boolean;
  connections: boolean;
  supports: boolean;
  voiceSignal: boolean;
  behaviouralInsights: boolean;
  doseChanges: boolean;
  sideEffectDuration: boolean;
  whatHelped: boolean;
  whatDidntHelp: boolean;
}

/** Minimal preset: only screenings + safety plan (the minimum a clinician needs). */
export const PRESET_MINIMAL: Readonly<RedactionPrefs> = {
  checkins: false,
  sleep: false,
  screenings: true,
  medications: false,
  episodes: false,
  phaseMarkers: false,
  diaryCard: false,
  thoughtRecords: false,
  safetyPlan: true,
  relapsePlan: false,
  connections: false,
  supports: false,
  voiceSignal: false,
  behaviouralInsights: false,
  doseChanges: false,
  sideEffectDuration: false,
  whatHelped: false,
  whatDidntHelp: false,
};

/** Full preset: everything included (the default for new users). */
export const PRESET_FULL: Readonly<RedactionPrefs> = {
  checkins: true,
  sleep: true,
  screenings: true,
  medications: true,
  episodes: true,
  phaseMarkers: true,
  diaryCard: true,
  thoughtRecords: true,
  safetyPlan: true,
  relapsePlan: true,
  connections: true,
  supports: true,
  voiceSignal: true,
  behaviouralInsights: true,
  doseChanges: true,
  sideEffectDuration: true,
  whatHelped: true,
  whatDidntHelp: true,
};

export const categoryKeys: readonly RedactionCategory[] = CATEGORY_KEYS;

/** Load the user's redaction preferences. Falls back to FULL when none stored. */
export function getRedactionPrefs(): RedactionPrefs {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return { ...PRESET_FULL };
    const parsed = JSON.parse(raw);
    // Validate: all category keys must be present as booleans.
    if (typeof parsed !== "object" || parsed === null) return { ...PRESET_FULL };
    for (const key of CATEGORY_KEYS) {
      if (typeof parsed[key] !== "boolean") return { ...PRESET_FULL };
    }
    return parsed as RedactionPrefs;
  } catch {
    return { ...PRESET_FULL };
  }
}

/** Persist the user's redaction preferences. */
export function setRedactionPrefs(prefs: RedactionPrefs): void {
  secureLocal.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
