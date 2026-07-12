import { describe, it, expect } from "vitest";
import { buildNilaSystem, explainerQuestionSteer } from "./nila";
import { buildEpisodeSystem } from "./episodePrompt";

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

  it("episode path also gets the explainer steer (footgun closed)", () => {
    const sys = buildEpisodeSystem([], "why do i feel so anxious all the time");
    expect(sys).toContain("STANCE FOR THIS MESSAGE");
  });
});

describe("persona hardening (2026-07-12 device-QA)", () => {
  const sys = buildNilaSystem("hello");
  it("carries the name guard (Nila is YOUR name, never invent theirs)", () => {
    expect(sys).toMatch(/Nila is your name/i);
    expect(sys).toMatch(/never guess or invent (their|a) name/i);
  });
  it("bans the helpdesk register, not just the three openers", () => {
    expect(sys).toMatch(/how may i assist/i);
    expect(sys).toMatch(/anything else i can help/i);
    expect(sys).toMatch(/don'?t hesitate to reach out/i);
  });
  it("bans step-by-step advice lists explicitly (not just markdown formatting)", () => {
    expect(sys).toMatch(/never (give|structure) (advice|steps) as (a )?(numbered )?(list|steps)/i);
  });
  it("teaches playful-register matching for jokes/hyperbole", () => {
    expect(sys).toMatch(/haha|joking|banter/i);
  });
});
