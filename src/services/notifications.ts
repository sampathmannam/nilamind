// Local notifications — minimal scheduling used by the Nila agent (AUTOPILOT Phase 6).
// Privacy: everything is local to the device; no push server, no network. Permission is requested
// at point of use (the first time the user asks for a reminder), per the privacy-first principle.
// Phase 7 expands this with compassionate streak reminders, quiet-hours enforcement, emoji, and
// gentle re-engagement; here we keep just enough to schedule a one-off reminder at a chosen time.

import { LocalNotifications } from "@capacitor/local-notifications";
import { withinQuietHours, getReminderPrefs } from "./reminders";
import { selfReportSleepSignal } from "./sleepInsight";
import { getWindDownReminder } from "./windDown";
import { topFireableSignal } from "./nilaInflection";
import { getInflectionEnabled } from "./inflectionPrefs";
import { DAY_MS, localDateKey } from "./storageUtils";
import { computeCompassionateStreak } from "./streaks";
import type { Medication } from "./medicationAdherence";
import { getEmaEnabled, getEmaFrequency } from "./emaPrefs";
import { planEmaFireTimes, emaElevationSignal, EMA_WINDOWS, type EmaWindow } from "./ema";
import { isSafetySuppressed, markSafetySuppression } from "./notificationSuppress";
import { isDndActive } from "./dnd";
import { peekRemaining, commitClaim, skipActive, recordNonCrisisSent } from "./notificationBudget";
import { isCategoryEnabled } from "./notificationCategories";
import { extractWeeklyFacts } from "./weeklySynthesis";
import { loadMoodHistory } from "./moodHistory";
import { secureLocal } from "./secureLocal";
import { getDiaryReminderPrefs } from "./diaryReminderPrefs";

// ── Proactive insight notification (Retention mechanic) ───────────────────────
// Surfaces one pattern insight per week as a notification.
// "Nila noticed: on days you got 7k+ steps, your mood was 2 points better."
// Research: Woebot proactively offers CBT-informed insights during conversations.
// We push one insight per week so the user feels the app is learning about them.
const INSIGHT_NOTIF_ID = 1004;

function contextualInsightBody(): string | null {
  try {
    const mood = loadMoodHistory();
    if (mood.length < 7) return null;

    // Compute a simple insight from mood data
    const recent7 = mood.slice(-7);
    const older7 = mood.slice(-14, -7);
    if (recent7.length < 3 || older7.length < 3) return null;

    const recentAvg = recent7.reduce((s, m) => s + (m.intensity ?? 5), 0) / recent7.length;
    const olderAvg = older7.reduce((s, m) => s + (m.intensity ?? 5), 0) / older7.length;
    const delta = recentAvg - olderAvg;

    // Check sleep correlation
    const withSleep = mood.filter((m) => m.sleepHours != null);
    if (withSleep.length >= 5) {
      const shortSleep = withSleep.filter((m) => m.sleepHours! < 6);
      const goodSleep = withSleep.filter((m) => m.sleepHours! >= 7 && m.sleepHours! <= 9);
      if (shortSleep.length >= 2 && goodSleep.length >= 2) {
        const shortAvg = shortSleep.reduce((s, m) => s + (m.intensity ?? 5), 0) / shortSleep.length;
        const goodAvg = goodSleep.reduce((s, m) => s + (m.intensity ?? 5), 0) / goodSleep.length;
        if (shortAvg - goodAvg > 1.5) {
          return "Nila noticed: on days you slept less, your distress tended to be higher. Sleep might be worth protecting.";
        }
      }
    }

    if (delta < -1.5) {
      return "Nila noticed: your mood has been trending better this week compared to last. Whatever you're doing, it's working.";
    }
    if (delta > 1.5) {
      return "Nila noticed: things have been harder this week. You don't have to figure it out alone — a quick check-in might help.";
    }

    // Check streak
    const streakDays = mood.length >= 7 ? 7 : mood.length;
    if (streakDays >= 5) {
      return `Nila noticed: you've been checking in consistently. That kind of self-awareness builds over time.`;
    }

    return null;
  } catch {
    return null;
  }
}

