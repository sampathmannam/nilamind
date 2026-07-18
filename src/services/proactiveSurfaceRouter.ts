// Phase 22.5 — Card and nudge selection for the proactive surface.
// Takes detected signals and decides what to show the user, where, and when.
// Enforces anti-fatigue, priority ordering, and safety suppression.

import type { CompoundSignal } from "./compoundDetector";
import type { PhaseShiftSuggestion } from "./episodeSuggester";
import { isCardTypeInCooldown, recordProactiveCardEvent } from "./signalStore";
import { isSafetySuppressed } from "./notificationSuppress";
import type { UserState } from "../types/modes";

// Positive/celebratory surfaces are invalidating when the user is already in a hard state — a
// "steady week, that stability quietly helps" card during an elevated/anxious moment reads as the app
// not listening. These are suppressed in those states; risk cards still surface.
const POSITIVE_CARD_TYPES: ReadonlySet<ProactiveCardType> = new Set([
  "resilience_celebration",
  "protective_signal",
]);

export type ProactiveCardType =
  | "sleep_pattern_alert"
  | "activity_shift"
  | "circadian_insight"
  | "typing_pattern"
  | "resilience_celebration"
  | "phase_shift_gentle"
  | "routine_disruption"
  | "connection_dip"
  | "protective_signal";

export interface ProactiveSurfaceCard {
  id: string;
  type: ProactiveCardType;
  priority: number;
  title: string;
  body: string;
  icon: string;
  color: string;
  action?: {
    label: string;
    route: string;
  };
  nudgeText?: string;
  contextBlock?: string;
}

const MAX_CARDS_PER_DAY = 3;
const DEFAULT_COOLDOWN_HOURS = 48;
const RESILIENCE_COOLDOWN_HOURS = 24;

/** Map compound signal IDs to proactive card types. */
function signalToCardType(signal: CompoundSignal): ProactiveCardType {
  switch (signal.id) {
    case "activity-prodrome": return "activity_shift";
    case "circadian-disintegration": return "routine_disruption";
    case "withdrawal-cascade": return "connection_dip";
    case "typing-motor-concordance": return "typing_pattern";
    case "resilience-cluster": return "resilience_celebration";
    default: return "protective_signal";
  }
}

/** Map compound signal to a proactive surface card. */
function signalToCard(signal: CompoundSignal): ProactiveSurfaceCard {
  const type = signalToCardType(signal);
  const icons: Record<string, string> = {
    activity_shift: "activity",
    routine_disruption: "clock",
    connection_dip: "users",
    typing_pattern: "keyboard",
    resilience_celebration: "heart",
    protective_signal: "shield",
    sleep_pattern_alert: "moon",
    circadian_insight: "sun",
    phase_shift_gentle: "eye",
  };
  const colors: Record<string, string> = {
    activity_shift: "amber",
    routine_disruption: "orange",
    connection_dip: "blue",
    typing_pattern: "purple",
    resilience_celebration: "green",
    protective_signal: "teal",
    sleep_pattern_alert: "indigo",
    circadian_insight: "yellow",
    phase_shift_gentle: "amber",
  };
  return {
    id: signal.id,
    type,
    priority: signal.kind === "risk" ? 2 : 4,
    title: signal.label,
    body: signal.detail,
    icon: icons[type] ?? "info",
    color: colors[type] ?? "gray",
    action: signal.kind === "risk"
      ? { label: "Check in", route: "ema_checkin" }
      : undefined,
    nudgeText: `${signal.label} — ${signal.detail.slice(0, 60)}...`,
  };
}

/** Map phase shift to a proactive surface card. */
function phaseShiftToCard(suggestion: PhaseShiftSuggestion): ProactiveSurfaceCard {
  return {
    id: `phase-shift-${suggestion.kind}`,
    type: "phase_shift_gentle",
    priority: 1, // highest priority
    title: suggestion.suggestedCard.title,
    body: suggestion.suggestedCard.body,
    icon: suggestion.suggestedCard.icon,
    color: suggestion.suggestedCard.color,
    action: { label: "How are you feeling?", route: "ema_checkin" },
    nudgeText: suggestion.suggestedCard.body.slice(0, 60) + "...",
  };
}

