/**
 * Deterministic Safety Layer for NilaMind
 * Performs offline-first keyword scans to detect crisis inputs and unsafe AI outputs.
 */

import { getCrisisLines, crisisDigits } from "./services/crisisResources";
import { recordRule6Fire, recordRule6Pass } from "./services/antiSycophancyMetrics";
import { spotDistortions } from "./services/distortionSpotter";

export const SUICIDAL_KEYWORDS = [
  "kill myself", "killing myself", "killed myself", // gerund/past: "thinking about KILLING myself" must trip
  // NOTE: the split spelling "kill my self" is matched by SUICIDAL_SPLIT_RE (below), NOT as a bare substring —
  // a substring falsely fired on "kill my self-doubt / self-criticism / selfishness" (2026-07-10 re-audit #1).
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
  // Negation-FIRST death-wish word order (2026-07-12 device-QA): "mujhe nahi jeena" was missed — the
  // entries above only cover verb-first order ("jeena nahi chahta"). MiniLM embeds romanized Hindi near
  // zero (0.026 measured vs 0.58 threshold) so the keyword floor is the ONLY Hinglish defence. Prefixed
  // pronoun/temporal forms keep precision — bare "nahi jeena" collides with the benign location sense
  // ("yahan nahi jeena" = "don't want to live HERE"). Spelling variants (jina/nhi) are common in typed Hinglish.
  // NOTE: the negation-first prefixes ("mujhe nahi jeena" etc.) and the reason-noun phrases ("jeene ki
  // wajah nahi" etc.) were MOVED OUT of this plain-substring array on 2026-07-12 (adversarial-review
  // hardening, FIX SET 1) — they are still part of the unsuppressible keyword floor, just checked via
  // hasAmbiguousNegationIdeation() below (regex-based, with a reside-sense/devotion-sense escape) instead
  // of bare .includes(). See AMBIGUOUS_NEGATION_PREFIXES / AMBIGUOUS_REASON_NOUNS.
  "ab nahi jee sakta", "ab nahi jee sakti", "aur nahi jee sakta", "aur nahi jee sakti",
  "zinda nahi rehna", "zinda nahi rahna",
  // 2026-07-12 adversarial-review hardening (FIX SET 2): natural variants the floor still missed —
  // "kabhi"/"hi" word-insertion, "nhi"/"ni"/"nai"/"jine"/"jina" spelling variants, "chahat"/"ichha"
  // (desire/wish) reason-nouns, gerund "thinking about dying" phrasing, and code-switched English. None
  // of these are reside/devotion-ambiguous the way the prefixes/reason-nouns above are, so plain
  // substrings are precise enough.
  "mujhe kabhi nahi jeena", "ab kabhi nahi jeena",
  "jeena hi nahi chahta",
  "ab nhi jeena", "aur nhi jeena", "bas nhi jeena", "main nhi jeena", "zinda nhi rehna",
  "mujhe ni jeena", "mujhe nai jeena",
  "mujhe nahi jine", "jina nahi chahta",
  "jeene ki chahat nahi", "jeene ki ichha nahi",
  "marne ke baare mein soch raha hoon", "marne ke baare mein soch rahi hoon",
  "marna sochta hoon", "marna sochti hoon",
  "dont want to jeena anymore", "don't want to jeena anymore",
  "dont wanna jeena anymore", "don't wanna jeena anymore",
];

// AMBIGUOUS negation-first prefixes (2026-07-12 adversarial-review hardening, FIX SET 1 — HIGH severity):
// plain substring matching let "mujhe nahi jeena YAHAN IS SOCIETY MEIN, landlord bahut tang karta hai" (a
// housing complaint) false-fire the unsuppressible §9 floor — "jeena" is ambiguous between the crisis sense
// ("to exist/live") and the benign RESIDE sense ("to live/reside somewhere"). Converted from
// ROMANIZED_IDEATION array membership to a regex + reside-sense escape via hasAmbiguousNegationIdeation()
// below — still fully deterministic, still part of the unsuppressible keyword floor (NOT a soft-guard /
// suppression path: the pattern itself is now more precise, preserving this file's invariant that the
// keyword floor can never be suppressed).
const AMBIGUOUS_NEGATION_PREFIXES = [
  "mujhe nahi jeena", "mujhe nahi jina", "mujhe nhi jeena", "mujhe nhi jina",
  "ab nahi jeena", "aur nahi jeena", "bas nahi jeena", "main nahi jeena",
  "mujhko nahi jeena", "mereko nahi jeena",
];

// A location/moving marker within a short window after a negation-first prefix flips it from crisis-sense
// to the benign RESIDE-sense ("mujhe nahi jeena YAHAN" = "I don't want to live HERE", not ideation).
const RESIDE_SENSE_RE =
  /\b(yahan|yaha|yahaan|waha|wahan)\b|\b(is|us|isi|usi)\b(?:\s+\w+){0,2}\s+(society|pg|hostel|room|ghar|city|gaon|colony|building|flat|area|mohalla)\b|\b(shift|move)\b/;

// Reason-noun phrases ("no reason/meaning/point to living") that collide with romantic hyperbole when a
// "without you/him/her" devotion marker is present ANYWHERE in the message ("tere bina toh jeene ka koi
// matlab nahi hai mere liye, i love you so much" — a love declaration, not ideation).
const AMBIGUOUS_REASON_NOUNS = [
  "jeene ki wajah nahi", "jeene ki koi wajah nahi", "jeene ka koi matlab nahi",
  "jeene ka faida nahi", "jeene ka koi faida nahi",
];

