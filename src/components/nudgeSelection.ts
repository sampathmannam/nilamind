// Pure nudge-visibility selection, extracted from ModeScreen (Phase 4 slice 2a). The footer shows at most
// MAX_NUDGES ambient (non-crisis) nudges; crisis cards are rendered separately and always show. Safety-plan
// asks (follow-up / review / calm-moment) are mutually exclusive and collapse to ONE card by clinical
// priority before the cap. Keeping this as a pure function makes the priority order + cap unit-testable
// without rendering ModeScreen. NOTE: nudge priority is the ARRAY ORDER below — reordering silently changes
// which nudges survive the cap.

export type SafetyPlanCard = "followup" | "review" | "calm" | null;

export const MAX_NUDGES = 2;

export interface NudgeVisibilityInput {
  /** ~48h first follow-up is due (most impactful part of Stanley-Brown). */
  safetyPlanFollowUp: boolean;
  /** A periodic safety-plan review is due. */
  safetyPlanReview: boolean;
  /** The calm-moment fill-a-blank safety-plan nudge wants to show. */
  calmSafetyNudgeShow: boolean;
  sleepProdrome: boolean;
  jitaiShouldNudge: boolean;
  pact: boolean;
  welcome: boolean;
}

export interface NudgeVisibility {
  /** The single safety-plan card to render (highest-priority of the three), or null. */
  safetyPlanCard: SafetyPlanCard;
  /** Ids of the ≤ MAX_NUDGES ambient nudges to render, by priority. */
  visibleNudgeIds: Set<string>;
}

export function selectVisibleNudges(input: NudgeVisibilityInput): NudgeVisibility {
  // Exactly one safety-plan ask by clinical priority: follow-up > review > calm-moment.
  const safetyPlanCard: SafetyPlanCard = input.safetyPlanFollowUp
    ? "followup"
    : input.safetyPlanReview
      ? "review"
      : input.calmSafetyNudgeShow
        ? "calm"
        : null;

  // Priority order IS this array order. The first MAX_NUDGES visible ones survive the cap.
  const nonCrisisNudges = [
    { id: "safetyPlan", show: !!safetyPlanCard },
    { id: "sleep", show: input.sleepProdrome },
    { id: "jitai", show: input.jitaiShouldNudge },
    { id: "pact", show: input.pact },
    { id: "welcome", show: input.welcome },
  ].filter((n) => n.show);

  const visibleNudgeIds = new Set(nonCrisisNudges.slice(0, MAX_NUDGES).map((n) => n.id));
  return { safetyPlanCard, visibleNudgeIds };
}
