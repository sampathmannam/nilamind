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
import { computeCompassionateStreak } from "./streaks";
import type { Medication } from "./medicationAdherence";
import { getEmaEnabled, getEmaFrequency } from "./emaPrefs";
import { planEmaFireTimes, emaElevationSignal, EMA_WINDOWS, type EmaWindow } from "./ema";
import { isSafetySuppressed, markSafetySuppression } from "./notificationSuppress";
import { isDndActive } from "./dnd";
import { peekRemaining, commitClaim, skipActive, recordNonCrisisSent } from "./notificationBudget";
import { isCategoryEnabled } from "./notificationCategories";
import { optimalFireHourNow } from "./notificationEngagement";

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

export const LAPSE_NUDGES = [
  "💙 Welcome back — no pressure. We pick up right where you are.",
  "🌱 Starting again is its own kind of strength. I'm here when you're ready.",
];

export const MILESTONE_NUDGES: Record<number, string> = {
  3: "🌟 3 days of showing up for yourself. That matters.",
  7: "🌟 7 days of checking in. That matters.",
  14: "🌟 Two weeks of showing up. You're building something steady.",
  30: "🌟 30 days. Not perfect — just present. That counts.",
};

export const STREAK_NUDGES = [
  "💙 Your streak is glowing. A quick check-in keeps it warm — only if it feels right.",
  "🌱 You're on a roll. No pressure; just wanted you to know it counts.",
];

/** Choose the daily nudge from the person's current SOFT signals — sleep prodrome first (manic-first), then a
 *  flagged downward trend, then compassionate streak state — else the warm rotation. Pure + deterministic
 *  (varies by dayIndex); dataless by design. The call site gates the inputs (inflection only when the user
 *  opted in). */
export function chooseNudge(ctx: {
  dayIndex: number;
  sleepFiring?: boolean;
  inflection?: "deterioration" | "improvement" | null;
  lapsed?: boolean;
  streak?: number;
  milestone?: number | null;
  activeToday?: boolean;
}): string {
  if (ctx.sleepFiring) return SLEEP_NUDGES[ctx.dayIndex % SLEEP_NUDGES.length];
  if (ctx.inflection === "deterioration") return CARE_NUDGES[ctx.dayIndex % CARE_NUDGES.length];
  if (ctx.lapsed) return LAPSE_NUDGES[ctx.dayIndex % LAPSE_NUDGES.length];
  if (ctx.milestone) return MILESTONE_NUDGES[ctx.milestone] ?? STREAK_NUDGES[ctx.dayIndex % STREAK_NUDGES.length];
  if ((ctx.streak ?? 0) >= 3 && ctx.activeToday) return STREAK_NUDGES[ctx.dayIndex % STREAK_NUDGES.length];
  return WARM_NUDGES[ctx.dayIndex % WARM_NUDGES.length];
}

// A single, stable id for the recurring daily nudge so re-syncing replaces (not stacks) it.
const DAILY_REMINDER_ID = 1001;

const pad = (n: number) => String(n).padStart(2, "0");
const timeToday = (h: number, m: number): Date => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
/** Midpoint hour of an EMA window, for P6.2: sorting windows by distance to the learned hour. */
const windowMid = (w: EmaWindow): number => {
  const [sh, sm] = w.start.split(":").map(Number);
  const [eh, em] = w.end.split(":").map(Number);
  return ((sh || 0) * 60 + (sm || 0) + (eh || 0) * 60 + (em || 0)) / 2 / 60;
};
/** Pick a nudge that varies by day and gently adapts to the person's current on-device signals (read here,
 *  never sent anywhere). Inflection is consulted only when the user has opted into inflection awareness. */
function nudgeForToday(): string {
  const dayIndex = Math.floor(timeToday(0, 0).getTime() / DAY_MS);
  const sleepFiring = !!selfReportSleepSignal()?.firing;
  const inflection = getInflectionEnabled() ? (topFireableSignal()?.direction ?? null) : null;
  const streak = computeCompassionateStreak();
  return chooseNudge({
    dayIndex,
    sleepFiring,
    inflection,
    lapsed: streak.lapsed,
    streak: streak.current,
    milestone: streak.milestone,
    activeToday: streak.activeToday,
  });
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
  } catch (e) {
    console.error("[notifications] ensureNotificationPermission failed:", e);
    return false; // web / plugin missing
  }
}

