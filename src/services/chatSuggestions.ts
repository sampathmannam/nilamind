// Chat suggestion engine — time-aware quick-reply chips to reduce cold-start friction.
// India-first: suggestions include culturally-relevant entries. Pure logic, no side effects.

import type { CheckInEntry } from "../types";
import { secureLocal } from "./secureLocal";

export interface SuggestionChip {
  id: string;
  text: string;
  emoji: string;
}

const CHIPS: Record<"morning" | "day" | "evening" | "night", SuggestionChip[]> = {
  morning: [
    { id: "am_checkin", text: "Checking in this morning", emoji: "☀️" },
    { id: "am_sleep", text: "I didn't sleep well", emoji: "😴" },
    { id: "am_intention", text: "Help me set an intention", emoji: "🎯" },
    { id: "am_mood", text: "I'm feeling a bit low", emoji: "💙" },
    { id: "am_gratitude", text: "Something good just happened", emoji: "🌟" },
  ],
  day: [
    { id: "day_checkin", text: "A quick check-in", emoji: "🌤️" },
    { id: "day_anxiety", text: "Feeling anxious right now", emoji: "😰" },
    { id: "day_flat", text: "Everything feels flat", emoji: "😶" },
    { id: "day_breathing", text: "Help me breathe for a minute", emoji: "🫁" },
    { id: "day_support", text: "I just need to talk to someone", emoji: "🤗" },
  ],
  evening: [
    { id: "eve_checkin", text: "How was my day?", emoji: "🌇" },
    { id: "eve_wind", text: "Help me wind down", emoji: "🌙" },
    { id: "eve_racing", text: "My mind won't stop racing", emoji: "🌀" },
    { id: "eve_reflect", text: "Let's reflect on today", emoji: "📝" },
    { id: "eve_gratitude", text: "Three good things today", emoji: "✨" },
  ],
  night: [
    { id: "nt_wind", text: "Help me fall asleep", emoji: "🌙" },
    { id: "nt_lonely", text: "I feel alone tonight", emoji: "💙" },
    { id: "nt_racing", text: "Too many thoughts to sleep", emoji: "🌀" },
    { id: "nt_calm", text: "Just need a calm voice", emoji: "🕊️" },
    { id: "nt_gratitude", text: "What went well today", emoji: "✨" },
  ],
};

export type TimeSlot = "morning" | "day" | "evening" | "night";

/** Time slot from hour (0-23). */
export function timeSlot(hour: number = new Date().getHours()): TimeSlot {
  if (hour < 8) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "day";
  if (hour < 21) return "evening";
  return "night";
}

const GOAL_KEY = "nilamind_user_goal";

/** Reads the onboarding "what brings you here?" goal selection back out of storage.
 *  Previously write-only (OnboardingGate.tsx wrote it, nothing read it — audit finding,
 *  engagement-onboarding synthesis). This is the first reader. Tolerant of absent/corrupt storage. */
export function getUserGoals(): string[] {
  try {
    const raw = secureLocal.getItem(GOAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((g): g is string => typeof g === "string") : [];
  } catch {
    return [];
  }
}

// Goal -> the chip ids (per slot) it should promote to the front, when present in that slot's list.
// Customizable/relevant content is a named engagement facilitator — this closes the onboarding goal
// picker's previously write-only loop by using the stated goal to lead with the most relevant chip,
// per Borghouts, Eikey, Mark et al. (2021), J Med Internet Res.
const GOAL_CHIP_PRIORITY: Record<string, string[]> = {
  "Feeling low": ["am_mood", "day_flat", "eve_reflect", "nt_lonely"],
  "Managing stress": ["day_breathing", "eve_wind", "nt_calm", "am_intention"],
  "Managing anxiety": ["day_anxiety", "eve_racing", "nt_racing", "day_breathing"],
  "Tracking moods": ["am_checkin", "day_checkin", "eve_checkin"],
  "Building skills": ["am_intention", "day_breathing", "eve_reflect"],
  "Just curious": [],
};

/** Reorders chips within a slot's list so goal-relevant ones lead, without changing membership. */
function orderByGoal(chips: SuggestionChip[], goals: string[]): SuggestionChip[] {
  const priorityIds = new Set<string>();
  for (const goal of goals) {
    for (const id of GOAL_CHIP_PRIORITY[goal] ?? []) priorityIds.add(id);
  }
  if (priorityIds.size === 0) return chips;
  return [...chips].sort((a, b) => {
    const aRank = priorityIds.has(a.id) ? 0 : 1;
    const bRank = priorityIds.has(b.id) ? 0 : 1;
    return aRank - bRank;
  });
}

/** Get 3 suggestion chips for the current time slot, optionally adapting to recent mood and the
 *  onboarding goal (defaults to reading the real stored goal — pass `[]` explicitly in tests to
 *  opt out). Real-time mood state always wins the lead slot over a static onboarding goal. */
export function getSuggestions(
  slot: TimeSlot,
  recentMood?: { intensity: number; emotion: string } | null,
  goals: string[] = getUserGoals(),
): SuggestionChip[] {
  const base = orderByGoal(CHIPS[slot] ?? CHIPS.day, goals);
  if (!recentMood) return base.slice(0, 3);

  // Swap one chip when recent mood is notably high (anxious/racing) or low
  if (recentMood.intensity >= 8) {
    const replacement = slot === "night" || slot === "evening"
      ? { id: "elevated", text: "I'm feeling really intense", emoji: "⚡" }
      : { id: "elevated", text: "Everything feels too fast", emoji: "⚡" };
    return [replacement, ...base.filter((c) => c.id !== replacement.id).slice(0, 2)];
  }

  if (recentMood.intensity <= 3) {
    const replacement = { id: "low", text: "Finding it hard to do anything", emoji: "💙" };
    return [replacement, ...base.filter((c) => c.id !== replacement.id).slice(0, 2)];
  }

  return base.slice(0, 3);
}
