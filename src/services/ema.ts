// EMA — Ecological Momentary Assessment micro-check-ins.
// Pure on-device scheduling logic (notification hook is device-specific via Capacitor).
// Privacy-first: all data stored locally under nilamind_ema.

import { secureLocal } from "./secureLocal";
import type { EmaEntry } from "../types";
import type { ElevationLevel } from "./elevationGuard";

const EMA_KEY = "nilamind_ema";

export interface EmaWindow {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

/** The default EMA sampling windows (local time). Exported so the scheduler can plan random times within them. */
export const EMA_WINDOWS: EmaWindow[] = [
  { start: "10:00", end: "12:00" },
  { start: "14:00", end: "16:00" },
  { start: "19:00", end: "21:00" },
];

const DEFAULT_FREQ = 2;

/** Local YYYY-MM-DD for `d` — the same day-bucket convention as check-ins (NOT the UTC ISO date), so EMA
 *  entries land in the same day as a same-day check-in regardless of the user's timezone. */
export function emaDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Load all stored EMA entries (newest first). */
export function loadEmaEntries(): EmaEntry[] {
  try {
    const raw = secureLocal.getItem(EMA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EmaEntry[]).sort(byNewest) : [];
  } catch {
    return [];
  }
}

/** Append a single EMA entry. Stored via secureLocal — the free-text note is mood content and is
 *  encrypted at rest, same as check-ins and diary cards. */
export function saveEmaEntry(entry: EmaEntry): void {
  try {
    const existing = loadEmaEntries();
    existing.unshift(entry);
    secureLocal.setItem(EMA_KEY, JSON.stringify(existing));
  } catch {
    // best-effort, never throw
  }
}

/** Generate scheduling windows for the day. */
export function generateEmaWindows(
  frequency: number = DEFAULT_FREQ,
  windows: EmaWindow[] = EMA_WINDOWS,
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

/** A uniform-random local Date within `win` (HH:mm) on the given `day`. RNG is injectable for tests. */
export function randomTimeInWindow(win: EmaWindow, day: Date, rng: () => number = Math.random): Date {
  const [sh, sm] = win.start.split(":").map(Number);
  const [eh, em] = win.end.split(":").map(Number);
  const startMin = (sh || 0) * 60 + (sm || 0);
  const endMin = (eh || 0) * 60 + (em || 0);
  const span = Math.max(0, endMin - startMin);
  const pick = startMin + Math.floor(rng() * (span + 1));
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  d.setHours(Math.floor(pick / 60), pick % 60, 0, 0);
  return d;
}

/**
 * Plan future, non-quiet EMA fire-times over `days` (default 3) starting today. Picks `frequency` windows/day
 * and a uniform-random time within each; re-rolls up to 5× and DROPS a slot that keeps landing in quiet hours
 * or in the past (never clamp into quiet hours). Pure given rng + now + isQuiet, so it is fully unit-testable.
 */
export function planEmaFireTimes(opts: {
  frequency: number;
  days?: number;
  now?: Date;
  rng?: () => number;
  isQuiet?: (d: Date) => boolean;
}): Date[] {
  const { frequency, days = 3, now = new Date(), rng = Math.random, isQuiet = () => false } = opts;
  const times: Date[] = [];
  const windows = generateEmaWindows(frequency, EMA_WINDOWS);
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    // Build each day from a fresh local midnight (not now + 24h*ms) so DST never slides the slot by an hour.
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 0, 0, 0, 0);
    for (const win of windows) {
      let chosen: Date | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const t = randomTimeInWindow(win, day, rng);
        if (t.getTime() > now.getTime() && !isQuiet(t)) { chosen = t; break; }
      }
      if (chosen) times.push(chosen);
    }
  }
  return times.sort((a, b) => a.getTime() - b.getTime());
}

/** Detect rapidly rising valence+energy across today's EMA entries. Used by elevation guard. */

export function emaElevationSignal(): ElevationLevel {
  const entries = loadEmaEntries();
  if (entries.length < 2) return "none";

  // Only consider today's entries (local day-bucket, same convention as EmaEntry.date + check-ins)
  const todayStr = emaDateKey();
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
