/**
 * On-device valence/arousal scorer for the orb's per-turn affect accent (ADDITIVE, off by default).
 *
 * Mirrors crisisClassifier.ts's injected-embedder/enable-flag shape, but the head outputs a bounded
 * bipolar pair {valence, arousal} (via tanh) instead of a single crisis probability (via sigmoid) — see
 * docs/superpowers/specs/2026-07-19-orb-affect-accent-design.md §1.
 *
 * SAFETY POSTURE:
 *  - FAIL-CLOSED: any embedder absence/error/dimension-mismatch returns null, never throws.
 *  - OFF BY DEFAULT: disabled until an embedder is injected AND setAffectAccentEnabled(true) is called
 *    (gated on device-verification — see main.tsx, which wires the embedder but leaves this false).
 *  - This module has zero opinion on WHERE its output is used — NilaFace's render decision (dead-zone,
 *    cooldown, elevated/crisis dormancy, anxious damping) lives in nilaFaceAccent.ts, not here.
 */
import weights from "./affectHead.weights.json";

/** Same embedding contract as crisisClassifier.ts's Embedder — the head was trained on normalized
 *  MiniLM mean-pooled embeddings, so the injected embedder MUST match. */
export type AffectEmbedder = (text: string) => Promise<number[] | Float32Array>;

const VALENCE_COEF: number[] = weights.valenceCoef as number[];
const VALENCE_BIAS: number = weights.valenceBias as number;
const AROUSAL_COEF: number[] = weights.arousalCoef as number[];
const AROUSAL_BIAS: number = weights.arousalBias as number;

let _embedder: AffectEmbedder | null = null;
let _enabled = false;

/** Inject the on-device embedder (call once at app init). Pass null to remove. */
export function setAffectEmbedder(fn: AffectEmbedder | null): void {
  _embedder = fn;
}

/** Master switch — OFF until device-verified. */
export function setAffectAccentEnabled(on: boolean): void {
  _enabled = on;
}

/** True only when the head will actually contribute (enabled AND an embedder is present). */
export function affectAccentActive(): boolean {
  return _enabled && _embedder !== null;
}

function dot(coef: number[], emb: number[] | Float32Array): number {
  let z = 0;
  for (let i = 0; i < coef.length; i++) z += coef[i] * emb[i];
  return z;
}

export interface AffectScore {
  valence: number;
  arousal: number;
}

/** Bounded {valence, arousal} in roughly [-1, 1] for `text`, or null if the head can't run (disabled,
 *  no embedder, wrong embedding dim, or any error). Null — never a throw. */
export async function scoreAffect(text: string): Promise<AffectScore | null> {
  if (!_enabled || !_embedder || !text) return null;
  try {
    const emb = await _embedder(text);
    if (!emb || emb.length !== VALENCE_COEF.length) return null;
    const valence = Math.tanh(VALENCE_BIAS + dot(VALENCE_COEF, emb));
    const arousal = Math.tanh(AROUSAL_BIAS + dot(AROUSAL_COEF, emb));
    return { valence, arousal };
  } catch {
    return null; // fail-closed: a broken embedder must never break the turn
  }
}
