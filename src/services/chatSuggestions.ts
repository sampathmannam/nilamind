// Chat suggestion engine — time-aware quick-reply chips to reduce cold-start friction.
// India-first: suggestions include culturally-relevant entries. Pure logic, no side effects.

import {
  Sun, Moon, Target, Heart, Star, CloudSun, CloudRain, CloudFog, Wind,
  HeartHandshake, Sunset, RefreshCw, PenLine, Sparkles, Feather, Zap,
  type LucideIcon,
} from "lucide-react";
import type { CheckInEntry } from "../types";
import { secureLocal } from "./secureLocal";

export interface SuggestionChip {
  id: string;
  text: string;
  Icon: LucideIcon;
}

const CHIPS: Record<"morning" | "day" | "evening" | "night", SuggestionChip[]> = {
  morning: [
    { id: "am_checkin", text: "Checking in this morning", Icon: Sun },
    { id: "am_sleep", text: "I didn't sleep well", Icon: Moon },
    { id: "am_intention", text: "Help me set an intention", Icon: Target },
    { id: "am_mood", text: "I'm feeling a bit low", Icon: Heart },
    { id: "am_gratitude", text: "Something good just happened", Icon: Star },
  ],
  day: [
    { id: "day_checkin", text: "A quick check-in", Icon: CloudSun },
    { id: "day_anxiety", text: "Feeling anxious right now", Icon: CloudRain },
    { id: "day_flat", text: "Everything feels flat", Icon: CloudFog },
    { id: "day_breathing", text: "Help me breathe for a minute", Icon: Wind },
    { id: "day_support", text: "I just need to talk to someone", Icon: HeartHandshake },
  ],
  evening: [
    { id: "eve_checkin", text: "How was my day?", Icon: Sunset },
    { id: "eve_wind", text: "Help me wind down", Icon: Moon },
    { id: "eve_racing", text: "My mind won't stop racing", Icon: RefreshCw },
    { id: "eve_reflect", text: "Let's reflect on today", Icon: PenLine },
    { id: "eve_gratitude", text: "Three good things today", Icon: Sparkles },
  ],
  night: [
    { id: "nt_wind", text: "Help me fall asleep", Icon: Moon },
    { id: "nt_lonely", text: "I feel alone tonight", Icon: Heart },
    { id: "nt_racing", text: "Too many thoughts to sleep", Icon: RefreshCw },
    { id: "nt_calm", text: "Just need a calm voice", Icon: Feather },
    { id: "nt_gratitude", text: "What went well today", Icon: Sparkles },
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
// Keyed by the onboarding goal IDs stored in nilamind_user_goal (see GOAL_TOOL_PRIORITY note in
// toolsRows.ts) — was keyed on retired labels, so chip personalization never fired.
const GOAL_CHIP_PRIORITY: Record<string, string[]> = {
  sleep: ["eve_wind", "nt_calm", "am_intention"],
  mood: ["am_mood", "am_checkin", "day_checkin", "eve_checkin"],
  grounding: ["day_breathing", "day_anxiety", "nt_racing", "eve_racing"],
  medication: ["am_checkin", "am_intention"],
  talking: ["day_flat", "eve_reflect", "nt_lonely"],
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
      ? { id: "elevated", text: "I'm feeling really intense", Icon: Zap }
      : { id: "elevated", text: "Everything feels too fast", Icon: Zap };
    return [replacement, ...base.filter((c) => c.id !== replacement.id).slice(0, 2)];
  }

  if (recentMood.intensity <= 3) {
    const replacement = { id: "low", text: "Finding it hard to do anything", Icon: Heart };
    return [replacement, ...base.filter((c) => c.id !== replacement.id).slice(0, 2)];
  }

  return base.slice(0, 3);
}
