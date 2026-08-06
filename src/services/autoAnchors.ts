// Auto-detect wake/bed times from phone usage patterns.
// Privacy-first: uses only app-open timestamps, no location or call data.
// This fills the gap when Health Connect is unavailable (which is most users).

import { secureLocal } from "./secureLocal";
import { dayKey } from "./retentionMetrics";

const WAKE_KEY = "nilamind_auto_wake";
const BED_KEY = "nilamind_auto_bed";

/**
 * Record the first app open of the day as a wake-time proxy.
 * Call this on every app foreground event. Idempotent per calendar day.
 */
export function recordFirstOpenToday(): void {
  const today = dayKey(new Date());
  try {
    const raw = secureLocal.getItem(WAKE_KEY);
    const existing = raw ? JSON.parse(raw) : null;
    if (existing?.date === today) return; // already recorded today
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    secureLocal.setItem(WAKE_KEY, JSON.stringify({ date: today, time: hhmm }));
  } catch { /* best-effort */ }
}

/**
 * Record the last app close/background of the day as a bed-time proxy.
 * Call this on every app background event. Idempotent per calendar day.
 */
export function recordLastCloseToday(): void {
  const today = dayKey(new Date());
  try {
    // Bed-time proxy = the LAST time the app went to background today, so every background must
    // overwrite the earlier one. This previously returned early when a value for today already
    // existed — the line below it ("Actually, we WANT the LATEST close, so always update") says
    // what was meant, but the guard above it won, so the FIRST background of the day was stored
    // and never replaced: background the app at 09:00 and your "bed time" read 09:00 for the rest
    // of the day. Only same-day values are overwritten; a new day starts fresh either way.
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    secureLocal.setItem(BED_KEY, JSON.stringify({ date: today, time: hhmm }));
  } catch { /* best-effort */ }
}

/** Get today's auto-detected wake time ("HH:MM") or null. */
export function getAutoWakeTime(): string | null {
  try {
    const today = dayKey(new Date());
    const raw = secureLocal.getItem(WAKE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.date === today ? data.time : null;
  } catch { return null; }
}

/** Get today's auto-detected bed time ("HH:MM") or null. */
export function getAutoBedTime(): string | null {
  try {
    const today = dayKey(new Date());
    const raw = secureLocal.getItem(BED_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.date === today ? data.time : null;
  } catch { return null; }
}

/**
 * Get auto-detected social rhythm anchors from phone usage.
 * Returns partial anchors (only wake/bed) that can be merged with manual entries.
 */
export function getAutoAnchors(): { wake?: string; bed?: string } {
  const wake = getAutoWakeTime();
  const bed = getAutoBedTime();
  const result: { wake?: string; bed?: string } = {};
  if (wake) result.wake = wake;
  if (bed) result.bed = bed;
  return result;
}
