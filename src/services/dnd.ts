// User-initiated "Give me space" Do-Not-Disturb latch (FEATURES_PLAN P6.7). When active, non-critical Nila
// nudges (daily reminders, EMA quick check-ins, reply-ready pings) are suppressed until the window passes.
// Deliberately MIRRORS notificationSuppress.ts shape, but this is user-controlled and NEVER suppresses the
// §9 crisis path — a person in crisis must still be able to reach help. Stores a millisecond timestamp.
// Non-sensitive UI pref → plain localStorage (sync, pre-gate safe), consistent with reminders.ts.

import { ls } from "./storageUtils";
import type { I18nKey } from "./i18n";

const DND_KEY = "nilamind_dnd_until";

export interface DndDuration { label: string; hours: number; i18nKey: I18nKey; }

export const DND_DURATIONS: DndDuration[] = [
  { label: "3 hours", hours: 3, i18nKey: "dnd_3_hours" },
  { label: "Tonight", hours: 12, i18nKey: "dnd_tonight" },
  { label: "24 hours", hours: 24, i18nKey: "dnd_24_hours" },
  { label: "3 days", hours: 72, i18nKey: "dnd_3_days" },
  { label: "Until I turn it off", hours: 0, i18nKey: "dnd_until_off" },
];

/** Persist a DND window that ends at `untilMs`. `hours: 0` means "until turned off" (far-future timestamp). */
export function setDndUntil(untilMs: number): void {
  try { ls()?.setItem(DND_KEY, String(untilMs)); } catch { /* best-effort */ }
}

export function getDndUntil(): number | null {
  try {
    const raw = ls()?.getItem(DND_KEY);
    if (!raw) return null;
    const until = Number(raw);
    return Number.isFinite(until) ? until : null;
  } catch {
    return null;
  }
}

/** True while inside the user's DND window (0 = off, far-future = until manually cleared). */
export function isDndActive(now: number = Date.now()): boolean {
  const until = getDndUntil();
  if (until === null) return false;
  return now < until;
}

/** Convenience: open a DND window for `hours` (0 = until manually cleared). */
export function enableDndFor(hours: number): void {
  const until = hours > 0 ? Date.now() + hours * 60 * 60 * 1000 : Number.MAX_SAFE_INTEGER;
  setDndUntil(until);
}

export function clearDnd(): void {
  try { ls()?.removeItem(DND_KEY); } catch { /* best-effort */ }
}
