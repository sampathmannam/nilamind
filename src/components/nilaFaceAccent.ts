import type { UserState } from "../types/modes";

// Pure render-decision resolver for NilaFace's per-turn affect accent — mirrors nilaFaceMotion.ts's
// "standalone, node-testable pure module" pattern. Decides WHETHER and HOW a computed affect signal
// becomes a visible core-dot flicker; never touches breatheSec/spinSec/shimmerSec (those stay owned
// entirely by faceMotion/nilaFaceMotion.ts). See
// docs/superpowers/specs/2026-07-19-orb-affect-accent-design.md §3.

export interface AffectAccentInput {
  valence: number;
  arousal: number;
}

export type AccentTint = "warm" | "deep";

export interface AccentRender {
  render: boolean;
  tint: AccentTint | null;
  magnitude: number;
}

// Below this combined signal strength, a turn is "near-neutral" and shouldn't flicker at all (ordinary
// logistics/small-talk turns).
const DEAD_ZONE = 0.15;
// Minimum gap between RENDERED accents, independent of the dead zone — matches nilaFaceMotion.ts's
// BASELINE.breatheSec (3s) so a rapid burst of emotional messages can't strobe the dot.
export const ACCENT_COOLDOWN_MS = 3000;
// The accent whispers at every intensity, never shouts — magnitude is clamped to this narrow band
// regardless of how strong the underlying arousal signal is.
const MAGNITUDE_MIN = 0.35;
const MAGNITUDE_MAX = 1.0;
// Anxious gets no protection from the elevated/crisis dormancy rule, but its most activated messages
// would otherwise produce the LARGEST flickers — a small dose of the stimulation-mirroring the
// elevated rule exists to prevent. Damp (not suppress) magnitude specifically for this state.
const ANXIOUS_DAMPING = 0.5;

const DORMANT: AccentRender = { render: false, tint: null, magnitude: 0 };

export function resolveAccentRender(
  accent: AffectAccentInput | null,
  state: UserState | null,
  lastRenderedAt: number | null,
  now: number
): AccentRender {
  if (!accent) return DORMANT;
  if (state === "elevated" || state === "crisis") return DORMANT;
  const strength = Math.max(Math.abs(accent.valence), Math.abs(accent.arousal));
  if (strength < DEAD_ZONE) return DORMANT;
  if (lastRenderedAt !== null && now - lastRenderedAt < ACCENT_COOLDOWN_MS) return DORMANT;

  const clampedArousal = Math.min(1, Math.max(0, Math.abs(accent.arousal)));
  let magnitude = MAGNITUDE_MIN + clampedArousal * (MAGNITUDE_MAX - MAGNITUDE_MIN);
  if (state === "anxious") magnitude *= ANXIOUS_DAMPING;

  return { render: true, tint: accent.valence >= 0 ? "warm" : "deep", magnitude };
}
