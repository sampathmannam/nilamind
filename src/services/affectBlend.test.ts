import { describe, it, expect } from "vitest";
import { blendAffect } from "./affectBlend";

describe("blendAffect — user-weighted, divergence-aware blend", () => {
  it("returns the shared value when user and Nila agree", () => {
    const user = { valence: -0.4, arousal: 0.2 };
    const nila = { valence: -0.4, arousal: 0.2 };
    const blended = blendAffect(user, nila);
    expect(blended.valence).toBeCloseTo(-0.4, 5);
    expect(blended.arousal).toBeCloseTo(0.2, 5);
  });

  it("blends 70/30 user/Nila when they differ but don't diverge past the epsilon", () => {
    const user = { valence: -0.2, arousal: 0.1 };
    const nila = { valence: -0.1, arousal: 0.0 };
    const blended = blendAffect(user, nila);
    expect(blended.valence).toBeCloseTo(-0.2 * 0.7 + -0.1 * 0.3, 5);
    expect(blended.arousal).toBeCloseTo(0.1 * 0.7 + 0.0 * 0.3, 5);
  });

  it("nudges warmer when Nila's valence diverges notably above the user's", () => {
    const user = { valence: -0.6, arousal: 0.2 };
    const nila = { valence: 0.5, arousal: -0.1 }; // diff = 1.1, well past the 0.25 epsilon
    const base = user.valence * 0.7 + nila.valence * 0.3;
    const blended = blendAffect(user, nila);
    expect(blended.valence).toBeCloseTo(Math.min(1, base + 0.15), 5);
    expect(blended.valence).toBeGreaterThan(base);
  });

  it("does not nudge when Nila's valence is lower than or equal to the user's", () => {
    const user = { valence: 0.5, arousal: 0.1 };
    const nila = { valence: -0.5, arousal: 0.1 };
    const base = user.valence * 0.7 + nila.valence * 0.3;
    const blended = blendAffect(user, nila);
    expect(blended.valence).toBeCloseTo(base, 5);
  });

  it("clamps output to [-1, 1]", () => {
    const user = { valence: 0.95, arousal: 0.95 };
    const nila = { valence: 0.95, arousal: 0.95 };
    const blended = blendAffect(user, nila);
    expect(blended.valence).toBeLessThanOrEqual(1);
    expect(blended.arousal).toBeLessThanOrEqual(1);
  });
});
