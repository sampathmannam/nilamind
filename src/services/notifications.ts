// Local notifications — minimal scheduling used by the Nila agent (AUTOPILOT Phase 6).
// Privacy: everything is local to the device; no push server, no network. Permission is requested
// at point of use (the first time the user asks for a reminder), per the privacy-first principle.
// Phase 7 expands this with compassionate streak reminders, quiet-hours enforcement, emoji, and
// gentle re-engagement; here we keep just enough to schedule a one-off reminder at a chosen time.

import { LocalNotifications } from "@capacitor/local-notifications";
import { withinQuietHours, getReminderPrefs } from "./reminders";
import { selfReportSleepSignal } from "./sleepInsight";
import { topFireableSignal } from "./nilaInflection";
import { getInflectionEnabled } from "./inflectionPrefs";
import { DAY_MS } from "./storageUtils";
import type { Medication } from "./medicationAdherence";

// Warm, low-pressure nudges (Phase 7). Never demanding, never guilt-laden — each is an invitation.
export const WARM_NUDGES = [
  "🌤️ A 2-minute check-in? No pressure.",
  "💙 How are you arriving today? I'm here when you're ready.",
  "🌱 One small moment for yourself — a quick check-in?",
  "🫧 Take a breath. Want to check in for a sec?",
  "☀️ Gentle nudge: how's today landing for you?",
  "🌙 Whenever it feels right — a soft check-in is here.",
];

// Signal-adapted nudges (2026-07-06 audit — the daily nudge was a static rotation blind to every signal).
// Kept SOFT and DATALESS: JITAI research says mistimed/irrelevant prompts backfire, and a notification must
// never state the data (no "you slept 3h") or alarm.
export const SLEEP_NUDGES = [
  "🌙 How's rest been treating you? I'm here if you'd like to wind down together.",
  "🌙 A gentle thought — how are you resting? We can wind down whenever you like.",
];
export const CARE_NUDGES = [
  "💙 Just thinking of you. However today is landing, I'm here.",
  "💙 Checking in gently — I'm here for you today if you'd like to talk.",
];

/** Choose the daily nudge from the person's current SOFT signals — sleep prodrome first (manic-first), then a
 *  flagged downward trend — else the warm rotation. Pure + deterministic (varies by dayIndex); dataless by
 *  design. The call site gates the inputs (inflection only when the user opted in). */
export function chooseNudge(ctx: { dayIndex: number; sleepFiring?: boolean; inflection?: "deterioration" | "improvement" | null }): string {
  if (ctx.sleepFiring) return SLEEP_NUDGES[ctx.dayIndex % SLEEP_NUDGES.length];
  if (ctx.inflection === "deterioration") return CARE_NUDGES[ctx.dayIndex % CARE_NUDGES.length];
  return WARM_NUDGES[ctx.dayIndex % WARM_NUDGES.length];
}

// A single, stable id for the recurring daily nudge so re-syncing replaces (not stacks) it.
const DAILY_REMINDER_ID = 1001;

const pad = (n: number) => String(n).padStart(2, "0");
const timeToday = (h: number, m: number): Date => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
/** Pick a nudge that varies by day and gently adapts to the person's current on-device signals (read here,
 *  never sent anywhere). Inflection is consulted only when the user has opted into inflection awareness. */
