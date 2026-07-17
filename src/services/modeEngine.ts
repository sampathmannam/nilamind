// modeEngine — determines which mode to show based on time of day + user state.
// Pure, deterministic, no network. The app's "brain" for UI adaptation.

import { localDateKey } from "./storageUtils";
import { hasCheckinToday, getSkipFlag } from "./checkin";
import { selfReportSleepSignal } from "./sleepInsight";
import { secureLocal } from "./secureLocal";
import { detectElevationRisk } from "./elevationGuard";
import type { ElevationLevel } from "./elevationGuard";
import { emaElevationSignal } from "./ema";
import { chatElevationSignal } from "./chatElevation";
import type { UserState, TimeMode } from "../types/modes";

// Pick the higher of two elevation levels (none < elevated < high).
const ELEVATION_RANK: Record<ElevationLevel, number> = { none: 0, elevated: 1, high: 2 };
function higherElevation(a: ElevationLevel, b: ElevationLevel): ElevationLevel {
  return ELEVATION_RANK[a] >= ELEVATION_RANK[b] ? a : b;
}

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
 * Get the user's current emotional state from recent check-ins, then fold in a sustained EMA elevation
 * trajectory (see foldElevation). Returns null if there is no signal at all.
 */
export function getUserState(): UserState | null {
  let base: UserState | null = null;
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (raw) {
      const checkins = JSON.parse(raw);
      if (Array.isArray(checkins) && checkins.length > 0) {
        // Most recent check-in
        const latest = [...checkins].sort(
          (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];
        if (latest) {
          const emotion = (latest.emotion || "").toLowerCase();
          const intensity = latest.intensity || 5;
          // Map emotion → state (order matters; explicit self-report wins over intensity)
          if (/anx|worr|panic|nervous/.test(emotion)) base = "anxious";
          else if (/low|sad|down|empty|hopeless/.test(emotion)) base = "low";
          else if (/calm|okay|good|fine/.test(emotion)) base = "calm";
          else if (/angry|frustrated|irritab/.test(emotion)) base = "elevated";
          else if (/overwhelm|stressed/.test(emotion)) base = "anxious";
          else if (intensity >= 7) base = "elevated";
          else base = "calm";
        }
      }
    }
  } catch {
    base = null;
  }

  // Fold in the elevation signals: a sustained EMA trajectory today (emaElevationSignal) OR a still-active
  // chat-detected elevation latch (chatElevationSignal — manic markers the user typed, within its cool-down).
  // Take the higher of the two. Wrapped separately so a storage error here can never discard a valid
  // check-in state.
  try {
    return foldElevation(base, higherElevation(emaElevationSignal(), chatElevationSignal()));
  } catch {
    return base;
  }
}

/**
 * Fold a sustained EMA elevation signal (emaElevationSignal — a rapid valence+energy rise across today)
 * into the derived UserState. A genuine upward trajectory upgrades a CALM or unknown state to the
 * protective "elevated" posture so the Living Interface can quiet down — the pixel-level extension of the
 * app's existing anti-mania-amplification steer (Østergaard 2023; elevationGuard already steers Nila's
 * words). It NEVER overrides an explicit self-report of distress (anxious/low) — respecting what the
 * person just told us — nor an already-elevated/crisis state. High-precision by construction: the signal
 * only fires on a real valence+energy rise, so a truly calm person is not mislabelled and invalidated.
 */
export function foldElevation(base: UserState | null, emaLevel: ElevationLevel): UserState | null {
  if (emaLevel === "none") return base;
  if (base === null || base === "calm") return "elevated";
  return base;
}

/**
 * Check if user has checked in today.
 */
export function hasCheckedInToday(): boolean {
  const today = localDateKey();
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
    // Wave 3 Group I (2026-07-12): "What's your intention for today?" used to be answered here as
    // free text — one of three independent, contradictory "intention" surfaces (synthesis finding).
    // Setting today's intention now happens through the structured if-then DailyIntentionCard on
    // the Today hub (weeklyIntention.ts's canonical daily-intention store), so this chat prompt no
    // longer asks for it — it just opens the conversation instead.
    return "How's your morning going?";
  }

  // Day
  if (timeMode === "day") {
    if (userState === "anxious") return "How are you feeling right now?";
    if (userState === "low") return "How's your day going?";
    // Not "Let's take a breath..." — the elevated-state sub-message shown right below this question
    // (STATE_MESSAGES.elevated, "Let's slow things down together.") already opens with "Let's", so a
    // matching lead-in here read as two back-to-back "Let's" sentences saying nearly the same thing.
    if (userState === "elevated") return "How are you feeling right now?";
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