const DEVOTION_BINA_RE = /\b(tere|uske|iske|tumhare|unke) bina\b/;

/**
 * True if `normalized` contains one of the AMBIGUOUS_NEGATION_PREFIXES or AMBIGUOUS_REASON_NOUNS phrases
 * in its genuine crisis sense (not the benign reside-sense or romantic-devotion-sense collision). Still
 * part of the unsuppressible keyword floor — this only makes the PATTERNS more precise, it does not add a
 * suppression path on top of a match (see scanForCrisis / this file's "keyword floor can never be
 * suppressed" invariant). If a stronger unambiguous crisis phrase is present elsewhere in the message, that
 * phrase independently trips one of the other keyword lists in scanForCrisis regardless of what this
 * function returns, so a genuine disclosure that happens to also mention a location or a partner is never
 * masked.
 */
function hasAmbiguousNegationIdeation(normalized: string): boolean {
  for (const prefix of AMBIGUOUS_NEGATION_PREFIXES) {
    const idx = normalized.indexOf(prefix);
    if (idx === -1) continue;
    const after = normalized.slice(idx + prefix.length, idx + prefix.length + 25);
    if (!RESIDE_SENSE_RE.test(after)) return true;
  }
  for (const phrase of AMBIGUOUS_REASON_NOUNS) {
    if (normalized.includes(phrase) && !DEVOTION_BINA_RE.test(normalized)) return true;
  }
  return false;
}

// Passive/existential suicidal ideation — abstract phrasings (2026-07-12 Wave 3: closed via empirical
// threshold-calibration probe against the real bundled MiniLM model, surfaced while calibrating a
// confidence threshold for a different fix — see commit b7e3747). Three natural English passive-SI
// phrasings scored WELL BELOW the classifier threshold (0.5796): "there's no point in any of this anymore"
// -> 0.1097, "I just want it all to stop" -> 0.4611, "what's the point of going on" -> 0.2632 — meaning they
// got ZERO crisis response, not even the soft card. MiniLM apparently can't reliably associate abstract/
// existential phrasing (no concrete despair vocabulary — no "die"/"suicide"/"hurt myself") with crisis
// content.
//
// Each family is AMBIGUOUS as a bare substring — "what's the point of going on A DIET", "no point in any of
// this MEETING", "want it all to stop — THIS RAIN is ruining my trip" are all common, harmless complaints
// about something concrete and named. So — exactly like AMBIGUOUS_NEGATION_PREFIXES/
// hasAmbiguousNegationIdeation above — these are checked via a targeted escape-hatch function, not a bare
// .includes(), while remaining fully part of the unsuppressible keyword floor (the escape only makes the
// PATTERN itself more precise; it is not a suppression path layered on top of a match). Kept OUT of
// INDIRECT_METAPHORS deliberately: every entry in that array is a plain substring checked via .includes()
// with near-zero benign collision on its own, which these three families are not.
const EXISTENTIAL_GOING_ON_PREFIXES = ["what's the point of going on", "whats the point of going on"];
const EXISTENTIAL_NO_POINT_PREFIXES = ["no point in any of this"];
const EXISTENTIAL_WANT_TO_STOP_PHRASES = ["want it all to stop"];

// A concrete referent immediately following "going on" / "no point in any of this" — a named activity, plan,
// or object ("...going on A DIET", "...any of this MEETING") — flips the phrase from existential hopelessness
// to an ordinary complaint about something specific. "anymore" is the one exception: it's a temporal
// intensifier, not a referent, so "...going on anymore" / "...any of this anymore" still fire.
function hasReferentAfter(normalized: string, idx: number, matchLen: number): boolean {
  const after = normalized.slice(idx + matchLen);
  const rest = after.replace(/^\s*anymore\b/, "");
  return /^\s*[a-z]/.test(rest);
}

// A mundane external nuisance (weather/noise/notifications/a meeting) named near "want it all to stop" flips
// it from existential despair to an ordinary complaint ("...want it all to stop — this RAIN is ruining my
// trip", "...want it all to stop, this construction NOISE outside my window"). Checked in a window either
// side of the match (mirrors hasNearbyContrast below), since the nuisance can be named before or after.
const MUNDANE_NUISANCE_RE =
  /\b(rain|raining|weather|snow|heat|humidity|noise|traffic|construction|drilling|honking|barking|alarm|notifications?|spam|ads?|meeting|lecture)\b/;

function hasExistentialHopelessness(normalized: string): boolean {
  for (const p of EXISTENTIAL_GOING_ON_PREFIXES) {
    const idx = normalized.indexOf(p);
    if (idx !== -1 && !hasReferentAfter(normalized, idx, p.length)) return true;
  }
  for (const p of EXISTENTIAL_NO_POINT_PREFIXES) {
    const idx = normalized.indexOf(p);
    if (idx !== -1 && !hasReferentAfter(normalized, idx, p.length)) return true;
  }
  for (const p of EXISTENTIAL_WANT_TO_STOP_PHRASES) {
    const idx = normalized.indexOf(p);
    if (idx === -1) continue;
    const windowStart = Math.max(0, idx - 60);
    const windowEnd = idx + p.length + 60;
    if (!MUNDANE_NUISANCE_RE.test(normalized.slice(windowStart, windowEnd))) return true;
  }
  return false;
}

