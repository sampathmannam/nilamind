// postCrisisCheckIn — an OPT-IN, content-free "checking in" local notification a few hours after a §9
// crisis surface was shown. Never scheduled silently: offerPostCrisisCheckIn() must only be called after
// the user explicitly taps "yes" on CrisisOverlay's dismiss prompt (2026-07-12 Wave 3, Task 1.4).
//
// Reuses notifications.ts's existing scheduleReminderAt (the same primitive syncDailyReminders/EMA use) —
// no new scheduling plumbing. Timing (a few hours later) is an ENGINEERING DEFAULT — the plan doc suggests a
// 3-6h band with no citation for the exact figure; 4h is picked as the midpoint. Copy is deliberately
// CONTENT-FREE (never mentions "crisis"), matching notifications.ts's existing lock-screen privacy
// discipline: "a lock-screen must not leak a mental-health conversation."

import { scheduleReminderAt } from "./notifications";
import { secureLocal } from "./secureLocal";

const OFFERED_KEY = "nilamind_post_crisis_checkin_offered_at";
const DECLINED_KEY = "nilamind_post_crisis_checkin_declined_at";

/** Engineering default (no citation) — midpoint of the plan's suggested 3-6h band. */
const CHECKIN_DELAY_MS = 4 * 60 * 60 * 1000;

/** Generic, content-free copy — never references "crisis" or any conversation detail. */
export const POST_CRISIS_CHECKIN_BODY = "Just checking in — how are you doing?";

/**
 * Schedule the opt-in check-in. ONLY call this after an explicit user tap ("yes, check in on me") — never
 * proactively or silently. Best-effort: a scheduling failure never blocks the crisis-dismiss flow it's
 * called from.
 */
export function offerPostCrisisCheckIn(): void {
  try {
    secureLocal.setItem(OFFERED_KEY, String(Date.now()));
  } catch {
    // best-effort — never block the dismiss flow on a storage failure
  }
  void scheduleReminderAt(new Date(Date.now() + CHECKIN_DELAY_MS), POST_CRISIS_CHECKIN_BODY);
}

/** Record that the user explicitly declined the check-in offer. Schedules nothing. */
export function declinePostCrisisCheckIn(): void {
  try {
    secureLocal.setItem(DECLINED_KEY, String(Date.now()));
  } catch {
    // best-effort
  }
}

/** Whether the user has ever opted into a post-crisis check-in (for settings/analytics, best-effort). */
export function isPostCrisisCheckInOffered(): boolean {
  try {
    return secureLocal.getItem(OFFERED_KEY) !== null;
  } catch {
    return false;
  }
}
