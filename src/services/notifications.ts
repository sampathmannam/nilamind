// Local notifications — minimal scheduling used by the Nila agent (AUTOPILOT Phase 6).
// Privacy: everything is local to the device; no push server, no network. Permission is requested
// at point of use (the first time the user asks for a reminder), per the privacy-first principle.
// Phase 7 expands this with compassionate streak reminders, quiet-hours enforcement, emoji, and
// gentle re-engagement; here we keep just enough to schedule a one-off reminder at a chosen time.

import { LocalNotifications } from "@capacitor/local-notifications";
import { withinQuietHours, getReminderPrefs } from "./reminders";

// Warm, low-pressure nudges (Phase 7). Never demanding, never guilt-laden — each is an invitation.
export const WARM_NUDGES = [
  "🌤️ A 2-minute check-in? No pressure.",
  "💙 How are you arriving today? I'm here when you're ready.",
  "🌱 One small moment for yourself — a quick check-in?",
  "🫧 Take a breath. Want to check in for a sec?",
  "☀️ Gentle nudge: how's today landing for you?",
  "🌙 Whenever it feels right — a soft check-in is here.",
];

// A single, stable id for the recurring daily nudge so re-syncing replaces (not stacks) it.
const DAILY_REMINDER_ID = 1001;

const pad = (n: number) => String(n).padStart(2, "0");
const timeToday = (h: number, m: number): Date => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
/** Pick a nudge that varies by day without needing stored state or randomness. */
function nudgeForToday(): string {
  const day = Math.floor(timeToday(0, 0).getTime() / 86400000);
  return WARM_NUDGES[day % WARM_NUDGES.length];
}

export interface ScheduleResult {
  ok: boolean;
  /** machine reason when !ok: "denied" (no permission) | "unavailable" (no plugin/web) | "error" */
  reason?: "denied" | "unavailable" | "error";
  /** when it will fire, for the spoken confirmation */
  at?: Date;
}

/** Ask for notification permission once, at the moment the user wants a reminder. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const check = await LocalNotifications.checkPermissions();
    if (check.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch {
    return false; // web / plugin missing
  }
}

/**
 * Schedule a one-off reminder to fire at `when`. Returns a structured result so the caller can
 * speak an honest confirmation (or explain why it couldn't be set) — never a silent failure.
 */
export async function scheduleReminderAt(when: Date, body: string, title = "NilaMind"): Promise<ScheduleResult> {
  if (!(when instanceof Date) || isNaN(when.getTime())) return { ok: false, reason: "error" };
  const granted = await ensureNotificationPermission();
  if (!granted) return { ok: false, reason: "denied", at: when };
  try {
    // Stable-ish id from the minute it fires (kept within 32-bit range for Android).
    const id = Math.floor((when.getTime() / 60000) % 2_000_000_000);
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title,
        body,
        schedule: { at: when, allowWhileIdle: true },
        smallIcon: "ic_stat_icon_config_sample",
      }],
    });
    return { ok: true, at: when };
  } catch {
    return { ok: false, reason: "unavailable", at: when };
  }
}

/** Convenience used by Phase 7 reminders — schedule only if outside the user's quiet hours. */
export async function scheduleIfAllowed(when: Date, body: string, title = "NilaMind"): Promise<ScheduleResult> {
  if (withinQuietHours(when)) return { ok: false, reason: "unavailable", at: when };
  return scheduleReminderAt(when, body, title);
}

/** Pretty 12-hour label for confirmations, e.g. "9:00 PM". */
export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export interface SyncResult { scheduled: boolean; at?: string; reason?: "disabled" | "denied" | "unavailable" }

/**
 * Reconcile the daily compassionate reminder with the user's prefs (AUTOPILOT Phase 7).
 * Frequency cap: exactly ONE gentle nudge per day (no nagging). The fire time is the start of the
 * user's chosen window, nudged out of quiet hours if they overlap. Idempotent — always cancels the
 * prior nudge first, so calling it on every settings change / app open is safe.
 */
export async function syncDailyReminders(opts: { request?: boolean } = { request: true }): Promise<SyncResult> {
  // Always clear the previous schedule so we never stack duplicates.
  try { await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }); } catch { /* */ }

  const prefs = getReminderPrefs();
  if (!prefs.enabled) return { scheduled: false, reason: "disabled" };

  // On startup (request:false) we only re-arm when permission is already granted — never prompt
  // out of the blue. From settings (request:true) we may ask, since the user just opted in.
  let granted = false;
  if (opts.request === false) {
    try { granted = (await LocalNotifications.checkPermissions()).display === "granted"; } catch { granted = false; }
  } else {
    granted = await ensureNotificationPermission();
  }
  if (!granted) return { scheduled: false, reason: "denied" };

  // Choose a fire time inside the window; if it lands in quiet hours, defer to quiet-hours end.
  let [h, m] = prefs.windowStart.split(":").map(Number);
  if (withinQuietHours(timeToday(h || 0, m || 0))) {
    [h, m] = prefs.quietEnd.split(":").map(Number);
  }
  h = Math.min(23, Math.max(0, h || 0));
  m = Math.min(59, Math.max(0, m || 0));

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: DAILY_REMINDER_ID,
        title: "NilaMind",
        body: nudgeForToday(),
        schedule: { on: { hour: h, minute: m }, allowWhileIdle: true }, // repeats daily
        smallIcon: "ic_stat_icon_config_sample",
      }],
    });
    return { scheduled: true, at: `${pad(h)}:${pad(m)}` };
  } catch {
    return { scheduled: false, reason: "unavailable" };
  }
}

/** Turn reminders off and clear the scheduled nudge. */
export async function clearDailyReminders(): Promise<void> {
  try { await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }); } catch { /* */ }
}
