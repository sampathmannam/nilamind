// src/services/weeklyIntention.ts
// Lightweight weekly micro-commitment (gentle, non-streak, user-driven).
// The person picks one small intention for the week. No guilt, no pressure — just a quiet nudge.

import { secureLocal } from "./secureLocal";
import { ymd } from "./streaks";

export interface WeeklyIntention {
  text: string;
  week: string;       // YYYY-MM-DD of the Monday this week
  completed: boolean;
  completedAt?: string;
  ackShown: boolean;  // whether the "nice work" acknowledgment was shown
}

const KEY = "nilamind_weekly_intention";

export const INTENTION_OPTIONS = [
  "Try one thought record this week",
  "Do a grounding exercise daily",
  "Track sleep for 3 nights",
  "Do one thing that matters (Values to Action)",
  "Practice self-compassion once",
  "Reach out to someone you trust",
  "Complete a breathing exercise daily",
  "Log a medication day streak",
  "Write in the diary 3 times",
  "Try a CBT skill from Learn",
] as const;

function loadRaw(): WeeklyIntention | null {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.text === "string" && parsed.week ? parsed : null;
  } catch { return null; }
}

function saveRaw(i: WeeklyIntention | null): void {
  try {
    if (i) secureLocal.setItem(KEY, JSON.stringify(i));
    else secureLocal.removeItem(KEY);
  } catch { /* best-effort */ }
}

export function getIntention(): WeeklyIntention | null {
  const i = loadRaw();
  if (!i) return null;
  const thisWeek = getWeekStart();
  // If we're in a new week, the old intention has expired
  if (i.week !== thisWeek) return null;
  return i;
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0];
}

export function setIntention(text: string): WeeklyIntention {
  const clean = text.trim();
  if (!clean) return null as any;
  const i: WeeklyIntention = {
    text: clean,
    week: getWeekStart(),
    completed: false,
    ackShown: false,
  };
  saveRaw(i);
  return i;
}

export function completeIntention(): void {
  const i = loadRaw();
  if (!i) return;
  const thisWeek = getWeekStart();
  if (i.week !== thisWeek) return;
  i.completed = true;
  i.completedAt = new Date().toISOString();
  saveRaw(i);
}

export function clearIntention(): void {
  saveRaw(null);
}

export function isIntentionCompleted(): boolean {
  const i = getIntention();
  return i?.completed ?? false;
}

/** Get the one-time completion acknowledgment text, or null if none/already shown. */
export function getCompletionAck(): string | null {
  const i = getIntention();
  if (!i?.completed || i.ackShown) return null;
  return "Nice work — you followed through on your intention. That matters. 💙";
}

/** Mark the acknowledgment as shown so it doesn't repeat. */
export function markAckShown(): void {
  const i = loadRaw();
  if (!i) return;
  i.ackShown = true;
  saveRaw(i);
}

// ── Daily if-then implementation intention ──
// Wave 3 Group I (2026-07-12): the app previously had THREE independent, contradictory "intention"
// surfaces — this weekly picker, a free-text chat question (modeEngine.ts's "What's your intention
// for today?"), and a free-text diary field (DiaryCardScreen.tsx) — exactly the friction the
// synthesis warned against, per Borghouts, Eikey, Mark et al. (2021), J Med Internet Res. This is
// the ONE canonical daily store both of those now defer to. It carries a structured if-then
// ("implementation intention") plan rather than free text: specific/structured plans produce
// d=0.65 on goal attainment generally and d=0.61 specifically on overcoming failure-to-start —
// exactly the "opens the app but doesn't act" gap an unstructured prompt is vulnerable to,
// per Gollwitzer & Sheeran (2006), Adv Exp Soc Psychol.
export interface DailyIntention {
  if: string;
  then: string;
  date: string; // YYYY-MM-DD — the day this intention is for
}

const DAILY_KEY = "nilamind_daily_intention";

function loadDailyRaw(): DailyIntention | null {
  try {
    const raw = secureLocal.getItem(DAILY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.if === "string" && typeof parsed.then === "string" && parsed.date
      ? parsed
      : null;
  } catch { return null; }
}

function saveDailyRaw(i: DailyIntention | null): void {
  try {
    if (i) secureLocal.setItem(DAILY_KEY, JSON.stringify(i));
    else secureLocal.removeItem(DAILY_KEY);
  } catch { /* best-effort */ }
}

/** Today's if-then intention, or null if none has been set yet or it was set on a prior day. */
export function getDailyIntention(): DailyIntention | null {
  const i = loadDailyRaw();
  if (!i) return null;
  if (i.date !== ymd(new Date())) return null; // a new day — the old plan has expired
  return i;
}

/** Set (or overwrite) today's if-then intention. Returns null and persists nothing if either
 *  field is blank — both halves of the implementation intention are required for it to be a
 *  concrete, evidence-backed plan rather than a vague reminder. */
export function setDailyIntention(ifText: string, thenText: string): DailyIntention | null {
  const cleanIf = ifText.trim();
  const cleanThen = thenText.trim();
  if (!cleanIf || !cleanThen) return null;
  const i: DailyIntention = { if: cleanIf, then: cleanThen, date: ymd(new Date()) };
  saveDailyRaw(i);
  return i;
}

/** Clear today's daily intention (e.g. so the user can start over). */
export function clearDailyIntention(): void {
  saveDailyRaw(null);
}