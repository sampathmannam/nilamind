// Emotional Intelligence Pre-Processor — helps the 1.5B model respond empathetically.
// Research: DBT validation levels (Linehan 2015), Motivational Interviewing OARS (Miller & Rollnick 2012).
// A 1.5B model can't do complex emotional reasoning, but it CAN follow concrete guidance
// when told explicitly "this person is feeling [X], validate with [Y], avoid [Z]".
// This pre-processor analyzes the user message and injects emotion-aware guidance into the system prompt.

import { detectEmotionUnified } from "./personaConfig";

export interface EmotionGuidance {
  /** Primary emotion detected. */
  primary: string;
  /** DBT validation level (1-5). Higher = deeper validation needed. */
  validationLevel: number;
  /** What to validate. */
  validateWhat: string;
  /** What the model should say (template). */
  sayPattern: string;
  /** What the model must NOT say. */
  neverSay: string[];
}

const EMOTION_PATTERNS: Record<string, EmotionGuidance> = {
  distress: {
    primary: "distress",
    validationLevel: 4,
    validateWhat: "their pain — this is real and hard",
    sayPattern: "Validate deeply first: 'That's so much to carry.' Then ONE gentle question about what would help.",
    neverSay: ["look on the bright side", "it could be worse", "stay positive", "everything happens for a reason", "at least"],
  },
  anxiety: {
    primary: "anxiety",
    validationLevel: 3,
    validateWhat: "their fear — it makes sense they'd feel this way",
    sayPattern: "Acknowledge the anxiety: 'It makes sense you'd feel anxious about this.' Then offer grounding gently.",
    neverSay: ["calm down", "don't worry", "it's not that bad", "just relax", "you're overthinking"],
  },
  sadness: {
    primary: "sadness",
    validationLevel: 2,
    validateWhat: "their sadness — it's okay to be sad, no need to fix it",
    sayPattern: "Sit with them in it: 'That's really sad. I'm here.' Then one gentle question.",
    neverSay: ["cheer up", "it'll get better", "just be happy", "others have it worse", "at least you're not"],
  },
  anger: {
    primary: "anger",
    validationLevel: 2,
    validateWhat: "their anger — it's valid, don't dismiss it",
    sayPattern: "Validate the anger: 'That would make anyone angry.' Then explore what's underneath.",
    neverSay: ["calm down", "you're overreacting", "it's not a big deal", "let it go"],
  },
  numbness: {
    primary: "numbness",
    validationLevel: 3,
    validateWhat: "their emptiness — numbness is its own kind of pain",
    sayPattern: "Acknowledge gently: 'Numbness is hard. Just being here counts.' No pressure to feel anything.",
    neverSay: ["what do you feel", "try to feel something", "you should feel", "snap out of it"],
  },
  hopelessness: {
    primary: "hopelessness",
    validationLevel: 5,
    validateWhat: "their hopelessness — this is deep, don't minimize it",
    sayPattern: "Hold space: 'That's a heavy place to be. You don't have to figure it out right now.'",
    neverSay: ["it gets better", "there's hope", "don't give up", "things will improve", "you'll be fine"],
  },
  loneliness: {
    primary: "loneliness",
    validationLevel: 3,
    validateWhat: "their isolation — loneliness is a real human need not being met",
    sayPattern: "Connect: 'Loneliness hurts. It's not a flaw — it's a need for connection.'",
    neverSay: ["just reach out", "make friends", "put yourself out there", "you're not alone (unless true)"],
  },
  celebration: {
    primary: "celebration",
    validationLevel: 1,
    validateWhat: "their joy — share it, don't analyze it",
    sayPattern: "Celebrate with them: 'That's wonderful! What do you think made today different?'",
    neverSay: ["but", "however", "just remember", "don't get too excited", "that's great, now about"],
  },
  neutral: {
    primary: "neutral",
    validationLevel: 1,
    validateWhat: "their presence — just being here matters",
    sayPattern: "Be present: one warm reflection, one gentle question. Keep it light.",
    neverSay: [],
  },
};

/**
 * Detect the user's primary emotion from their message.
 * Uses the unified keyword matcher from personaConfig, then maps to EMOTION_PATTERNS keys.
 */
export function detectEmotion(message: string): string {
  const unified = detectEmotionUnified(message);
  // Map unified labels to EMOTION_PATTERNS keys
  const MAP: Record<string, string> = {
    crisis: "distress",
    distress: "distress",
    hopeless: "hopelessness",
    numb: "numbness",
    anxious: "anxiety",
    lonely: "loneliness",
    angry: "anger",
    sad: "sadness",
    happy: "celebration",
    overwhelmed: "anxiety",
    stressed: "anxiety",
    neutral: "neutral",
  };
  return MAP[unified] ?? "neutral";
}

/**
 * Get the emotion guidance for a user message.
 * Returns a short string to inject into the system prompt that primes the model
 * for an emotionally appropriate response.
 */
export function getEmotionGuidance(message: string): string {
  const emotion = detectEmotion(message);
  const pattern = EMOTION_PATTERNS[emotion];

  if (!pattern || emotion === "neutral") return "";

  const parts: string[] = [];
  parts.push(`EMOTION: ${pattern.primary} (validation level ${pattern.validationLevel}).`);
  parts.push(`Validate: ${pattern.validateWhat}.`);
  parts.push(`Say: ${pattern.sayPattern}`);

  if (pattern.neverSay.length > 0) {
    parts.push(`NEVER say: ${pattern.neverSay.join(", ")}.`);
  }

  return parts.join(" ");
}

/**
 * Inject emotion guidance into the system prompt.
 * Prepended as a high-priority instruction that overrides the default persona
 * for this specific turn.
 */
export function emotionalSteer(userMessage: string): string {
  const guidance = getEmotionGuidance(userMessage);
  if (!guidance) return "";
  return `[EMOTIONAL GUIDANCE — follow this for this reply]\n${guidance}`;
}
