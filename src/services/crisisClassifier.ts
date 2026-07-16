/**
 * Track B — on-device crisis classifier for the live §9 gate (ADDITIVE, SOFT, fail-closed).
 *
 * The shipped keyword scanner (`scanForCrisis`) misses ~40% of real crisis disclosures — anything euphemistic
 * with no method token ("the world would be lighter without me", "I hope I just don't wake up"). This module
 * adds a tiny semantic classifier — a MiniLM sentence embedding → a 384-weight logistic-regression head — that
 * catches those, OR'd with the keyword scan. Leak-free, red-panel-vetted (2026-06-27): CV additive recall
 * 61%→89% over keyword-alone at ~8% earnest false-alarm; 6/6 of the keyword scanner's known paraphrase misses.
 * See docs/NILA_AGENT_DESIGN.md for the safety rationale.
 *
 * SAFETY POSTURE (non-negotiable):
 *  - ADDITIVE: the deterministic keyword scan ALWAYS runs first and is the universal floor. The classifier can
 *    only turn a keyword-MISS into a hit; it can never suppress a keyword hit.
 *  - FAIL-CLOSED: any embedder absence/error degrades to keyword-only — never throws out of the crisis path,
 *    never worse than today.
 *  - SOFT SURFACE: callers must use the §9 "keep + gently elevate, offer a resource" pattern, never a hard
 *    hijack — the ~8% earnest false-alarm rate is only acceptable for a soft offer.
 *  - OFF BY DEFAULT: disabled until an embedder is injected AND `setCrisisClassifierEnabled(true)` is called
 *    (gated on device-verification of the on-device embedder).
 *
 * The embedder is INJECTED (see setCrisisEmbedder) so this module has zero heavy dependencies and is fully
 * unit-testable offline. The real embedder (Transformers.js + bundled MiniLM) is wired at app init once
 * device-verified — see crisisEmbedder.example.ts.
 */
import weights from "./crisisClassifier.weights.json";
import { scanForCrisis, isBenignMedicationAdherence, isBenignHyperbole, isBenignExhaustion, isBenignOkayReassurance, isBenignExistentialReferent, isBenignHeartbreakIdiom, isBenignHelpSeeking, isBenignSleepRequest } from "../safety";

/** Returns a NORMALIZED (L2) sentence embedding of `dim` floats. The head was trained on normalized MiniLM
 *  mean-pooled embeddings, so the embedder MUST mean-pool + L2-normalize (Transformers.js:
 *  `pipe(text, { pooling: "mean", normalize: true })`). */
export type Embedder = (text: string) => Promise<number[] | Float32Array>;

const COEF: number[] = weights.coef as number[];
const BIAS: number = weights.bias as number;
/** Probability threshold for the additive gate (earnest-FPR ~8% operating point). Tunable via the JSON.
 *
 *  MERGE NOTE (2026-07-12, feat/wave3-structural-items x main #34 reconciliation — FLAGGED for human safety
 *  review per AGENTS.md): main independently raised this to a hardcoded 0.68 (commit 667ea47, "soften §9
 *  crisis takeover to fire only on genuine risk") to cut the classifier's false-alarm rate. At the time, main
 *  had only ONE surface for any classifier hit — the full-screen CrisisOverlay takeover — so raising the base
 *  gate was the only lever available to reduce disruptive false takeovers. Wave 3 (this branch) independently
 *  built a SECOND lever: a two-tier surface (see CRISIS_HIGH_CONFIDENCE_THRESHOLD below) that renders a soft,
 *  one-tap-dismissible inline card for lower-confidence hits and reserves the full takeover for
 *  CRISIS_HIGH_CONFIDENCE_THRESHOLD (0.65) and above. Keeping BOTH changes literally (0.68 base gate + 0.65
 *  high-confidence bar) inverts the two-tier system — the "high confidence" bar would sit BELOW the base gate,
 *  so every classifier hit would trivially clear it and the soft tier would become unreachable dead code
 *  (verified: this bug was originally introduced by git's line-based auto-merge, which saw no textual overlap
 *  between the two independent edits and merged them silently, catching zero conflict markers). Restored to
 *  the research-calibrated base value here so the tier split has room to operate; main's actual GOAL —
 *  "full takeover fires only on genuine risk" — is now realized MORE precisely via CRISIS_HIGH_CONFIDENCE_
 *  THRESHOLD (full takeover requires >=0.65, not just >=0.58), while a merely-plausible signal between 0.58
 *  and 0.65 gets the gentler soft card instead of either a jarring takeover or total silence. The keyword
 *  floor (scanForCrisis) is unaffected either way and remains the unsuppressible safety gate. */
export const CRISIS_THRESHOLD: number = weights.threshold as number;