function nudgeForToday(): string {
  const dayIndex = Math.floor(timeToday(0, 0).getTime() / DAY_MS);
  const sleepFiring = !!selfReportSleepSignal()?.firing;
  const inflection = getInflectionEnabled() ? (topFireableSignal()?.direction ?? null) : null;
  return chooseNudge({ dayIndex, sleepFiring, inflection });
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

// Stable id for the "Nila replied" ping so a new one replaces (not stacks) the last.
const REPLY_READY_ID = 1002;

/**
 * Fire an immediate, gentle ping that Nila's reply is ready — the passive→active "reaches out" piece.
 * Called when a reply finishes while the app is BACKGROUNDED (the person left mid-generation), so they
 * know to come back. Deliberately CONTENT-FREE: just "Nila replied", never the message text (privacy —
 * a lock-screen must not leak a mental-health conversation). Best-effort and NON-prompting: it only fires
 * if notification permission is ALREADY granted (prompting from a background completion would be jarring
 * and usually impossible); otherwise it's a silent no-op. Never called for crisis or offline replies.
 */
export async function notifyReplyReady(): Promise<void> {
  try {
    const granted = (await LocalNotifications.checkPermissions()).display === "granted";
    if (!granted) return; // never prompt here; silently skip if notifications aren't already enabled
    await LocalNotifications.schedule({
      notifications: [{
        id: REPLY_READY_ID,
        title: "NilaMind",
        body: "Nila replied — she's here whenever you're ready. 💙",
        schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true }, // ~immediate, fires even in doze
        smallIcon: "ic_stat_icon_config_sample",
      }],
    });
  } catch {
    /* web / plugin missing / permission race — best-effort, never throws into the reply path */
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

// Medication reminders use a distinct id space so they don't collide with the daily nudge.
const MED_REMINDER_ID_BASE = 200_000;

/** Convert a stable string id to a 32-bit numeric notification id (deterministic). */
function medNotificationId(medId: string, offset = 0): number {
  let hash = 0;
  for (let i = 0; i < medId.length; i++) {
    hash = (hash << 5) - hash + medId.charCodeAt(i);
    hash |= 0;
  }
  return MED_REMINDER_ID_BASE + ((Math.abs(hash) + offset) % 100_000);
}

/** Parse "HH:MM" into [hour, minute], clamped to valid ranges. */
function parseTime(time: string): [number, number] {
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  return [Math.min(23, Math.max(0, Number.isNaN(h) ? 0 : h)), Math.min(59, Math.max(0, Number.isNaN(m) ? 0 : m))];
}

/**
 * Sync recurring local notifications for active daily/twice-daily medications. Idempotent: clears prior
 * med reminders first, then re-schedules from the current list. Never prompts for permission — callers
 * should request permission when the user opts in.
 */
export async function syncMedicationReminders(meds: Medication[]): Promise<void> {
  // Always clear previous med reminders so deletions/changes don't leave stale pings.
  try {
    const cancelIds: number[] = [];
    for (const med of meds) {
      cancelIds.push(medNotificationId(med.id));
      if (med.schedule === "twice_daily") cancelIds.push(medNotificationId(med.id, 1));
    }
    // Also clear any prior med ids by covering the known id range once — cheap and safe.
    await LocalNotifications.cancel({ notifications: cancelIds.map((id) => ({ id })) });
  } catch { /* plugin may be unavailable */ }

  let granted = false;
  try { granted = (await LocalNotifications.checkPermissions()).display === "granted"; } catch { return; }
  if (!granted) return;

  const notifications: { id: number; title: string; body: string; schedule: { on: { hour: number; minute: number }; allowWhileIdle: true }; smallIcon: string }[] = [];
  for (const med of meds) {
    if (!med.active) continue;
    const [h, m] = parseTime(med.time);
    const body = `Time for ${med.name} ${med.dose}`.trim();
    notifications.push({ id: medNotificationId(med.id), title: "NilaMind", body, schedule: { on: { hour: h, minute: m }, allowWhileIdle: true }, smallIcon: "ic_stat_icon_config_sample" });
    if (med.schedule === "twice_daily") {
      // Space second dose 12 hours later, wrapping around midnight.
      const h2 = (h + 12) % 24;
      notifications.push({ id: medNotificationId(med.id, 1), title: "NilaMind", body, schedule: { on: { hour: h2, minute: m }, allowWhileIdle: true }, smallIcon: "ic_stat_icon_config_sample" });
    }
  }
  if (notifications.length === 0) return;
  try { await LocalNotifications.schedule({ notifications }); } catch { /* */ }
}