// ── Contextual weekly digest (Retention mechanic) ────────────────────────────
// Generates a warm, personalized notification body from weekly facts.
// "Finch sends a weekly report that feels like a letter from a friend" — we do the same.
function contextualWeeklyBody(): string {
  try {
    const f = extractWeeklyFacts();
    const parts: string[] = [];

    if (f.checkinCount >= 5) {
      parts.push(`${f.checkinCount} check-ins this week — you showed up.`);
    } else if (f.checkinCount >= 2) {
      parts.push(`${f.checkinCount} check-ins this week.`);
    }

    if (f.streak >= 7) {
      parts.push(`${f.streak}-day streak and counting.`);
    } else if (f.streak >= 3) {
      parts.push(`${f.streak} days in a row.`);
    }

    if (f.episodes > 0) {
      parts.push(`${f.episodes} episode${f.episodes > 1 ? "s" : ""} logged — that takes courage.`);
    }

    if (f.skillsUsed.length > 0) {
      parts.push(`Skills used: ${f.skillsUsed.slice(0, 2).join(", ")}.`);
    }

    if (parts.length === 0) {
      return "Your week in review is ready — tap to see how things went.";
    }

    return parts.join(" ") + " Tap for your full week in review.";
  } catch {
    return "Your week in review is ready — tap to see how your mood and rhythm went.";
  }
}

// ── Android notification channels (Phase 20) ──────────────────────────────────
// Mirrors the channels created in MainActivity.java. Passed via channelId to every
// LocalNotifications.schedule() call so the OS can apply per-channel importance,
// sound, and badge policies defined natively.
export const CHANNEL = {
  gentle: "nila_gentle",
  medication: "nila_medication",
  reply: "nila_reply",
  ema: "nila_ema",
  crisis: "nila_crisis",
} as const;

// ── Notification action types (Phase 20) ──────────────────────────────────────
// Capacitor action types render as inline buttons in the expanded notification
// on Android. The "Snooze" type gives a gentle pause; "CheckIn" drives the EMA flow.
// Each schedule call sets actionTypeId to one of these.
export const ACTION_TYPE = {
  snooze: "NILA_SNOOZE",
  checkIn: "NILA_CHECKIN",
  medication: "NILA_MEDICATION",
  dismissOnly: "NILA_DISMISS",
} as const;

/** Call once at app start to register the action type templates. Idempotent. */
export async function registerNotificationActionTypes(): Promise<void> {
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: ACTION_TYPE.snooze,
          actions: [
            { id: "snooze_1h", title: "Be back in 1h" },
            { id: "snooze_3h", title: "Pause for 3h" },
          ],
        },
        {
          id: ACTION_TYPE.checkIn,
          actions: [
            { id: "check_in", title: "Check in" },
            { id: "dismiss", title: "Not now" },
          ],
        },
        {
          id: ACTION_TYPE.medication,
          actions: [
            { id: "taken", title: "Taken ✓" },
            { id: "remind_30m", title: "Remind in 30m" },
          ],
        },
        {
          id: ACTION_TYPE.dismissOnly,
          actions: [
            { id: "dismiss", title: "Dismiss" },
          ],
        },
      ],
    });
  } catch (e) {
    console.error("[notifications] registerActionTypes failed:", e);
  }
}
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

// Retention: medication adherence nudges (for users with active meds who are missing doses)
export const MEDICATION_NUDGES = [
  "💊 A gentle reminder — your medications are part of your routine. No pressure.",
  "💙 Taking care of yourself includes the small things. Your meds are waiting.",
];