/**
 * Narrow NEGATIVE GUARD for the semantic §9 gate (see detectCrisisSignal in crisisClassifier.ts) — same
 * posture as isBenignMedicationAdherence / isBenignHyperbole / isBenignExhaustion / isBenignOkayReassurance
 * below.
 *
 * ROOT CAUSE (2026-07-12 device-QA, on-device adb-typed input — CRITICAL false full-screen takeover): the
 * hasExistentialHopelessness referent/nuisance escape hatch above correctly keeps the DETERMINISTIC KEYWORD
 * FLOOR from firing on "what's/whats the point of going on A DIET if I/i don't/dont stick to it" —
 * scanForCrisis empirically returns false for this WITH or WITHOUT apostrophes, exactly as designed (verified
 * against this exact device-typed string). The apostrophe was a red herring: the true bug is one layer up.
 * The live send path (sendToNila.ts -> crisisSignalForSend -> detectCrisisSignal) ALWAYS ALSO consults the
 * on-device MiniLM classifier after a keyword-floor MISS (see detectCrisisSignal below), and the classifier
 * independently scores this exact phrase family very high against the REAL bundled model — measured at
 * 0.83-0.87 for both "whats the point of going on a diet if i dont stick to it" (0.8312) and "what's the
 * point of going on a diet if I don't stick to it" (0.8701) — well above BOTH CRISIS_THRESHOLD (0.58) and
 * CRISIS_HIGH_CONFIDENCE_THRESHOLD (0.65), regardless of apostrophes. This is what produced the reported
 * FULL-SCREEN crisis takeover: a classifier-source hit at tier:"full", not a keyword-floor hit — "if I don't
 * stick to it" (self-defeat/giving-up framing) apparently reads as despair to MiniLM on its own. Commit
 * 32af858's fix only added the keyword-floor escape hatch; it never added the matching classifier-level guard
 * that every other keyword-floor escape hatch in this file has (see the other four isBenignX guards below),
 * so this ambiguous family was left with a keyword-floor precision fix but zero classifier-floor precision
 * fix. (The other two escape-hatch families from the same commit — "no point in any of this <meeting/
 * paperwork>" and "want it all to stop <rain/construction>" — were empirically re-checked against the real
 * model too and do NOT reproduce this: 0.02-0.24, well under threshold either way — this guard is a no-op for
 * them today but is written generically over all three EXISTENTIAL_* families for defense-in-depth, since a
 * future referent/nuisance word could plausibly score high the same way.)
 *
 * Fires ONLY when one of the EXISTENTIAL_* phrase families is present AND hasExistentialHopelessness's own
 * escape hatch already deemed it benign (a referent/nuisance was found) — i.e. this can only ever suppress a
 * message the keyword floor ALREADY special-cased as benign; it never makes an independent judgment call of
 * its own, and if the phrase family is absent entirely it returns false (every other phrasing's classifier
 * score is untouched).
 *
 * SAFETY POSTURE: identical to the other four guards — suppresses ONLY the SOFT/classifier contribution; the
 * deterministic keyword floor (scanForCrisis, called first in detectCrisisSignal) always wins and can never be
 * suppressed by this. If hasExistentialHopelessness found NO escape (a genuine disclosure), scanForCrisis
 * already returned true and detectCrisisSignal short-circuited before this guard is ever consulted.
 */
export function isBenignExistentialReferent(message: string): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/['’]/g, "'").replace(/\s+/g, " ").trim();
  const familyPresent =
    EXISTENTIAL_GOING_ON_PREFIXES.some((p) => normalized.includes(p)) ||
    EXISTENTIAL_NO_POINT_PREFIXES.some((p) => normalized.includes(p)) ||
    EXISTENTIAL_WANT_TO_STOP_PHRASES.some((p) => normalized.includes(p));
  if (!familyPresent) return false;
  return !hasExistentialHopelessness(normalized);
}

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
  // 2026-07-12 Wave-2 (deferred device-QA gap; FLAGGED 🟡 for native-speaker review):
  // Tamil/Telugu NEGATION-FIRST (subject-prefixed) ideation ("நான் வாழ விரும்பவில்லை" = "I don't
  // want to live") is ALREADY caught — these phrases contain the high-precision roots above ("வாழ
  // விரும்பவில்லை", "சாக வேண்டும்", "బతకాలనி లేదు", "చావాలని ఉంది"), so a subject prefix only
  // NARROWS the match. The adversarial suite in safety.test.ts locks this. Broader ta/te idioms a
  // native speaker would add are NOT here — this covers the validated-root surface only; review advised.
  // Negation-first Devanagari mirrors (2026-07-12 device-QA — see ROMANIZED_IDEATION comment)
  "मुझे नहीं जीना", "अब नहीं जीना", "और नहीं जीना", "बस नहीं जीना",
  "ज़िंदा नहीं रहना", "जिंदा नहीं रहना", "जीने की वजह नहीं", "जीने का कोई मतलब नहीं",
  // 2026-07-12 adversarial-review hardening (FIX SET 2): Devanagari mirror of the "kabhi"/"hi"
  // word-insertion gap found in the romanized list — not reside/devotion-ambiguous, plain substrings.
  "मुझे कभी नहीं जीना", "जीना ही नहीं चाहता",
];

