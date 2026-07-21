// nudgePrioritization — selects the single highest-priority in-app nudge for TodayScreen.
// Rule: max 1 nudge visible at a time, safety-first cascade.

export type NudgeCandidate = {
  hasSafetyPlanNudge: boolean;
  hasReCheckIn: boolean;
  hasPendingDraft: boolean;
  hasWellbeingDue: boolean;
  hasAssessmentPrompt: boolean;
  hasProactiveNudge: boolean;
};

export type NudgeType =
  | "safety_plan"
  | "re_checkin"
  | "pending_draft"
  | "wellbeing_due"
  | "assessment_prompt"
  | "proactive";

const PRIORITY: NudgeType[] = [
  "safety_plan",      // 1 — safety-critical
  "re_checkin",       // 2 — engagement recovery after gap
  "pending_draft",    // 3 — conversational check-in waiting
  "wellbeing_due",    // 4 — longitudinal assessment
  "assessment_prompt", // 5 — contextual screening
  "proactive",        // 6 — insight-based nudge (lowest)
];

const FLAG_MAP: [keyof NudgeCandidate, NudgeType][] = [
  ["hasSafetyPlanNudge", "safety_plan"],
  ["hasReCheckIn", "re_checkin"],
  ["hasPendingDraft", "pending_draft"],
  ["hasWellbeingDue", "wellbeing_due"],
  ["hasAssessmentPrompt", "assessment_prompt"],
  ["hasProactiveNudge", "proactive"],
];

/** Returns the single highest-priority nudge, or null if none are available. */
export function selectTopNudge(candidates: NudgeCandidate): NudgeType | null {
  for (const nudgeType of PRIORITY) {
    const flag = FLAG_MAP.find(([, t]) => t === nudgeType)?.[0];
    if (flag && candidates[flag]) return nudgeType;
  }
  return null;
}
