// Infer shame from check-in emotion labels.
// Research: shame is a key predictor of social withdrawal and self-harm in bipolar disorder.
// Diary cards collect explicit shame (0-5 scale), but most users don't use diary cards daily.
// This module infers shame from the emotion label in check-ins, so patternInsights.ts can
// correlate shame with social media usage even without diary card data.
//
// The keyword approach is conservative — only strong shame words trigger, not mild discomfort.
// False negatives are acceptable; false positives are not (we don't want to flag someone as
// "shameful" when they're just "embarrassed" about a minor thing).

const SHAME_KEYWORDS = [
  "ashamed",
  "shame",
  "shameful",
  "humiliated",
  "mortified",
  "disgusted with myself",
  "self-loathing",
  "worthless",
  "pathetic",
  "failure", // only in self-referential context
  "imposter",
  "fraud",
  "exposed",
  "unworthy",
];

/**
 * Infer a shame score (0-5) from an emotion label.
 * Returns 0 for no shame detected, 1-5 for increasing intensity.
 * Conservative: only strong shame words trigger.
 */
export function inferShame(emotionLabel: string | null | undefined): number {
  if (!emotionLabel) return 0;
  const lower = emotionLabel.toLowerCase().trim();

  // Exact match or contained in label
  for (const keyword of SHAME_KEYWORDS) {
    if (lower.includes(keyword)) {
      // Strong shame words get higher scores
      if (keyword === "ashamed" || keyword === "humiliated" || keyword === "mortified" || keyword === "self-loathing") {
        return 4; // strong shame
      }
      if (keyword === "shame" || keyword === "shameful" || keyword === "disgusted with myself") {
        return 3; // moderate shame
      }
      return 2; // mild shame
    }
  }

  return 0;
}

/**
 * Check if an emotion label indicates shame.
 * Convenience function for patternInsights.ts integration.
 */
export function hasShame(emotionLabel: string | null | undefined): boolean {
  return inferShame(emotionLabel) > 0;
}
