// P6.2 — optimal notification timing learner. NilaMind records when the person actually opens the app from a
// notification (engagement), and after enough days of signal, shifts nudges toward the hours they tend to
// respond in. This is the JITAI "right time" lever: mistimed prompts backfire (Wysa / BMJ Mental Health 2025).
// Pure learner logic is unit-tested; the store + Capacitor listener in App.tsx are the only IO.
// Non-sensitive behavioural signal → plain localStorage (sync, pre-gate safe).

import { ls } from "./storageUtils";
import { DAY_MS } from "./storageUtils";

const KEY = "nilamind_engagement";
const MIN_DAYS = 7; // need a week of signal before we shift anything
const MAX_POINTS = 300;

/** Append an engagement timestamp (default: now). Capped so the store never grows unbounded. */
export function recordNotificationOpen(ts: number = Date.now()): void {
  try {
    const raw = ls()?.getItem(KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    arr.push(ts);
    if (arr.length > MAX_POINTS) arr.splice(0, arr.length - MAX_POINTS);
    ls()?.setItem(KEY, JSON.stringify(arr));
  } catch { /* best-effort */ }
}

/** Engagement timestamps within the last `days` days (default 30). */
export function getEngagement(days = 30): number[] {
  try {
    const raw = ls()?.getItem(KEY);
    if (!raw) return [];
    const arr: number[] = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - days * DAY_MS;
    return arr.filter((t) => typeof t === "number" && t >= cutoff);
  } catch {
    return [];
  }
}

/**
 * Pure learner: given engagement timestamps, return the local hour (0-23) the person most often engages,
 * or null until we have at least MIN_DAYS distinct calendar days of signal. Ties resolve to the earliest hour.
 */
export function optimalFireHour(engagements: number[], now: Date = new Date()): number | null {
  if (engagements.length < MIN_DAYS) return null;
  const days = new Set<string>();
  const byHour = new Array(24).fill(0);
  for (const ts of engagements) {
    const d = new Date(ts);
    if (!Number.isFinite(d.getTime())) continue;
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    byHour[d.getHours()]++;
  }
  if (days.size < MIN_DAYS) return null;
  let best = -1;
  let bestCount = 0;
  for (let h = 0; h < 24; h++) {
    if (byHour[h] > bestCount) {
      bestCount = byHour[h];
      best = h;
    }
  }
  return best >= 0 ? best : null;
}

/** Convenience: read the store and return the learned hour (or null). */
export function optimalFireHourNow(now: Date = new Date()): number | null {
  return optimalFireHour(getEngagement(30), now);
}

/** True once we have enough signal to start shifting times. */
export function hasEnoughEngagementData(now: Date = new Date()): boolean {
  return optimalFireHourNow(now) !== null;
}
