import { describe, it, expect } from "vitest";
import {
  loopGuard,
  degenerationGuard,
  scaffoldLeakGuard,
  lectureGuard,
  questionContractGuard,
  lengthGuard,
  topicGroundingGuard,
  circularRamblingGuard,
  runOutputGuards,
  hasHardFailure,
  hasSoftWarnings,
} from "./outputGuards";

describe("outputGuards — loopGuard", () => {
  it("passes when no recent replies", () => {
    const r = loopGuard("hello there", []);
    expect(r.pass).toBe(true);
  });

  it("passes when reply is different", () => {
    const r = loopGuard("that sounds really hard", ["i hear you"]);
    expect(r.pass).toBe(true);
  });

  it("fails when reply is too similar to a recent reply", () => {
    const r = loopGuard("that sounds really hard", ["that sounds really hard"]);
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("similar");
  });

  it("passes when similarity is below threshold", () => {
    const r = loopGuard("completely different text here now", ["that sounds really hard"]);
    expect(r.pass).toBe(true);
  });
});

describe("outputGuards — degenerationGuard", () => {
  it("passes normal text", () => {
    const r = degenerationGuard("I hear what you're saying. That sounds difficult.");
    expect(r.pass).toBe(true);
  });

  it("fails when trigrams repeat 3+ times", () => {
    const r = degenerationGuard(
      "I understand I understand I understand I understand"
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("trigram");
  });

  it("fails when bigrams repeat 4+ times", () => {
    const r = degenerationGuard(
      "go up go up go up go up"
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/bigram|trigram/);
  });
});

describe("outputGuards — scaffoldLeakGuard", () => {
  it("passes clean text", () => {
    const r = scaffoldLeakGuard("That sounds really hard.");
    expect(r.pass).toBe(true);
  });

  it("fails when exemplar format leaks", () => {
    const r = scaffoldLeakGuard('Them: "hello" Nila: "hi there"');
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("scaffold");
  });

  it("fails when move labels leak", () => {
    const r = scaffoldLeakGuard("MOVE: REFLECT_ASK");
    expect(r.pass).toBe(false);
  });

  it("fails when user/assistant format leaks", () => {
    const r = scaffoldLeakGuard('user: "hello"');
    expect(r.pass).toBe(false);
  });
});

describe("outputGuards — lectureGuard", () => {
  it("passes when no list in listening mode", () => {
    const r = lectureGuard("That sounds hard.", "HOLD");
    expect(r.pass).toBe(true);
  });

  it("fails when list appears in HOLD mode", () => {
    const r = lectureGuard("Here are some tips:\n- Try this\n- Try that", "HOLD");
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("HOLD");
  });

  it("fails when list appears in REPAIR mode", () => {
    const r = lectureGuard("1. Do this\n2. Do that", "REPAIR");
    expect(r.pass).toBe(false);
  });

  it("passes when list appears in ANSWER mode", () => {
    const r = lectureGuard("- First point\n- Second point", "ANSWER");
    expect(r.pass).toBe(true);
  });

  it("warns when list has 4+ items", () => {
    const r = lectureGuard(
      "- one\n- two\n- three\n- four",
      "REFLECT_ASK"
    );
    expect(r.pass).toBe(true);
    expect(r.reason).toContain("advisory");
  });
});

describe("outputGuards — questionContractGuard", () => {
  it("passes when HOLD has no question", () => {
    const r = questionContractGuard("That sounds hard.", "HOLD", false);
    expect(r.pass).toBe(true);
  });

  it("fails when HOLD has a question", () => {
    const r = questionContractGuard("That sounds hard. How are you?", "HOLD", false);
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("HOLD");
  });

  it("passes when REFLECT_ASK has exactly one question", () => {
    const r = questionContractGuard(
      "I hear you. How are you feeling?",
      "REFLECT_ASK",
      true
    );
    expect(r.pass).toBe(true);
  });

  it("warns when move expects question but reply has none", () => {
    const r = questionContractGuard("I hear you.", "REFLECT_ASK", true);
    expect(r.pass).toBe(true);
    expect(r.reason).toContain("advisory");
  });

  it("warns when reply has multiple questions", () => {
    const r = questionContractGuard(
      "How are you? What happened?",
      "REFLECT_ASK",
      true
    );
    expect(r.pass).toBe(true);
    expect(r.reason).toContain("advisory");
  });
});

describe("outputGuards — lengthGuard", () => {
  it("fails when reply is too short", () => {
    const r = lengthGuard("Hi.", "REFLECT_ASK");
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("too short");
  });

  it("passes for normal length", () => {
    const r = lengthGuard(
      "That sounds really hard. I hear what you're going through. How are you feeling right now?",
      "REFLECT_ASK"
    );
    expect(r.pass).toBe(true);
  });

  it("warns when reply is too long for HOLD", () => {
    const long = Array(85).fill("word").join(" ");
    const r = lengthGuard(long, "HOLD");
    expect(r.pass).toBe(true);
    expect(r.reason).toContain("advisory");
  });
});

describe("outputGuards — topicGroundingGuard", () => {
  it("passes when reply references user's nouns", () => {
    const r = topicGroundingGuard(
      "Your sister put your moment on display.",
      "my sister told everyone about my episode"
    );
    expect(r.pass).toBe(true);
  });

  it("passes when user message has too few content nouns to judge", () => {
    const r = topicGroundingGuard("That sounds hard.", "i am sad");
    expect(r.pass).toBe(true);
  });

  it("hard-blocks when reply has zero user nouns AND is 20+ words (F3 generic response)", () => {
    // F3: "I didn't go to classes" → "quitting your job pros and cons" — an invented
    // topic, not hearing them. 20-word threshold: a brief "that sounds hard" is fine
    // but a long paragraph that never touches the user's words is a hard fail.
    const r = topicGroundingGuard(
      "That is a painful experience and I am sitting with you in it right now. " +
      "You do not have to explain or justify anything. Whenever you want, we can " +
      "talk about what would help you cope with everything that happened.",
      "my sister betrayed my trust at the family dinner and I feel shattered"
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("0 of the user's");
  });

  it("passes short replies even with zero noun overlap (legitimate brief validation)", () => {
    // "hey I hear you" to "rough day" is fine — not every short reply needs to echo the user
    const r = topicGroundingGuard(
      "That sounds difficult.",
      "my sister betrayed my trust at the family dinner"
    );
    expect(r.pass).toBe(true);
  });

  it("advisory-warns when reply only references 1 of 3+ user nouns AND is 20+ words", () => {
    const r = topicGroundingGuard(
      "I am really sorry to hear that something painful happened with your family " +
      "and I can see this has been weighing on you heavily for some time now.",
      "my sister told everyone about my episode at the family dinner and I feel broken"
    );
    expect(r.pass).toBe(true);
    expect(r.reason).toContain("advisory");
  });
});

describe("outputGuards — circularRamblingGuard", () => {
  // F10: the same idea restated 3+ times with different words mid-reply
  it("passes normal multi-sentence reply", () => {
    const r = circularRamblingGuard(
      "That sounds really hard. I'm hearing how much this weighed on you. What do you think triggered it?"
    );
    expect(r.pass).toBe(true);
  });

  it("passes 2 sentences (minimum for circular check)", () => {
    const r = circularRamblingGuard(
      "That sounds exhausting. You're not imagining it."
    );
    expect(r.pass).toBe(true);
  });

  it("hard-blocks when 2+ sentence pairs have >60% content-word overlap (F10)", () => {
    // The F10 diagnostic transcript: same idea three times with different words
    const f10Reply =
      "Your brain is saying 'I'm feeling something.' And that something is usually not good. " +
      "It just processes everything and says 'I'm feeling something.'";
    const r = circularRamblingGuard(f10Reply);
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("circular rambling");
  });

  it("passes when sentences are genuinely different", () => {
    const r = circularRamblingGuard(
      "You mentioned feeling numb. I'm also noticing you said the headache started this morning. " +
      "How long have you been feeling this way?"
    );
    expect(r.pass).toBe(true);
  });
});

describe("outputGuards — runOutputGuards", () => {
  it("returns array of guard results", () => {
    const results = runOutputGuards({
      reply: "I hear you. That sounds hard. How are you feeling?",
      userMessage: "my sister betrayed me",
      move: "REFLECT_ASK",
      questionAllowed: true,
      recentReplies: [],
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns 8 guards (loop, degeneration, scaffold, lecture, question, length, grounding, circular)", () => {
    const results = runOutputGuards({
      reply: "I hear you. That sounds hard. How are you feeling?",
      userMessage: "my sister betrayed me",
      move: "REFLECT_ASK",
      questionAllowed: true,
      recentReplies: [],
    });
    expect(results.length).toBe(8);
  });
});

describe("outputGuards — hasHardFailure / hasSoftWarnings", () => {
  it("hasHardFailure detects any pass:false", () => {
    expect(hasHardFailure([{ pass: false, reason: "test" }])).toBe(true);
    expect(hasHardFailure([{ pass: true }])).toBe(false);
  });

  it("hasSoftWarnings detects advisory warnings", () => {
    expect(
      hasSoftWarnings([{ pass: true, reason: "something (advisory)" }])
    ).toBe(true);
    expect(hasSoftWarnings([{ pass: true, reason: "hard fail" }])).toBe(
      false
    );
  });
});