/** Check if a card type is in cooldown. */
function isInCooldown(type: ProactiveCardType): boolean {
  const cooldownHours = type === "resilience_celebration" ? RESILIENCE_COOLDOWN_HOURS : DEFAULT_COOLDOWN_HOURS;
  return isCardTypeInCooldown(type, cooldownHours);
}

/** True when a proactive positive/celebratory card should be held back for the current mood state. */
function positiveSuppressed(userState?: UserState | null): boolean {
  return userState === "elevated" || userState === "anxious";
}

/**
 * Select the best proactive surface cards from detected signals.
 * Rules:
 * - Max 3 cards per day
 * - Anti-fatigue: same type cooldown 48h (resilience: 24h) — applied to the phase-shift card too
 * - Safety suppression: no cards within the post-§9-crisis window (the SAME latch every other nudge
 *   path honors — notificationSuppress, set by suppressNudgesForCrisis at each crisis entry point).
 *   The previous local check read a "crisis" proactive-card type that is never recorded → dead guard.
 * - Positive cards (resilience/protective) are also held back in an elevated/anxious state.
 * - Priority: phase_shift_gentle > risk > protective
 */
export function selectProactiveCards(
  signals: CompoundSignal[],
  phaseShift?: PhaseShiftSuggestion | null,
  userState?: UserState | null,
): ProactiveSurfaceCard[] {
  if (isSafetySuppressed()) return [];

  const candidates: ProactiveSurfaceCard[] = [];

  // Phase shift has highest priority — but still honors its own anti-fatigue cooldown.
  if (phaseShift && !isInCooldown("phase_shift_gentle")) {
    candidates.push(phaseShiftToCard(phaseShift));
  }

  // Add signal cards
  for (const signal of signals) {
    const card = signalToCard(signal);
    if (isInCooldown(card.type)) continue;
    if (positiveSuppressed(userState) && POSITIVE_CARD_TYPES.has(card.type)) continue;
    candidates.push(card);
  }

  // Sort by priority (lower = higher priority)
  candidates.sort((a, b) => a.priority - b.priority);

  // Cap at MAX_CARDS_PER_DAY
  return candidates.slice(0, MAX_CARDS_PER_DAY);
}

/**
 * Build the single best nudge for the TodayScreen rail.
 * Returns null when silence is better than a nudge.
 */
export function selectProactiveNudge(
  signals: CompoundSignal[],
): { text: string; route: string; icon: string } | null {
  if (isSafetySuppressed()) return null;

  // Surface the strongest risk signal (by confidence when present, else detector order).
  const riskSignals = signals
    .filter((s) => s.kind === "risk")
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  if (riskSignals.length === 0) return null;

  const top = riskSignals[0];
  return {
    text: `${top.label} — worth a quick look`,
    route: "dashboard",
    icon: "alert-circle",
  };
}

/** Record that a card was shown (for anti-fatigue). */
export function markCardShown(card: ProactiveSurfaceCard): void {
  recordProactiveCardEvent({
    id: card.id,
    type: card.type,
    shownAt: new Date().toISOString(),
    dismissed: false,
    clicked: false,
  });
}

/** Record that a card was dismissed. */
export function markCardDismissed(card: ProactiveSurfaceCard): void {
  recordProactiveCardEvent({
    id: card.id,
    type: card.type,
    shownAt: new Date().toISOString(),
    dismissed: true,
    dismissedAt: new Date().toISOString(),
    clicked: false,
  });
}

/** Record that a card was clicked. */
export function markCardClicked(card: ProactiveSurfaceCard): void {
  recordProactiveCardEvent({
    id: card.id,
    type: card.type,
    shownAt: new Date().toISOString(),
    dismissed: false,
    clicked: true,
  });
}
