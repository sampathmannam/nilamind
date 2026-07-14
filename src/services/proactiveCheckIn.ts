// Proactive Check-In — Nila initiates conversation based on context.
// Research: Finch's pet "misses you" when returning after absence. Woebot proactively
// surfaces CBT-informed insights. Nila should feel alive, not passive.
//
// This module determines when to proactively generate a check-in message
// and what that message should say. The model fills in warmth.

import { loadMoodHistory } from "./moodHistory";
import { selfReportSleepSignal } from "./sleepInsight";
import { computeCompassionateStreak } from "./streaks";
import { secureLocal } from "./secureLocal";
import type { VoiceScenario } from "./nilaVoice";
import { buildNilaMessage } from "./nilaVoice";

const LAST_CHECKIN_KEY = "nilamind_last_proactive_checkin";

export interface ProactiveCheckIn {
  /** Whether to show a proactive message. */
  shouldShow: boolean;
  /** The scenario context (for model fill-in). */
  scenario: VoiceScenario | null;
  /** The pre-written template message. Model fills in warmth. */
  message: string;
  /** Whether this is a high-priority nudge (should show prominently). */
  priority: "high" | "medium" | "low";
}

/**
 * Determine if Nila should proactively reach out when the user opens the app.
 * Checks multiple signals and returns the most relevant proactive message.
 */
export function checkProactiveCheckIn(): ProactiveCheckIn | null {
  // Don't spam — only show one proactive check-in per 4 hours
  try {
    const lastRaw = secureLocal.getItem(LAST_CHECKIN_KEY);
    if (lastRaw) {
      const last = JSON.parse(lastRaw);
      const hoursSince = (Date.now() - last.timestamp) / (1000 * 60 * 60);
      if (hoursSince < 4) return null;
    }
  } catch { /* best-effort */ }

  // Signal 1: Returning after absence (3+ days without conversation)
  const streak = computeCompassionateStreak();
  if (streak.lapsed && streak.current === 0) {
    const msg = buildNilaMessage({
      timeOfDay: getTimeOfDay(),
      recentMoodAvg: null,
      checkedInToday: false,
      streakDays: 0,
      sleepHours: null,
      isCrisis: false,
      hasRecentEpisode: false,
      isReturning: true,
    });
    return {
      shouldShow: true,
      scenario: "returning_after_absence",
      message: msg.message,
      priority: "medium",
    };
  }

  // Signal 2: Short sleep (bipolar prodrome — #1 signal to check)
  const sleepSignal = selfReportSleepSignal();
  if (sleepSignal?.firing) {
    const mood = loadMoodHistory();
    const recentAvg = mood.length >= 3
      ? mood.slice(-3).reduce((s, m) => s + (m.intensity ?? 5), 0) / mood.length
      : null;

    return {
      shouldShow: true,
      scenario: "sleep_short",
      message: "I noticed your sleep has been shorter lately. How are you feeling today?",
      priority: recentAvg !== null && recentAvg >= 7 ? "high" : "medium",
    };
  }

  // Signal 3: Streak milestone
  if (streak.current >= 7 && streak.milestone !== null) {
    return {
      shouldShow: true,
      scenario: "streak_milestone",
      message: `${streak.current} days of showing up for yourself. That kind of consistency matters. How are you doing today?`,
      priority: "medium",
    };
  }

  return null;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

/** Record that a proactive check-in was shown (throttle). */
export function recordProactiveCheckIn(): void {
  try {
    secureLocal.setItem(LAST_CHECKIN_KEY, JSON.stringify({ timestamp: Date.now() }));
  } catch { /* best-effort */ }
}
