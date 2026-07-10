// EMA — Ecological Momentary Assessment micro-check-ins.
// Pure on-device scheduling logic (notification hook is device-specific via Capacitor).
// Privacy-first: all data stored locally under nilamind_ema.

import { ls } from "./storageUtils";
import type { EmaEntry } from "../types";
import type { ElevationLevel } from "./elevationGuard";

const EMA_KEY = "nilamind_ema";

export interface EmaWindow {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

const DEFAULT_WINDOWS: EmaWindow[] = [
  { start: "10:00", end: "12:00" },
  { start: "14:00", end: "16:00" },
  { start: "19:00", end: "21:00" },
];

const DEFAULT_FREQ = 2;

/** Load all stored EMA entries (newest first). */
export function loadEmaEntries(): EmaEntry[] {
  try {
    const store = ls();
    if (!store) return [];
    const raw = store.getItem(EMA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EmaEntry[]).sort(byNewest) : [];
  } catch {
    return [];
  }
}

/** Append a single EMA entry. */
export function saveEmaEntry(entry: EmaEntry): void {
  try {
    const store = ls();
    if (!store) return;
    const existing = loadEmaEntries();
    existing.unshift(entry);
    store.setItem(EMA_KEY, JSON.stringify(existing));
  } catch {
    // best-effort, never throw
  }
}

/** Generate scheduling windows for the day. */
export function generateEmaWindows(
  frequency: number = DEFAULT_FREQ,
  windows: EmaWindow[] = DEFAULT_WINDOWS,
): EmaWindow[] {
  // Pick `frequency` windows, evenly spaced from the available pool
  if (frequency >= windows.length) return [...windows];
  const step = windows.length / frequency;
  const result: EmaWindow[] = [];
  for (let i = 0; i < frequency; i++) {
    const idx = Math.min(Math.round(i * step), windows.length - 1);
    result.push(windows[idx]);
  }
  return result;
}

/** Detect rapidly rising valence+energy across today's EMA entries. Used by elevation guard. */

export function emaElevationSignal(): ElevationLevel {
  const entries = loadEmaEntries();
  if (entries.length < 2) return "none";

  // Only consider today's entries
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayEntries = entries.filter((e) => e.date === todayStr && typeof e.energy === "number");
  if (todayEntries.length < 2) return "none";

  const first = todayEntries[todayEntries.length - 1]; // oldest (sorted newest-first, last = oldest)
  const last = todayEntries[0]; // newest

  const valenceDelta = last.valence - first.valence;
  const energyDelta = (last.energy ?? 0) - (first.energy ?? 0);

  // High: steep rise in both
  if (valenceDelta >= 3 && energyDelta >= 2) return "high";
  // Elevated: notable rise
  if (valenceDelta >= 2 && energyDelta >= 1) return "elevated";

  return "none";
}

function byNewest(a: EmaEntry, b: EmaEntry): number {
  return b.timestamp.localeCompare(a.timestamp);
}
