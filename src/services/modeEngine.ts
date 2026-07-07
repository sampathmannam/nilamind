// modeEngine — determines which mode to show based on time of day + user state.
// Pure, deterministic, no network. The app's "brain" for UI adaptation.

import { hasCheckinToday, getSkipFlag } from "./checkin";
import { selfReportSleepSignal } from "./sleepInsight";
import { secureLocal } from "./secureLocal";
import { detectElevationRisk } from "./elevationGuard";
import type { UserState, TimeMode } from "../types/modes";

/**
 * Get the current time-based mode.
 * Morning (6-12), Day (12-18), Evening (18-22), Night (22-6)
 */
export function getTimeMode(): TimeMode {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "day";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/**
 * Get the user's current emotional state from recent check-ins.
 * Returns null if no recent data.
 */
export function getUserState(): UserState | null {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return null;
    const checkins = JSON.parse(raw);
    if (!Array.isArray(checkins) || checkins.length === 0) return null;

    // Get most recent check-in
    const sorted = [...checkins].sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latest = sorted[0];
    if (!latest) return null;

    const emotion = (latest.emotion || "").toLowerCase();
    const intensity = latest.intensity || 5;

    // Map emotion to state
    if (/anx|worr|panic|nervous/.test(emotion)) return "anxious";
    if (/low|sad|down|empty|hopeless/.test(emotion)) return "low";
    if (/calm|okay|good|fine/.test(emotion)) return "calm";
    if (/angry|frustrated|irritab/.test(emotion)) return "elevated";
    if (/overwhelm|stressed/.test(emotion)) return "anxious";

    // High intensity = elevated state
    if (intensity >= 7) return "elevated";

    return "calm";
  } catch {
    return null;
  }
}

/**
 * Check if user has checked in today.
 */
export function hasCheckedInToday(): boolean {
  const today = new Date().toISOString().split("T")[0];
  return hasCheckinToday(today) || getSkipFlag() === today;
}

/**
 * Check if user is in crisis (for safety).
 */
export function isInCrisis(): boolean {
  // This would check crisis state - simplified for now
  return false;
}

/**
 * Get the current mode based on time + user state.
 * The living interface adapts to the user.
 */
export function getCurrentMode(): {
  timeMode: TimeMode;
  userState: UserState | null;
  hasCheckedIn: boolean;
  inCrisis: boolean;
} {
  return {
    timeMode: getTimeMode(),
    userState: getUserState(),
    hasCheckedIn: hasCheckedInToday(),
    inCrisis: isInCrisis(),
  };
}

/**
 * Get Nila's greeting based on time mode.
 */
export function getGreeting(timeMode: TimeMode): string {
  const hour = new Date().getHours();

  if (timeMode === "morning") {
    if (hour < 8) return "Good early morning";
    if (hour < 10) return "Good morning";
    return "Good late morning";
  }

  if (timeMode === "day") {
    if (hour < 14) return "Good afternoon";
    return "Good late afternoon";
  }

  if (timeMode === "evening") {
    if (hour < 20) return "Good evening";
    return "Good night";
  }

  return "Good night";
}

/**
 * Get Nila's question based on time mode + user state.
 */
export function getNilaQuestion(
  timeMode: TimeMode,
  userState: UserState | null,
  hasCheckedIn: boolean
): string {
  // Morning
  if (timeMode === "morning") {
    if (!hasCheckedIn) return "How did you sleep?";
    return "What's your intention for today?";
  }

  // Day
  if (timeMode === "day") {
    if (userState === "anxious") return "How are you feeling right now?";
    if (userState === "low") return "How's your day going?";
    if (userState === "elevated") return "Let's take a breath. How are you?";
    return "How's your day going?";
  }

  // Evening
  if (timeMode === "evening") {
    return "What happened today?";
  }

  // Night
  return "Ready to wind down?";
}

/**
 * Get the user state color for Nila's face.
 */
export function getStateColor(userState: UserState | null): string {
  switch (userState) {
    case "calm": return "warm";
    case "anxious": return "blue";
    case "low": return "purple";
    case "elevated": return "green";
    case "crisis": return "red";
    default: return "warm";
  }
}
