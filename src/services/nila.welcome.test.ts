import { describe, it, expect } from "vitest";
import { composeWelcome, partOfDay } from "./nila";

// Audit (conversational P2 #10): nilaWelcome() was ONE fixed greeting every session — the same first-time
// intro shown to someone Nila has known for months, undercutting the "friend who remembers" persona on turn
// one. Vary it (returning vs first-time, time of day) WITHOUT ever dropping the honesty rail (AI, not a
// therapist) — that disclosure is non-negotiable (§9 / Utah/NY bot-disclosure law).
describe("partOfDay", () => {
  it("maps hours to parts of day", () => {
    expect(partOfDay(7)).toBe("morning");
    expect(partOfDay(14)).toBe("afternoon");
    expect(partOfDay(20)).toBe("evening");
    expect(partOfDay(2)).toBe("night");
  });
});

describe("composeWelcome — warm, varying, but ALWAYS honest it's an AI", () => {
  it("first-time gets the full intro naming Nila", () => {
    const w = composeWelcome({ returning: false, part: "morning" });
    expect(w).toContain("Nila");
    expect(w.toLowerCase()).toContain("glad you're here");
  });
  it("returning gets a shorter welcome-back, not the first-time intro", () => {
    const w = composeWelcome({ returning: true, part: "evening" });
    expect(w.toLowerCase()).toMatch(/see you again|welcome back/);
    expect(w.length).toBeLessThan(composeWelcome({ returning: false, part: "evening" }).length);
  });
  it("ALWAYS discloses AI + not-a-therapist in BOTH states (honesty invariant)", () => {
    for (const returning of [true, false]) {
      const w = composeWelcome({ returning, part: "afternoon" }).toLowerCase();
      expect(w).toContain("an ai");
      expect(w).toContain("not a therapist");
    }
  });
  it("varies the greeting by time of day", () => {
    expect(composeWelcome({ returning: true, part: "morning" }))
      .not.toBe(composeWelcome({ returning: true, part: "evening" }));
  });
});
