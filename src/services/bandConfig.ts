import type { UserState } from "../types/modes";

/** Capacity-aware dashboard configuration (Phase 3). Distressed-user research (Smashing Magazine,
 *  Bearable case study) shows exhausted/anxious/low users are overwhelmed by dense dashboards. So:
 *   - low-capacity states (anxious | low | elevated | crisis) → keep every band collapsed AND engage a
 *     "soft visual register" (reduced contrast/saturation) so the screen asks for less.
 *   - calm (high capacity) → gently open the lightest, most actionable bands (activity, tracking,
 *     trends) so the dashboard feels alive rather than empty, without dumping every dense section.
 *   - null (no signal yet) → safest default: all collapsed, neutral register.
 *  Pure + deterministic so it is unit-testable and never reads storage at render time. */
export interface BandConfig {
  softRegister: boolean;
  openActivity: boolean;
  openTracking: boolean;
  openSignals: boolean;
  openTrends: boolean;
  openEpisodes: boolean;
}

const LOW_CAPACITY: UserState[] = ["anxious", "low", "elevated", "crisis"];

export function buildBandConfig(state: UserState | null): BandConfig {
  const lowCapacity = state !== null && LOW_CAPACITY.includes(state);
  const calm = state === "calm";

  return {
    softRegister: lowCapacity,
    // A calm user gets a gently-opened, inviting set of bands; everyone else stays collapsed.
    openActivity: calm,
    openTracking: calm,
    openSignals: false,
    openTrends: calm,
    openEpisodes: false,
  };
}