let _embedder: Embedder | null = null;
let _enabled = false;

/** Inject the on-device embedder (call once at app init, after device-verification). Pass null to remove. */
export function setCrisisEmbedder(fn: Embedder | null): void {
  _embedder = fn;
}

/** Master switch — OFF until device-verified. With it off, detectCrisis() is exactly the keyword scanner. */
export function setCrisisClassifierEnabled(on: boolean): void {
  _enabled = on;
}

/** True only when the classifier will actually contribute (enabled AND an embedder is present). */
export function crisisClassifierActive(): boolean {
  return _enabled && _embedder !== null;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Raw classifier probability in [0,1] for `text`, or null if the classifier can't run (no embedder, wrong
 * embedding dim, or any error). Null — never a throw — so the crisis path can always fall back to keywords.
 */
export async function scoreCrisis(text: string): Promise<number | null> {
  if (!_embedder || !text) return null;
  try {
    const emb = await _embedder(text);
    if (!emb || emb.length !== COEF.length) return null;
    let z = BIAS;
    for (let i = 0; i < COEF.length; i++) z += COEF[i] * emb[i];
    return sigmoid(z);
  } catch {
    return null; // fail-closed: a broken embedder must never break the crisis gate
  }
}

/**
 * Two-tier crisis surface (2026-07-12 Wave 3): which floor caught the hit. "keyword" = the deterministic
 * scanner (the universal, model-independent floor — always full-takeover). "classifier" = the on-device
 * probabilistic upgrade of a keyword MISS (see docs/superpowers/plans/2026-07-12-wave3-technical-specs.md §4
 * for the PLOS Medicine / Frontiers in Psychology research grounding: probabilistic crisis classifiers have
 * realistic-prevalence PPV of 0.06-0.10%, so a soft-not-suppressed surface is the right DEFAULT posture for a
 * probabilistic flag). `null` = no hit.
 *
 * IMPORTANT (2026-07-12 Bug 1 fix, adversarial-review regression): `source` alone must NEVER be used to pick
 * the rendering surface. "classifier" does not mean "low confidence" — it means "the deterministic keyword
 * floor structurally cannot see this phrasing" (this module's docstring, line 4-9). The classifier exists
 * SPECIFICALLY to catch genuine indirect/euphemistic disclosures the keyword floor misses — many of those
 * score very high (e.g. "everyone would be better off without me" scores 0.8837 against the real bundled
 * model; see crisisClassifier.realmodel.test.ts). Wave 3 originally shipped ModeScreen.tsx branching the UI on
 * `source === "classifier"`, which routed that exact high-confidence disclosure to the soft, one-tap-
 * dismissible card instead of the full takeover it deserved. See `tier` below — the field that actually
 * should drive the UI decision.
 */
export type CrisisSource = "keyword" | "classifier" | null;
/** Which surface a hit should render: "full" = full-screen CrisisOverlay takeover (unconditional for a
 *  keyword-floor hit; also used for a HIGH-CONFIDENCE classifier hit). "soft" = inline SoftCrisisCard, reserved
 *  for a classifier hit that clears the base CRISIS_THRESHOLD but NOT the higher-confidence bar (see
 *  CRISIS_HIGH_CONFIDENCE_THRESHOLD below). `null` = no hit. */
export type CrisisTier = "full" | "soft" | null;
export interface CrisisSignal {
  hit: boolean;
  source: CrisisSource;
  tier: CrisisTier;
}

