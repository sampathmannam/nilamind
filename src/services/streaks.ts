// Streak computation (AUTOPILOT Phase 2). A "streak" = consecutive days with any self-care activity
// (a check-in or a diary entry). Today not-yet-logged does NOT break the streak — it counts up to the
// most recent active day. Compassionate-streak grace/freeze logic is layered on in Phase 7.
//
// Pure + local; reads the encrypted-at-rest data via secureLocal.

import { secureLocal } from "./secureLocal";

const DAY = 86400000;
export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** All dates (YYYY-MM-DD) on which the user did something — check-in or diary entry. */
export function activeDates(): Set<string> {
  const s = new Set<string>();
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (raw) for (const c of JSON.parse(raw)) if (c?.date) s.add(c.date);
  } catch { /* ignore */ }
  try {
    const raw = secureLocal.getItem("nilamind_diary");
    if (raw) for (const d of Object.keys(JSON.parse(raw))) s.add(d);
  } catch { /* ignore */ }
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
  if (!dates.has(ymd(cursor))) cursor = new Date(today.getTime() - DAY);
  while (dates.has(ymd(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - DAY);
  }

  // Longest: scan the sorted dates for the longest run of consecutive days.
  const sorted = [...dates].sort();
  let longest = 0, run = 0, prev: number | null = null;
  for (const ds of sorted) {
    const t = new Date(ds + "T00:00:00").getTime();
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
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
  for (let k = 0, c = new Date(today); k <= 400; k++, c = new Date(c.getTime() - DAY)) {
    if (dates.has(ymd(c))) { daysSinceLast = k; break; }
  }

  // Walk back, bridging single-day gaps with the freeze budget.
  let current = 0;
  let freezesUsed = 0;
  let cursor = new Date(today);
  if (!dates.has(ymd(cursor))) cursor = new Date(cursor.getTime() - DAY); // today-grace
  while (true) {
    if (dates.has(ymd(cursor))) { current++; cursor = new Date(cursor.getTime() - DAY); continue; }
    const prevDay = new Date(cursor.getTime() - DAY);
    if (freezesUsed < FREEZE_BUDGET && dates.has(ymd(prevDay))) {
      freezesUsed++; cursor = prevDay; continue; // forgive one missed day
    }
    break;
  }

  const lapsed = daysSinceLast >= 2;
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
