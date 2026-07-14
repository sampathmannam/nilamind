// checkin — pure helpers for Nila's once-a-day tap check-in. Builds the one CheckInEntry, appends it
// to the shared nilamind_checkins array via secureLocal (read-modify-write, byte-identical to every
// existing writer), and manages the non-sensitive per-day skip flag in plain localStorage.

import { secureLocal, appendToSecureArray } from "./secureLocal";
import type { CheckInEntry } from "../types";

const CHECKINS_KEY = "nilamind_checkins";       // SENSITIVE_KEY — encrypted via secureLocal
const SKIP_KEY = "nilamind_checkin_skipped";    // non-sensitive UI flag — plain localStorage, nilamind_-prefixed

/** Build the single CheckInEntry a Nila check-in produces. Provenance suffix " (Nila)" lets readers
 *  strip it back to the base emotion (see stripProvenance / nilaContext.cleanEmotion). */
export function buildCheckinEntry(label: string, intensity: number, contextTag: string | null, granularEmotion?: string | null, energy?: number | null, sleepHours?: number | null): CheckInEntry {
  const entry: CheckInEntry = {
    id: "ch_" + Date.now(),
    date: new Date().toISOString().split("T")[0],
    timestamp: new Date().toLocaleTimeString(),
    emotion: `${label} (Nila)`,
    intensity,
    energy: energy ?? null,
    context: contextTag || "Nila check-in",
    granularEmotion: granularEmotion || undefined,
  };
  if (sleepHours != null) entry.sleepHours = sleepHours;
  return entry;
}

/** Append the entry via the atomic shared primitive (2026-07-06 audit — closes the last-writer-wins race
 *  vs the other check-in writers that each hand-rolled read-modify-write). */
export function appendCheckin(entry: CheckInEntry): void {
  appendToSecureArray<CheckInEntry>(CHECKINS_KEY, entry);
}

/** True when any stored CheckInEntry has date === today (local YYYY-MM-DD). Any same-day check-in
 *  from any surface suppresses Nila's opening check-in — intentionally once-a-day app-wide. */
export function hasCheckinToday(today: string): boolean {
  try {
    const raw = secureLocal.getItem(CHECKINS_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return false;
    return list.some((e: CheckInEntry) => e && e.date === today);
  } catch {
    return false;
  }
}

/** Per-day skip flag (plain localStorage; non-sensitive; cleared by the nilamind_ wipe sweep). */
export function getSkipFlag(): string | null {
  try {
    return (globalThis as any).localStorage?.getItem(SKIP_KEY) ?? null;
  } catch {
    return null;
  }
}
export function setSkipFlag(today: string): void {
  try {
    (globalThis as any).localStorage?.setItem(SKIP_KEY, today);
  } catch {
    /* non-sensitive flag; failing to persist a skip just re-prompts later — acceptable */
  }
}
