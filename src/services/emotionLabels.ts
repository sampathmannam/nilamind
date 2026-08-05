/**
 * Emotion Differentiation Micro-Practice (Feature 6).
 *
 * Evidence: Widdershoven et al. 2019 (ESM improves negative emotion differentiation),
 * Lieberman et al. 2007 (affect labeling dampens amygdala), Probst et al. 2018
 * (skill-use days → lower same-day SI).
 *
 * The diary card's 6-slider emotion tier is *valence/intensity* but not *differentiated*.
 * Adding a discrete-label chip set turns a tracking field into the intervention itself.
 *
 * This module is pure — no persistence, no side effects. DiaryCardScreen owns the state.
 */

export interface DiscreteEmotion {
  readonly id: string;
  readonly label: string;
  readonly valence: "negative" | "positive";
  readonly arousal: "high" | "low";
}

/**
 * Curated set of 10 discrete emotion labels.  Covers the high-arousal distress
 * cluster (prickly, shaky, furious, wired) that slides miss, the low-arousal
 * cluster (heavy, empty, numb) that mania flattens, and three positive states.
 *
 * These overlap with the emotionGranularity families on purpose: the granularity
 * step in the check-in suggests 3 per family, but the diary-card chip picker
 * shows the full set — the user picks whichever "names the wave" best.
 */
export const DISCRETE_EMOTIONS: readonly DiscreteEmotion[] = [
  // Distress — high arousal
  { id: "prickly", label: "Prickly", valence: "negative", arousal: "high" },
  { id: "shaky",   label: "Shaky",   valence: "negative", arousal: "high" },
  { id: "furious", label: "Furious", valence: "negative", arousal: "high" },
  { id: "wired",   label: "Wired",   valence: "negative", arousal: "high" },
  // Distress — low arousal
  { id: "heavy",   label: "Heavy",   valence: "negative", arousal: "low" },
  { id: "empty",   label: "Empty",   valence: "negative", arousal: "low" },
  { id: "numb",    label: "Numb",    valence: "negative", arousal: "low" },
  // Positive
  { id: "bright",  label: "Bright",  valence: "positive", arousal: "high" },
  { id: "calm",    label: "Calm",    valence: "positive", arousal: "low" },
  { id: "warm",    label: "Warm",    valence: "positive", arousal: "low" },
] as const;

const LOOKUP = new Map(DISCRETE_EMOTIONS.map((e) => [e.id, e]));

/** Look up a discrete emotion by id. Returns undefined for unknown ids. */
export function getDiscrete(id: string): DiscreteEmotion | undefined {
  return LOOKUP.get(id);
}

/**
 * Enrich a broad diary-card emotion (e.g. "misery", "anger", "fear") with
 * a discrete label.  Returns a human-readable string: "Misery → heavy".
 *
 * If the discrete id is unknown, returns the broad label unchanged.
 */
export function differentiateEmotion(broadLabel: string, discreteId: string): string {
  const broad = broadLabel.charAt(0).toUpperCase() + broadLabel.slice(1).toLowerCase();
  const discrete = LOOKUP.get(discreteId);
  if (!discrete) return broad;
  return `${broad} → ${discrete.label.toLowerCase()}`;
}

/**
 * Count the number of distinct discrete-emotion labels that appear across a
 * list of diary-card entries (each entry may have zero or more discrete labels).
 *
 * Used for the weekly synthesis: "This week you named N distinct feelings vs M
 * last week — noticing more shades helps waves pass sooner."
 */
export function countDistinctEmotions(
  entries: ReadonlyArray<{ discreteEmotions?: readonly string[] }>,
): number {
  const seen = new Set<string>();
  for (const e of entries) {
    if (e.discreteEmotions) {
      for (const id of e.discreteEmotions) {
        if (LOOKUP.has(id)) seen.add(id);
      }
    }
  }
  return seen.size;
}
