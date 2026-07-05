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
  "burn myself", "hit myself", "punish myself", "deserve pain", "want to bleed",
  // present-continuous forms: a live disclosure ("I've been HURTING myself") must trip the floor too,
  // mirroring the gerund/past coverage in SUICIDAL_KEYWORDS. The "…myself" suffix keeps the precision
  // boundary (benign "hurting my back" / "not hurting anyone" stay safe).
  "hurting myself", "harming myself", "burning myself", "hitting myself", "punishing myself"
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
  "took too many pills", "swallowed a bunch of pills", "took a bottle of pills",
  // Ingestion self-harm beyond pills. Near-zero benign collision (unlike firearm phrasings, which are
  // idiom-heavy — "shoot myself in the foot", "gun to my head" — and are left to the semantic classifier).
  "drink bleach", "drinking bleach", "swallowed bleach", "drank bleach"
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

// Pre-suicide EUPHEMISM gate (2026-07-05 live-test gap). "I've put my affairs in order and I finally feel at
// peace with it" is a terminal-planning disclosure that slips BOTH deterministic layers: the keyword floor
// never carried it, and the semantic classifier scores it ~0.27 (< 0.58 threshold) — MiniLM cannot separate
// it from benign acceptance at any safe threshold (see crisisClassifier.realmodel.test.ts). We catch it
// DETERMINISTICALLY, but only on CO-OCCURRENCE: a "settling final affairs" cue AND an "acceptance-of-an-ending"
// cue. Neither list fires alone, so "affairs in order before vacation" and a bare "I'm at peace with it" stay
// safe. Precision over recall — this gates the input before the model, where a false fire is itself harmful.
export const EUPHEMISM_PREP_CUES = [
  "affairs in order", "put everything in order", "get everything in order",
  "said my goodbyes", "say my goodbyes", "saying my goodbyes", "said goodbye to everyone",
  "given away my", "giving away my", "gave away my",
  "written my will", "wrote my will", "updated my will",
];

export const EUPHEMISM_ACCEPTANCE_CUES = [
  "at peace with it", "at peace with this", "at peace with everything",
  "made my peace with it", "made peace with it", "make my peace with it",
  "finally at peace", "finally feel at peace", "feel at peace with it",
  "ready to go now", "ready for it to be over", "ready for it all to be over",
  "it will all be over soon", "no more pain soon",
];

// High-precision on their OWN — the model or user naming peace with death itself. Near-zero benign collision,
// so these need no co-occurrence guard. Doubles as the output-gate signal (checkResponse Rule 4): a warm reply
// must never AFFIRM these.
export const EUPHEMISM_DEATH_PHRASES = [
  "peace with dying", "peace with death", "at peace with dying", "at peace with death",
  "made my peace with dying", "come to peace with dying",
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
 * True if `normalized` (already lowercased, apostrophe- and whitespace-collapsed) is a pre-suicide euphemism:
 * either an unambiguous "peace with death" phrase, OR a "settling final affairs" cue CO-OCCURRING with an
 * "acceptance-of-an-ending" cue. The co-occurrence requirement is what keeps precision — "affairs in order
 * before vacation" (prep only) and "I'm at peace with it" about a lost game (acceptance only) both stay safe.
 */
function scanForEuphemism(normalized: string): boolean {
  if (EUPHEMISM_DEATH_PHRASES.some((p) => normalized.includes(p))) return true;
  const hasPrep = EUPHEMISM_PREP_CUES.some((p) => normalized.includes(p));
  const hasAcceptance = EUPHEMISM_ACCEPTANCE_CUES.some((p) => normalized.includes(p));
  return hasPrep && hasAcceptance;
}

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

  if (scanForEuphemism(normalized)) return true;

  return false;
}

// A medication NOUN — the thing being taken. Presence alone is meaningless (real overdose disclosures also
// name pills); it's only the *first* of three conditions for the benign guard below.
const MEDICATION_NOUN =
  /\b(pills?|meds?|medications?|medicine|tablets?|capsules?|prescriptions?|dose|dosage|antidepressants?|antipsychotics?|ssris?|lithium|inhaler|insulin)\b/;

