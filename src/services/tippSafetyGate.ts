// TIPP tool's one-time safety-gate checklist (2026-07-12 Wave 3, Group E).
//
// TIPP's Temperature component (face immersion/cold water) triggers the mammalian dive reflex —
// strong evidence for a cardiac-vagal effect (Ackermann et al. 2023, Psychophysiology), but the same
// reflex is implicated in "autonomic conflict" arrhythmia risk (Shattock & Tipton 2012). Per spec doc
// §3, Temperature is CONTRAINDICATED OR REQUIRES SIGN-OFF for: known cardiac arrhythmia, pacemaker,
// uncontrolled hypertension, beta-blockers/HR-affecting medication, seizure disorder, and eating
// disorders with a bradycardia/electrolyte-imbalance/low-cardiac-mass history — plus softer cautions
// for cold sensitivity/Raynaud's and pregnancy. This is a one-time, persisted checklist: checking ANY
// box doesn't block the tool, it just removes the Temperature tab and defaults the flow to
// Intense-exercise → Paced-breathing → Paired-muscle-relaxation instead.
//
// Health-condition data — encrypted at rest via secureLocal (see SENSITIVE_KEYS in secureLocal.ts).

import { secureLocal } from "./secureLocal";

const KEY = "nilamind_tipp_safety";

export interface TippSafetyFlags {
  cardiac: boolean; // known cardiac arrhythmia or a pacemaker
  hypertension: boolean; // uncontrolled high blood pressure
  hrMeds: boolean; // beta-blockers or other heart-rate-affecting medication
  seizure: boolean; // seizure disorder
  edBradycardia: boolean; // eating disorder with bradycardia/electrolyte-imbalance/low-cardiac-mass history
  pregnancy: boolean; // softer caution
  coldSensitivity: boolean; // cold sensitivity / Raynaud's — softer caution
}

export const TIPP_SAFETY_ITEMS: { key: keyof TippSafetyFlags; label: string }[] = [
  { key: "cardiac", label: "A known cardiac arrhythmia or a pacemaker" },
  { key: "hypertension", label: "Uncontrolled high blood pressure" },
  { key: "hrMeds", label: "Beta-blockers or other heart-rate-affecting medication" },
  { key: "seizure", label: "A seizure disorder" },
  { key: "edBradycardia", label: "An eating disorder with a history of low heart rate, electrolyte imbalance, or reduced cardiac mass" },
  { key: "pregnancy", label: "Pregnant" },
  { key: "coldSensitivity", label: "Cold sensitivity or Raynaud's" },
];

export function defaultTippSafetyFlags(): TippSafetyFlags {
  return {
    cardiac: false,
    hypertension: false,
    hrMeds: false,
    seizure: false,
    edBradycardia: false,
    pregnancy: false,
    coldSensitivity: false,
  };
}

export interface TippSafetyState {
  completed: boolean;
  flags: TippSafetyFlags;
}

export function getTippSafetyState(): TippSafetyState {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return { completed: false, flags: defaultTippSafetyFlags() };
    const parsed = JSON.parse(raw);
    return {
      completed: !!parsed?.completed,
      flags: { ...defaultTippSafetyFlags(), ...(parsed?.flags ?? {}) },
    };
  } catch {
    return { completed: false, flags: defaultTippSafetyFlags() };
  }
}

/** Persist the checklist. Saving with every box left unchecked is a valid, explicit "none of these
 *  apply to me" answer — it still marks the checklist completed so it isn't asked again. */
export function saveTippSafetyFlags(flags: TippSafetyFlags): TippSafetyState {
  const state: TippSafetyState = { completed: true, flags };
  try { secureLocal.setItem(KEY, JSON.stringify(state)); } catch { /* best-effort — never throw */ }
  return state;
}

/** True if ANY safety-gate box is checked — the caller must hide the Temperature tab. */
export function hasTemperatureCaution(flags: TippSafetyFlags): boolean {
  return Object.values(flags).some(Boolean);
}
