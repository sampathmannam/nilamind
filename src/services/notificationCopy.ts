// Contextual daily-nudge copy selection (UX-9: Notification Polish).
//
// Extraction of the signal-adapted nudge engine so the copy + selection logic live in one named,
// independently-testable module (masterplan Phase UX-9: `notificationCopy.ts` + "Tests for contextual
// copy"). The call site (services/notifications.ts) reads the SOFT on-device signals and passes them in;
// this module stays pure + deterministic. Copy is SOFT and DATALESS: JITAI research says mistimed or
// irrelevant prompts backfire, and a notification must never state the data (no "you slept 3h") or alarm.

// Warm, default rotation — no signal matched.
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

export interface NudgeContext {
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
}

/** Choose the daily nudge from the person's current SOFT signals — sleep prodrome first (manic-first), then a
 *  flagged downward trend, then disengagement, elevation, lapse, milestone, streak, medication, else the warm
 *  rotation. Pure + deterministic (varies by dayIndex); dataless by design. The call site gates the inputs
 *  (inflection only when the user opted in). */
export function chooseNudge(ctx: NudgeContext): string {
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