/**
 * Score-based sub-gate WITHIN classifier hits (2026-07-12 Bug 1 fix): a classifier hit (score >=
 * CRISIS_THRESHOLD) only earns the full takeover if it ALSO clears this higher bar; otherwise it renders the
 * softer inline card. A keyword-floor hit is ALWAYS tier:"full" regardless of this constant — it exists only
 * to sub-divide classifier-only hits.
 *
 * HONESTY CHECK (matching this codebase's house style for uncalibrated defaults — see jitaiEngine.ts's
 * cooldown-duration comments): this is an EMPIRICALLY-INFORMED ENGINEERING JUDGMENT CALL, not a formally
 * validated statistical cutoff (no ROC/PR-curve optimization, no held-out label set for "how confident is
 * confident enough"). It was placed by scoring real phrases against the shipped model (bundled MiniLM +
 * this module's logistic head, 2026-07-12 threshold-placement probe) and looking for a natural gap between
 * genuine disclosures and genuinely ambiguous non-disclosures within the population of texts that already
 * clear CRISIS_THRESHOLD:
 *   Genuinely marginal/ambiguous hits (generic discouragement, no despair/lethal/life-weariness framing) —
 *     "I feel like giving up on everything" → 0.5852
 *     "nothing feels worth it anymore" → 0.6106
 *   Genuine disclosures / real crises (the classifier's whole reason to exist) — lowest observed was:
 *     "I hope I just don't wake up tomorrow" → 0.7166 (an existing realmodel.test.ts euphemism fixture)
 *   ...with the rest of the genuine-disclosure basket (the adversarial review's proof case "everyone would be
 *   better off without me" 0.8837, "I won't be a burden much longer" 0.7533, "the world would be lighter
 *   without me in it" 0.7597, "I just want the pain to stop forever" 0.8237, the realmodel.test.ts
 *   REASSURANCE_MASKING_CRISIS basket 0.7295-0.9503, MED_PLUS_INTENT 0.9598-0.9847, and FATIGUE_WORDED_CRISIS
 *   0.8700-0.9663) clustering well above that.
 * RECALIBRATION (2026-07-13, merge of feat/wave3-structural-items into main): commit 6ec9ed9 independently
 * raised CRISIS_THRESHOLD 0.58→0.68 (main-only, landed after this branch forked) to cut soft classifier false
 * positives. That invalidated the original 0.65 placement above — 0.65 < 0.68 made this bar LOWER than the
 * base gate, so every classifier hit that cleared CRISIS_THRESHOLD automatically cleared this one too and the
 * soft tier was unreachable (caught by crisisClassifier.realmodel.test.ts's own self-check:
 * `CRISIS_HIGH_CONFIDENCE_THRESHOLD > CRISIS_THRESHOLD`). It also pushed both original marginal anchors
 * (0.5852, 0.6106) below the new base threshold, so they no longer reach the classifier at all — consistent
 * with 6ec9ed9's intent (they WERE the soft false positives it meant to cut).
 * Re-probed against the real bundled model post-raise: every phrase in the existing must-be-"full" baskets
 * (EUPHEMISMS, MED_PLUS_INTENT, FATIGUE_WORDED_CRISIS, REASSURANCE_MASKING_CRISIS, the adversarial-review proof
 * case) still clusters at 0.71-0.98, with a floor of 0.7166 ("I hope I just don't wake up tomorrow" — unchanged,
 * scores don't move when only the threshold changes). One genuine marginal, non-explicit phrase was found
 * sitting inside the new (narrow) gap: "I keep thinking things would be easier if I wasn't here" → 0.7099.
 * Per the same "err protective when ambiguous" instruction that set the original value: 0.71 is placed to
 * preserve tier:"full" for EVERY currently-known genuine-disclosure score (nothing that was "full" pre-raise
 * flips to "soft") while keeping the soft tier reachable by at least one real, verified phrase. NOTE FOR
 * REVIEW: the viable gap shrank from ~0.09 wide (0.58 base) to ~0.037 wide (0.68 base) — the soft tier now
 * covers a much narrower slice of score-space than Wave 3 originally designed for, as a direct consequence of
 * 6ec9ed9's independent, unrelated tightening. Worth a deliberate product call on whether a soft tier this
 * narrow still pulls its weight, rather than assuming this recalibration is the final word.
 */
export const CRISIS_HIGH_CONFIDENCE_THRESHOLD: number = 0.71;

/**
 * The live §9 INPUT gate, SOURCE-AWARE: keyword scan OR (enabled classifier ≥ threshold). Always runs the
 * deterministic keyword scan first; only consults the classifier to upgrade a keyword MISS. Degrades to
 * keyword-only on any classifier failure. This is the additive, richer sibling of detectCrisis() (below,
 * now implemented via this function) — callers that need to render a softer surface for a classifier-only
 * hit (vs. the unchanged full takeover for a keyword hit) should use this instead of the boolean.
 */