/**
 * Schedule a one-off reminder to fire at `when`. Returns a structured result so the caller can
 * speak an honest confirmation (or explain why it couldn't be set) — never a silent failure.
 */
export async function scheduleReminderAt(when: Date, body: string, title = "NilaMind", extra?: Record<string, unknown>): Promise<ScheduleResult> {
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
        // Content-free routing payload only (e.g. {view:'armed_checkin'}) — NEVER user text.
        ...(extra ? { extra } : {}),
      }],
    });
    return { ok: true, at: when };
  } catch (e) {
    console.error("[notifications] scheduleReminderAt failed:", e);
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
    if (isDndActive()) return; // P6.7: never ping someone who asked for space (never called for crisis replies anyway)
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
  } catch (e) {
    console.error("[notifications] notifyReplyReady failed:", e);
  }
}

/** Convenience used by Phase 7 reminders — schedule only if outside the user's quiet hours. */
export async function scheduleIfAllowed(when: Date, body: string, title = "NilaMind", extra?: Record<string, unknown>): Promise<ScheduleResult> {
  if (withinQuietHours(when)) return { ok: false, reason: "unavailable", at: when };
  if (isDndActive()) return { ok: false, reason: "unavailable", at: when }; // P6.7: user "give me space"
  return scheduleReminderAt(when, body, title, extra);
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
  try { await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }); } catch (e) { console.error("[notifications] syncDailyReminders cancel failed:", e); }

  // P6.4: the warm daily nudge is the same class of "how are you?" ping as EMA — never fire it inside a
  // crisis/elevation suppression window (medication reminders are exempt: health-critical, not a nudge).
  if (isSafetySuppressed()) return { scheduled: false, reason: "unavailable" };
  // P6.5: category toggle — the daily nudge is the "insight nudge" category.
  if (!isCategoryEnabled("insight")) return { scheduled: false, reason: "disabled" };
  // P6.7: the user asked for space — the daily nudge is exactly the kind of ping DND suppresses.
  if (isDndActive()) return { scheduled: false, reason: "unavailable" };
  // P6.3: frequency cap — the daily nudge is 1 of the MAX_NON_CRISIS_PER_DAY budget; hold if the cap is hit
  // or a progressive-cooldown window is active (crisis/medication paths are exempt and untouched above).
  if (skipActive() || peekRemaining() < 1) return { scheduled: false, reason: "unavailable" };

  const prefs = getReminderPrefs();
  if (!prefs.enabled) return { scheduled: false, reason: "disabled" };

  // On startup (request:false) we only re-arm when permission is already granted — never prompt
  // out of the blue. From settings (request:true) we may ask, since the user just opted in.
  let granted = false;
  if (opts.request === false) {
    try { granted = (await LocalNotifications.checkPermissions()).display === "granted"; } catch (e) { console.error("[notifications] checkPermissions failed:", e); granted = false; }
  } else {
    granted = await ensureNotificationPermission();
  }
  if (!granted) return { scheduled: false, reason: "denied" };

  // Choose a fire time inside the window; if it lands in quiet hours, defer to quiet-hours end.
  // P6.2: once we have a week of engagement signal, bias the fire hour toward when the person actually
  // responds (clamped to their chosen window so we never nudge outside their stated bounds).
  let [h, m] = prefs.windowStart.split(":").map(Number);
  const learned = optimalFireHourNow();
  if (learned !== null) {
    const [ws, we] = prefs.windowStart.split(":").map(Number);
    const inWindow = learned >= (ws || 0) && learned <= (we || 23);
    if (inWindow && !withinQuietHours(timeToday(learned, 0))) h = learned;
  }
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
    commitClaim(1); // P6.3: count the daily nudge against the per-day budget
    return { scheduled: true, at: `${pad(h)}:${pad(m)}` };
  } catch (e) {
    console.error("[notifications] syncDailyReminders schedule failed:", e);
    return { scheduled: false, reason: "unavailable" };
  }
}

/** Turn reminders off and clear the scheduled nudge. */
export async function clearDailyReminders(): Promise<void> {
  try { await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }); } catch (e) { console.error("[notifications] clearDailyReminders failed:", e); }
}

