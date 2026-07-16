/**
 * Usage ceilings — gentle friction after N turns per day.
 *
 * Prevents unhealthy session length by showing a calming interstitial
 * when the user exceeds a configurable daily turn limit. The interstitial
 * is a nudge, not a hard block — the user can continue immediately.
 *
 * Research basis: SmartBipolar (2026) found passive monitoring alone has
 * zero effect; structured, time-limited engagement is the validated approach.
 * Unbounded chat sessions correlate with rumination, not recovery.
 */

import { secureLocal, appendToSecureArray } from "./secureLocal";

const STORAGE_KEY = "nilamind_daily_turns";
const DEFAULT_LIMIT = 30;

export interface UsageCeilingResult {
  status: "no_ceiling" | "ceiling_reached";
  turnsToday: number;
  turnsRemaining: number;
  message: string;
}

const CEILING_MESSAGES = [
  "You've been chatting with Nila for a while. A short break can help things settle — she'll be here when you're ready.",
  "Taking a moment to step away can be just as important as talking things through. Nila will keep your place.",
  "Sometimes the best thing after a good chat is a bit of quiet. Nila's here whenever you come back.",
  "A pause can let what you've shared sink in. Nila will be here — no rush.",
];

/**
 * Check if the user has hit their daily usage ceiling.
 */
export function checkUsageCeiling(turnsToday: number, limit = DEFAULT_LIMIT): UsageCeilingResult {
  const remaining = Math.max(0, limit - turnsToday);
  const status = turnsToday >= limit ? "ceiling_reached" : "no_ceiling";
  const message = status === "ceiling_reached"
    ? CEILING_MESSAGES[Math.abs(turnsToday) % CEILING_MESSAGES.length]
    : "";
  return { status, turnsToday, turnsRemaining: remaining, message };
}

/**
 * Record a turn for today.
 */
export function recordTurn(date?: string): void {
  const today = date ?? new Date().toISOString().split("T")[0];
  appendToSecureArray<{ date: string; count: number }>(STORAGE_KEY, { date: today, count: 1 });
}

/**
 * Get today's turn count from stored records.
 */
export function getTodayTurns(date?: string): number {
  const today = date ?? new Date().toISOString().split("T")[0];
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const arr: { date: string; count: number }[] = JSON.parse(raw);
    if (!Array.isArray(arr)) return 0;
    return arr.filter((r) => r.date === today).reduce((sum, r) => sum + (r.count || 0), 0);
  } catch {
    return 0;
  }
}
