// Blends a turn's two raw affect scores (user's message, Nila's reply) into one accent-facing value —
// see docs/superpowers/specs/2026-07-19-orb-affect-accent-design.md §2.

export interface AffectPoint {
  valence: number;
  arousal: number;
}

const USER_WEIGHT = 0.7;
const NILA_WEIGHT = 0.3;
// How much warmer Nila's reply has to be than the user's turn before it's treated as a deliberate
// validating response worth nudging the blend toward — a subtle "this is being held" cue, not a full
// average toward Nila's tone.
const DIVERGENCE_EPSILON = 0.25;
const DIVERGENCE_NUDGE = 0.15;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function blendAffect(user: AffectPoint, nila: AffectPoint): AffectPoint {
  let valence = clamp(user.valence * USER_WEIGHT + nila.valence * NILA_WEIGHT, -1, 1);
  const arousal = clamp(user.arousal * USER_WEIGHT + nila.arousal * NILA_WEIGHT, -1, 1);
  if (nila.valence - user.valence > DIVERGENCE_EPSILON) {
    valence = clamp(valence + DIVERGENCE_NUDGE, -1, 1);
  }
  return { valence, arousal };
}
