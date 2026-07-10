// A tiny persisted "don't nudge" latch. When a crisis or elevation is detected we open a 24h window during
// which non-crisis notifications (EMA quick check-ins) must NOT be scheduled or fired — you never push a
// "how are you right now?" to someone mid-crisis (FEATURES_PLAN P6.4). Persisted via secureLocal because
// crisis/elevation are computed per-message and would otherwise never survive to the next notification sync.
// Mirrors proactiveEngine's timestamp-cooldown shape.

import { secureLocal } from "./secureLocal";

const SUPPRESS_KEY = "nilamind_notif_suppress_until";
const SUPPRESS_MS = 24 * 60 * 60 * 1000;

/** Open a 24h suppression window from `now`. Call at EVERY crisis-open and elevation-detection site. */
export function markSafetySuppression(now: number = Date.now()): void {
  try {
    secureLocal.setItem(SUPPRESS_KEY, String(now + SUPPRESS_MS));
  } catch {
    /* best-effort; a missed latch only means a nudge might fire — the sync also checks emaElevationSignal */
  }
}

/** True while inside the suppression window — non-crisis notifications must not be scheduled or fired. */
export function isSafetySuppressed(now: number = Date.now()): boolean {
  try {
    const raw = secureLocal.getItem(SUPPRESS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && now < until;
  } catch {
    return false;
  }
}
