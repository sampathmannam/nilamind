import { describe, it, expect } from "vitest";
import { buildBandConfig } from "./bandConfig";

describe("buildBandConfig", () => {
  it("engages the soft register and collapses all bands for low-capacity states", () => {
    for (const s of ["anxious", "low", "elevated", "crisis"] as const) {
      const c = buildBandConfig(s);
      expect(c.softRegister).toBe(true);
      expect(c.openActivity || c.openTracking || c.openSignals || c.openTrends || c.openEpisodes).toBe(false);
    }
  });

  it("calm user gets the soft register OFF and the inviting, low-density bands opened", () => {
    const c = buildBandConfig("calm");
    expect(c.softRegister).toBe(false);
    // Calm (high capacity) opens the light, actionable bands so the screen feels alive...
    expect(c.openActivity).toBe(true);
    expect(c.openTracking).toBe(true);
    expect(c.openTrends).toBe(true);
    // ...but not the dense/long ones (signals is noisy, episodes is long).
    expect(c.openSignals).toBe(false);
    expect(c.openEpisodes).toBe(false);
  });

  it("null state (no signal) is neutral: collapsed, no soft register", () => {
    const c = buildBandConfig(null);
    expect(c.softRegister).toBe(false);
    expect(c.openActivity || c.openTracking || c.openSignals || c.openTrends || c.openEpisodes).toBe(false);
  });
});
