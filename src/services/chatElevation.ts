import { secureLocal } from "./secureLocal";
import type { ElevationLevel } from "./elevationGuard";

// A small persisted cool-down latch for CHAT-detected elevation, mirroring notificationSuppress.ts. The
// deterministic elevationGuard (detectElevationRisk) already fires on manic markers in the user's typed
// messages to steer Nila's WORDS; this latch lets that same signal also quiet the visible UI (the orb
// settles, the home thins) — the pixel-level half of the manic-first response. EMA elevation is a live,
// day-scoped signal folded directly in getUserState; chat elevation is event-driven, so it needs a latch
// with a cool-down instead.
//
// Cool-down = 6h: long enough to span an active elevated stretch so the home doesn't flicker back to a
// busy/stimulating state between messages, short enough to relax the same day if the person settles and
// never formally checks in. ANY check-in clears it immediately (clearChatElevation, from the check-in
// handler) — a fresh explicit self-report supersedes the inferred signal. detectElevationRisk is
// high-precision (specific manic markers), so this only latches on real signals.
const KEY = "nilamind_chat_elevation";
export const CHAT_ELEVATION_WINDOW_MS = 6 * 60 * 60 * 1000;

interface Latch {
  level: ElevationLevel;
  at: number;
}

/** Persist a chat-detected elevation. No-op for "none". Refreshes the timestamp on every qualifying turn. */
export function noteChatElevation(level: ElevationLevel, now: number = Date.now()): void {
  if (level === "none") return;
  try {
    secureLocal.setItem(KEY, JSON.stringify({ level, at: now } satisfies Latch));
  } catch {
    /* best-effort — a missed latch only means the UI doesn't settle from chat this turn */
  }
}

/** The still-active chat-elevation level, or "none" if absent / expired / malformed. */
export function chatElevationSignal(now: number = Date.now()): ElevationLevel {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return "none";
    const l = JSON.parse(raw) as Latch;
    if (!l || (l.level !== "elevated" && l.level !== "high") || typeof l.at !== "number") return "none";
    if (now - l.at >= CHAT_ELEVATION_WINDOW_MS) return "none";
    return l.level;
  } catch {
    return "none";
  }
}

/** Clear the latch — called on any check-in so a fresh explicit self-report relaxes the interface. */
export function clearChatElevation(): void {
  try {
    secureLocal.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