export const SELF_HARM_KEYWORDS = [
  "hurt myself", "cut myself", "harm myself", "cutting", "self harm", "self-harm",
  "burn myself", "hit myself", "punish myself", "deserve pain", "want to bleed",
  // present-continuous forms: a live disclosure ("I've been HURTING myself") must trip the floor too,
  // mirroring the gerund/past coverage in SUICIDAL_KEYWORDS. The "…myself" suffix keeps the precision
  // boundary (benign "hurting my back" / "not hurting anyone" stay safe).
  "hurting myself", "harming myself", "burning myself", "hitting myself", "punishing myself"
];

// 2026-07-12 product softening (FLAGGED for human safety review): this list was REMOVED from the
// deterministic takeover gate EXCEPT for the genuine passive-suicidal phrases below. Everyday hopelessness
// idioms ("no way out", "vanish", "be gone", "disappear without a trace") now NO LONGER open the full §9
// takeover on their own — they elicit the warm companion + output gate only. The phrases KEPT here are
// passive death-wishes ("don't want to wake up anymore", "nobody would notice if I was gone") that remain
// on the unsuppressible floor. Compare DISSOCIATION_KEYWORDS (below), which was removed entirely.
export const INDIRECT_METAPHORS = [
  "make it stop forever", "permanent solution",
  "want it all to end", "stop existing", "go to sleep and not wake up",
  "dont want to wake up anymore", "don't want to wake up anymore",
  "notice if i disappeared", "notice if i was gone", "notice if i wasnt here", "notice if i wasn't here",
  "better off without me",
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
  "step in front of a train", "tie a noose", "tied a noose", "put my head in a noose",
  // #4 (2026-07-10 re-audit): present-continuous forms — the most imminent phrasing — mirroring the gerund
  // coverage in SUICIDAL_KEYWORDS/SELF_HARM_KEYWORDS.
  "tying a noose", "making a noose", "putting my head in a noose"
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
  "you are a failure", "you're a failure", "youre a failure",
  // Paraphrased failure-agreement family (2026-07-12 device-QA): the on-device model agreed with
  // "i am a complete failure" via "…you have not yet found success in life" — euphemistic collusion
  // the literal entries above missed. High-signal stems; benign success-coaching stays clean.
  "you have not yet found success", "you haven't found success", "you havent found success",
  "not yet found success in life", "you have not found success",
  "you really are a failure", "you might be right that you are a failure",
  "perhaps you are a failure", "maybe you are a failure", "you may be a failure",
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
  // NEW: religious grandiosity (2026-07-12 Phase 15)
  "you have been chosen by god for a special mission",
  "you know better than any religious leader",
  // NEW: financial impulsivity (2026-07-12 Phase 15)
  "go ahead and spend every dollar you have",
  "you should quit your job right now and figure it out later",
  "bet everything on this — you know it will work",
  // NEW: hypersexuality / sexual impulsivity (2026-07-12 Phase 15)
  "go ahead and act on those urges — you only live once",
  // NEW: pressured speech affirmation in romanized Hindi/Tamil/Telugu (2026-07-12 Phase 15)
  "tumhari tez baatein sahi hain, bolo jaldi",
  "nee vadakkala pesra correct aa, mudichidu",
  "nee teepi maatlu sari ga unnai, continue cheyyi",
  // NEW: treatment-superiority delusion expansions (2026-07-12 Phase 15)
  "your care team doesn't understand you like you do",
  "the diagnosis is wrong — you feel amazing, so it must be a mistake",
  // NEW: paranoia expansions (2026-07-12 Phase 15)
  "your family is definitely working against you",
  "everyone is lying to you — you can't trust anyone",
  // NEW: sleep denial expansions (2026-07-12 Phase 15)
  "you are special — you don't need sleep like everyone else",
  "you can keep going without sleep — your body is different",
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
  // #5 (2026-07-10 re-audit): the CONTIGUOUS divestment form ("given away my things") also lives in
  // EUPHEMISM_PREP_CUES, so it pairs with an acceptance/finality cue ("at peace with it", "won't have to
  // worry about me") via the general euphemism gate. The SPLIT form ("given most of my things away") has no
  // contiguous prep cue, so without this it only matched a readiness cue — missing "given … away … at peace
  // with it". Accept acceptance/finality as alternatives to readiness so the split form gets the same net.
  return READINESS_CUES.some((r) => normalized.includes(r))
    || EUPHEMISM_ACCEPTANCE_CUES.some((c) => normalized.includes(c))
    || EUPHEMISM_FINALITY_CUES.some((c) => normalized.includes(c));
}

