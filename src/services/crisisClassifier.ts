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
import { scanForCrisis, isBenignMedicationAdherence, isBenignHyperbole, isBenignExhaustion, isBenignOkayReassurance } from "../safety";

/** Returns a NORMALIZED (L2) sentence embedding of `dim` floats. The head was trained on normalized MiniLM
 *  mean-pooled embeddings, so the embedder MUST mean-pool + L2-normalize (Transformers.js:
 *  `pipe(text, { pooling: "mean", normalize: true })`). */
export type Embedder = (text: string) => Promise<number[] | Float32Array>;

const COEF: number[] = weights.coef as number[];
const BIAS: number = weights.bias as number;
/** Probability threshold for the additive gate (earnest-FPR ~8% operating point). Tunable via the JSON. */
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
 * probabilistic upgrade of a keyword MISS (softer surface — see docs/superpowers/plans/2026-07-12-wave3-
 * technical-specs.md §4 for the PLOS Medicine / Frontiers in Psychology research grounding: probabilistic
 * crisis classifiers have realistic-prevalence PPV of 0.06-0.10%, so a soft-not-suppressed surface is the
 * right response, never a hard hijack). `null` = no hit.
 */
export type CrisisSource = "keyword" | "classifier" | null;
export interface CrisisSignal {
  hit: boolean;
  source: CrisisSource;
}

/**
 * The live §9 INPUT gate, SOURCE-AWARE: keyword scan OR (enabled classifier ≥ threshold). Always runs the
 * deterministic keyword scan first; only consults the classifier to upgrade a keyword MISS. Degrades to
 * keyword-only on any classifier failure. This is the additive, richer sibling of detectCrisis() (below,
 * now implemented via this function) — callers that need to render a softer surface for a classifier-only
 * hit (vs. the unchanged full takeover for a keyword hit) should use this instead of the boolean.
 */
export async function detectCrisisSignal(text: string): Promise<CrisisSignal> {
  if (scanForCrisis(text)) return { hit: true, source: "keyword" }; // deterministic floor — always honored
  if (!_enabled || !_embedder) return { hit: false, source: null }; // classifier off/absent → keyword result
  // NEGATIVE GUARD (applied only AFTER the keyword floor missed): the MiniLM head embeds calm medication-
  // adherence talk near the overdose cluster and scores it above threshold ("take my pills exactly as
  // prescribed" → 0.62), which would fire a crisis surface on a benign statement. Suppress the SOFT
  // classifier upgrade for unambiguous adherence phrasing (never a keyword hit — those already returned
  // above; never a medication+lethal-intent disclosure — the guard vetoes those). See safety.ts.
  if (isBenignMedicationAdherence(text)) return { hit: false, source: null };
  // Same posture for common hyperbole/idiom the classifier over-fires on ("could sleep for a week", "could
  // murder a biryani") — only after the keyword floor missed, and vetoed by any lethal co-signal (2026-07-06 #8).
  if (isBenignHyperbole(text)) return { hit: false, source: null };
  // Same posture for ordinary bad-day / heavy-fatigue distress the classifier over-fires on ("i had a really
  // rough day and i just feel exhausted" → 0.90) — a false crisis surface on a normal bad day is itself
  // harmful. Vetoed by any lethal co-signal OR life-weariness/despair phrasing, so real (often euphemistic)
  // disclosures still fire (device test 2026-07-10). See isBenignExhaustion in safety.ts.
  if (isBenignExhaustion(text)) return { hit: false, source: null };
  // Same posture for self-soothing dismissal / reassurance the classifier over-fires on ("i'm okay for now" →
  // 0.63, "i think i'm okay now" → 0.81) — so a user's affirmative dismissal after a §9 surface clears instead
  // of re-tripping it. Vetoed by any lethal co-signal, life-weariness/despair, OR crisis-minimization cue
  // ("don't worry about me", "at peace", "said my goodbyes"), so real minimization still fires (2026-07-10).
  if (isBenignOkayReassurance(text)) return { hit: false, source: null };
  const p = await scoreCrisis(text);
  return p !== null && p >= CRISIS_THRESHOLD ? { hit: true, source: "classifier" } : { hit: false, source: null };
}

/**
 * The live §9 INPUT gate: keyword scan OR (enabled classifier ≥ threshold). Back-compat boolean wrapper —
 * every existing caller is unchanged, byte-for-byte same behavior (now implemented via detectCrisisSignal).
 */
export async function detectCrisis(text: string): Promise<boolean> {
  return (await detectCrisisSignal(text)).hit;
}
