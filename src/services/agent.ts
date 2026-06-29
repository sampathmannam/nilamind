// Nila agent — turns plain language into in-app actions (AUTOPILOT Phase 6).
//
// Privacy-first & on-device: intent recognition is fully local (no text leaves the phone for this).
// Only when a message ISN'T an actionable command do we fall through to the conversational AI
// (Nila's on-device model) in AiCoachScreen. The agent can: log a mood, set a reminder, read the dashboard back,
// and open any screen. Replies are short, warm, and voiced by the caller.
//
// Design: `classify()` is PURE (no side effects) so it's unit-testable; `runAgent()` is the thin
// async executor that performs the side effect (save / schedule) and returns a spoken confirmation.

import { secureLocal } from "./secureLocal";
import { computeCompassionateStreak } from "./streaks";
import { scheduleReminderAt, formatTime } from "./notifications";
import { mapEmotion, parseIntensity } from "./emotionParse";
import { CheckInEntry } from "../types";

export type AgentView =
  | "dashboard" | "your_data" | "settings" | "skills" | "assessment"
  | "values_to_action" | "nila"
  | "grounding" | "breathing" | "checkin" | "diary";

export interface AgentResult {
  /** true when the message was an actionable command we handled (don't send to the on-device model). */
  handled: boolean;
  /** short, warm confirmation to display + speak. */
  reply: string;
  /** screen the UI should open, if any. */
  navigate?: AgentView;
}

export type Intent =
  | { kind: "reminder"; when: Date | null; task: string }
  | { kind: "log_mood"; emotion: string | null; intensity: number | null }
  | { kind: "read_dashboard" }
  | { kind: "navigate"; view: AgentView; label: string };

// Emotions we recognise directly (superset of the check-in chips + common synonyms). Used so we
// never mistake a command word ("log") for a feeling.
const KNOWN_EMOTIONS = [
  "anxious", "anxiety", "low", "sad", "sadness", "angry", "anger", "numb", "overwhelmed",
  "okay", "ok", "calm", "panic", "panicky", "scared", "worried", "worry", "down", "depressed",
  "empty", "mad", "fine", "good", "great", "tired", "exhausted", "stressed", "stress",
  "hopeless", "lonely", "frustrated", "upset", "happy", "content", "restless", "irritable",
];

/** Pull a recognised emotion out of free text, or null. Avoids the title-case fallback in mapEmotion. */
function extractEmotion(text: string): string | null {
  const lower = (text || "").toLowerCase();
  const hit = KNOWN_EMOTIONS.find((k) => new RegExp(`\\b${k}\\b`).test(lower));
  return hit ? mapEmotion(hit) : null;
}

/** Parse a time expression into the next future Date it refers to, or null. */
export function parseWhen(text: string, now: Date = new Date()): Date | null {
  const t = (text || "").toLowerCase();

  // Relative: "in 30 minutes", "in 2 hours".
  const rel = t.match(/\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|h)\b/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const d = new Date(now);
    if (/^h|hour|hr/.test(rel[2])) d.setHours(d.getHours() + n);
    else d.setMinutes(d.getMinutes() + n);
    return d;
  }

  const tomorrow = /\btomorrow\b/.test(t);
  const tonight = /\btonight\b/.test(t);

  let hour: number | null = null;
  let min = 0;
  if (/\bnoon\b/.test(t)) hour = 12;
  else if (/\bmidnight\b/.test(t)) hour = 0;
  else {
    const m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/);
    if (m) {
      let h = parseInt(m[1], 10);
      const mm = m[2] ? parseInt(m[2], 10) : 0;
      const ap = m[3] ? m[3].replace(/\./g, "") : "";
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      if (!ap && h <= 12 && tonight && h < 12) h += 12; // "tonight at 9" → 21:00
      if (h >= 0 && h <= 23 && (m[2] || ap || tonight || tomorrow || /\bat\b/.test(t))) {
        hour = h;
        min = mm;
      }
    }
  }
  if (tonight && hour === null) hour = 20;
  if (hour === null) return null;

  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMilliseconds(0);
  d.setHours(hour, min, 0, 0);
  if (tomorrow) d.setDate(d.getDate() + 1);
  else if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1); // next occurrence
  return d;
}

