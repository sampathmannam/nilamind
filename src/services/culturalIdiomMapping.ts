/**
 * Cultural idiom → emotion mapping.
 *
 * South Asian users often express emotions through culturally specific idioms
 * ("tension", "pressure", "heavy heart", "mind is racing") that standard
 * English emotion lexicons miss. This module maps those idioms to recognized
 * emotion keywords so the agent and context system can understand them.
 *
 * Research basis: Cultural idioms of distress are well-documented across
 * South Asian populations (Nortje et al., 2016; Kaiser et al., 2015).
 * "Tension" is the most common Hindi/Urdu somatic-心理 idiom for anxiety
 * (Ichhpujani et al., 2012). Indian English inherits these patterns.
 */

const IDIOM_MAP: { pattern: RegExp; emotion: string }[] = [
  // Tension / anxiety cluster
  { pattern: /\b(?:so\s+)?tension\b/i, emotion: "anxious" },
  { pattern: /\btension\s+(?:hai|is|feeling|me|inside)\b/i, emotion: "anxious" },

  // Pressure / overwhelm cluster
  { pattern: /\b(?:so\s+)?pressure\b/i, emotion: "overwhelmed" },
  { pattern: /\bpressure\s+(?:hai|is|on\s+me|building)\b/i, emotion: "overwhelmed" },

  // Heavy heart / sadness cluster
  { pattern: /\bheavy\s+heart\b/i, emotion: "sad" },
  { pattern: /\bheart\s+is\s+sinking\b/i, emotion: "sad" },
  { pattern: /\bheart\s+(?:feels?|is)\s+(?:heavy|sinking|empty)\b/i, emotion: "sad" },

  // Racing mind / anxiety cluster
  { pattern: /\bmind\s+is\s+racing\b/i, emotion: "anxious" },
  { pattern: /\bthoughts?\s+(?:are\s+)?racing\b/i, emotion: "anxious" },

  // Boiling / anger cluster
  { pattern: /\b(?:boiling|burning)\s+(?:inside|within)\b/i, emotion: "angry" },
  { pattern: /\banger\s+(?:is\s+)?(?:building|rising|boiling)\b/i, emotion: "angry" },

  // No peace / inner turmoil
  { pattern: /\bno\s+peace\b/i, emotion: "anxious" },
  { pattern: /\binner\s+(?:turmoil|chaos|conflict)\b/i, emotion: "anxious" },

  // Restlessness
  { pattern: /\brestless\s+(?:inside|within|feeling)\b/i, emotion: "restless" },
  { pattern: /\bcan'?t\s+(?:sit\s+still|settle|relax)\b/i, emotion: "restless" },

  // Burning stomach / gut (Indian somatic idiom)
  { pattern: /\bburning\s+(?:stomach|gut|inside)\b/i, emotion: "anxious" },

  // Eyes heavy / fatigue idiom
  { pattern: /\beyes?\s+(?:are\s+)?heavy\b/i, emotion: "tired" },
];

/**
 * Map a cultural idiom of distress to a recognized emotion keyword.
 * Returns null when no idiom pattern is detected.
 */
export function mapCulturalIdiom(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const { pattern, emotion } of IDIOM_MAP) {
    if (pattern.test(lower)) return emotion;
  }
  return null;
}

/**
 * Quick check: does this text contain a cultural idiom?
 */
export function isCulturalIdiom(text: string): boolean {
  return mapCulturalIdiom(text) !== null;
}