// Retention: elevation signal nudges (for users with rising energy — bipolar prodrome)
export const ELEVATION_NUDGES = [
  "⚡ Your energy has been rising lately — worth checking in with how you're feeling.",
  "🌤️ Things seem to be picking up. A quick check-in can help you stay grounded.",
];

// Retention: disengagement nudges (for users drifting away — 7+ days inactive)
export const DISENGAGEMENT_NUDGES = [
  "💙 It's been a while — no judgment. I'm here whenever you're ready.",
  "🌱 Taking a break is okay. When you're ready, I'll be here.",
  "💙 Missing you. No pressure — just know the door is open.",
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
  medicationMissed?: boolean;
  elevationSignal?: boolean;
  disengaged?: boolean;
}): string {
  // Priority cascade: sleep > deterioration > disengagement > elevation > lapse > milestone > streak > medication > warm
  if (ctx.sleepFiring) return SLEEP_NUDGES[ctx.dayIndex % SLEEP_NUDGES.length];
  if (ctx.inflection === "deterioration") return CARE_NUDGES[ctx.dayIndex % CARE_NUDGES.length];
  if (ctx.disengaged) return DISENGAGEMENT_NUDGES[ctx.dayIndex % DISENGAGEMENT_NUDGES.length];
  if (ctx.elevationSignal) return ELEVATION_NUDGES[ctx.dayIndex % ELEVATION_NUDGES.length];
  if (ctx.lapsed) return LAPSE_NUDGES[ctx.dayIndex % LAPSE_NUDGES.length];
  if (ctx.milestone) return MILESTONE_NUDGES[ctx.milestone] ?? STREAK_NUDGES[ctx.dayIndex % STREAK_NUDGES.length];
  if ((ctx.streak ?? 0) >= 3 && ctx.activeToday) return STREAK_NUDGES[ctx.dayIndex % STREAK_NUDGES.length];
  if (ctx.medicationMissed) return MEDICATION_NUDGES[ctx.dayIndex % MEDICATION_NUDGES.length];
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

  // Retention: check medication adherence
  const medicationMissed = (() => {
    try {
      const raw = secureLocal.getItem("nilamind_medication_logs");
      if (!raw) return false;
      const logs = JSON.parse(raw);
      const today = localDateKey();
      const todayLogs = Array.isArray(logs) ? logs.filter((l: any) => l?.date === today) : [];
      const todayMeds = (() => {
        try {
          const mRaw = secureLocal.getItem("nilamind_medications");
          return mRaw ? JSON.parse(mRaw).filter((m: any) => m?.active) : [];
        } catch { return []; }
      })();
      return todayMeds.length > 0 && todayLogs.length < todayMeds.length;
    } catch { return false; }
  })();

  // Retention: check disengagement (7+ days since last activity)
  const disengaged = streak.lapsed && (streak.current === 0);

  // W1 (2026-07-17 QA): a sustained EMA up-trajectory today should surface the manic-first elevation nudge.
  // chooseNudge already ranks it (sleep > deterioration > disengagement > elevation > …); it was simply
  // never passed, so ELEVATION_NUDGES was dead. emaElevationSignal() is dataless + on-device.
  const elevationSignal = emaElevationSignal() !== "none";

  return chooseNudge({
    dayIndex,
    sleepFiring,
    inflection,
    lapsed: streak.lapsed,
    streak: streak.current,
    milestone: streak.milestone,
    activeToday: streak.activeToday,
    medicationMissed,
    disengaged,
    elevationSignal,
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
        channelId: (extra as any)?.channelId || CHANNEL.gentle,
        actionTypeId: ACTION_TYPE.snooze,
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
const REPLY_READY_ID = 1003;

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
        schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true },
        smallIcon: "ic_stat_icon_config_sample",
        channelId: CHANNEL.reply,
        actionTypeId: ACTION_TYPE.dismissOnly,
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

/** The shared gate for every gentle "insight" nudge (daily reminder + weekly digest): never fire inside a
 *  crisis/elevation suppression window, when the insight category is off, during DND, or once the per-day
 *  non-crisis budget is spent. Returns the failing SyncResult, or null to proceed. Consolidated 2026-07-17
 *  QA — the daily/weekly copies were byte-identical duplicates, exactly the drift surface where W1/W2 hid. */
function insightNudgeGate(): SyncResult | null {
  if (isSafetySuppressed()) return { scheduled: false, reason: "unavailable" };
  if (!isCategoryEnabled("insight")) return { scheduled: false, reason: "disabled" };
  if (isDndActive()) return { scheduled: false, reason: "unavailable" };
  if (skipActive() || peekRemaining() < 1) return { scheduled: false, reason: "unavailable" };
  return null;
}

/** Resolve notification permission for a sync. On startup (request === false) only re-arm when permission is
 *  ALREADY granted — never prompt out of the blue; from settings (request !== false) we may prompt. Returns a
 *  "denied" SyncResult when the grant is missing, or null to proceed. */
async function resolveNotifGrant(request: boolean | undefined): Promise<SyncResult | null> {
  let granted = false;
  if (request === false) {
    try { granted = (await LocalNotifications.checkPermissions()).display === "granted"; }
    catch (e) { console.error("[notifications] checkPermissions failed:", e); granted = false; }
  } else {
    granted = await ensureNotificationPermission();
  }
  return granted ? null : { scheduled: false, reason: "denied" };
}

/**
 * Reconcile the daily compassionate reminder with the user's prefs (AUTOPILOT Phase 7).
 * Frequency cap: exactly ONE gentle nudge per day (no nagging). The fire time is the start of the
 * user's chosen window, nudged out of quiet hours if they overlap. Idempotent — always cancels the
 * prior nudge first, so calling it on every settings change / app open is safe.
 */
export async function syncDailyReminders(opts: { request?: boolean } = { request: true }): Promise<SyncResult> {
  // Always clear the previous schedule so we never stack duplicates.
  try { await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }); } catch (e) { console.error("[notifications] syncDailyReminders cancel failed:", e); }

  // P6.3–6.7: the warm daily nudge is a gentle "insight" ping — held during crisis/elevation suppression,
  // when the category is off, during DND, or once the per-day non-crisis budget is spent.
  const gate = insightNudgeGate();
  if (gate) return gate;

  const prefs = getReminderPrefs();
  if (!prefs.enabled) return { scheduled: false, reason: "disabled" };

  const grant = await resolveNotifGrant(opts.request);
  if (grant) return grant;

  // Choose a fire time inside the window; if it lands in quiet hours, defer to quiet-hours end.
  // P6.2: once we have a week of engagement signal, bias the fire hour toward when the person actually
  // responds (clamped to their chosen window so we never nudge outside their stated bounds).
  let [h, m] = prefs.windowStart.split(":").map(Number);
  const learned = optimalFireHourNow();
  if (learned !== null) {
    // W2 (2026-07-17 QA): the upper bound must come from windowEND's HOUR. The old code destructured
    // windowStart for both, so `we` was the START's minutes (usually 0) → the `<= 23` clamp was a no-op and
    // the learned hour could escape the user's stated window (e.g. a 22:00 nudge on a 10:00–20:00 window).
    const [ws] = prefs.windowStart.split(":").map(Number);
    const [we] = prefs.windowEnd.split(":").map(Number);
    const inWindow = learned >= (ws || 0) && learned <= (we ?? 23);
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
        channelId: CHANNEL.gentle,
        actionTypeId: ACTION_TYPE.snooze,
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

// ── Diary journal reminder ─────────────────────────────────────────────────────
// A single, user-CHOSEN daily time to journal (diaryReminderPrefs.ts) — OFF by default, no streak, no
// penalty copy. Deliberately simpler than syncDailyReminders (no learned-hour bias, no window): the
// user picked one exact time, and that's the time we honor, nudged out of quiet hours only.
const DIARY_REMINDER_ID = 1005;

export async function syncDiaryReminder(opts: { request?: boolean } = { request: true }): Promise<SyncResult> {
  try { await LocalNotifications.cancel({ notifications: [{ id: DIARY_REMINDER_ID }] }); } catch (e) { console.error("[notifications] syncDiaryReminder cancel failed:", e); }

  if (isSafetySuppressed()) return { scheduled: false, reason: "unavailable" };
  if (!isCategoryEnabled("diary")) return { scheduled: false, reason: "disabled" };
  if (isDndActive()) return { scheduled: false, reason: "unavailable" };
  if (skipActive() || peekRemaining() < 1) return { scheduled: false, reason: "unavailable" };

  const prefs = getDiaryReminderPrefs();
  if (!prefs.enabled) return { scheduled: false, reason: "disabled" };

  let granted = false;
  if (opts.request === false) {
    try { granted = (await LocalNotifications.checkPermissions()).display === "granted"; } catch (e) { console.error("[notifications] checkPermissions failed:", e); granted = false; }
  } else {
    granted = await ensureNotificationPermission();
  }
  if (!granted) return { scheduled: false, reason: "denied" };

  let [h, m] = prefs.time.split(":").map(Number);
  if (withinQuietHours(timeToday(h || 0, m || 0))) {
    [h, m] = getReminderPrefs().quietEnd.split(":").map(Number);
  }
  h = Math.min(23, Math.max(0, h || 0));
  m = Math.min(59, Math.max(0, m || 0));

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: DIARY_REMINDER_ID,
        title: "NilaMind",
        body: "A quiet moment to write, if you'd like one — no pressure either way.",
        schedule: { on: { hour: h, minute: m }, allowWhileIdle: true }, // repeats daily
        smallIcon: "ic_stat_icon_config_sample",
        channelId: CHANNEL.gentle,
        actionTypeId: ACTION_TYPE.dismissOnly,
      }],
    });
    commitClaim(1); // counts against the same per-day non-crisis nudge budget as the other gentle nudges
    return { scheduled: true, at: `${pad(h)}:${pad(m)}` };
  } catch (e) {
    console.error("[notifications] syncDiaryReminder schedule failed:", e);
    return { scheduled: false, reason: "unavailable" };
  }
}

