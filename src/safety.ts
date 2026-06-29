/**
 * Deterministic Safety Layer for NilaMind
 * Performs offline-first keyword scans to detect crisis inputs and unsafe AI outputs.
 */

import { getCrisisLines, crisisDigits } from "./services/crisisResources";

export const SUICIDAL_KEYWORDS = [
  "kill myself", "killing myself", "killed myself", // gerund/past: "thinking about KILLING myself" must trip
  "end my life", "ending my life", "take my life", "taking my life",
  "want to die", "want to be dead", "wish i was dead", "wish i were dead",
  "dont want to be here", "don't want to be here",
  "dont want to live", "don't want to live", "better off dead", "no reason to live", "cant go on",
  "can't go on", "end it all", "not worth living", "suicide", "suicidal",
  "ending things", "wont be around", "won't be around", "goodbye forever"
];

export const SELF_HARM_KEYWORDS = [
  "hurt myself", "cut myself", "harm myself", "cutting", "self harm", "self-harm",
  "burn myself", "hit myself", "punish myself", "deserve pain", "want to bleed"
];

export const INDIRECT_METAPHORS = [
  "disappear without a trace", "make it stop forever", "permanent solution",
  "want it all to end", "stop existing", "go to sleep and not wake up",
  "dont want to wake up anymore", "don't want to wake up anymore",
  "notice if i disappeared", "notice if i was gone", "notice if i wasnt here", "notice if i wasn't here",
  "everyone better off without me", "be gone", "vanish"
];

// First-person OVERDOSE/ingestion disclosures — past-tense ACTION phrasing only, so they catch a real
// disclosure ("I just took a whole bunch of my pills") WITHOUT the precision collision that kept bare
// "overdose"/"take my pills" out of the input gate (see safety.test.ts benign controls: "take my pills
// tonight", "his overdose last year" must stay safe — none of these match those).
export const OVERDOSE_PHRASES = [
  "overdosed", "took a bunch of pills", "took a whole bunch of my pills", "took all my pills",
  "took too many pills", "swallowed a bunch of pills", "took a bottle of pills"
];

export const DISSOCIATION_KEYWORDS = [
  "not real", "watching myself", "outside my body", "voices telling me",
  "cant tell whats real", "can't tell what's real", "nothing feels real"
];

// Unambiguous first-person method+intent phrases. High-precision ONLY — these gate the input before the
// model, so a benign false-positive ("call a hotline") on a calm app is itself harmful. No bare nouns
// (those stay output-only in checkResponse Rule 2). Recall for borderline phrasing is left to the lists
// above + the output gate. Every entry has a paired benign-control test in safety.test.ts.
export const METHOD_INTENT_PHRASES = [
  "slit my wrists", "cut my wrists", "hang myself",
  "jump off a bridge", "jump off a building", "jump off the roof",
  "jump in front of a train", "jump in front of a car", "throw myself in front of"
];

export const UNSAFE_METHOD_KEYWORDS = [
  "razor", "blade", "pill", "slit", "overdose", "hang", "rope", "poison", "suffocate"
];

export const DISTORTION_AGREEMENTS = [
  "you're right that nobody", "youre right that nobody",
  "they don't care about you", "they dont care about you",
  "you are worthless", "you're worthless", "youre worthless",
  "it is hopeless", "it's hopeless", "its hopeless",
  "you're right to feel like a burden", "youre right to feel like a burden",
  "you are a failure", "you're a failure", "youre a failure"
];

/**
 * Scans user input for active suicidal ideation or self-harm warnings.
 * Deterministic, offline, super fast.
 */
export function scanForCrisis(message: string): boolean {
  if (!message) return false;
  // Collapse ALL internal whitespace (newlines/tabs/multi-space) to single spaces so a multi-word
  // keyword still matches when the user typed it across a line break or with extra spaces (textareas),
  // or when fields/records were concatenated. Keyword phrases below use single internal spaces.
  const normalized = message.toLowerCase().replace(/['’]/g, "'").replace(/\s+/g, " ").trim();

  // Check categories
  for (const list of [SUICIDAL_KEYWORDS, SELF_HARM_KEYWORDS, INDIRECT_METAPHORS, DISSOCIATION_KEYWORDS, METHOD_INTENT_PHRASES, OVERDOSE_PHRASES]) {
    for (const kw of list) {
      if (normalized.includes(kw)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates whether the AI's reply is safe to display.
 */
export function checkResponse(aiReply: string, userMessage: string): boolean {
  if (!aiReply) return false;
  const replyNorm = aiReply.toLowerCase();
  
  // Rule 1: If user was in a crisis, the AI reply MUST surface a crisis resource (region's number or
  // recognisable crisis-line language). If it doesn't, flag as unsafe.
  const userIsInCrisis = scanForCrisis(userMessage);
  if (userIsInCrisis && !replyMentionsCrisisResource(aiReply)) {
    return false;
  }

  // Rule 2: Contains potential method/means instructions
  for (const method of UNSAFE_METHOD_KEYWORDS) {
    if (replyNorm.includes(method) && (replyNorm.includes("how to") || replyNorm.includes("instruction") || replyNorm.includes("try"))) {
      return false;
    }
  }

  // Rule 3: Validates cognitive distortions as objective facts
  for (const agreement of DISTORTION_AGREEMENTS) {
    if (replyNorm.includes(agreement)) {
      return false;
    }
  }

  return true;
}

/**
 * Strict live-stream tripwire: a method/means keyword co-occurring with the strongest instruction cue
 * ("how to"). Deliberately narrower than checkResponse Rule 2 — it cuts text LIVE (shown in chat,
 * spoken in a call), so it must never fire on a warm phrase like "try to hang in there". The broad
 * final gate (checkResponse) still runs on the finished reply as the authority.
 */
export function isStreamingHarm(text: string): boolean {
  if (!text) return false;
  const norm = text.toLowerCase();
  for (const method of UNSAFE_METHOD_KEYWORDS) {
    if (norm.includes(method) && norm.includes("how to")) return true;
  }
  return false;
}

/** True if an AI reply surfaces a real crisis resource — the active region's number, or recognisable
 *  crisis-line / emergency language (covers regional phrasing and directory fallbacks). */
function replyMentionsCrisisResource(reply: string): boolean {
  if (!reply) return false;
  const digits = reply.replace(/\D/g, "");
  if (crisisDigits().some((d) => d && digits.includes(d))) return true;
  return /helpline|crisis line|crisis lifeline|988|116\s?123|samaritans|lifeline|beyond blue|befrienders|findahelpline|emergency (services|number|services)/.test(
    reply.toLowerCase()
  );
}

/** The deterministic crisis reply, built from the user's region crisis lines (always ≥1). */
export function getCrisisReply(): string {
  const lines = getCrisisLines().map((l) => `📞 ${l.name}: ${l.display}`).join("\n");
  return `What you just said matters more than anything else right now.

I hear you. This kind of pain is real, and you should not be alone with it.

This is a moment for a human — right now.

${lines}

These are free, confidential, and answered by people trained for exactly this moment.

Your safety plan is one tap away — the red button below.`;
}

/** Short fallback when an AI reply is judged unsafe — still points to a real crisis line. */
export function getUnsafeFallbackReply(): string {
  const first = getCrisisLines()[0];
  return `Let me slow down. What you're feeling matters.
Right now, let's focus on getting you steadier — or reaching someone who can help.
📞 ${first.name}: ${first.display}`;
}
