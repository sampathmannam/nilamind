// Curated emotion taxonomy — 6 families, 72 words. Evidence basis: Barrett 2004 (emotion
// granularity predicts better regulation), Lieberman 2007 (affect labeling reduces amygdala
// activation), Kashdan 2015 (emotion differentiation is a transdiagnostic resilience factor).
// Layout mirrors How We Feel's progressive-disclosure approach: coarse (mood tap) → specific
// (granular pick). Intensity ranges are approximate and guide which family surfaces first.

export interface EmotionFamily {
  family: string;
  base: string;
  words: string[];
  intensity: [number, number];
}

export const EMOTION_FAMILIES: EmotionFamily[] = [
  {
    family: "Sad / Low",
    base: "Low",
    words: [
      "Disappointed", "Drained", "Numb", "Empty", "Defeated", "Hopeless",
      "Heavy", "Lonely", "Hurt", "Grief-stricken", "Melancholy", "Disconnected",
    ],
    intensity: [3, 8],
  },
  {
    family: "Anxious / Afraid",
    base: "Anxious",
    words: [
      "Worried", "Panicked", "On-edge", "Overwhelmed", "Restless", "Tense",
      "Dread", "Insecure", "Trapped", "Avoidant", "Paranoid", "Startled",
    ],
    intensity: [3, 9],
  },
  {
    family: "Angry / Frustrated",
    base: "Angry",
    words: [
      "Irritated", "Resentful", "Furious", "Betrayed", "Bitter", "Defensive",
      "Indignant", "Explosive", "Seething", "Snapping", "Aggravated", "Provoked",
    ],
    intensity: [4, 9],
  },
  {
    family: "Shame / Self-critical",
    base: "Numb",
    words: [
      "Ashamed", "Guilty", "Inadequate", "Self-loathing", "Worthless", "Humiliated",
      "Embarrassed", "Regretful", "Self-conscious", "Exposed", "Flawed", "Failure",
    ],
    intensity: [5, 9],
  },
  {
    family: "Disgust / Aversion",
    base: "Low",
    words: [
      "Repulsed", "Sickened", "Fed-up", "Done", "Revolted", "Contempt",
      "Distaste", "Sceptical", "Cynical", "Jaded", "Bored", "Apathetic",
    ],
    intensity: [2, 7],
  },
  {
    family: "Positive / Well",
    base: "Okay",
    words: [
      "Calm", "Content", "Grateful", "Relieved", "Hopeful", "Optimistic",
      "Proud", "Curious", "Playful", "Connected", "Engaged", "Peaceful",
    ],
    intensity: [1, 3],
  },
];

export function familyForBroad(label: string): EmotionFamily | undefined {
  const l = label.toLowerCase().trim();
  if (l === "fear" || l === "surprise") return EMOTION_FAMILIES[1];
  if (l === "sadness") return EMOTION_FAMILIES[0];
  if (l === "anger") return EMOTION_FAMILIES[2];
  if (l === "disgust") return EMOTION_FAMILIES[4];
  if (l === "joy" || l === "trust" || l === "anticipation") return EMOTION_FAMILIES[5];
  if (l === "numb") return EMOTION_FAMILIES[3];
  if (l === "low") return EMOTION_FAMILIES[0];
  if (l === "anxious" || l === "overwhelmed") return EMOTION_FAMILIES[1]; // #10: "Overwhelmed" is an Anxious-family word
  if (l === "angry") return EMOTION_FAMILIES[2];
  if (l === "ashamed" || l === "guilty" || l === "worthless") return EMOTION_FAMILIES[3];
  if (l === "okay" || l === "calm" || l === "good") return EMOTION_FAMILIES[5];
  return undefined;
}
