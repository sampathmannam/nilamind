// Streak computation (AUTOPILOT Phase 2). A "streak" = consecutive days with any self-care activity
// (a check-in or a diary entry). Today not-yet-logged does NOT break the streak — it counts up to the
// most recent active day. Compassionate-streak grace/freeze logic is layered on in Phase 7.
//
// Pure + local; reads the encrypted-at-rest data via secureLocal.

import { loadDiaryMap } from "./diary";
import { loadCheckins } from "./checkin";
import { DAY_MS, localDateKey } from "./storageUtils";
// LOCAL calendar frame — MUST match how check-ins/diary are stored (localDateKey(), see checkin.ts /
// DiaryCardScreen). The 2026-07-17 QA pass unified the whole day-bucketing system on the LOCAL day: with UTC
// keys (the prior convention) a late-night IST entry (00:00–05:30) stamped yesterday, so streaks and the
// activity strip silently dropped it. The DAY_MS day-walk below stays exact in the IST target market (no DST,
// so −86_400_000 ms always lands on the previous local calendar day). Stored historical UTC keys are left
// as-is (correct-forward): at most one near-midnight day may look off during the transition, then it self-heals.
export const ymd = (d: Date): string => localDateKey(d);

/** All dates (YYYY-MM-DD) on which the user did something — check-in or diary entry. */
export function activeDates(): Set<string> {
  const s = new Set<string>();
  try {
    for (const c of loadCheckins()) if (c?.date) s.add(c.date);
  } catch { /* ignore */ }
  for (const d of Object.keys(loadDiaryMap())) s.add(d);
  return s;
}

export interface StreakInfo {
  current: number;
  longest: number;
  activeToday: boolean;
  totalActiveDays: number;
}

export function computeStreak(): StreakInfo {
  const dates = activeDates();
  const today = new Date();
  const activeToday = dates.has(ymd(today));

  // Current: count back consecutive active days, starting today (or yesterday if today's not logged).
  let current = 0;
  let cursor = new Date(today);
  if (!dates.has(ymd(cursor))) cursor = new Date(today.getTime() - DAY_MS);
  while (dates.has(ymd(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  // Longest: scan the sorted dates for the longest run of consecutive days.
  const sorted = [...dates].sort();
  let longest = 0, run = 0, prev: number | null = null;
  for (const ds of sorted) {
    const t = new Date(ds + "T00:00:00").getTime();
    run = prev !== null && Math.round((t - prev) / DAY_MS) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = t;
  }

  return { current, longest, activeToday, totalActiveDays: dates.size };
}

// ── Compassionate streaks (AUTOPILOT Phase 7) ───────────────────────────────────────────────
// A streak should encourage, never punish. For someone with depression, a broken-streak guilt-trip
// is actively harmful, so:
//   • Today not-yet-logged never breaks the streak (today-grace, as above).
//   • A SINGLE missed day is auto-bridged by a "freeze" (a small grace budget), so one hard day
//     doesn't erase weeks of effort. Two+ consecutive missed days end the streak gently.
//   • After a lapse we welcome the user back with zero blame.
// The streak count reflects days actually shown up for; bridged days are forgiven, not counted.

export const FREEZE_BUDGET = 2; // grace days that can bridge gaps within the current streak
const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];

export interface CompassionateStreak {
  current: number;
  longest: number;
  activeToday: boolean;
  totalActiveDays: number;
  freezesUsed: number;   // grace days applied inside the current streak
  freezesLeft: number;
  daysSinceLast: number; // 0 = today, 1 = yesterday, … ; -1 = never logged
  lapsed: boolean;       // missed today AND yesterday → offer a no-pressure welcome back
  milestone: number | null; // set only on the day a milestone is reached
  message: string;       // warm status line, never guilt-inducing
  emoji: string;
}

export function computeCompassionateStreak(today: Date = new Date()): CompassionateStreak {
  const dates = activeDates();
  const base = computeStreak();
  const activeToday = dates.has(ymd(today));

  // Days since the most recent active day (capped to keep it bounded).
  let daysSinceLast = -1;
  for (let k = 0, c = new Date(today); k <= 400; k++, c = new Date(c.getTime() - DAY_MS)) {
    if (dates.has(ymd(c))) { daysSinceLast = k; break; }
  }

  // Walk back, bridging single-day gaps with the freeze budget.
  let current = 0;
  let freezesUsed = 0;
  let cursor = new Date(today);
  if (!dates.has(ymd(cursor))) cursor = new Date(cursor.getTime() - DAY_MS); // today-grace
  while (true) {
    if (dates.has(ymd(cursor))) { current++; cursor = new Date(cursor.getTime() - DAY_MS); continue; }
    const prevDay = new Date(cursor.getTime() - DAY_MS);
    if (freezesUsed < FREEZE_BUDGET && dates.has(ymd(prevDay))) {
      freezesUsed++; cursor = prevDay; continue; // forgive one missed day
    }
    break;
  }

  const lapsed = daysSinceLast >= 4;
  const milestone = activeToday && MILESTONES.includes(current) ? current : null;

  let message: string;
  let emoji: string;
  if (base.totalActiveDays === 0 || daysSinceLast === -1) {
    message = "Whenever you're ready — your first check-in starts here.";
    emoji = "🌱";
  } else if (lapsed) {
    message = "Welcome back — no pressure. We pick up right where you are. 💙";
    emoji = "💙";
  } else if (milestone) {
    message = `${milestone} days of showing up for yourself. That matters.`;
    emoji = "🌟";
  } else if (activeToday) {
    message = current > 1 ? `${current} days in a row. Gently done.` : "Checked in today. That counts.";
    emoji = "💙";
  } else {
    message = current > 0
      ? "Your streak's safe today — a check-in any time keeps it going, no rush."
      : "A small check-in whenever you can. That's enough.";
    emoji = "🌤️";
  }

  return {
    current,
    longest: base.longest,
    activeToday,
    totalActiveDays: base.totalActiveDays,
    freezesUsed,
    freezesLeft: FREEZE_BUDGET - freezesUsed,
    daysSinceLast,
    lapsed,
    milestone,
    message,
    emoji,
  };
}