export async function clearDiaryReminder(): Promise<void> {
  try { await LocalNotifications.cancel({ notifications: [{ id: DIARY_REMINDER_ID }] }); } catch (e) { console.error("[notifications] clearDiaryReminder failed:", e); }
}

// P6.6 — weekly digest: a Sunday "week in review" notification, independent of the daily nudge. Distinct id
// space so it never collides with the daily reminder or EMA pings.
const WEEKLY_DIGEST_ID = 1002;

export async function syncWeeklyDigest(opts: { request?: boolean } = { request: false }): Promise<SyncResult> {
  try { await LocalNotifications.cancel({ notifications: [{ id: WEEKLY_DIGEST_ID }] }); } catch (e) { console.error("[notifications] syncWeeklyDigest cancel failed:", e); }
  // Crisis/elevation + DND + category + frequency-cap gates mirror the daily nudge — the digest is a nudge.
  const gate = insightNudgeGate();
  if (gate) return gate;
  const prefs = getReminderPrefs();
  if (!prefs.weeklyDigest) return { scheduled: false, reason: "disabled" };

  const grant = await resolveNotifGrant(opts.request);
  if (grant) return grant;

  let [h, m] = prefs.windowStart.split(":").map(Number);
  if (withinQuietHours(timeToday(h || 0, m || 0))) [h, m] = prefs.quietEnd.split(":").map(Number);
  h = Math.min(23, Math.max(0, h || 0));
  m = Math.min(59, Math.max(0, m || 0));

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: WEEKLY_DIGEST_ID,
        title: "NilaMind",
        body: contextualWeeklyBody(),
        schedule: { on: { weekday: 1, hour: h, minute: m }, allowWhileIdle: true },
        smallIcon: "ic_stat_icon_config_sample",
        channelId: CHANNEL.gentle,
        actionTypeId: ACTION_TYPE.snooze,
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

  const notifications: { id: number; title: string; body: string; schedule: { on: { hour: number; minute: number }; allowWhileIdle: true }; smallIcon: string; channelId: string; actionTypeId: string; extra: { medId: string } }[] = [];
  for (const med of meds) {
    if (!med.active) continue;
    const [h, m] = parseTime(med.time);
    const body = `Time for ${med.name} ${med.dose}`.trim();
    notifications.push({ id: medNotificationId(med.id), title: "NilaMind", body, schedule: { on: { hour: h, minute: m }, allowWhileIdle: true }, smallIcon: "ic_stat_icon_config_sample", channelId: CHANNEL.medication, actionTypeId: ACTION_TYPE.medication, extra: { medId: med.id } });
    if (med.schedule === "twice_daily") {
      const h2 = (h + 12) % 24;
      notifications.push({ id: medNotificationId(med.id, 1), title: "NilaMind", body, schedule: { on: { hour: h2, minute: m }, allowWhileIdle: true }, smallIcon: "ic_stat_icon_config_sample", channelId: CHANNEL.medication, actionTypeId: ACTION_TYPE.medication, extra: { medId: med.id } });
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
        channelId: CHANNEL.ema,
        actionTypeId: ACTION_TYPE.checkIn,
        group: "nila_ema",
        groupSummary: i === 0, // first one acts as the group summary
        extra: { view: "ema_checkin" },
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

// ── Weekly insight notification (Retention mechanic) ──────────────────────────
// Surfaces one pattern insight per week. Fires on Wednesdays (mid-week, not competing
// with the Sunday digest). Respects all safety gates.
export async function syncInsightNotification(): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: INSIGHT_NOTIF_ID }] });
  } catch { /* ok */ }

  const body = contextualInsightBody();
  if (!body) return;

  try {
    const perms = await LocalNotifications.checkPermissions();
    if (perms.display !== "granted") return;
  } catch { return; }

  if (isSafetySuppressed() || isDndActive()) return;
  if (!isCategoryEnabled("insight")) return;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: INSIGHT_NOTIF_ID,
        title: "NilaMind",
        body,
        schedule: { on: { weekday: 4, hour: 10, minute: 0 }, allowWhileIdle: true }, // Wednesday 10am
        smallIcon: "ic_stat_icon_config_sample",
        channelId: CHANNEL.gentle,
        actionTypeId: ACTION_TYPE.snooze,
      }],
    });
  } catch (e) {
    console.error("[notifications] syncInsightNotification failed:", e);
  }
}

// ── Wind-down reminder sync (Phase 20) ────────────────────────────────────────
// Reconciles the nightly wind-down nudge on every app open (idempotent).
// Was previously only scheduled on explicit toggle; now catches boot/upgrade too.
const WIND_DOWN_ID = 5001;
export async function syncWindDownReminder(): Promise<void> {
  const wd = getWindDownReminder();
  try {
    await LocalNotifications.cancel({ notifications: [{ id: WIND_DOWN_ID }] });
  } catch { /* ok if not yet scheduled */ }

  if (!wd.enabled) return;
  const [h, m] = wd.time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: WIND_DOWN_ID,
        title: "NilaMind",
        body: "Time to wind down — a few minutes to settle your body and let the day rest.",
        schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
        smallIcon: "ic_stat_icon_config_sample",
        channelId: CHANNEL.gentle,
        actionTypeId: ACTION_TYPE.snooze,
        extra: { view: "winddown" },
      }],
    });
  } catch (e) {
    console.error("[notifications] syncWindDownReminder failed:", e);
  }
}