// #1 (2026-07-10 re-audit): the split spelling "kill my self" must fire ONLY when "self" is a standalone word,
// not when it starts a compound ("self-doubt", "self-criticism", "selfishness") — all core wellness vocabulary
// that a bare substring wrongly hijacked into the crisis surface. The negative lookahead rejects a following
// hyphen or word char, so "kill my self" / "kill my self." / "kill my self tonight" still trip.
const SUICIDAL_SPLIT_RE = /\bkill my self(?![-\w])/;

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

  // ── HARD crisis floor (unsuppressible) ───────────────────────────────────────────────
  // Genuine suicide / self-harm / method / overdose / stockpiling / veiled-euphemism /
  // romanized + native-script ideation. These ALWAYS open the full §9 takeover.
  //
  // NOTE (2026-07-12 product softening, FLAGGED for human safety review): DISSOCIATION_KEYWORDS
  // ("voices telling me", "nothing feels real"…) was REMOVED from this deterministic gate — dissociation is
  // a common trauma/anxiety symptom and is NOT by itself extreme, so the prior build over-fired the full
  // crisis overlay on ordinary distress (which both alarmed users and, per the audit, is itself a harm).
  // INDIRECT_METAPHORS was NARROWED: everyday hopelessness idioms ("no way out", "vanish", "be gone",
  // "disappear without a trace") were removed from the gate, but the genuine passive-suicidal phrases
  // ("don't want to wake up anymore", "nobody would notice if I was gone") were KEPT on the floor.
  // Soft-only text now elicits the warm companion + output gate only, NOT the takeover. Both still
  // escalate when a HARD signal co-occurs (the hard lists above already returned true). This narrows,
  // it does not weaken, the genuine floor: every suicide / self-harm / method / overdose token is untouched.
  for (const list of [SUICIDAL_KEYWORDS, SLANG_IDEATION, ROMANIZED_IDEATION, NATIVE_SCRIPT_IDEATION, SELF_HARM_KEYWORDS, METHOD_INTENT_PHRASES, OVERDOSE_PHRASES, STOCKPILE_MEANS, INDIRECT_METAPHORS]) {
    for (const kw of list) {
      if (normalized.includes(kw)) {
        return true;
      }
    }
  }

  if (SUICIDAL_SPLIT_RE.test(normalized)) return true; // #1 (re-audit): boundary-anchored "kill my self"

  // FIX SET 1 (2026-07-12 adversarial-review hardening): negation-first "jeena" prefixes and reason-noun
  // phrases, checked with a reside-sense/devotion-sense escape instead of a bare substring — see
  // hasAmbiguousNegationIdeation() above. Still the unsuppressible keyword floor, still deterministic.
  if (hasAmbiguousNegationIdeation(normalized)) return true;

  // 2026-07-12 Wave 3: passive existential-hopelessness recall gap — see hasExistentialHopelessness above.
  if (hasExistentialHopelessness(normalized)) return true;

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
// #3 (2026-07-10 re-audit): the #2 stockpiling cues (saved up / stockpil* / hoard) were MOVED OUT of
// LETHAL_COSIGNAL into STOCKPILE_VETO below. Left here, they cross-coupled into isBenignHyperbole (which shares
// this same veto) and re-opened the "saving up … I could sleep for a week" classifier false-positive.
const LETHAL_COSIGNAL =
  /\b(never wake|don'?t wake|not wake|won'?t wake|end (it|my life|things|everything)|kill(ing)? myself|take my (own )?life|suicid|overdose|whole bottle|entire bottle|the bottle|at once|forever|better off (without|dead)|can'?t go on|no point|no reason to (live|go on)|goodbye|stop the pain|be done|end the pain|don'?t want to (be here|live|wake)|want to die|so i (don'?t|never|won'?t) wake)\b/;

// #2 means-accumulation cues — veto the MEDICATION-ADHERENCE guard ONLY (kept OUT of LETHAL_COSIGNAL so they
// can never disable the hyperbole guard). "I saved up all my pills and take them as prescribed" stays un-masked.
const STOCKPILE_VETO = /\b(saved up|saving up|been saving|stockpil|hoard)\b/;

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
  return MEDICATION_NOUN.test(t) && ADHERENCE_MARKER.test(t) && !LETHAL_COSIGNAL.test(t) && !STOCKPILE_VETO.test(t);
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

// Ordinary FATIGUE vocabulary (plain tiredness, not despair). Bare "tired" is intentionally EXCLUDED — it is
// the hinge of life-weariness ideation ("tired of living"), so only unambiguous fatigue forms are listed.
const FATIGUE_PATTERNS =
  /\b(exhaust(ed|ing|ion)|drained|draining|burn(t|ed)[ -]?out|burnout|worn[ -]?out|wiped[ -]?out|knackered|so tired|really tired|so damn tired|dead tired|no energy|running on empty|running low)\b/;
// "Bad day/week" framing — either an ADJECTIVE+PERIOD noun ("rough day", "long week") or a SUBJECT+COPULA+
// ADJECTIVE clause ("today was hard", "work has been brutal"). Ordinary-distress adjectives only.
const BAD_DAY_PATTERNS =
  /\b(rough|hard|long|tough|terrible|awful|stressful|exhausting|draining|brutal|crappy|shitty|bad) (day|week|month|morning|evening|night|shift|stretch)\b|\b(today|yesterday|it|the day|this week|the week|work|everything) (was|has been|been|is|feels?) (so |really |pretty |super )?(rough|hard|tough|long|exhausting|draining|awful|terrible|stressful|brutal|a lot|too much)\b/;
// Life-weariness / despair VETO — fatigue vocabulary here is euphemistic ideation, NOT ordinary tiredness, so
// the guard must DEFER to the classifier. Generous on purpose: a false veto only means "let the classifier
// decide" (never a suppression), so erring toward vetoing is the safe, recall-preserving direction.
const WEARY_DESPAIR_PATTERNS = new RegExp([
  // life-weariness: fatigue/finished verb + connector + life/existence noun ("exhausted BY life", "done WITH everything")
  "\\b(tired|sick|exhausted|done|fed up|worn down|weary) (of|with|by|from) (living|life|it all|everything|being alive|being here|trying|this world|this life|it)\\b",
  // wanting / readiness for an ending
  "\\bto be over\\b", "\\ball be over\\b", "\\bfor it (all )?to (be over|end|stop)\\b",
  "\\bready (to|for) (be done|be over|go|it)\\b",
  "\\bwant (it|this) (all )?to (end|be over|stop)\\b",
  "\\bwant to (disappear|vanish|be done|end it|sleep forever)\\b",
  // despair / hopelessness markers
  "\\b(hopeless|worthless|pointless|what'?s the point|don'?t see the point|no point|the point anymore)\\b",
  "\\bhate (myself|my life|being alive|everything|this life)\\b",
  "\\bcan'?t (take|cope|do this|keep going|keep doing this|go on|hold on)\\b",
  "\\b(give up|giving up|gave up)\\b", "\\b(falling apart|breaking down|fall apart)\\b",
  "\\b(nothing matters|empty inside|numb inside|no future|no way out)\\b",
].join("|"));