// P6.6 — weekly digest: a Sunday "week in review" notification, independent of the daily nudge. Distinct id
// space so it never collides with the daily reminder or EMA pings.
const WEEKLY_DIGEST_ID = 1002;

export async function syncWeeklyDigest(opts: { request?: boolean } = { request: false }): Promise<SyncResult> {
  try { await LocalNotifications.cancel({ notifications: [{ id: WEEKLY_DIGEST_ID }] }); } catch (e) { console.error("[notifications] syncWeeklyDigest cancel failed:", e); }
  // Crisis/elevation + DND + category + frequency-cap gates mirror the daily nudge — the digest is a nudge.
  if (isSafetySuppressed()) return { scheduled: false, reason: "unavailable" };
  if (!isCategoryEnabled("insight")) return { scheduled: false, reason: "disabled" };
  if (isDndActive()) return { scheduled: false, reason: "unavailable" };
  if (skipActive() || peekRemaining() < 1) return { scheduled: false, reason: "unavailable" };
  const prefs = getReminderPrefs();
  if (!prefs.weeklyDigest) return { scheduled: false, reason: "disabled" };

  let granted = false;
  if (opts.request === false) {
    try { granted = (await LocalNotifications.checkPermissions()).display === "granted"; } catch (e) { console.error("[notifications] checkPermissions failed:", e); granted = false; }
  } else {
    granted = await ensureNotificationPermission();
  }
  if (!granted) return { scheduled: false, reason: "denied" };

  let [h, m] = prefs.windowStart.split(":").map(Number);
  if (withinQuietHours(timeToday(h || 0, m || 0))) [h, m] = prefs.quietEnd.split(":").map(Number);
  h = Math.min(23, Math.max(0, h || 0));
  m = Math.min(59, Math.max(0, m || 0));

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: WEEKLY_DIGEST_ID,
        title: "NilaMind",
        body: "Your week in review is ready — tap to see how your mood and rhythm went.",
        schedule: { on: { weekday: 1, hour: h, minute: m }, allowWhileIdle: true }, // Sundays
        smallIcon: "ic_stat_icon_config_sample",
      }],
    });
    commitClaim(1); // counts against the per-day non-crisis budget
    return { scheduled: true, at: `${pad(h)}:${pad(m)}` };
  } catch (e) {
    console.error("[notifications] syncWeeklyDigest schedule failed:", e);
    return { scheduled: false, reason: "unavailable" };
  }
}

/** Turn the weekly digest off and clear its scheduled notification. */
export async function clearWeeklyDigest(): Promise<void> {
  try { await LocalNotifications.cancel({ notifications: [{ id: WEEKLY_DIGEST_ID }] }); } catch (e) { console.error("[notifications] clearWeeklyDigest failed:", e); }
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
  } catch (e) { console.error("[notifications] syncMedicationReminders cancel failed:", e); }

  let granted = false;
  try { granted = (await LocalNotifications.checkPermissions()).display === "granted"; } catch (e) { console.error("[notifications] syncMedicationReminders checkPermissions failed:", e); return; }
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
  try { await LocalNotifications.schedule({ notifications }); } catch (e) { console.error("[notifications] syncMedicationReminders schedule failed:", e); }
}

// ── EMA quick check-ins (Phase 3) ────────────────────────────────────────────────────────────────────
// Calendar-repeat (schedule.on:{hour,minute}) fixes the clock time every day and defeats the P3.1 "random
// intervals" requirement, so EMA uses ONE-SHOT (schedule.at) pings over a short horizon, re-rolled to fresh
// random times on every app open + settings change. Distinct id space; content-free body; never fires in quiet
// hours or while a crisis/elevation suppression window is active (P6.4 — never nudge someone mid-crisis).
const EMA_NOTIF_ID_BASE = 300_000;
const EMA_HORIZON_DAYS = 3;
const EMA_MAX_SLOTS = 3 * EMA_HORIZON_DAYS; // cancel range covers max frequency so lowering it strands no ids
const EMA_BODY = "🌤️ A quick check-in — how are you right now?"; // CONTENT-FREE, fixed

