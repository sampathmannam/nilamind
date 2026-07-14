import { useState, useEffect } from "react";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

interface TimeOfDayResult {
  timeOfDay: TimeOfDay;
  /** Sub-period for more granular greetings. */
  subPeriod: "early" | "mid" | "late";
  /** Hour of the day (0-23). */
  hour: number;
  /** Whether it's currently nighttime (10pm-6am). */
  isNight: boolean;
  /** Whether it's currently morning (6am-12pm). */
  isMorning: boolean;
  /** Whether it's currently evening (6pm-10pm). */
  isEvening: boolean;
}

/**
 * Hook that returns the current time of day and re-evaluates every minute.
 * Used for time-aware UI adaptations (hero gradients, greeting, tool ordering).
 */
export function useTimeOfDay(): TimeOfDayResult {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const hour = now.getHours();
  let timeOfDay: TimeOfDay;
  if (hour >= 6 && hour < 12) timeOfDay = "morning";
  else if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
  else if (hour >= 18 && hour < 22) timeOfDay = "evening";
  else timeOfDay = "night";

  let subPeriod: "early" | "mid" | "late";
  if (timeOfDay === "morning") subPeriod = hour < 8 ? "early" : hour < 10 ? "mid" : "late";
  else if (timeOfDay === "afternoon") subPeriod = hour < 14 ? "early" : hour < 16 ? "mid" : "late";
  else if (timeOfDay === "evening") subPeriod = hour < 19 ? "early" : hour < 21 ? "mid" : "late";
  else subPeriod = hour < 1 ? "early" : hour < 4 ? "mid" : "late";

  return {
    timeOfDay,
    subPeriod,
    hour,
    isNight: timeOfDay === "night",
    isMorning: timeOfDay === "morning",
    isEvening: timeOfDay === "evening",
  };
}

/**
 * Returns a CSS gradient class for the hero section based on time of day.
 * Uses the app's warm color tokens for a subtle, non-intrusive background shift.
 */
export function heroGradient(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case "morning":
      return "from-amber-500/5 via-peach-400/3 to-transparent";
    case "afternoon":
      return "from-blue-400/5 via-emerald-400/3 to-transparent";
    case "evening":
      return "from-purple-400/8 via-blue-400/4 to-transparent";
    case "night":
      return "from-indigo-400/6 via-purple-400/3 to-transparent";
  }
}

/**
 * Returns a contextual one-liner based on recent mood data and time of day.
 * Warm, companion-tone — never clinical.
 */
export function contextualSummary(
  timeOfDay: TimeOfDay,
  checkedInToday: boolean,
  recentAvg: number | null,
  streakDays: number,
): string | null {
  if (!checkedInToday && timeOfDay === "morning") {
    return "A new day — how are you feeling?";
  }
  if (!checkedInToday && timeOfDay === "evening") {
    return "The day's winding down — how did it go?";
  }
  if (checkedInToday && recentAvg != null) {
    if (recentAvg <= 3) return "You're having a gentle stretch — that's worth noticing.";
    if (recentAvg <= 5) return "Things have been mixed lately — steady presence helps.";
    if (recentAvg <= 7) return "You're showing up — that matters.";
    return "Tough days lately — be gentle with yourself.";
  }
  if (streakDays >= 7) {
    return `${streakDays} days of showing up — you're building something real.`;
  }
  return null;
}
