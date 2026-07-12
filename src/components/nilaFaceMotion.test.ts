import { describe, it, expect } from "vitest";
import { faceMotion } from "./nilaFaceMotion";
import type { UserState } from "../types/modes";

describe("faceMotion — orb settles when elevated, stills under reduced-motion", () => {
  it("calm / default → baseline speeds, animated", () => {
    expect(faceMotion("calm", false)).toEqual({ breatheSec: 3, spinSec: 20, shimmerSec: 6, animate: true });
    expect(faceMotion(null, false).animate).toBe(true);
  });

  it("elevated → SLOWER on every ambient motion than calm (settle, don't rev)", () => {
    const e = faceMotion("elevated", false);
    const c = faceMotion("calm", false);
    expect(e.breatheSec).toBeGreaterThan(c.breatheSec);
    expect(e.spinSec).toBeGreaterThan(c.spinSec);
    expect(e.shimmerSec).toBeGreaterThan(c.shimmerSec);
    expect(e.animate).toBe(true);
  });

  it("reduced-motion → all ambient motion off, regardless of state", () => {
    const states: (UserState | null)[] = ["calm", "elevated", "anxious", "low", "crisis", null];
    for (const s of states) {
      const m = faceMotion(s, true);
      expect(m).toEqual({ breatheSec: 0, spinSec: 0, shimmerSec: 0, animate: false });
    }
  });
});