async function cancelEmaRange(): Promise<void> {
  try {
    const ids = Array.from({ length: EMA_MAX_SLOTS }, (_, i) => ({ id: EMA_NOTIF_ID_BASE + i }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch (e) { console.error("[notifications] cancelEmaRange failed:", e); }
}

/** Cancel every scheduled EMA ping. Called at crisis-open to immediately yank already-queued nudges. */
export async function clearEmaCheckins(): Promise<void> {
  await cancelEmaRange();
}

/**
 * Reconcile EMA quick-check-in notifications with the user's prefs. Idempotent: cancels the EMA id range FIRST,
 * then reschedules randomized one-shot pings over EMA_HORIZON_DAYS. Safe on every app open (request:false, never
 * prompts) and on settings change (request:true, may prompt). SAFETY: bails cancel-only (schedules nothing) when
 * disabled, permission-denied, a 24h crisis/elevation suppression latch is active, or today's EMA trend is
 * already elevating — you never push "how are you right now?" to someone mid-crisis (FEATURES_PLAN P6.4).
 */
export async function syncEmaCheckins(opts: { request?: boolean } = { request: true }): Promise<SyncResult> {
  await cancelEmaRange(); // clear before any decision so a bail leaves nothing scheduled

  if (!getEmaEnabled()) return { scheduled: false, reason: "disabled" };
  if (!isCategoryEnabled("checkin")) return { scheduled: false, reason: "disabled" }; // P6.5: category toggle
  if (isSafetySuppressed() || emaElevationSignal() !== "none") return { scheduled: false, reason: "unavailable" };
  if (isDndActive()) return { scheduled: false, reason: "unavailable" }; // P6.7: user "give me space"
  if (skipActive()) return { scheduled: false, reason: "unavailable" }; // P6.3: progressive-cooldown hold

  let granted = false;
  if (opts.request === false) {
    try { granted = (await LocalNotifications.checkPermissions()).display === "granted"; } catch (e) { console.error("[notifications] syncEmaCheckins checkPermissions failed:", e); granted = false; }
  } else {
    granted = await ensureNotificationPermission();
  }
  if (!granted) return { scheduled: false, reason: "denied" };

  // P6.2: bias EMA windows toward the learned responsive hour (windows nearest it get selected first).
  const learned = optimalFireHourNow();
  const emaWindows = learned !== null
    ? [...EMA_WINDOWS].sort((a, b) => Math.abs(windowMid(a) - learned) - Math.abs(windowMid(b) - learned))
    : EMA_WINDOWS;
  const times = planEmaFireTimes({ frequency: getEmaFrequency(), days: EMA_HORIZON_DAYS, isQuiet: withinQuietHours, windows: emaWindows });
  if (times.length === 0) return { scheduled: false, reason: "unavailable" };

  // P6.3: only the slots firing TODAY draw from the per-day budget; the cap is shared with the daily nudge.
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const todayCount = times.filter((t) => t.getTime() >= startOfToday.getTime()).length;
  if (peekRemaining() < todayCount) return { scheduled: false, reason: "unavailable" }; // cap reached for today

  try {
    await LocalNotifications.schedule({
      notifications: times.map((at, i) => ({
        id: EMA_NOTIF_ID_BASE + i,
        title: "NilaMind",
        body: EMA_BODY,
        schedule: { at, allowWhileIdle: true },
        smallIcon: "ic_stat_icon_config_sample",
        extra: { view: "ema_checkin" }, // content-free routing tag for the tap listener
      })),
    });
    commitClaim(todayCount); // P6.3: count today's EMA nudges against the per-day budget
    return { scheduled: true, at: times[0].toISOString() };
  } catch (e) {
    console.error("[notifications] syncEmaCheckins schedule failed:", e);
    return { scheduled: false, reason: "unavailable" };
  }
}

/**
 * P6.4 — never nudge someone mid-crisis. Latch the 24h no-nudge window AND immediately yank queued EMA + daily
 * nudges, so the guarantee holds no matter which surface detected the crisis (App crisis overlay, chat
 * elevation in localNila, or an inline tool-screen crisis stage). Medication reminders are intentionally NOT
 * cleared — they're health-critical, not a "how are you?" nudge. Call at EVERY §9/elevation entry point.
 */
export async function suppressNudgesForCrisis(): Promise<void> {
  markSafetySuppression();
  await Promise.allSettled([clearEmaCheckins(), clearDailyReminders()]);
}
