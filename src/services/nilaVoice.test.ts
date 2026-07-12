import { describe, it, expect } from "vitest";
import { buildNilaSystem, explainerQuestionSteer } from "./nila";

describe("Nila voice (short companion persona)", () => {
  const sys = buildNilaSystem("why does staying calm help");

  it("still carries the §9 crisis directive verbatim", () => {
    expect(sys).toContain("What you just shared matters more than anything else right now");
  });

  it("instructs prose over markdown/lists and against explainer preambles", () => {
    expect(sys.toLowerCase()).toMatch(/no bullet|no markdown|no bold/);
    expect(sys.toLowerCase()).toContain("that's a great question");
  });

  it("shows the reflect-and-ask move via at least one exemplar", () => {
    expect(sys.toLowerCase()).toContain("what's been the hardest part");
  });
});

describe("explainerQuestionSteer", () => {
  it("fires a reflect-not-lecture steer for why/how explainer questions", () => {
    for (const q of [
      "why do i keep putting things off",
      "why does staying calm help",
      "how do i stop overthinking at night",
      "how do i deal with a stressful day at work",
      "what makes me so anxious",
    ]) {
      const steer = explainerQuestionSteer(q).toLowerCase();
      expect(steer, `should fire for: ${q}`).toMatch(/do not answer it with an explanation|reflect the feeling/);
      expect(steer).toContain("never a numbered list");
    }
  });

  it("stays empty for non-explainer messages (so it never mutes normal replies)", () => {
    for (const q of ["i feel so alone", "today was awful", "i'm just lazy and useless", "hi", ""]) {
      expect(explainerQuestionSteer(q), `should be empty for: ${q}`).toBe("");
    }
  });
});
