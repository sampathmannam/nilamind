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