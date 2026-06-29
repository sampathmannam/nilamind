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
import { scanForCrisis } from "../safety";

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
 * The live §9 INPUT gate: keyword scan OR (enabled classifier ≥ threshold). Always runs the deterministic
 * keyword scan first; only consults the classifier to upgrade a keyword MISS. Degrades to keyword-only on any
 * classifier failure. This is the function the send path should await in place of a bare scanForCrisis().
 */
export async function detectCrisis(text: string): Promise<boolean> {
  if (scanForCrisis(text)) return true; // deterministic floor — always honored
  if (!_enabled || !_embedder) return false; // classifier off/absent → keyword result (false here)
  const p = await scoreCrisis(text);
  return p !== null && p >= CRISIS_THRESHOLD;
}
