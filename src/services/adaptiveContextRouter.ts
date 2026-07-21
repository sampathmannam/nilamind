/**
 * AdaptiveContextRouter — state/time-based prioritization for the unified engagement system.
 * Phase 2 (Intent Convergence): determines what to surface based on user state + time.
 * Pure functions, no side effects.
 */

export type UserState = "calm" | "anxious" | "low" | "elevated" | "crisis" | "mixed";
export type TimeBlock = "morning" | "afternoon" | "evening" | "night";

export interface RoutingContext {
  state: UserState | null;
  timeBlock: TimeBlock;
  completedToday: boolean;
  hasRecentEpisode: boolean;
  streakDays: number;
}

export interface RoutedSuggestion {
  phase: "calm" | "data" | "protocol";
  toolId: string;
  reason: string;
}

const STATE_PHASE: Record<UserState, "calm" | "data" | "protocol"> = {
  calm: "protocol",
  anxious: "calm",
  low: "data",
  elevated: "calm",
  crisis: "calm",
  mixed: "data",
};

const TIME_PHASE: Record<TimeBlock, "calm" | "data" | "protocol"> = {
  morning: "data",
  afternoon: "data",
  evening: "protocol",
  night: "calm",
};

const STATE_TOOLS: Partial<Record<UserState, string[]>> = {
  anxious: ["plan", "winddown"],
  elevated: ["plan", "winddown"],
  low: ["diary", "ema_checkin"],
  crisis: ["plan", "episode"],
  calm: ["values_to_action", "problem_solving"],
  mixed: ["diary", "assessment"],
};

const TIME_TOOLS: Record<TimeBlock, string[]> = {
  morning: ["ema_checkin", "diary"],
  afternoon: ["assessment", "social_rhythm"],
  evening: ["winddown", "values_to_action"],
  night: ["winddown", "plan"],
};

export function routeByContext(ctx: RoutingContext): RoutedSuggestion {
  const statePhase = ctx.state ? STATE_PHASE[ctx.state] : null;
  const timePhase = TIME_PHASE[ctx.timeBlock];

  const phase = statePhase ?? timePhase;

  const stateTools = ctx.state ? STATE_TOOLS[ctx.state] ?? [] : [];
  const timeTools = TIME_TOOLS[ctx.timeBlock];

  const toolId = stateTools[0] ?? timeTools[0] ?? "diary";

  let reason: string;
  if (ctx.state && stateTools.length > 0) {
    reason = `Recommended for your current state (${ctx.state})`;
  } else {
    reason = `Suggested for ${ctx.timeBlock}`;
  }

  return { phase, toolId, reason };
}
