// Dynamic sampling parameters — adapts temperature and top_p based on conversation context.
// Research: Crisis moments need conservative sampling (low temp, safe responses).
// Celebration/reflection benefits from more creativity (higher temp, more variety).
// The base temperature (0.4) is a safe default for general conversation.

export interface SamplingParams {
  temperature: number;
  top_p: number;
  top_k: number;
}

/**
 * Adapt sampling parameters based on the conversation scenario.
 * Returns the recommended temperature, top_p, and top_k for the given context.
 */
export function adaptiveSampling(params: {
  scenario: "crisis" | "anxiety" | "low_mood" | "celebration" | "reflection" | "protocol" | "normal";
}): SamplingParams {
  switch (params.scenario) {
    case "crisis":
      // Most conservative — safety-critical. Keep responses predictable and within distribution.
      return { temperature: 0.2, top_p: 0.8, top_k: 20 };

    case "anxiety":
    case "low_mood":
      // Slightly more warmth than crisis, but still safe. Validated responses preferred.
      return { temperature: 0.35, top_p: 0.85, top_k: 30 };

    case "protocol":
      // Protocol-guided — needs to follow instructions precisely. Lower temp = better instruction following.
      return { temperature: 0.3, top_p: 0.85, top_k: 25 };

    case "celebration":
      // More creative and varied — celebration moments benefit from personality.
      return { temperature: 0.6, top_p: 0.95, top_k: 50 };

    case "reflection":
      // Reflective responses benefit from slightly more creativity while staying grounded.
      return { temperature: 0.5, top_p: 0.9, top_k: 40 };

    case "normal":
    default:
      // Balanced default — safe but not boring.
      return { temperature: 0.4, top_p: 0.95, top_k: 40 };
  }
}

/** Detect the conversation scenario from the user message and context. */
export function detectScenario(
  userMessage: string,
  context: { isCrisis: boolean; recentMoodAvg: number | null; protocolActive: boolean },
): "crisis" | "anxiety" | "low_mood" | "celebration" | "reflection" | "protocol" | "normal" {
  if (context.isCrisis) return "crisis";
  if (context.protocolActive) return "protocol";

  const lower = userMessage.toLowerCase();

  // Celebration markers
  if (/great|amazing|wonderful|fantastic|happy|grateful|celebrat/i.test(lower)) {
    return "celebration";
  }

  // Reflection markers — questions about self, patterns, "why"
  if (/why.*feel|what.*wrong|why.*happen|why.*me|reflect|think.*about/i.test(lower)) {
    return "reflection";
  }

  // Anxiety markers
  if (/anxious|anxiety|worried|panic|scared|nervous|fear/i.test(lower)) {
    return "anxiety";
  }

  // Low mood markers
  if (context.recentMoodAvg !== null && context.recentMoodAvg <= 4) {
    return "low_mood";
  }
  if (/sad|depressed|low|down|hopeless|numb|can't|nothing.*help/i.test(lower)) {
    return "low_mood";
  }

  return "normal";
}