// Screen routes, most-specific first (so "voice check-in" beats the generic "check-in").
const NAV: { re: RegExp; view: AgentView; label: string }[] = [
  { re: /\b(your data|my data|export|delete my data|privacy data)\b/, view: "your_data", label: "your data" },
  { re: /\b(dashboard|my progress|my stats|overview|how i'?m doing)\b/, view: "dashboard", label: "your dashboard" },
  { re: /\b(settings|preferences|voice settings|reminders settings)\b/, view: "settings", label: "settings" },
  { re: /\b(skills?( library)?|coping skills|dbt|cbt skills)\b/, view: "skills", label: "the skills library" },
  { re: /\b(screening|assessment|phq|gad|who-?5|pss|questionnaire)\b/, view: "assessment", label: "a screening" },
  { re: /\b(behaviou?ral activation|plan (an? )?activit|schedule activit|values( compass)?|toward steps?|values to action)\b/, view: "values_to_action", label: "values to action" },
  { re: /\b(voice check-?in|check in with nila|nila check-?in|talk to nila)\b/, view: "nila", label: "Nila" },
  { re: /\bground(ing)?\b/, view: "grounding", label: "grounding" },
  { re: /\bbreath(e|ing)\b/, view: "breathing", label: "breathing" },
  { re: /\b(diary|journal)\b/, view: "diary", label: "your diary" },
  { re: /\bcheck-?in\b/, view: "checkin", label: "a check-in" },
];

/**
 * Decide what (if anything) the user is asking the app to DO. Pure — no side effects.
 * Returns null when the message is conversational and should go to the on-device model instead.
 */
export function classify(text: string, now: Date = new Date()): Intent | null {
  const lower = (text || "").trim().toLowerCase();
  if (!lower) return null;

  // 1. Reminder — strong, unambiguous trigger.
  if (/\b(remind me|set (a |an )?(reminder|alarm)|wake me|nudge me|reminder to)\b/.test(lower)) {
    const when = parseWhen(lower, now);
    let task = "";
    const toM = lower.match(/\bto\s+(.+)$/);
    if (toM) {
      task = toM[1]
        .replace(/\bat\s+\d.*$/, "")
        .replace(/\bin\s+\d+\s*(minutes?|mins?|hours?|hrs?|h)\b.*$/, "")
        .replace(/\b(tonight|tomorrow|this (morning|afternoon|evening)|noon|midnight)\b.*$/, "")
        .replace(/[.!?]+$/, "")
        .trim();
    }
    return { kind: "reminder", when, task };
  }

  // 2. Log a mood — needs an explicit log/note verb so we never hijack emotional disclosure.
  if (/\b(log|note|record|track|save|jot)\b/.test(lower)) {
    const emotion = extractEmotion(lower);
    const wantsMood = emotion !== null || /\b(feel|feeling|mood|i'?m|i am|that i'?m|that i am)\b/.test(lower);
    if (wantsMood) return { kind: "log_mood", emotion, intensity: parseIntensity(lower) };
  }

  // 3. Read the dashboard back.
  if (/\b(how am i|how'?s my (week|day|mood|progress|dashboard)|how is my (week|day|mood|progress)|my streak|read (me )?my (dashboard|stats|progress|week)|summar(y|ise|ize) my (week|progress|mood))\b/.test(lower)) {
    return { kind: "read_dashboard" };
  }

  // 4. Open a screen.
  // Early-return for the specific phrase "talk to nila" so that generic "talk to <anything>"
  // does NOT open the nav gate (e.g. "talk to my therapist about my diary" must NOT route to diary).
  if (/\btalk to nila\b/.test(lower)) {
    return { kind: "navigate", view: "nila", label: "Nila" };
  }

  const navVerb = /\b(open|show|go to|take me to|navigate to|launch|bring up|pull up|start|begin|let'?s do)\b/.test(lower)
    || /^(dashboard|settings|skills|data|diary|journal|grounding|breathe|breathing|values)$/.test(lower);
  if (navVerb) {
    for (const n of NAV) if (n.re.test(lower)) return { kind: "navigate", view: n.view, label: n.label };
  }

  return null;
}

function saveMood(emotion: string, intensity: number | null): void {
  const now = new Date();
  const entry: CheckInEntry = {
    id: "ch_" + Date.now(),
    date: now.toISOString().split("T")[0],
    timestamp: now.toLocaleTimeString(),
    emotion: `${emotion} (Nila agent)`,
    intensity: intensity ?? 5,
    context: "Logged via Nila agent",
  };
  let list: CheckInEntry[] = [];
  try { const raw = secureLocal.getItem("nilamind_checkins"); if (raw) list = JSON.parse(raw); } catch { /* */ }
  list.push(entry);
  secureLocal.setItem("nilamind_checkins", JSON.stringify(list));
}

function dashboardSummary(): string {
  const s = computeCompassionateStreak();
  let entries: CheckInEntry[] = [];
  try { const raw = secureLocal.getItem("nilamind_checkins"); if (raw) entries = JSON.parse(raw); } catch { /* */ }
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const week = entries.filter((e) => { const d = new Date(e.date); return !isNaN(d.getTime()) && d >= weekAgo; });

  const parts: string[] = [];
  if (week.length) {
    const avg = Math.round((week.reduce((a, e) => a + (Number(e.intensity) || 0), 0) / week.length) * 10) / 10;
    parts.push(`This week you checked in ${week.length} time${week.length > 1 ? "s" : ""}, distress averaging ${avg} out of 10.`);
  } else {
    parts.push("You haven't checked in this week yet.");
  }
  if (s.current > 0) {
    parts.push(`Current streak: ${s.current} day${s.current > 1 ? "s" : ""}${s.longest > s.current ? ` (best ${s.longest})` : ""}.`);
  }
  parts.push("No pressure — even a quick check-in counts.");
  return parts.join(" ");
}

/** Execute a recognised command. Returns handled:false for conversational input (→ on-device model). */
export async function runAgent(text: string): Promise<AgentResult> {
  const intent = classify(text);
  if (!intent) return { handled: false, reply: "" };

  switch (intent.kind) {
    case "reminder": {
      if (!intent.when) {
        return { handled: true, reply: "I can set a reminder — when would you like it? Try “remind me at 9pm.”" };
      }
      const body = intent.task ? `Reminder: ${intent.task}` : "A gentle nudge from NilaMind — 2-min check-in? 💙";
      const r = await scheduleReminderAt(intent.when, body);
      const at = formatTime(intent.when);
      const toStr = intent.task ? ` to ${intent.task}` : "";
      if (r.ok) return { handled: true, reply: `Done — I'll remind you${toStr} at ${at}.` };
      if (r.reason === "denied") {
        return { handled: true, reply: `I'd remind you at ${at}, but I need notification permission first — you can enable it in your phone's settings.` };
      }
      return { handled: true, reply: `Reminders run on the phone app — I couldn't schedule that here, but it'll work once installed.` };
    }
    case "log_mood": {
      if (!intent.emotion) {
        return { handled: true, reply: "Sure — what would you like to log? For example, “log that I'm anxious.”", navigate: "checkin" };
      }
      saveMood(intent.emotion, intent.intensity);
      const lvl = intent.intensity ?? 5;
      const tail = intent.intensity ? "" : " I set intensity to 5 — say a number 1 to 10 to adjust.";
      return { handled: true, reply: `Logged — ${intent.emotion.toLowerCase()}, intensity ${lvl} out of 10. Saved privately on your device.${tail}` };
    }
    case "read_dashboard":
      // Read it back in the chat — don't yank the user away to another screen.
      return { handled: true, reply: dashboardSummary() };
    case "navigate":
      return { handled: true, reply: `Opening ${intent.label}.`, navigate: intent.view };
  }
}
