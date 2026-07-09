/**
 * Deterministic Safety Layer for NilaMind
 * Performs offline-first keyword scans to detect crisis inputs and unsafe AI outputs.
 */

import { getCrisisLines, crisisDigits } from "./services/crisisResources";

export const SUICIDAL_KEYWORDS = [
  "kill myself", "killing myself", "killed myself", // gerund/past: "thinking about KILLING myself" must trip
  "kill my self", // #14 (2026-07-09 audit): common split spelling of "myself" — no benign reading
  "end my life", "ending my life", "take my life", "taking my life",
  "want to die", "want to be dead", "wish i was dead", "wish i were dead",
  "dont want to be here", "don't want to be here",
  "dont want to live", "don't want to live", "better off dead", "no reason to live", "cant go on",
  "can't go on", "end it all", "not worth living", "suicide", "suicidal",
  "ending things", "wont be around", "won't be around", "goodbye forever",
  // 2026-07-09 audit: phrases with near-zero benign collision that were only in LETHAL_COSIGNAL
  // (which only vetoes benign-classifier suppression), NOT in the deterministic keyword floor.
  // "stop the pain" has rare benign physical-pain use but missing it is more harmful than over-firing.
  "end my suffering",
  "stop the pain", "end the pain",
  "can't do this anymore", "cant do this anymore",
  "can't do this any longer", "cant do this any longer",
];

// Modern/coined self-harm slang (2026-07-06 audit). "unalive" is a coined euphemism with ~zero benign
// collision → safe as a bare substring. "kms" ("kill myself") is NOT safe bare (collides with "kilometres":
// "5 kms away"), so it is carried ONLY in first-person intent phrasings, which have ~zero benign collision.
export const SLANG_IDEATION = [
  "unalive", // covers "unalive myself", "gonna unalive", "want to unalive"
  "want to kms", "wanna kms", "gonna kms", "going to kms", "gonna kill myself",
  // Gen-Z / internet slang for suicide ideation (2026-07-06 audit). High-precision multi-word / coined
  // euphemisms with near-zero benign collision. "sewerslide"/"sewer slide" is a deliberate corruption of
  // "suicide" to evade content filters; "log out/off of life" and "exit the game" are gamified metaphors.
  "sewerslide", "sewer slide", "log out of life", "log off permanently", "logging off permanently", "exit the game",
];

// Romanized Hindi/Tamil crisis phrasing (2026-07-06 audit). India-first app; MiniLM is English-only and the
// keyword floor had zero non-English coverage → a whole population's disclosures bypassed. Phrases are chosen
// to be high-precision multi-word units (near-zero benign collision) — e.g. bare "marna"/"mann nahi" are NOT
// used; only "marna hai" / "jeene ka mann nahi" (= "don't feel like living").
export const ROMANIZED_IDEATION = [
  "jeene ka mann nahi", "jeena nahi chahta", "jeena nahi chahti", "ab jeena nahi",
  "marna hai", "mar jana chahta", "mar jaana hai", "mar jaunga", "mar jaungi",
  "zindagi khatam", "khatam kar lunga", "khatam kar dunga",
  "khudkushi", "aatmahatya",
  // Hindi: active suicidal ideation / death-wish / refusal-to-rise phrasing (2026-07-06 audit).
  "marne ka mann", "marne ki ichha", "mar raha hoon", "mar rahi hoon",
  "jeena nahi chahiye", "jeena mushkil ho raha hai", "aaj uthna nahi chahta",
  // Tamil (romanized)
  "saaganum", "saga poren", "saaga poren", "uyir vaazha maaten",
  // Tamil: additional crisis-ideation phrasing (2026-07-06 audit)
  "vaazha vendaam", "saavukku poyida poren", "saaganum da",
];

