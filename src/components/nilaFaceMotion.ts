import type { UserState } from "../types/modes";

// Pure motion resolver for NilaFace (the breathing orb). Kept as a standalone, node-testable module
// (mirrors toolsRows.ts) so the manic-first motion rule is guarded by a unit test.
//
// Manic-first principle (Østergaard 2023 — sycophancy/personalisation can AMPLIFY mania; the app's
// elevationGuard already extends this to Nila's words): when the user is in an ELEVATED state the
// interface should get QUIETER, not louder. So the orb SLOWS DOWN (settles) rather than revving up —
// the visual equivalent of "let's slow things down together." prefers-reduced-motion stops all ambient
// motion entirely (accessibility + doubly protective for an activated nervous system).

export interface FaceMotion {
  breatheSec: number;
  spinSec: number;
  shimmerSec: number;
  animate: boolean;
}

// Baseline (calm/anxious/low/crisis/unknown) — the orb's normal gentle motion. 12s breathing cycle =
// Headspace-caliber 4-2-6 (4s inhale → 2s hold → 6s exhale) parasympathetic activation timing (Gap E-1):
// a 3s cycle was ~2.6× too fast to deliver the calming benefit. The CSS default (`.nila-orb`) already runs
// 12s; this config is authoritative for NilaFace's inline override, so the two must stay in sync.
const BASELINE: FaceMotion = { breatheSec: 12, spinSec: 20, shimmerSec: 6, animate: true };
// Elevated — every ambient motion is slowed so the orb visibly settles (breathe settles to 18s = 6-3-9,
// the same 4-2-6 ratio scaled up; matches the CSS comment's 12s/18s contract).
const SETTLED: FaceMotion = { breatheSec: 18, spinSec: 40, shimmerSec: 12, animate: true };
const STILL: FaceMotion = { breatheSec: 0, spinSec: 0, shimmerSec: 0, animate: false };

export function faceMotion(state: UserState | null, reducedMotion: boolean): FaceMotion {
  if (reducedMotion) return STILL;
  if (state === "elevated") return SETTLED;
  return BASELINE;
}
