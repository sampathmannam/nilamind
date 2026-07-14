// P6.3 — non-crisis notification frequency cap + progressive cooldown (Wysa-class restraint).
// Max MAX_NON_CRISIS_PER_DAY non-crisis nudges per calendar day (daily reminder + EMA check-ins share the
// budget). Progressive cooldown: if the user dismisses 2 non-crisis nudges in a row, hold ALL non-crisis
// notifications for the next full day (never crisis/medication — those are health/safety-critical and exempt).
// Pure, deterministic, fully unit-tested; the OS dismissal signal is observed device-side (see App.tsx tap
// listener) and fed through recordEngagement()/recordDismissal().
// Non-sensitive UI pref → plain localStorage (sync, pre-gate safe), consistent with reminders.ts.

import { ls } from "./storageUtils";

export const MAX_NON_CRISIS_PER_DAY = 3;

const SENT_KEY_PREFIX = "nilamind_notif_sent_"; // + YYYY-MM-DD
const STREAK_KEY = "nilamind_notif_dismiss_streak";
const SKIP_KEY = "nilamind_notif_skip_until";

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** How many non-crisis nudges may still be scheduled for the calendar day containing `ts`. */
export function peekRemaining(ts: number = Date.now()): number {
  const used = getSentToday(ts);
  return Math.max(0, MAX_NON_CRISIS_PER_DAY - used);
}

/** How many non-crisis nudges were already scheduled for the calendar day containing `ts`. */
export function getSentToday(ts: number = Date.now()): number {
  try {
    const raw = ls()?.getItem(SENT_KEY_PREFIX + dayKey(ts));
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Atomically reserve `count` slots of today's budget. Capped at MAX so the cap can never be exceeded. */
export function commitClaim(count: number, ts: number = Date.now()): void {
  const next = Math.min(MAX_NON_CRISIS_PER_DAY, getSentToday(ts) + Math.max(0, Math.floor(count)));
  try { ls()?.setItem(SENT_KEY_PREFIX + dayKey(ts), String(next)); } catch { /* best-effort */ }
}

/** Convenience: reserve a single slot (used right after a non-crisis nudge is scheduled). */
export function recordNonCrisisSent(count = 1, ts: number = Date.now()): void {
  commitClaim(count, ts);
}

/** Reset the consecutive-dismissal streak (the person engaged with a nudge). */
export function recordEngagement(): void {
  try { ls()?.setItem(STREAK_KEY, "0"); ls()?.removeItem(SKIP_KEY); } catch { /* best-effort */ }
}

/** Record a dismissed/ignored non-crisis nudge. Two in a row hold notifications for the next full day. */
export function recordDismissal(now: number = Date.now()): void {
  try {
    const streak = (() => { const r = ls()?.getItem(STREAK_KEY); const n = Number(r); return Number.isFinite(n) && n > 0 ? n : 0; })();
    const next = streak + 1;
    ls()?.setItem(STREAK_KEY, String(next));
    if (next >= 2) {
      // Skip the entire next calendar day: hold until the start of the day after tomorrow.
      const tomorrowStart = startOfDay(now + 24 * 60 * 60 * 1000);
      const dayAfterStart = tomorrowStart + 24 * 60 * 60 * 1000;
      ls()?.setItem(SKIP_KEY, String(dayAfterStart));
    }
  } catch { /* best-effort */ }
}

export function dismissStreak(): number {
  try {
    const r = ls()?.getItem(STREAK_KEY);
    const n = Number(r);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** True while the next-day cooldown window is active — non-crisis nudges must be held. */
export function skipActive(ts: number = Date.now()): boolean {
  try {
    const raw = ls()?.getItem(SKIP_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && ts < until;
  } catch {
    return false;
  }
}