// NATIVE-SCRIPT crisis phrasing (2026-07-08 audit 1.B). The app now ships a hi/ta/te language switcher and
// greets users in Devanagari/Tamil/Telugu script, so users WILL type in-script — but scanForCrisis is a
// substring match and the MiniLM classifier is English-only, so native-script disclosures had ZERO
// coverage (a Telugu user typing "చనిపోవాలని ఉంది" got an ungated reply). These mirror ROMANIZED_IDEATION:
// high-precision multi-word ideation phrases + the unambiguous single-word nouns for "suicide"
// (आत्महत्या / தற்கொலை / ఆత్మహత్య). Bare verbs (मर / சா / చావు) are intentionally NOT listed — only phrases
// that cannot collide with benign text (see the paired benign-control tests in safety.test.ts).
export const NATIVE_SCRIPT_IDEATION = [
  // Hindi (Devanagari)
  "मरना चाहता", "मरना चाहती", "मरना चाहूं", "मर जाना चाहता", "मर जाना चाहती",
  "जीना नहीं चाहता", "जीना नहीं चाहती", "जीने का मन नहीं", "अब जीना नहीं",
  "जान दे दूंगा", "जान दे दूँगी", "अपनी जान ले", "आत्महत्या", "खुदकुशी",
  // Tamil (script)
  "சாக விரும்பு", "சாக வேண்டும்", "சாகணும்", "வாழ விரும்பவில்லை",
  "இறந்துவிட வேண்டும்", "தற்கொலை",
  // Telugu (script)
  "చనిపోవాలని", "చనిపోవాలి", "చావాలని ఉంది", "బతకాలని లేదు", "ఆత్మహత్య",
  // Telugu (romanized) — Telugu had no coverage at all, even romanized
  "chanipovaalani", "chanipovali", "chavaalani undi", "bathakalani ledu", "aatmahatya cheskovali",
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
  "everyone better off without me", "be gone", "vanish",
  // 2026-07-09 audit: "no way out" is a common hopelessness expression in crisis contexts.
  "no way out", "cant see a way out", "can't see a way out",
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

// Method STOCKPILING / planning (2026-07-06 audit): "enough tablets saved up to make sure it works" (0.10),
// "saving up pills" — accumulating a lethal means is a strong, imminent-risk signal the keyword floor missed
// and MiniLM scored near-zero. Kept high-precision by requiring the means noun and the stockpiling verb to be
// ADJACENT (as a single phrase), so "saved up money for the trip" (no means) and "saved up to afford my pills"
// (means and verb non-adjacent → a financial statement) both stay safe.
export const STOCKPILE_MEANS = [
  "pills saved up", "tablets saved up", "meds saved up", "medication saved up",
  "saved up pills", "saved up tablets", "saved up meds", "saved up enough pills", "saved up enough tablets",
  "saving up pills", "saving up tablets", "saving up meds", "saving up my pills", "saving up my meds",
  "stockpiled pills", "stockpiling pills", "stockpiling my meds", "stockpiling meds", "stockpiled my meds",
  "hoarding pills", "hoarding my meds", "been collecting pills",
  "enough pills to make sure", "enough tablets to make sure", "enough pills to end", "enough tablets to end",
];

export const DISSOCIATION_KEYWORDS = [
  "not real", "watching myself", "outside my body", "voices telling me",
  "cant tell whats real", "can't tell what's real", "nothing feels real",
  // 2026-07-09 audit: expanded dissociation coverage — depersonalization/derealization are common
  // in trauma and anxiety populations and are strong distress signals the keyword floor should catch.
  "feel detached", "feeling detached",
  "feel unreal", "feeling unreal",
  "depersonalized", "depersonalised",
  "disconnected from reality", "feeling disconnected from reality",
  "dont feel real", "don't feel real"
];

// Unambiguous first-person method+intent phrases. High-precision ONLY — these gate the input before the
// model, so a benign false-positive ("call a hotline") on a calm app is itself harmful. No bare nouns
// (those stay output-only in checkResponse Rule 2). Recall for borderline phrasing is left to the lists
// above + the output gate. Every entry has a paired benign-control test in safety.test.ts.
export const METHOD_INTENT_PHRASES = [
  "slit my wrists", "cut my wrists", "hang myself",
  "jump off a bridge", "jump off a building", "jump off the roof",
  "jump in front of a train", "jump in front of a car", "throw myself in front of",
  // #12 (2026-07-09 audit): high-precision means+intent with ~zero idiom collision — the exact parallel of
  // the listed "jump in front of a train", and noose phrasing (the means-preparation form of "hang myself").
  // Idiom-heavy firearm phrasings ("shoot myself", "gun to my head") stay with the semantic classifier.
  "step in front of a train", "tie a noose", "tied a noose", "put my head in a noose"
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
  // "settling final affairs" additions (2026-07-05 veiled-ideation probe): farewell letters/notes and making
  // "arrangements". Ambiguous ALONE (wedding arrangements, a job goodbye letter), so — like the rest of this
  // list — they only fire when an acceptance- OR finality-cue co-occurs.
  "made all the arrangements", "made the arrangements", "made my arrangements", "final arrangements",
  "goodbye letter", "goodbye letters", "goodbye note", "wrote letters to everyone", "written my note", "wrote my note",
];

export const EUPHEMISM_ACCEPTANCE_CUES = [
  "at peace with it", "at peace with this", "at peace with everything",
  "made my peace with it", "made peace with it", "make my peace with it",
  "finally at peace", "finally feel at peace", "feel at peace with it",
  "ready to go now", "ready for it to be over", "ready for it all to be over",
  "it will all be over soon", "no more pain soon",
];

// Explicit FINALITY markers — "I am leaving / won't be here" phrasing (2026-07-05 veiled-ideation probe). TIGHT
// on purpose: each stays high-precision even paired with a mundane prep cue, so bare farewell idioms ("last day
// at the office", "gone this weekend") don't collide. Like the acceptance cues, these fire ONLY with a prep cue;
// a finality marker alone ("this is my last message before I board the flight") must never trip.
export const EUPHEMISM_FINALITY_CUES = [
  "when i'm gone", "after i'm gone", "once i'm gone", "before i'm gone",
  "won't be needing", "no longer need my", "won't be around much longer", "not be around much longer",
  "this is my last message", "my last message to", "my final message to",
  "won't have to worry about me anymore",
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

// Phase 0 — anti-sycophancy / reality-testing. Research basis (docs/NILA_AGENT_RESEARCH_BASIS.md): a model
// VALIDATING a harmful belief ("sycophancy") is THE documented harm mechanism of LLM mental-health tools
// (OpenAI's GPT-4o rollback; the Danish registry's delusion + mania cases). checkResponse Rule 4 rejects a reply
// that AFFIRMS a harmful belief a warm companion must never affirm — regardless of context. Complements
// DISTORTION_AGREEMENTS (worthlessness/failure/burden) with the gaps the harms literature flags: med/treatment
// discouragement (mania/bipolar risk), "better off dead/gone", isolation, mania sleep-denial, terminal
// hopelessness, deserving-suffering. Kept HIGH-SIGNAL + LOW-false-positive (e.g. "you are beyond help", NOT bare
// "beyond help", so a professional-referral "beyond what I can help with" isn't cut).
export const SYCOPHANTIC_AFFIRMATIONS = [
  // med / treatment discouragement
  "you don't need your meds", "you dont need your meds",
  "you don't need medication", "you dont need medication",
  "stop taking your medication", "stop taking your meds", "you should stop your meds",
  // mania: sleep denial
  "you don't need sleep", "you dont need sleep", "you don't need to sleep", "you dont need to sleep",
  // "better off dead/gone/without you" (crisis-adjacent affirmation)
  "better off dead", "better off gone", "better off without you",
  // isolation encouragement
  "you're better off alone", "youre better off alone", "you are better off alone",
  "no one can help you", "no-one can help you", "nobody can help you",
  // terminal hopelessness (beyond the existing "it's hopeless")
  "you'll never get better", "youll never get better", "you will never get better",
  "you're beyond help", "youre beyond help", "you are beyond help",
  "it will never get better", "nothing will ever change",
  // deserving-suffering
  "you deserve to suffer", "you deserve the pain", "you deserve this pain",
];

// MANIC-STATE sycophancy (2026-07-06 new-vision extension). For a MANIC-FIRST app the sharpest documented harm
// is a reply AFFIRMING an elevated/psychotic state — grandiosity, treatment-superiority delusion, impulsive
// risk-taking (spending/quitting/betting sprees), or paranoia-as-objective-fact — which can precipitate real
// damage (med-stopping, financial ruin, isolation, escalation). Complements SYCOPHANTIC_AFFIRMATIONS (which
// already covers med-stopping + sleep-denial). HIGH-PRECISION and AFFIRMATION-LEADING ("you should…"/"go
// ahead…"), so warm de-escalation ("you don't have to spend it all at once", "quitting your job is worth
// sleeping on") never trips. Each entry pairs with a benign control in safety.test.ts.
export const MANIC_VALIDATION = [
  // grandiosity / treatment-superiority delusion
  "you know better than the doctors", "you know better than your doctor",
  "the doctors are wrong about you", "the doctor is wrong about you",
  "the rules don't apply to you", "the rules dont apply to you",
  // manic impulsivity — affirmation-leading only
  "you should spend it all", "go ahead and spend it all",
  "go ahead and quit your job", "you should quit your job right now",
  "you should invest everything", "you should bet everything",
  // paranoia affirmed as objective fact
  "they are all conspiring against you", "everyone really is out to get you",
];

/**
 * True if `normalized` (already lowercased, apostrophe- and whitespace-collapsed) is a pre-suicide euphemism:
 * either an unambiguous "peace with death" phrase, OR a "settling final affairs" cue CO-OCCURRING with an
 * "acceptance-of-an-ending" OR "finality" cue. The co-occurrence requirement is what keeps precision —
 * "affairs in order before vacation" (prep only), "I'm at peace with it" about a lost game (acceptance only),
 * and "this is my last message before the flight" (finality only) all stay safe.
 */
function scanForEuphemism(normalized: string): boolean {
  if (EUPHEMISM_DEATH_PHRASES.some((p) => normalized.includes(p))) return true;
  if (scanForDivestmentReadiness(normalized)) return true;
  const hasPrep = EUPHEMISM_PREP_CUES.some((p) => normalized.includes(p));
  if (!hasPrep) return false;
  const hasAcceptance = EUPHEMISM_ACCEPTANCE_CUES.some((p) => normalized.includes(p));
  const hasFinality = EUPHEMISM_FINALITY_CUES.some((p) => normalized.includes(p));
  return hasAcceptance || hasFinality;
}

// Divestment + readiness (2026-07-06 audit): "I've given away most of my things, I feel ready now" bypassed
// both deterministic layers and scored 0.34 on MiniLM. GIVING AWAY POSSESSIONS is a much stronger pre-suicide
// signal than "affairs in order" (which benignly precedes vacations), so pairing it with a readiness cue is
// high-precision — kept SEPARATE from the general prep×acceptance gate precisely so "affairs in order + feel
// ready now for the trip" stays safe (no divestment verb+possession). Requires a giving-away VERB AND a
// POSSESSION object AND a readiness cue; none of the three alone (nor verb+possession without readiness — a
// genuine declutter/donation) fires.
// The giving-away phrasal verb is frequently SPLIT by its object in natural English ("given most of my
// things away"), which a contiguous-substring list ("given away") misses — the 2026-07-09 audit (#1, P0)
// showed this defeats the whole gate, and the classifier scores the split form ~0.34 (< threshold), so it
// is not a backstop. DIVESTMENT_AWAY matches the giving verb and "away" non-adjacently within one clause
// (letters/spaces/apostrophe/hyphen only, so it can't cross a comma/period or an unrelated clause), while
// the contiguous non-"away" verbs stay as substrings. Precision is still carried by the AND of object +
// readiness below — verb alone (a genuine declutter/donation) never fires.
const DIVESTMENT_AWAY = /\b(gave|given|giving|give)\b[a-z '-]{0,40}\baway\b/;
const DIVESTMENT_VERBS = ["gave all", "donated all", "getting rid of all"];
const DIVESTMENT_OBJECTS = ["my things", "my stuff", "my belongings", "my possessions", "everything i own", "most of my", "all my things"];
const READINESS_CUES = ["feel ready now", "i feel ready", "i'm ready now", "im ready now", "ready now", "ready to go now"];
function scanForDivestmentReadiness(normalized: string): boolean {
  const hasVerb = DIVESTMENT_AWAY.test(normalized) || DIVESTMENT_VERBS.some((v) => normalized.includes(v));
  if (!hasVerb) return false;
  const hasObject = DIVESTMENT_OBJECTS.some((o) => normalized.includes(o));
  if (!hasObject) return false;
  return READINESS_CUES.some((r) => normalized.includes(r));
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
  // #14 (2026-07-09 audit): strip zero-width chars (U+200B–200D, U+FEFF) FIRST so an injected zero-width
  // space (U+200B) can't split a keyword; stripping it first means an injected zero-width space cannot evade a match.
  const normalized = message.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/['’]/g, "'").replace(/\s+/g, " ").trim();

  // Check categories
  for (const list of [SUICIDAL_KEYWORDS, SLANG_IDEATION, ROMANIZED_IDEATION, NATIVE_SCRIPT_IDEATION, SELF_HARM_KEYWORDS, INDIRECT_METAPHORS, DISSOCIATION_KEYWORDS, METHOD_INTENT_PHRASES, OVERDOSE_PHRASES, STOCKPILE_MEANS]) {
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
// #2 (2026-07-09 audit): stockpiling/means-accumulation cues (saved up, saving up, stockpil*, hoard*, been
// saving) are added so the benign-adherence guard can NEVER veto a means-accumulation disclosure — "I saved
// up all my pills and take them as prescribed" (classifier ~0.78) is no longer masked. This only lifts the
// SOFT-classifier suppression; the classifier still decides, so genuine "saved up money for my pills" is not
// force-flagged (the guard just stops silencing the classifier, which scores such benign text low).
const LETHAL_COSIGNAL =
  /\b(never wake|don'?t wake|not wake|won'?t wake|end (it|my life|things|everything)|kill(ing)? myself|take my (own )?life|suicid|overdose|whole bottle|entire bottle|the bottle|at once|forever|better off (without|dead)|can'?t go on|no point|no reason to (live|go on)|goodbye|stop the pain|be done|end the pain|don'?t want to (be here|live|wake)|so i (don'?t|never|won'?t) wake|saved up|saving up|been saving|stockpil|hoard)\b/;

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

// Common HYPERBOLE / idiom that the MiniLM classifier over-fires on (2026-07-06 audit #8): "I could sleep for
// a week" (0.85), "I could murder a plate of biryani" (0.73), "I'm dying to see it". A false crisis surface on
// a calm chat is itself harmful (erodes trust), so — exactly like isBenignMedicationAdherence — this suppresses
// ONLY the SOFT classifier upgrade AFTER the deterministic keyword floor has already missed. It can never
// suppress a keyword hit, and the same LETHAL_COSIGNAL veto keeps it from ever masking a real disclosure that
// merely happens to contain an idiom (e.g. "sleep for a week and never wake up" → vetoed).
const HYPERBOLE_PATTERNS =
  /\bsleep (for )?(a|an|the|another|a whole|an entire) (week|month|year|century|decade|weekend|day)\b|\bcould (murder|kill for|kill|die for) (a|an|some|the|this|that)\b|\bdying (to|for)\b|\bdying of (laughter|boredom|embarrassment|thirst|hunger)\b|\b(dead tired|dead serious|scared to death|bored to death|worked to death)\b/;
export function isBenignHyperbole(message: string): boolean {
  if (!message) return false;
  const t = message.toLowerCase().replace(/['’]/g, "'").replace(/\s+/g, " ").trim();
  return HYPERBOLE_PATTERNS.test(t) && !LETHAL_COSIGNAL.test(t);
}

/**
 * Validates whether the AI's reply is safe to display.
 */
export function checkResponse(aiReply: string, userMessage: string, userInCrisis?: boolean): boolean {
  if (!aiReply) return false;
  const replyNorm = aiReply.toLowerCase();

  // Rule 1: If user was in a crisis, the AI reply MUST surface a crisis resource (region's number or
  // recognisable crisis-line language). If it doesn't, flag as unsafe.
  //
  // AUDIT 2026-07-06 (P0 structural hole): this previously ALWAYS re-derived crisis from scanForCrisis — the
  // KEYWORD-only floor. For a euphemistic input the classifier caught but the floor missed, userIsInCrisis was
  // false, so a warm resource-free reply passed the backstop → the send-path classifier verdict was ignored at
  // the output gate. The send path now threads its already-computed detectCrisis verdict in as `userInCrisis`;
  // absent that (legacy callers / tests) we fall back to the keyword floor, so behaviour is never weakened.
  const userIsInCrisis = userInCrisis ?? scanForCrisis(userMessage);
  if (userIsInCrisis && !replyMentionsCrisisResource(aiReply)) {
    return false;
  }

  // Rule 2: method/means INSTRUCTIONS — an instruction cue ("how to" / "instruction" / "try") FOLLOWED by a
  // method word within a short window (the method is the OBJECT of the instruction). DIRECTIONAL on purpose:
  // narrowing to "how to" only (2026-07-06) fixed warm-reply false-cuts but LOOSENED the gate — "try taking a
  // whole bottle of pills" and "instructions for an overdose" slipped through. Requiring the method to FOLLOW
  // the cue keeps "let's try one small step" / "end of your rope, let's try" safe (the method idiom sits BEFORE
  // the cue, or there's no method) while re-closing that gap. isStreamingHarm stays "how to"-only — it cuts
  // LIVE mid-stream so it must not over-fire; this broad FINAL gate can afford the directional cue set.
  const INSTRUCTION_CUES = ["how to", "instruction", "try"];
  for (const cue of INSTRUCTION_CUES) {
    for (let i = replyNorm.indexOf(cue); i !== -1; i = replyNorm.indexOf(cue, i + 1)) {
      const after = replyNorm.slice(i, i + cue.length + 40); // cue + ~40 chars: the method as the cue's object
      if (UNSAFE_METHOD_KEYWORDS.some((m) => after.includes(m))) return false;
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

  // Rule 5: Anti-sycophancy / reality-testing — the reply must never AFFIRM a harmful belief (med-stopping,
  // "better off dead/gone", isolation, mania sleep-denial, terminal hopelessness, deserving-suffering).
  // Sycophancy is the documented harm mechanism (see docs/NILA_AGENT_RESEARCH_BASIS.md).
  for (const affirmation of SYCOPHANTIC_AFFIRMATIONS) {
    if (replyNorm.includes(affirmation)) {
      return false;
    }
  }

  // Rule 6: Anti-sycophancy for MANIC states — never AFFIRM grandiosity, treatment-superiority delusion,
  // impulsive risk-taking, or paranoia-as-fact (manic-first app; see MANIC_VALIDATION). Affirmation-leading
  // phrasing keeps warm de-escalation of an elevated mood safe.
  for (const affirmation of MANIC_VALIDATION) {
    if (replyNorm.includes(affirmation)) {
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
