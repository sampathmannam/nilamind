// On-device retention / engagement instrumentation.
//
// WHY: the biggest open question for a self-help app is not efficacy but ADHERENCE — real-world app
// retention is brutal (industry median: a few percent still active by day 15). To learn whether NilaMind
// keeps people, we have to measure retention. But the app's north star is "never gather data at any cost",
// and there is no server. So retention is measured **100% on-device**, for the user's OWN history, and it
// only ever leaves the phone if the user chooses to include it in the user-initiated export (exportReport.ts).
// There is deliberately NO gamified "you opened the app N/30 days" surface — that is the exact
// adherence-shaming a mental-health app should avoid; the numbers exist for honest measurement, not nudging.
//
// This records the DISTINCT DAYS the app was opened (LOCAL day keys, matching streaks/check-in/diary storage
// after the 2026-07-17 unification — see streaks.ts), and derives retention metrics from that log plus the
// identity createdAt anchor.

import { secureLocal } from "./secureLocal";
import { loadIdentity } from "./identity";
import { localDateKey } from "./storageUtils";

const APP_OPENS_KEY = "nilamind_app_opens";
const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** LOCAL day key YYYY-MM-DD — matches streaks.ts `ymd()` and how check-ins/diary persist dates
 *  (unified on the local calendar day, 2026-07-17 QA — see streaks.ts). */
export function dayKey(d: Date): string {
  return localDateKey(d);
}

/** Whole UTC days from day `a` to day `b` (b - a), both `YYYY-MM-DD`. */
function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** The sorted, de-duplicated list of local days the app was opened. Tolerant of absent/corrupt storage. */
export function loadAppOpens(): string[] {
  try {
    const raw = secureLocal.getItem(APP_OPENS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr: unknown[] = Array.isArray(parsed?.days) ? parsed.days : Array.isArray(parsed) ? parsed : [];
    const days = arr.filter((x): x is string => typeof x === "string" && DAY_RE.test(x));
    return [...new Set(days)].sort();
  } catch {
    return [];
  }
}

function saveAppOpens(days: string[]): void {
  try {
    secureLocal.setItem(APP_OPENS_KEY, JSON.stringify({ days }));
  } catch {
    /* best-effort — retention must never break the app or throw */
  }
}

/**
 * Record that the app was opened today. Idempotent per calendar day, so it is safe to call repeatedly —
 * e.g. from an App-level mount effect, which React StrictMode double-invokes in dev.
 */
export function recordAppOpen(now: Date = new Date()): void {
  const today = dayKey(now);
  const days = loadAppOpens();
  if (days.includes(today)) return;
  days.push(today);
  days.sort();
  saveAppOpens(days);
}

export interface RetentionSummary {
  /** The earliest of identity.createdAt (day) and the first recorded open — the retention anchor. */
  firstUseDay: string | null;
  /** Whole days from first use to today. */
  daysSinceFirstUse: number;
  /** Distinct days the app was opened. */
  totalActiveDays: number;
  lastOpenDay: string | null;
  /** Days from the first OPEN to the last open — how long the person actually kept coming back. */
  spanDays: number;
  /** Days since the last open. */
  currentGapDays: number;
  /** Largest gap (in days) between two consecutive opens. */
  longestGapDays: number;
  activeDaysLast7: number;
  activeDaysLast30: number;
  /** Individual retention flags: was the app still being opened at least N days after the first OPEN
   *  (return behaviour). A single-visit user is never "retained". */
  retainedDay1: boolean;
  retainedDay7: boolean;
  retainedDay14: boolean;
  retainedDay30: boolean;
}

/** Compute the on-device retention summary from the app-open log + identity anchor. Pure given the clock. */
export function computeRetention(now: Date = new Date()): RetentionSummary {
  const opens = loadAppOpens(); // sorted, unique
  const today = dayKey(now);

  // Anchor first-use to identity.createdAt when it predates the earliest recorded open — this keeps the
  // metric honest for users who existed before this instrumentation shipped (their real first use is older
  // than their first recorded open). Fall back to whichever single signal exists.
  const createdAt = loadIdentity()?.createdAt;
  const createdDay = createdAt && DAY_RE.test(createdAt.slice(0, 10)) ? createdAt.slice(0, 10) : null;
  const earliestOpen = opens[0] ?? null;
  const firstUseDay =
    createdDay && earliestOpen ? (createdDay < earliestOpen ? createdDay : earliestOpen)
    : createdDay ?? earliestOpen;

  const firstOpenDay = earliestOpen; // return behaviour is measured from the first ACTUAL open
  const lastOpenDay = opens.length ? opens[opens.length - 1] : null;
  const nn = (x: number) => Math.max(0, x); // clamp defensively against clock skew / bad data

  const daysSinceFirstUse = firstUseDay ? nn(diffDays(firstUseDay, today)) : 0;
  // spanDays and the retained* flags measure RETURN behaviour: first OPEN -> last OPEN. This is
  // deliberately NOT anchored to createdAt — otherwise an old account with a single open would report
  // "still opening after 30 days: yes" off one visit. A single open therefore yields span 0 (never
  // "retained"). daysSinceFirstUse above is the separate account-AGE metric; do not conflate the two.
  const spanDays = firstOpenDay && lastOpenDay ? nn(diffDays(firstOpenDay, lastOpenDay)) : 0;
  const currentGapDays = lastOpenDay ? nn(diffDays(lastOpenDay, today)) : 0;

  let longestGapDays = 0;
  for (let i = 1; i < opens.length; i++) {
    const g = diffDays(opens[i - 1], opens[i]);
    if (g > longestGapDays) longestGapDays = g;
  }

  const within = (n: number) =>
    opens.filter((d) => { const g = diffDays(d, today); return g >= 0 && g < n; }).length;

  const reached = (n: number) => spanDays >= n;

  return {
    firstUseDay,
    daysSinceFirstUse,
    totalActiveDays: opens.length,
    lastOpenDay,
    spanDays,
    currentGapDays,
    longestGapDays,
    activeDaysLast7: within(7),
    activeDaysLast30: within(30),
    retainedDay1: reached(1),
    retainedDay7: reached(7),
    retainedDay14: reached(14),
    retainedDay30: reached(30),
  };
}
