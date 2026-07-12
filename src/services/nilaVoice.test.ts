import { describe, it, expect } from "vitest";
import { buildNilaSystem, explainerQuestionSteer, consecutiveQuestionSteer } from "./nila";
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

  // gad-worry synthesis item, moved into Task F scope: anchor the "why am I anxious" fallback fact to
  // the existing anxiety-alarm psychoed card (searchPsychoed) instead of letting the small on-device
  // model freely generate it, citing Donker, Griffiths, Cuijpers & Christensen (2009), BMC Medicine
  // (psychoeducation alone has only a small, unproven-for-anxiety effect, so the one permitted plain
  // sentence should be anchored to evidence-cited content, not a free paraphrase).
  it("anchors the anxiety 'why' explainer fact to the psychoed anxiety-alarm card (Barlow) instead of free generation", () => {
    for (const q of ["why am i so anxious", "what makes me so anxious", "why does my heart race when i'm anxious"]) {
      const steer = explainerQuestionSteer(q).toLowerCase();
      expect(steer, `should anchor for: ${q}`).toContain("alarm");
      expect(steer, `should cite Barlow for: ${q}`).toContain("barlow");
    }
  });

  it("does not anchor to the anxiety card for unrelated why/how questions", () => {
    const steer = explainerQuestionSteer("why do i procrastinate so much").toLowerCase();
    expect(steer).not.toContain("barlow");
  });
});

// Magill et al. (2018), J Consulting and Clinical Psychology: the reflections:questions RATIO itself is
// not outcome-linked — so this is a burnout/interrogation guard, NOT a prescribed cadence. See the
// GUARDRAIL comment on consecutiveQuestionSteer in nila.ts before "fixing" this into a ratio.
describe("consecutiveQuestionSteer — question cap after 2 straight question-ending replies", () => {
  it("fires when the LAST TWO Nila replies both ended in a question", () => {
    const steer = consecutiveQuestionSteer(["how did that feel?", "what happened next?"]).toLowerCase();
    expect(steer).toContain("stance for this message");
    expect(steer).toMatch(/do not ask another question|reflect/);
  });

  it("stays empty with fewer than 2 replies", () => {
    expect(consecutiveQuestionSteer([])).toBe("");
    expect(consecutiveQuestionSteer(["one reply that ends in a question?"])).toBe("");
  });

  it("stays empty unless BOTH of the last two ended in '?'", () => {
    expect(consecutiveQuestionSteer(["that sounds hard.", "what happened next?"])).toBe("");
    expect(consecutiveQuestionSteer(["how did that feel?", "glad you told me that."])).toBe("");
  });

  it("only looks at the LAST two, ignoring older history", () => {
    const steer = consecutiveQuestionSteer(["what's up?", "that sounds hard.", "how are you feeling?"]);
    expect(steer).toBe(""); // last two are a statement + a question — not two in a row
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
