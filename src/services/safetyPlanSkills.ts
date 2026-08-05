/**
 * Safety-Plan Skills Bridge (Feature 11 / Phase J).
 *
 * Evidence: Bryan et al. 2017 (crisis response planning > contracts),
 * Rizvi et al. 2016 (in-moment skills reduce NSSI), Barber & Miller 2014
 * (means restriction), §9 determinism.
 *
 * Converts the safety plan's passive coping text into an executable,
 * skill-anchored response sequence. Crisis behavior is never routed
 * through the LLM.
 *
 * Pure service — no React, no side-effects.
 */

export interface SafetyLadderStep {
  skillId: string;
  label: string;
  duration?: string;
  instructions: string;
}

export interface SafetyPlanSkillsBridge {
  steps: SafetyLadderStep[];
  lastUsed?: string;
  /** ISO timestamp — 24h after last use. While active, the bridge shows "already used recently". */
  cooldownUntil?: string;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Default ordered skills ladder for crisis response.
 * Heat-safe TIPP: cool splash, not ice (Kinoshita 2021).
 */
export const DEFAULT_LADDER: readonly SafetyLadderStep[] = [
  { skillId: "stop", label: "STOP", duration: "60 seconds", instructions: "Freeze. Breathe. Observe." },
  { skillId: "pace", label: "Paced Breathing", duration: "2 minutes", instructions: "In 4, out 6, 10 rounds." },
  { skillId: "surf", label: "Urge Surfing", duration: "3\u20135 minutes", instructions: "Notice the urge as a wave. Watch it crest and fall." },
  { skillId: "tipp", label: "TIPP (Heat-Safe)", duration: "3 minutes", instructions: "Splash cool water on face. Breathe slowly." },
  { skillId: "delay", label: "Delay 24 Hours", duration: "24 hours", instructions: "Put off acting on this urge for 24 hours." },
  { skillId: "reach", label: "Reach Out", duration: "When ready", instructions: "Call someone you trust, or a crisis line." },
] as const;

/**
 * Create a fresh skills bridge with the default ladder.
 */
export function createSkillsBridge(): SafetyPlanSkillsBridge {
  return { steps: [...DEFAULT_LADDER] };
}

/**
 * Mark the bridge as used now. Sets lastUsed and cooldownUntil.
 */
export function markUsed(bridge: SafetyPlanSkillsBridge, now: Date = new Date()): SafetyPlanSkillsBridge {
  const ts = now.toISOString();
  return {
    ...bridge,
    lastUsed: ts,
    cooldownUntil: new Date(now.getTime() + COOLDOWN_MS).toISOString(),
  };
}

/**
 * Check if the bridge is in cooldown (used within the last 24 hours).
 */
export function isInCooldown(bridge: SafetyPlanSkillsBridge, now: Date = new Date()): boolean {
  if (!bridge.cooldownUntil) return false;
  return new Date(bridge.cooldownUntil).getTime() > now.getTime();
}

/**
 * Get the next step in the ladder after a given skillId.
 * Returns undefined if the given skill is the last step.
 */
export function nextStep(bridge: SafetyPlanSkillsBridge, currentSkillId: string): SafetyLadderStep | undefined {
  const idx = bridge.steps.findIndex((s) => s.skillId === currentSkillId);
  return idx >= 0 && idx < bridge.steps.length - 1 ? bridge.steps[idx + 1] : undefined;
}
