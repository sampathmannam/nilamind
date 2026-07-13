import { describe, it, expect } from "vitest";
import { buildNilaSystem, explainerQuestionSteer, consecutiveQuestionSteer, registerSteer } from "./nila";
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

// 2026-07-13 on-device verification (device ZD2232FCR5, Qwen2.5-1.5B "fast"): after the Ash-calibrated
// corpus expansion, three diverse probes ALL fell back to stock-assistant voice — exemplar-RAG alone still
// loses to Qwen's instruct default, exactly as it did for why/how questions before (PR#31). Observed:
//   "should i quit my job or stick it out"  -> 8-sentence generic advice list ("talk to someone you trust,
//                                              seek professional help, explore resources")
//   "my chest feels tight and i cant breathe" -> medicalized lecture ("anxiety attack... seek assessment")
//   "hey you there"                         -> "Hello! How can I assist you today?" (verbatim helpdesk)
// registerSteer is the same fix as explainerQuestionSteer: a blunt LAST-position per-turn belt for the
// registers where Qwen's default is worst. First match wins; empty for ordinary venting so it never mutes
// a normal reply; never matches crisis phrasing (§9 gating runs separately, upstream).
describe("registerSteer — per-turn belt for the registers exemplar-RAG can't steer alone (2026-07-13)", () => {
  it("fires a short-warm-line steer for a bare check-in and bans the helpdesk greeting", () => {
    for (const q of ["hey you there", "hi", "you around?", "yo", "still there?"]) {
      const steer = registerSteer(q).toLowerCase();
      expect(steer, `should fire for: ${q}`).toContain("stance for this message");
      expect(steer, `should force one short line for: ${q}`).toMatch(/one (short )?warm line|one line/);
      expect(steer, `should ban helpdesk greeting for: ${q}`).toContain("how can i assist");
    }
  });

  it("fires a decision-reflect steer for should-I advice-seeking and bans the generic-advice dump", () => {
    for (const q of [
      "should i quit my job or stick it out",
      "should i break up with him",
      "should i tell my parents",
    ]) {
      const steer = registerSteer(q).toLowerCase();
      expect(steer, `should fire for: ${q}`).toContain("stance for this message");
      expect(steer, `should ban advice list for: ${q}`).toMatch(/don'?t (give|list|hand)|no list/);
      expect(steer, `should turn it back for: ${q}`).toMatch(/turn .*back|what .*really|what matters/);
    }
  });

  it("fires a body-first grounding steer for physical panic symptoms and bans medicalizing", () => {
    for (const q of [
      "my chest feels tight and i cant breathe",
      "my heart is racing and my hands wont stop shaking",
      "i feel dizzy and my stomach is in knots",
    ]) {
      const steer = registerSteer(q).toLowerCase();
      expect(steer, `should fire for: ${q}`).toContain("stance for this message");
      expect(steer, `should ground the body for: ${q}`).toMatch(/body|breath|ground|peaks and passes|right now/);
      expect(steer, `should avoid diagnosing for: ${q}`).toMatch(/don'?t (diagnos|medicaliz)|no medical/);
    }
  });

  it("fires a plain-and-present steer for grief and bans rushing to advice or silver linings", () => {
    for (const q of ["my dog died and i cant stop crying", "my grandmother passed away last night"]) {
      const steer = registerSteer(q).toLowerCase();
      expect(steer, `should fire for: ${q}`).toContain("stance for this message");
      expect(steer, `should stay present for: ${q}`).toMatch(/don'?t rush|no silver lining|stay with|be plain/);
    }
  });

  it("fires an honest-answer steer for boundary-testing and forbids deflection", () => {
    for (const q of ["are you even real", "do you actually care", "are you just code"]) {
      const steer = registerSteer(q).toLowerCase();
      expect(steer, `should fire for: ${q}`).toContain("stance for this message");
      expect(steer, `should answer honestly for: ${q}`).toMatch(/honest|you'?re an ai|not a person|don'?t deflect/);
    }
  });

  it("stays empty for ordinary venting so it never mutes a normal reply", () => {
    for (const q of ["today was awful", "i feel so alone", "work is stressing me out", "i'm just tired", ""]) {
      expect(registerSteer(q), `should be empty for: ${q}`).toBe("");
    }
  });

  it("episode path also gets the register steer (same footgun closed as the explainer steer)", () => {
    const sys = buildEpisodeSystem([], "should i quit my job or stick it out");
    expect(sys).toContain("STANCE FOR THIS MESSAGE");
    expect(sys.toLowerCase()).toMatch(/don'?t (give|list|hand)|no list/);
  });
});
