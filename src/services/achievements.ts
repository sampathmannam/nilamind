// Achievements — meaningful progress markers that celebrate the user's journey.
// Each achievement is a small win that encourages continued engagement.
// Stored locally, never shared. Pure logic, no side effects.

import { secureLocal } from "./secureLocal";

const KEY = "nilamind_achievements";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Icon emoji or Lucide icon name. */
  icon: string;
  /** Color class for the badge. */
  color: string;
  /** When this achievement was unlocked (ISO string), or null if locked. */
  unlockedAt: string | null;
  /** Category for grouping. */
  category: "checkin" | "streak" | "tool" | "caregiver" | "safety" | "wellbeing";
}

/** The achievement registry — all possible achievements. */
export const ACHIEVEMENT_REGISTRY: Omit<Achievement, "unlockedAt">[] = [
  {
    id: "first_checkin",
    title: "You started your story",
    description: "Completed your first check-in.",
    icon: "🌱",
    color: "text-emerald-400",
    category: "checkin",
  },
  {
    id: "seven_day_streak",
    title: "A week of showing up",
    description: "7 consecutive days of check-ins.",
    icon: "🔥",
    color: "text-amber-400",
    category: "streak",
  },
  {
    id: "thirty_day_streak",
    title: "A month of presence",
    description: "30 consecutive days of check-ins.",
    icon: "⭐",
    color: "text-blue-400",
    category: "streak",
  },
  {
    id: "first_episode",
    title: "Courage to track",
    description: "Logged your first episode marker.",
    icon: "📝",
    color: "text-purple-400",
    category: "checkin",
  },
  {
    id: "safety_plan",
    title: "Prepared, not scared",
    description: "Completed your safety plan.",
    icon: "🛡️",
    color: "text-emerald-400",
    category: "safety",
  },
  {
    id: "caregiver_added",
    title: "Trusted connection",
    description: "Added a caregiver contact.",
    icon: "🤝",
    color: "text-blue-400",
    category: "caregiver",
  },
  {
    id: "wellbeing_check",
    title: "Self-aware",
    description: "Completed a wellbeing check.",
    icon: "💚",
    color: "text-emerald-400",
    category: "wellbeing",
  },
  {
    id: "tool_used",
    title: "Skill builder",
    description: "Used a wellness tool for the first time.",
    icon: "🧰",
    color: "text-amber-400",
    category: "tool",
  },
  {
    id: "ten_checkins",
    title: "Building momentum",
    description: "Completed 10 check-ins.",
    icon: "📈",
    color: "text-emerald-400",
    category: "checkin",
  },
  {
    id: "hundred_checkins",
    title: "100 check-ins",
    description: "A century of self-reflection.",
    icon: "💯",
    color: "text-amber-400",
    category: "checkin",
  },
];

function loadUnlocked(): Record<string, string> {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveUnlocked(map: Record<string, string>): void {
  secureLocal.setItem(KEY, JSON.stringify(map));
}

/** Returns all achievements with their unlock status. */
export function getAllAchievements(): Achievement[] {
  const unlocked = loadUnlocked();
  return ACHIEVEMENT_REGISTRY.map((a) => ({
    ...a,
    unlockedAt: unlocked[a.id] ?? null,
  }));
}

/** Returns only unlocked achievements, sorted by unlock date (newest first). */
export function getUnlockedAchievements(): Achievement[] {
  return getAllAchievements()
    .filter((a) => a.unlockedAt != null)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""));
}

/** Returns the count of unlocked achievements. */
export function getAchievementCount(): number {
  return getUnlockedAchievements().length;
}

/**
 * Attempts to unlock an achievement by id. Returns true if newly unlocked.
 * If already unlocked, returns false (idempotent).
 */
export function tryUnlockAchievement(id: string): boolean {
  const unlocked = loadUnlocked();
  if (unlocked[id]) return false;
  unlocked[id] = new Date().toISOString();
  saveUnlocked(unlocked);
  return true;
}

/** Checks if a specific achievement is unlocked. */
export function isAchievementUnlocked(id: string): boolean {
  return loadUnlocked()[id] != null;
}

/**
 * Checks all unlock conditions based on current app state.
 * Returns a list of newly unlocked achievement ids.
 * Call this after any state change (check-in, tool use, episode log, etc.).
 */
export function checkAchievementConditions(context: {
  checkinCount: number;
  streakDays: number;
  hasEpisodeMarkers: boolean;
  hasSafetyPlan: boolean;
  hasCaregiverContact: boolean;
  hasWellbeingCheck: boolean;
  hasUsedTool: boolean;
}): string[] {
  const newlyUnlocked: string[] = [];

  if (context.checkinCount >= 1 && tryUnlockAchievement("first_checkin")) {
    newlyUnlocked.push("first_checkin");
  }
  if (context.checkinCount >= 10 && tryUnlockAchievement("ten_checkins")) {
    newlyUnlocked.push("ten_checkins");
  }
  if (context.checkinCount >= 100 && tryUnlockAchievement("hundred_checkins")) {
    newlyUnlocked.push("hundred_checkins");
  }
  if (context.streakDays >= 7 && tryUnlockAchievement("seven_day_streak")) {
    newlyUnlocked.push("seven_day_streak");
  }
  if (context.streakDays >= 30 && tryUnlockAchievement("thirty_day_streak")) {
    newlyUnlocked.push("thirty_day_streak");
  }
  if (context.hasEpisodeMarkers && tryUnlockAchievement("first_episode")) {
    newlyUnlocked.push("first_episode");
  }
  if (context.hasSafetyPlan && tryUnlockAchievement("safety_plan")) {
    newlyUnlocked.push("safety_plan");
  }
  if (context.hasCaregiverContact && tryUnlockAchievement("caregiver_added")) {
    newlyUnlocked.push("caregiver_added");
  }
  if (context.hasWellbeingCheck && tryUnlockAchievement("wellbeing_check")) {
    newlyUnlocked.push("wellbeing_check");
  }
  if (context.hasUsedTool && tryUnlockAchievement("tool_used")) {
    newlyUnlocked.push("tool_used");
  }

  return newlyUnlocked;
}

/** Resets all achievements (for testing or "clear all data"). */
export function resetAchievements(): void {
  saveUnlocked({});
}
