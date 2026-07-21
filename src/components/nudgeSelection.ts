export type SafetyPlanCard = "followup" | "review" | "calm" | null;

export const MAX_NUDGES = 3;

export interface NudgeVisibilityInput {
  safetyPlanFollowUp: boolean;
  safetyPlanReview: boolean;
  calmSafetyNudgeShow: boolean;
  sleepProdrome: boolean;
  jitaiShouldNudge: boolean;
  pact: boolean;
  welcome: boolean;
}

export interface NudgeVisibility {
  safetyPlanCard: SafetyPlanCard;
  visibleNudgeIds: Set<string>;
  totalNudges: number;
}

export function selectVisibleNudges(input: NudgeVisibilityInput): NudgeVisibility {
  const safetyPlanCard: SafetyPlanCard = input.safetyPlanFollowUp
    ? "followup"
    : input.safetyPlanReview
      ? "review"
      : input.calmSafetyNudgeShow
        ? "calm"
        : null;

  const nonCrisisNudges = [
    { id: "safetyPlan", show: !!safetyPlanCard },
    { id: "sleep", show: input.sleepProdrome },
    { id: "jitai", show: input.jitaiShouldNudge },
    { id: "pact", show: input.pact },
    { id: "welcome", show: input.welcome },
  ].filter((n) => n.show);

  const visibleNudgeIds = new Set(nonCrisisNudges.map((n) => n.id));
  return { safetyPlanCard, visibleNudgeIds, totalNudges: nonCrisisNudges.length };
}
