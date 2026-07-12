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

// alliance-voice (2026-07-12 clinical research wave 2): expectation-setting on first contact. Known-machine
// status increases willingness to disclose (Lucas, Gratch, King & Morency, 2014, Computers in Human
// Behavior) and a working bond can form despite that disclosure within ~5 days (Darcy et al., 2021, JMIR
// Formative Research) — but "sustained over 8 weeks" was checked and found UNSUPPORTED by the synthesis, so
// the copy must never claim that specific figure.
describe("composeWelcome — first-contact expectation-setting (Lucas 2014 / Darcy 2021)", () => {
  it("first-timers get a line naming that being upfront about being an AI makes it easier to open up", () => {
    const w = composeWelcome({ returning: false, part: "morning" }).toLowerCase();
    expect(w).toMatch(/easier to (say|share|open up|be honest|talk)/);
  });
  it("never claims a specific unsupported bond-duration figure", () => {
    const w = composeWelcome({ returning: false, part: "morning" }).toLowerCase();
    expect(w).not.toMatch(/8 weeks|eight weeks|sustained/);
  });
});