// Routine/adherence framing — the signal that this is calm "I follow my regimen" talk, not a plan. These are
// deliberately UNAMBIGUOUS markers (near-zero crisis reading). Bare timing words ("tonight") are intentionally
// EXCLUDED: "take my pills tonight" is genuinely ambiguous, so it is left to soft-fire (the conservative side).
const ADHERENCE_MARKER =
  /\b(as (prescribed|directed|instructed|the doctor said|my doctor said)|every (morning|day|night|evening)|each (morning|day|night)|with (food|water|breakfast|lunch|dinner|a meal)|on time|don'?t forget|forget (to|my)|remember(ed)? to|refill(ed|s)?|pharmacy|pharmacist|prescribed|prescription|my routine|my schedule|on schedule|regularly|adjusted my (dose|dosage)|so i don'?t forget)\b/;

// Lethal-intent CO-SIGNALS that VETO the benign guard — belt-and-suspenders on top of the deterministic
// keyword floor. Deliberately does NOT include "all my pills": present-tense "take all my pills as
// prescribed" is a documented benign control (only past-tense "took all my pills" is a crisis token in
// OVERDOSE_PHRASES). If any of these co-occur, the text is NOT treated as benign adherence.
const LETHAL_COSIGNAL =
  /\b(never wake|don'?t wake|not wake|won'?t wake|end (it|my life|things|everything)|kill(ing)? myself|take my (own )?life|suicid|overdose|whole bottle|entire bottle|the bottle|at once|forever|better off (without|dead)|can'?t go on|no point|no reason to (live|go on)|goodbye|stop the pain|be done|end the pain|don'?t want to (be here|live|wake)|so i (don'?t|never|won'?t) wake)\b/;

/**
 * Narrow NEGATIVE GUARD for the semantic §9 gate (see detectCrisis in crisisClassifier.ts).
 *
 * The MiniLM classifier embeds ANY medication talk near the self-harm-by-overdose cluster, so calm adherence
 * statements ("I need to take my pills exactly as prescribed" → 0.621) score above threshold and would
 * wrongly trigger a crisis surface — the exact false positive the keyword floor's benign controls exclude.
 * A false "call a hotline" on a calm chat is itself harmful, so we suppress the SOFT classifier upgrade when
 * the text is unambiguous medication-adherence: a medication noun AND an adherence/routine marker AND NO
 * lethal-intent co-signal.
 *
 * SAFETY POSTURE: this ONLY gates the classifier's soft contribution (a keyword-miss that the classifier
 * would upgrade). It can never suppress the deterministic keyword floor (scanForCrisis runs first and always
 * wins), and the lethal co-signal veto keeps it from ever masking a medication+intent disclosure.
 */
export function isBenignMedicationAdherence(message: string): boolean {
  if (!message) return false;
  const t = message.toLowerCase().replace(/['’]/g, "'").replace(/\s+/g, " ").trim();
  return MEDICATION_NOUN.test(t) && ADHERENCE_MARKER.test(t) && !LETHAL_COSIGNAL.test(t);
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

  // Rule 4: Never AFFIRM a user's "peace with dying/death". Independent of input detection, this catches the
  // on-device failure mode where the model validates a euphemistic disclosure ("...a sense of peace with
  // dying") even when the input phrasing slipped the euphemism gate. Phrase-tight so ordinary warm replies
  // about "peace" are untouched; on a hit the caller substitutes the crisis fallback (a safe failure here).
  const replyNormApos = replyNorm.replace(/['’]/g, "'");
  for (const phrase of EUPHEMISM_DEATH_PHRASES) {
    if (replyNormApos.includes(phrase)) {
      return false;
    }
  }

  return true;
}

/**
 * Strict live-stream tripwire: a method/means keyword co-occurring with the strongest instruction cue
 * ("how to"). Deliberately narrower than checkResponse Rule 2 — it cuts text LIVE (shown in chat, SPOKEN in a
 * call), so it must never fire on a warm reply. Broadening it to also cut on "try"/"instruction" was tried and
 * REVERTED: "try" collides with ordinary phrasing ("you're at the end of your rope, let's try one small step";
 * substrings like "poetry"/"pantry"), so it false-cut warm replies mid-stream. The broad final gate
 * (checkResponse) still runs on the finished reply and catches method+"try"/"instruction" post-hoc.
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

You can reach any of these lines right now — and your safety plan is one tap away, just below.`;
}

/** Short fallback when an AI reply is judged unsafe — still points to a real crisis line. */
export function getUnsafeFallbackReply(): string {
  const first = getCrisisLines()[0];
  return `Let me slow down. What you're feeling matters.
Right now, let's focus on getting you steadier — or reaching someone who can help.
📞 ${first.name}: ${first.display}`;
}
