// modeEngine — determines which mode to show based on time of day + user state.
// Pure, deterministic, no network. The app's "brain" for UI adaptation.

import { localDateKey } from "./storageUtils";
import { hasCheckinToday, getSkipFlag, loadCheckins } from "./checkin";
import type { ElevationLevel } from "./elevationGuard";
import { emaElevationSignal } from "./ema";
import { chatElevationSignal } from "./chatElevation";
import { todayAffectBucket, type AffectBucket } from "./chatAffect";
import { detectCompoundSignals } from "./compoundDetector";
import { getFeatureWindow } from "./signalStore";
import { getPassiveSensingEnabled } from "./passiveSensingPrefs";
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
    const checkins = loadCheckins();
    if (checkins.length > 0) {
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
  } catch {
    base = null;
  }

  // Fold in the elevation signals: a sustained EMA trajectory today (emaElevationSignal) OR a still-active
  // chat-detected elevation latch (chatElevationSignal — manic markers the user typed, within its cool-down).
  // Take the higher of the two. Wrapped separately so a storage error here can never discard a valid
  // check-in state.
  try {
    const withElevation = foldElevation(base, higherElevation(emaElevationSignal(), chatElevationSignal()));
    // Then fold compound signals (multi-modal, higher confidence)
    const withCompoundSignals = foldCompoundSignals(withElevation);
    // Then fold today's affect-accent bucket (Phase 2, orb affect accent) — last in the chain since it
    // only ever promotes from null/calm, so it can never undo an elevated/low/anxious promotion any
    // earlier fold already made.
    return foldAffectAccent(withCompoundSignals, todayAffectBucket(), hasCheckinToday(localDateKey()));
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
 * Fold compound detector signals into the user state.
 * Compound signals (activity-prodrome, circadian-disintegration, etc.) provide
 * higher-confidence, multi-modal evidence than single EMA/chat signals alone.
 * 
 * Priority order (highest to lowest):
 * - activity-prodrome → elevated (strongest mania prodrome signal)
 * - circadian-disintegration → elevated (rhythm fragmentation = mania risk)
 * - withdrawal-cascade → low (social withdrawal + low mood)
 * - typing-motor-concordance → anxious (motor + typing concordance)
 * - resilience-cluster → calm (protective patterns)
 * 
 * NEVER overrides explicit distress self-report (anxious/low).
 */
export function foldCompoundSignals(base: UserState | null): UserState | null {
  if (!getPassiveSensingEnabled()) return base;
  try {
    const window = getFeatureWindow(30);
    const signals = detectCompoundSignals(window);
    if (signals.length === 0) return base;

    // Never override explicit distress
    if (base === "anxious" || base === "low") return base;

    // Map signals to state upgrades (highest priority wins)
    const signalPriority: Record<string, UserState> = {
      "activity-prodrome": "elevated",
      "circadian-disintegration": "elevated",
      "withdrawal-cascade": "low",
      "typing-motor-concordance": "anxious",
      "resilience-cluster": "calm",
    };

    for (const signal of signals) {
      const upgrade = signalPriority[signal.id];
      if (upgrade && (base === null || base === "calm")) {
        return upgrade;
      }
    }
  } catch { /* best-effort */ }
  return base;
}

/**
 * Fold today's affect-accent bucket (Phase 2 of the orb affect accent — see
 * docs/superpowers/specs/2026-07-19-orb-affect-accent-phase2-design.md §2) into the derived state.
 * NEVER overrides explicit distress self-report (anxious/low) or an already-elevated state — same gate
 * as foldElevation/foldCompoundSignals. May promote from null unconditionally, but may promote from
 * "calm" ONLY when there is no check-in today: a same-day "I'm okay" is self-report and must never be
 * re-colored by a soft valence estimate off a couple of chat messages (unlike foldElevation's override
 * of calm, which is justified by hypomanic self-report being characteristically unreliable — that
 * justification does not transfer to this signal).
 */
export function foldAffectAccent(
  base: UserState | null,
  today: AffectBucket | null,
  checkedInToday: boolean
): UserState | null {
  if (base !== null && base !== "calm") return base;
  if (base === "calm" && checkedInToday) return base;
  if (!today || today.count < 3) return base; // need a real exchange, not one noisy message
  if (today.valence > -0.4) return base; // not clearly negative
  return today.arousal >= 0.2 ? "anxious" : "low";
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