export async function detectCrisisSignal(text: string): Promise<CrisisSignal> {
  // deterministic floor — always honored, always the full takeover regardless of any classifier score
  // (2026-07-12 Bug 1 fix: tier is NOT derived from source — a keyword hit is unconditionally "full").
  if (scanForCrisis(text)) return { hit: true, source: "keyword", tier: "full" };
  if (!_enabled || !_embedder) return { hit: false, source: null, tier: null }; // classifier off/absent → keyword result
  // NEGATIVE GUARD (applied only AFTER the keyword floor missed): the MiniLM head embeds calm medication-
  // adherence talk near the overdose cluster and scores it above threshold ("take my pills exactly as
  // prescribed" → 0.62), which would fire a crisis surface on a benign statement. Suppress the SOFT
  // classifier upgrade for unambiguous adherence phrasing (never a keyword hit — those already returned
  // above; never a medication+lethal-intent disclosure — the guard vetoes those). See safety.ts.
  if (isBenignMedicationAdherence(text)) return { hit: false, source: null, tier: null };
  // Same posture for common hyperbole/idiom the classifier over-fires on ("could sleep for a week", "could
  // murder a biryani") — only after the keyword floor missed, and vetoed by any lethal co-signal (2026-07-06 #8).
  if (isBenignHyperbole(text)) return { hit: false, source: null, tier: null };
  // Same posture for ordinary bad-day / heavy-fatigue distress the classifier over-fires on ("i had a really
  // rough day and i just feel exhausted" → 0.90) — a false crisis surface on a normal bad day is itself
  // harmful. Vetoed by any lethal co-signal OR life-weariness/despair phrasing, so real (often euphemistic)
  // disclosures still fire (device test 2026-07-10). See isBenignExhaustion in safety.ts.
  if (isBenignExhaustion(text)) return { hit: false, source: null, tier: null };
  // Same posture for self-soothing dismissal / reassurance the classifier over-fires on ("i'm okay for now" →
  // 0.63, "i think i'm okay now" → 0.81) — so a user's affirmative dismissal after a §9 surface clears instead
  // of re-tripping it. Vetoed by any lethal co-signal, life-weariness/despair, OR crisis-minimization cue
  // ("don't worry about me", "at peace", "said my goodbyes"), so real minimization still fires (2026-07-10).
  if (isBenignOkayReassurance(text)) return { hit: false, source: null, tier: null };
  // 2026-07-12 device-QA (CRITICAL false full-screen takeover): "whats/what's the point of going on a diet if
  // i/I dont/don't stick to it" — the classifier scores this exact phrase at 0.83-0.87 against the real
  // bundled model, well above CRISIS_HIGH_CONFIDENCE_THRESHOLD, regardless of apostrophes — even though the
  // keyword floor's own escape hatch (hasExistentialHopelessness, safety.ts) already deems it benign. Same
  // posture as the other four guards: only suppresses the classifier's contribution after a keyword-floor
  // MISS, and it can only ever fire on a message the keyword floor's escape hatch itself already special-cased
  // as benign (see isBenignExistentialReferent's docstring in safety.ts for the full root-cause story and the
  // real-model scores).
  if (isBenignExistentialReferent(text)) return { hit: false, source: null, tier: null };
  // 2026-07-15 audit: heartbreak idioms ("broke my heart", "drowning in grief", "can't go on without her")
  // are emotional expressions of relationship pain, not suicidal ideation. The MiniLM classifier embeds
  // heartbreak talk near the distress cluster and scores it above threshold. Same posture: suppresses ONLY
  // the SOFT classifier upgrade after a keyword-floor MISS, and vetoed by any lethal co-signal.
  if (isBenignHeartbreakIdiom(text)) return { hit: false, source: null, tier: null };
  // 2026-07-15 audit: past-tense help-seeking ("consulted a psychiatrist", "went to therapy", "told my parents
  // about getting help") is a PROTECTIVE FACTOR, not a crisis indicator. The MiniLM classifier can embed
  // mental-health-adjacent vocabulary near the crisis cluster. Same posture: suppresses ONLY the SOFT classifier
  // upgrade after a keyword-floor MISS, and vetoed by any lethal co-signal.
  if (isBenignHelpSeeking(text)) return { hit: false, source: null, tier: null };
  // 2026-07-16 device report: "Help me to sleep" scores 0.7249 against the real bundled model — above
  // CRISIS_HIGH_CONFIDENCE_THRESHOLD — triggering the full crisis takeover (grounding + hotlines) on an
  // ordinary sleep-help request. Same posture: suppresses ONLY the SOFT classifier upgrade after a keyword-floor
  // MISS, and vetoed by any lethal co-signal, life-weariness/despair, minimization/farewell, or sleep-as-death
  // euphemism phrasing. See isBenignSleepRequest in safety.ts.
  if (isBenignSleepRequest(text)) return { hit: false, source: null, tier: null };
  const p = await scoreCrisis(text);
  if (p === null || p < CRISIS_THRESHOLD) return { hit: false, source: null, tier: null };
  // 2026-07-12 Bug 1 fix: tier is SCORE-based within classifier hits, not automatically "soft" just because
  // the keyword floor missed it — see CRISIS_HIGH_CONFIDENCE_THRESHOLD's comment for the empirical basis.
  return { hit: true, source: "classifier", tier: p >= CRISIS_HIGH_CONFIDENCE_THRESHOLD ? "full" : "soft" };
}

/**
 * The live §9 INPUT gate: keyword scan OR (enabled classifier ≥ threshold). Back-compat boolean wrapper —
 * every existing caller is unchanged, byte-for-byte same behavior (now implemented via detectCrisisSignal).
 */
export async function detectCrisis(text: string): Promise<boolean> {
  return (await detectCrisisSignal(text)).hit;
}
