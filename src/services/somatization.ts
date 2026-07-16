/**
 * Somatization-aware emotion mapping.
 *
 * Many users — especially in South Asian contexts — express emotional distress through
 * physical symptoms ("my head hurts", "chest feels tight", "can't sleep"). This module
 * maps somatic expressions to recognized emotion keywords so the agent and context
 * system can understand the underlying emotional state.
 *
 * Research basis: Somatization is the most common presentation of depression/anxiety
 * in South Asian populations (Grover et al., 2017; Isaac et al., 2019). Up to 60% of
 * depression presents as physical symptoms in India (WHO SUPRE-MH).
 */

const SOMATIC_MAP: { pattern: RegExp; emotion: string }[] = [
  // Head / neurological
  { pattern: /\bhead\w*\s+(?:(?:is|feels?|feeling)\s+)?(?:pound|ache|hurt|throb|pain)\w*\b/i, emotion: "stressed" },
  { pattern: /\b(?:headache|migraine)\b/i, emotion: "stressed" },
  { pattern: /\b(?:dizzy|lightheaded|faint|spinning)\b/i, emotion: "anxious" },
  { pattern: /\b(?:ringing in|tinnitus)\b/i, emotion: "stressed" },

  // Chest / respiratory
  { pattern: /\bchest\w*\s+(?:(?:is|feels?|feeling)\s+)?(?:tight|heavy|pain|ache|hurt|constrict)\w*\b/i, emotion: "anxious" },
  { pattern: /\b(?:tight|heavy)\s+chest\b/i, emotion: "anxious" },
  { pattern: /\bcan'?t\s+(?:catch\s+(?:my\s+)?breath|breathe\w*)\b/i, emotion: "anxious" },
  { pattern: /\b(?:shortness of breath|breathless)\b/i, emotion: "anxious" },
  { pattern: /\bheart\w*\s+(?:is\s+)?(?:race|pound|beat\s+fast|pounding)\w*\b/i, emotion: "anxious" },
  { pattern: /\b(?:palpitation)\w*\b/i, emotion: "anxious" },

  // Stomach / GI
  { pattern: /\bstomach\w*\s+(?:(?:is|feels?|feeling)\s+)?(?:hurt|ache|pain|churn|knot|butterfly)\w*\b/i, emotion: "anxious" },
  { pattern: /\b(?:nausea|nauseous|vomit|throw\s+up)\b/i, emotion: "anxious" },
  { pattern: /\bgut\w*\s+(?:(?:is|feels?|feeling)\s+)?(?:wrench|churn|knot)\w*\b/i, emotion: "anxious" },
  { pattern: /\bbutterflies\s+in\s+(?:my\s+)?stomach\b/i, emotion: "anxious" },
  { pattern: /\b(?:diarrhea|loose\s+motion)\b/i, emotion: "anxious" },

  // Sleep
  { pattern: /\bcan'?t\s+(?:fall\s+)?asleep\b/i, emotion: "anxious" },
  { pattern: /\b(?:insomnia|trouble\s+sleeping)\b/i, emotion: "anxious" },
  { pattern: /\bwaking\s+up\s+(?:at\s+night|early)\b/i, emotion: "anxious" },

  // Musculoskeletal
  { pattern: /\bbody\w*\s+(?:(?:is|feels?|feeling)\s+)?(?:ache|pain|hurt|sore)\w*\b/i, emotion: "tired" },
  { pattern: /\bmuscle\w*\s+(?:(?:is|feels?|feeling)\s+)?(?:ache|pain|tight|stiff)\w*\b/i, emotion: "tired" },
  { pattern: /\b(?:fatigue|fatigued|exhausted|drained|worn\s+out)\b/i, emotion: "tired" },
  { pattern: /\b(?:no\s+energy|low\s+energy)\b/i, emotion: "tired" },
  { pattern: /\bback\w*\s+(?:(?:is|feels?|feeling)\s+)?(?:pain|ache|hurt)\w*\b/i, emotion: "stressed" },

  // General
  { pattern: /\b(?:sweating|sweaty|clammy|hot\s+flash)\b/i, emotion: "anxious" },
  { pattern: /\b(?:trembl|shak|jitter)\w*\b/i, emotion: "anxious" },
  { pattern: /\bthroat\w*\s+(?:(?:is|feels?|feeling)\s+)?(?:tight|lump|constrict)\w*\b/i, emotion: "sad" },
  { pattern: /\blump\s+in\s+(?:my\s+)?throat\b/i, emotion: "sad" },
];

/**
 * Map a somatic (physical) expression to an underlying emotion keyword.
 * Returns null when no somatic pattern is detected.
 */
export function mapSomaticExpression(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const { pattern, emotion } of SOMATIC_MAP) {
    if (pattern.test(lower)) return emotion;
  }
  return null;
}

/**
 * Quick check: does this text contain a somatic expression?
 */
export function isSomaticExpression(text: string): boolean {
  return mapSomaticExpression(text) !== null;
}
