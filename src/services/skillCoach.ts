/**
 * In-the-Moment Skill Coach (Feature 1 / Phase E).
 *
 * Evidence: Rizvi et al. 2011, 2016 (DBT Coach reduced NSSI at moment of urge),
 * Simon et al. 2022 (unaccompanied dumps → HR 1.29 harm), Probst et al. 2018
 * (skill-use days → lower same-day SI), Neacsiu et al. 2010 (skills use mediates outcomes).
 *
 * Safety: scanForCrisis must return null BEFORE any offer. Elevation → no offer.
 * Anti-sycophancy: Nila never validates the urge, only the *skill*.
 *
 * Pure service — no React, no side-effects. Chat flow owns the trigger.
 */

export interface SkillOffer {
  skillId: string;
  family: "mindfulness" | "distress" | "emotion" | "interpersonal" | "crisis";
  /** Deterministic regex matched against user message. Never LLM. */
  triggerPattern: RegExp;
  /** 60-second guided micro-script the user can follow right now. */
  microScript: string;
  /** Follow-up prompt for the skills-practice log entry. */
  followUp: string;
}

const URGE_SURFING: SkillOffer = {
  skillId: "urge_surfing",
  family: "distress",
  triggerPattern: /(?:urge|craving|want to (?:cut|drink|use|binge|purge|skip)|can'?t resist|impulse|acting on it)/i,
  microScript:
    "Urge surfing — ride the wave:\n" +
    "1. Close your eyes for a moment. Notice where the urge lives in your body — chest, throat, hands.\n" +
    "2. Breathe in slowly for 4 counts. As you exhale, imagine the urge as a wave in the ocean.\n" +
    "3. The wave is rising. That's okay — you don't have to act on it. Just watch it.\n" +
    "4. Name it: 'This is an urge. It will pass.'\n" +
    "5. Keep breathing. Most urges peak within 20–30 minutes. You're already riding it.\n" +
    "6. When it dips, open your eyes. You stayed. That counts.",
  followUp: "Did urge surfing help? Tap to log this practice.",
};

const STOP_SKILL: SkillOffer = {
  skillId: "stop",
  family: "distress",
  triggerPattern: /(?:panic|overwhelm|can'?t breathe|spinning|out of control|racing|hyperventilat)/i,
  microScript:
    "STOP — a quick reset when everything feels like too much:\n" +
    "S — Stop. Whatever you're doing, pause right now.\n" +
    "T — Take a breath. One slow, deep breath in through your nose, out through your mouth.\n" +
    "O — Observe. What's happening in your body? What emotion is here? Name it without judging it.\n" +
    "P — Proceed mindfully. What is the *one* small thing you can do right now that helps, not hurts?",
  followUp: "Did STOP help you catch your breath? Tap to log this practice.",
};

const CHECK_FACTS: SkillOffer = {
  skillId: "check_the_facts",
  family: "emotion",
  triggerPattern: /(?:everyone (?:hates|thinks)|nobody|always mess|never work|worthless|failure|stupid|useless|can'?t do anything right|fit unchecked|catastroph)/i,
  microScript:
    "Check the Facts — before the story runs away with you:\n" +
    "1. What actually happened? Just the observable facts, not the meaning you added.\n" +
    "2. What emotion are you feeling? Name it (e.g., shame, fear, anger).\n" +
    "3. What's the story you're telling yourself?\n" +
    "4. Is there another way to see this? What would a kind friend say?\n" +
    "5. On a scale of 0–10, how intense is the emotion now vs. before you checked?",
  followUp: "Did checking the facts shift anything? Tap to log this practice.",
};

const ACCUMULATE_POSITIVES: SkillOffer = {
  skillId: "accumulate_positives",
  family: "emotion",
  triggerPattern: /(?:nothing (?:good|fun|enjoy)|empty inside|bored|no point|why bother|don'?t care anymore|anhedonia|flat|numb inside)/i,
  microScript:
    "Accumulate Positives — small things that fill the well:\n" +
    "1. Right now, can you do ONE tiny pleasant thing? (A sip of tea, a song you like, stepping outside for 30 seconds.)\n" +
    "2. You don't have to feel 'motivated' first — just do the action. Motivation often follows action, not the other way around.\n" +
    "3. Write down one thing you used to enjoy. Can you schedule 10 minutes of it this week?\n" +
    "4. Notice: even a small pleasure counts. You're not broken — your radar is just tuned to threat right now.",
  followUp: "Did you try something small? Tap to log this practice.",
};

const BREATHING_OFFER: SkillOffer = {
  skillId: "paced_breathing",
  family: "mindfulness",
  triggerPattern: /(?:anxious|nervous|tense|can'?t calm|wound up|on edge|stressed|worried|dread)/i,
  microScript:
    "Paced breathing — 6 breaths per minute calms your nervous system:\n" +
    "1. Breathe in through your nose for 5 seconds.\n" +
    "2. Breathe out through your mouth for 5 seconds.\n" +
    "3. Repeat 5 more times (6 breaths total = about 1 minute).\n" +
    "4. If your mind wanders, that's fine — just come back to the counting.\n" +
    "5. Notice how your body feels after those 6 breaths. You gave your nervous system a reset.",
  followUp: "Did breathing help? Tap to log this practice.",
};

/** All available skill offers, ordered by specificity. */
export const SKILL_OFFERS: readonly SkillOffer[] = [
  URGE_SURFING,
  STOP_SKILL,
  BREATHING_OFFER,
  CHECK_FACTS,
  ACCUMULATE_POSITIVES,
];

/**
 * Select a skill offer based on the user's message.
 *
 * Returns null when:
 * - No pattern matches (no offer is better than a wrong offer)
 * - The caller has not verified crisis/elevation gates first
 *
 * Deterministic — no LLM, no randomness, no state.
 */
export function selectSkill(userMessage: string): SkillOffer | null {
  for (const offer of SKILL_OFFERS) {
    if (offer.triggerPattern.test(userMessage)) return offer;
  }
  return null;
}

/**
 * Build the chat message to send when offering a skill.
 * Returns the formatted string the user sees, or null if no skill was selected.
 */
export function formatSkillOffer(offer: SkillOffer): string {
  return `I hear you. Here's a skill that might help right now:\n\n**${offer.skillId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}**\n\n${offer.microScript}\n\n_${offer.followUp}_`;
}
