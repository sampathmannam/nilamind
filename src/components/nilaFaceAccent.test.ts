import { describe, it, expect } from "vitest";
import { resolveAccentRender, ACCENT_COOLDOWN_MS } from "./nilaFaceAccent";

describe("resolveAccentRender — orb affect-accent render decision", () => {
  it("no accent -> dormant", () => {
    expect(resolveAccentRender(null, "calm", null, 1000)).toEqual({ render: false, tint: null, magnitude: 0 });
  });

  it("elevated state -> dormant regardless of accent magnitude", () => {
    const d = resolveAccentRender({ valence: 0.9, arousal: 0.9 }, "elevated", null, 1000);
    expect(d.render).toBe(false);
  });

  it("crisis state -> dormant regardless of accent magnitude", () => {
    const d = resolveAccentRender({ valence: -0.9, arousal: 0.9 }, "crisis", null, 1000);
    expect(d.render).toBe(false);
  });

  it("below the dead zone -> dormant", () => {
    const d = resolveAccentRender({ valence: 0.05, arousal: 0.1 }, "calm", null, 1000);
    expect(d.render).toBe(false);
  });

  it("clears the dead zone -> renders, positive valence tints warm", () => {
    const d = resolveAccentRender({ valence: 0.5, arousal: 0.4 }, "calm", null, 1000);
    expect(d.render).toBe(true);
    expect(d.tint).toBe("warm");
  });

  it("negative valence tints deep", () => {
    const d = resolveAccentRender({ valence: -0.5, arousal: 0.4 }, "calm", null, 1000);
    expect(d.tint).toBe("deep");
  });

  it("inside the cooldown window -> dormant even with a strong accent", () => {
    const d = resolveAccentRender({ valence: 0.8, arousal: 0.8 }, "calm", 1000, 1000 + ACCENT_COOLDOWN_MS - 1);
    expect(d.render).toBe(false);
  });

  it("outside the cooldown window -> renders again", () => {
    const d = resolveAccentRender({ valence: 0.8, arousal: 0.8 }, "calm", 1000, 1000 + ACCENT_COOLDOWN_MS);
    expect(d.render).toBe(true);
  });

  it("magnitude stays within [0.35, 1.0] across the arousal range", () => {
    const low = resolveAccentRender({ valence: 0.5, arousal: 0.16 }, "calm", null, 1000);
    const high = resolveAccentRender({ valence: 0.5, arousal: 1.0 }, "calm", null, 1000);
    expect(low.magnitude).toBeGreaterThanOrEqual(0.35);
    expect(high.magnitude).toBeLessThanOrEqual(1.0);
    expect(high.magnitude).toBeGreaterThan(low.magnitude);
  });

  it("anxious damps magnitude relative to the same accent at calm", () => {
    const calm = resolveAccentRender({ valence: 0.5, arousal: 0.8 }, "calm", null, 1000);
    const anxious = resolveAccentRender({ valence: 0.5, arousal: 0.8 }, "anxious", null, 1000);
    expect(anxious.render).toBe(true);
    expect(anxious.tint).toBe(calm.tint);
    expect(anxious.magnitude).toBeLessThan(calm.magnitude);
  });
});