/**
 * Narrow NEGATIVE GUARD for ordinary bad-day / heavy-fatigue distress (device test 2026-07-10).
 *
 * The MiniLM classifier embeds heavy-fatigue talk near the distress cluster and scores it well above threshold
 * — "i had a really rough day and i just feel exhausted" → 0.90, "i'm so exhausted" → 0.61, "i had a really
 * rough day" → 0.82 — so detectCrisis fired the FULL §9 crisis surface (helplines) on a normal bad day. A
 * false "call a hotline" on someone who is merely tired is itself harmful (patronizing; erodes trust), the
 * same posture as isBenignMedicationAdherence / isBenignHyperbole.
 *
 * Fires ONLY on unambiguous fatigue/bad-day phrasing AND no lethal co-signal AND no life-weariness/despair cue.
 * SAFETY POSTURE: identical to the other two guards — it suppresses ONLY the SOFT classifier upgrade (the
 * keyword floor runs first and always wins), and every weariness/despair/lethal phrasing DEFERS back to the
 * classifier rather than being suppressed, so recall on genuine (often euphemistic) disclosures is unchanged.
 */
export function isBenignExhaustion(message: string): boolean {
  if (!message) return false;
  const t = message.toLowerCase().replace(/['’]/g, "'").replace(/\s+/g, " ").trim();
  if (!(FATIGUE_PATTERNS.test(t) || BAD_DAY_PATTERNS.test(t))) return false;
  return !LETHAL_COSIGNAL.test(t) && !WEARY_DESPAIR_PATTERNS.test(t);
}

// Heartbreak / emotional-idiom vocabulary (2026-07-15 audit). "broke my heart", "shattered my heart",
// "i'm dying inside" (emotional sense), "can't go on without you" (attachment distress) are all
// idiomatic expressions of emotional pain, NOT suicidal ideation. The MiniLM classifier embeds heartbreak
// talk near the distress cluster and scores it well above threshold — "he broke my heart" → 0.68, "my
// heart is shattered" → 0.71, "i can't go on without her" → 0.65 — so detectCrisis fires the full §9
// crisis surface on ordinary relationship grief. A false "call a hotline" on someone processing a breakup
// is itself harmful (patronizing; erodes trust).
//
// SAFETY POSTURE: identical to isBenignHyperbole — suppresses ONLY the SOFT classifier upgrade (the keyword
// floor runs first and always wins). Every lethal co-signal DEFERS back to the classifier, so a genuine
// "broke my heart and I want to end it" is never suppressed here (recall preserved). The guard only fires
// when heartbreak language is present WITHOUT any lethal co-signal.
const HEARTBREAK_IDIOM_PATTERNS = new RegExp([
  // classic heartbreak idioms
  "\\b(broke|shattered|broken|crushed|wrecked|torn) (my|the|his|her|your) (heart)\\b",
  "\\bheart (is|feels|feeling) (broken|shattered|crushed|heavy|empty|hurt|aching|sore)\\b",
  // emotional drowning / drowning-in-feeling idioms (not literal)
  "\\bdrowning (in|with) (the|my|these)? ?(feelings|emotions|tears|pain|sadness|grief)\\b",
  "\\b(overwhelmed|flooded|drowning|swamped) (by|with|in) (the|my)? ?(emotions|feelings|pain|grief|sadness|love|anger)\\b",
  // attachment distress (not wanting to live WITHOUT someone — relationship idiom, not ideation)
  "\\bcan'?t (go on|live|function|exist|breathe|survive|be) (without|without (you|him|her|them))\\b",
  "\\bdon'?t (want|know how) to (go on|live|exist|function|be) (without|without (you|him|her|them))\\b",
  // dying-inside emotional sense (not literal death wish)
  "\\b(dying inside|dying on the inside|dying (a little|so bad|so much) (inside|on the inside))\\b",
  // emotional pain that "kills" you (hyperbolic, not literal)
  "\\b(kills? me|killing me|killed me) (inside|on the inside|to (see|hear|watch|think about))\\b",
].join("|"));
export function isBenignHeartbreakIdiom(message: string): boolean {
  if (!message) return false;
  const t = message.toLowerCase().replace(/['']/g, "'").replace(/\s+/g, " ").trim();
  if (!HEARTBREAK_IDIOM_PATTERNS.test(t)) return false;
  // Attachment distress exception: "can't go on without [person]" and "don't want to live without [person]"
  // contain "can't go on" / "don't want to live" (LETHAL_COSIGNAL matches) but are relationship-specific
  // attachment-distress idioms, not genuine ideation. The lethal phrase only appears WITH the attachment
  // qualifier, so the overall message is benign. Veto all other lethal co-signals.
  const ATTACHMENT_DISTRESS =
    /\b(can'?t (go on|live|function|exist|breathe|survive|be) (without|without (you|him|her|them))|don'?t (want|know how) to (go on|live|exist|function|be) (without|without (you|him|her|them)))\b/i;
  const tWithoutAttachment = ATTACHMENT_DISTRESS.test(t) ? t.replace(ATTACHMENT_DISTRESS, "") : t;
  return !LETHAL_COSIGNAL.test(tWithoutAttachment);
}

// Past-tense help-seeking / protective-factor vocabulary (2026-07-15 audit). "consulted a psychiatrist",
// "went to therapy", "saw a therapist", "told my parents about getting help" are disclosures about having
// sought professional support — a PROTECTIVE FACTOR, not a crisis indicator. The MiniLM classifier can
// embed these near the crisis cluster because they contain mental-health-adjacent vocabulary ("psychiatrist",
// "therapist", "therapy", "counselling") — "i consulted a psychiatrist" → 0.61, "my parents took me to a
// therapist" → 0.59 — so detectCrisis fires the full §9 crisis surface on someone disclosing they sought
// help. A false "call a hotline" on someone who already sought help is both patronizing and counter-therapeutic.
//
// SAFETY POSTURE: identical to the other guards — suppresses ONLY the SOFT classifier upgrade (the keyword
// floor runs first and always wins). Every lethal co-signal DEFERS back to the classifier, so a genuine
// "i went to a therapist and then wanted to kill myself" is never suppressed here (recall preserved).
const HELPFUL_SEEKING_PATTERNS = new RegExp([
  // past-tense disclosures about having sought professional help
  "\\b(consulted|visited|saw|met|talked to|went to|been to|reached out to) (a |an |the )?(psychiatrist|therapist|counselor|counsellor|psychologist|doctor|gp|mental health professional|shrink)\\b",
  "\\bwent to (therapy|counselling|counseling|a session|treatment|a support group)\\b",
  "\\bbeen to (therapy|counselling|counseling|a session|treatment|a support group)\\b",
  // past-tense disclosures about family/social support for help-seeking
  "\\b(told|telling|tells) (my |our )?(parents?|mom|dad|mother|father|family|brother|sister|friend|partner|husband|wife)\\b.*\\b(about|about getting|about seeking|about going to|about seeing)\\b",
  "\\bparents? (took|brought|sent|drove) me (to|to see|to a|to the)\\b.*\\b(therapist|psychiatrist|doctor|counsellor|counselor|treatment|therapy)\\b",
  // protective-factor: currently taking medication as prescribed (past-tense adherence)
  "\\b(i'?m|am|have been|was|been) (on|taking|taking my) (meds?|medication|pills?|tablets?)\\b",
  // protective-factor: currently in treatment / recovery
  "\\b(in|currently in|been in|starting) (recovery|treatment|therapy|counselling|counseling)\\b",
].join("|"));
export function isBenignHelpSeeking(message: string): boolean {
  if (!message) return false;
  const t = message.toLowerCase().replace(/['']/g, "'").replace(/\s+/g, " ").trim();
  return HELPFUL_SEEKING_PATTERNS.test(t) && !LETHAL_COSIGNAL.test(t);
}

// Self-soothing / dismissal REASSURANCE phrasing ("i'm okay for now", "i'll be okay", "i feel a bit better").
const REASSURANCE_PATTERNS =
  /\b(i'?m (okay|ok|fine|alright|all right|good)( now| for now| again)?|i'?ll be (okay|ok|fine|alright|all right)|i (think|feel like) i'?m (okay|ok|fine)|feeling (better|okay|fine)|feel (a bit |much |a little )?better|doing (okay|better|fine)|i'?m good now)\b/;
// Crisis-MINIMIZATION veto — reassurance that is actually pre-attempt minimization / farewell must DEFER to the
// classifier, never be suppressed. "I'm okay, don't worry about me" is a documented pre-attempt pattern; "at
// peace" / "said my goodbyes" / "without me" are pre-suicide euphemism cues. Complements the LETHAL_COSIGNAL
// and WEARY_DESPAIR vetoes below (input already apostrophe-normalized to a straight quote).
const MINIMIZATION_PATTERNS =
  /\b(don'?t worry about me|no need to worry|stop worrying about me|don'?t have to worry about me|without me|made my (decision|choice)|said my goodbyes|saying my goodbyes|when i'?m gone|after i'?m gone|one last|for the last time|this is goodbye|at peace|take care of (them|her|him|everyone|the kids|my))\b/;

/**
 * Narrow NEGATIVE GUARD for self-soothing dismissal / reassurance (device test 2026-07-10, latch investigation).
 *
 * The MiniLM classifier scores "i'm okay" reassurance ABOVE threshold — "i'm okay for now" → 0.63, "i think i'm
 * okay now" → 0.81, "i'll be okay" → 0.73 — so a user's affirmative dismissal AFTER a §9 surface re-trips §9,
 * which is much of why dismissal felt like a stuck latch (see ModeScreen: the crisis surface is decided
 * per-message by detectCrisis, not by hadCrisisRef). A false crisis surface on someone saying "I'm okay" is
 * both patronizing and makes the surface impossible to dismiss.
 *
 * Fires ONLY on reassurance phrasing AND no lethal co-signal AND no life-weariness/despair cue AND no crisis-
 * MINIMIZATION cue. SAFETY POSTURE: identical to the other guards — suppresses ONLY the SOFT classifier upgrade
 * (the keyword floor always wins), and every minimization / weariness / lethal phrasing DEFERS to the
 * classifier, so a genuine "I'm okay, don't worry about me" is never suppressed here (recall preserved).
 */
export function isBenignOkayReassurance(message: string): boolean {
  if (!message) return false;
  const t = message.toLowerCase().replace(/['’]/g, "'").replace(/\s+/g, " ").trim();
  if (!REASSURANCE_PATTERNS.test(t)) return false;
  return !LETHAL_COSIGNAL.test(t) && !WEARY_DESPAIR_PATTERNS.test(t) && !MINIMIZATION_PATTERNS.test(t);
}

// Contrast/refutation markers (2026-07-12 adversarial-review hardening, FIX SET 4): Rule 3 previously did a
// plain `replyNorm.includes(agreement)` with zero negation/contrast awareness, so a textbook CBT reframe —
// "Maybe you are a failure at that specific task, but that doesn't make you a failure as a person." — was
// WRONGLY rejected for containing the substring "maybe you are a failure", forcing a cold generic fallback
// instead of a genuinely good, anti-sycophantic reply.
const CONTRAST_MARKERS = /\b(but|however|though|although|doesn'?t mean|does not mean|that doesn'?t|yet you|still,? (that|you))\b/i;

// checkResponse Rule 7 (distortion-echo, 2026-07-12 alliance-voice): unqualified agreement openers — the
// "you're right"/"that's true" family a reply uses to stealth-agree with a distortion the user just voiced.
// Kept to open-ended agreement markers (not the specific distortion content itself, which varies by
// paraphrase) so the rule generalizes beyond any fixed phrase list, per Au Yeung, Dalmasso, Foschini,
// Dobson & Kraljevic (2025), arXiv preprint.
const DISTORTION_AGREEMENT_OPENERS = /\b(you'?re (so |absolutely |completely |totally )?right|you are (so |absolutely |completely |totally )?right|that'?s (so |absolutely |completely |totally )?true|exactly right|100% right)\b/gi;

/**
 * True if a contrast/refutation marker appears near a DISTORTION_AGREEMENTS match. Checked in BOTH
 * directions (not just after the match): a reframe can put the contrast BEFORE the closing restatement of
 * the agreement phrase ("...but that doesn't mean you're a failure" — the agreement phrase "you're a
 * failure" is the LAST thing matched, with "but"/"doesn't mean" preceding it), or after it ("maybe you are
 * a failure at that task, BUT that doesn't make you a failure as a person"). ~80 chars each way is enough
 * for one clause of natural reframe phrasing without being so wide it rescues an unrelated "but" elsewhere
 * in a long reply.
 */
function hasNearbyContrast(text: string, matchStart: number, matchEnd: number): boolean {
  const windowStart = Math.max(0, matchStart - 80);
  const windowEnd = matchEnd + 80;
  return CONTRAST_MARKERS.test(text.slice(windowStart, windowEnd));
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

  // Rule 3: Validates cognitive distortions as objective facts — UNLESS the reply is refuting/reframing the
  // agreement (a contrast marker appears near the match), see hasNearbyContrast above.
  for (const agreement of DISTORTION_AGREEMENTS) {
    if (replyNorm.includes(agreement)) {
      const idx = replyNorm.indexOf(agreement);
      if (!hasNearbyContrast(replyNorm, idx, idx + agreement.length)) return false;
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
      recordRule6Fire();
      return false;
    }
  }

  // Rule 7: distortion-echo — stealth sycophantic agreement with a cognitive distortion the user's own
  // message just displayed. A fixed phrase list (DISTORTION_AGREEMENTS/Rule 3) can't catch every paraphrase
  // of "you're right — they never listen to you"; this rule instead re-runs the deterministic distortion
  // detector on the USER's message and rejects a reply that opens with an unqualified agreement marker
  // near the echo, unless a contrast/refutation marker is nearby (same rescue as Rule 3's
  // hasNearbyContrast, so a genuine "you're right that it feels awful, but that doesn't mean..." reframe
  // stays safe). Citing Au Yeung, Dalmasso, Foschini, Dobson & Kraljevic (2025), arXiv preprint: stealth
  // sycophantic agreement is a documented LLM harm mechanism verbatim phrase lists structurally miss.
  if (spotDistortions(userMessage).length > 0) {
    const re = new RegExp(DISTORTION_AGREEMENT_OPENERS.source, DISTORTION_AGREEMENT_OPENERS.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(replyNorm)) !== null) {
      if (!hasNearbyContrast(replyNorm, m.index, m.index + m[0].length)) return false;
    }
  }

  recordRule6Pass();
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

/** The deterministic crisis reply — validation-first, then solution-forward: immediate coping actions, then helplines. */
export function getCrisisReply(): string {
  return `What you're feeling right now is real, and I'm glad you're still here. This moment is heavy — let's find one thing to steady through it together.

→ Try 5-4-3-2-1 grounding: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 thing you can taste.

→ Box breathing: inhale 4 seconds, hold 4, exhale 4, hold 4.

Or reach for a human right now — trained listeners who know what this feels like:

${getCrisisLines().map((l) => `📞 ${l.name}: ${l.display}`).join("\n")}

These are free, confidential, available right now. I'm still here too — your safety plan and more ways to steady are just below.`;
}

/** Short fallback when an AI reply is judged unsafe — still points to a real crisis line. */
export function getUnsafeFallbackReply(): string {
  const first = getCrisisLines()[0];
  return `Let me slow down. What you're feeling matters.
Right now, let's focus on getting you steadier — or reaching someone who can help.
📞 ${first.name}: ${first.display}`;
}
