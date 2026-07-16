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
  genericAssistantPhraseGuard,
  runOutputGuards,
  hasHardFailure,
  hasGenerationBlockingFailure,
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
    const r = topicGroundingGuard("That sounds hard.", "i feel bad");
    expect(r.pass).toBe(true);
  });

  it("hard-blocks when reply is 20+ words and has zero user noun overlap (F3 invented topic)", () => {
    // F3: invented topic — user says "classes", model responds "quitting job" for 5 turns.
    // Reply: 26 words, completely different topic (quitting a job vs sister's betrayal).
    // User content nouns: sister, betrayed, trust, family, dinner, feel, shattered
    // Reply nouns (job is < 3 chars so filtered, quit is stop word): significant, decision,
    //   pros, cons, weigh, carefully, might, consider, financial, situation, making, changes
    // Zero overlaps. Hard block.
    const r = topicGroundingGuard(
      "Quitting a job is a significant decision and there are pros and cons to weigh carefully. " +
      "You might want to consider your financial situation before making any changes.",
      "my sister betrayed my trust at the family dinner and I feel shattered"
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("0 of the user's");
  });

  it("passes short replies even with zero noun overlap (legitimate brief validation)", () => {
    const r = topicGroundingGuard(
      "That sounds difficult.",
      "my sister betrayed my trust at the family dinner"
    );
    expect(r.pass).toBe(true);
  });

  it("advisory-warns when reply is 20+ words and references only 1 of 3+ user nouns", () => {
    // Reply: 22 words. Only "feel" overlaps with user (sister, told, everyone, about, episode,
    // family, dinner, feel, broken). All other reply nouns are non-overlapping: really, sorry,
    // difficult, heavy, weight, some, time, now, okay.
    // grounded = 1 (feel), userNouns = 9, advisory fires.
    const r = topicGroundingGuard(
      "I am really sorry to hear that something difficult happened and this seems heavy. " +
      "I can feel the weight of what you are carrying right now.",
      "my sister told everyone about my episode at the family dinner and I feel broken"
    );
    expect(r.pass).toBe(true);
    expect(r.reason).toContain("advisory");
  });
});

describe("outputGuards — circularRamblingGuard", () => {
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

  it("hard-blocks when the same content bigram appears across 2+ sentences (F10 mid-reply repetition)", () => {
    // F10: same idea restated 3 times with different surrounding words
    const f10Reply =
      "Your brain is saying 'I'm feeling something.' And that something is usually not good. " +
      "It just processes everything and says, 'I'm feeling something.'";
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

describe("outputGuards — genericAssistantPhraseGuard", () => {
  // Regression (device QA): on a low-signal chat turn, the on-device model fell back to its
  // pretrained-assistant default ("Hello! How can I assist you today?"), silently violating the
  // persona's own "NEVER SAY" list (nila.ts) with no code-level enforcement. lengthGuard already
  // flagged this reply as too-short but is deliberately advisory (see its docstring) so it never
  // suppressed the reply. This guard hard-blocks the exact banned phrases regardless of length,
  // so it can't be defeated by padding the reply with extra words.
  it("passes clean, in-persona text", () => {
    const r = genericAssistantPhraseGuard("That sounds really hard. What's the hardest part?");
    expect(r.pass).toBe(true);
  });

  it("fails on 'how can/may I assist/help you' (helpdesk boilerplate)", () => {
    const r = genericAssistantPhraseGuard("Hello! How can I assist you today?");
    expect(r.pass).toBe(false);
    expect(r.blockGeneration).toBe(true);
  });

  it("fails on other NEVER-SAY anti-patterns from the persona prompt", () => {
    expect(genericAssistantPhraseGuard("I'm sorry to hear that.").pass).toBe(false);
    expect(genericAssistantPhraseGuard("That's a great question!").pass).toBe(false);
    expect(genericAssistantPhraseGuard("Is there anything else I can help with?").pass).toBe(false);
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

  it("returns 9 guards (loop, degeneration, scaffold, lecture, question, length, grounding, circular, generic-assistant-phrase)", () => {
    const results = runOutputGuards({
      reply: "I hear you. That sounds hard. How are you feeling?",
      userMessage: "my sister betrayed me",
      move: "REFLECT_ASK",
      questionAllowed: true,
      recentReplies: [],
    });
    expect(results.length).toBe(9);
  });

  it("a generic-assistant reply through the full pipeline blocks generation", () => {
    const results = runOutputGuards({
      reply: "Hello! How can I assist you today?",
      userMessage: "hi nila, just testing",
      move: "REFLECT_ASK",
      questionAllowed: true,
      recentReplies: [],
    });
    expect(hasGenerationBlockingFailure(results)).toBe(true);
  });
});

describe("outputGuards — hasHardFailure / hasGenerationBlockingFailure / hasSoftWarnings", () => {
  it("hasHardFailure detects any pass:false", () => {
    expect(hasHardFailure([{ pass: false, reason: "test" }])).toBe(true);
    expect(hasHardFailure([{ pass: true }])).toBe(false);
  });

  it("hasGenerationBlockingFailure only catches pass:false WITH blockGeneration:true", () => {
    expect(
      hasGenerationBlockingFailure([{ pass: false, blockGeneration: true, reason: "test" }])
    ).toBe(true);
    // Advisory pass:false without blockGeneration — must NOT block generation
    expect(
      hasGenerationBlockingFailure([{ pass: false, blockGeneration: undefined, reason: "advisory" }])
    ).toBe(false);
    expect(
      hasGenerationBlockingFailure([{ pass: false, blockGeneration: false, reason: "advisory" }])
    ).toBe(false);
    expect(hasGenerationBlockingFailure([{ pass: true }])).toBe(false);
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

describe("outputGuards — blockGeneration semantics", () => {
  // Each canary verifies that the guard sets blockGeneration correctly.
  // Hard-block guards MUST set blockGeneration:true so the v1.16 companion pipeline may suppress them.
  // Advisory guards MUST set blockGeneration:undefined OR false so they flag but never suppress.

  it("loopGuard on near-duplicate sets blockGeneration:true", () => {
    const r = loopGuard("that sounds really hard", ["that sounds really hard"]);
    expect(r.pass).toBe(false);
    expect(r.blockGeneration).toBe(true);
  });

  it("degenerationGuard on repeated tris sets blockGeneration:true", () => {
    const r = degenerationGuard("the same the same the same the same");
    expect(r.pass).toBe(false);
    expect(r.blockGeneration).toBe(true);
  });

  it("scaffold leak sets blockGeneration:true", () => {
    const r = scaffoldLeakGuard('Them: "hi" Nila: "hello"');
    expect(r.pass).toBe(false);
    expect(r.blockGeneration).toBe(true);
  });

  it("circularRamblingGuard sets blockGeneration:true (F10 mid-reply repetition)", () => {
    const r = circularRamblingGuard(
      "Your brain is saying feeling something. And that feeling something usually not good. " +
      "It just processes everything and says feeling something again."
    );
    expect(r.pass).toBe(false);
    expect(r.blockGeneration).toBe(true);
  });

  it("topicGroundingGuard hard-block sets blockGeneration:true (F3 invented-topic fix)", () => {
    // 20+ word reply with zero content-noun overlap and 3+ user nouns
    const r = topicGroundingGuard(
      "Quitting a job is a significant decision and there are pros and cons to weigh carefully. " +
      "You might want to consider your financial situation before making any changes.",
      "my sister betrayed my trust at the family dinner and I feel shattered"
    );
    expect(r.pass).toBe(false);
    expect(r.blockGeneration).toBe(true);
  });

  it("questionContractGuard on HOLD-with-questions sets blockGeneration:true", () => {
    const r = questionContractGuard("That sounds hard. How are you?", "HOLD", false);
    expect(r.pass).toBe(false);
    expect(r.blockGeneration).toBe(true);
  });

  it("lectureGuard on HOLD-with-lists sets blockGeneration:true", () => {
    const r = lectureGuard(
      "Here are some tips:\n- Try this\n- Try that\n- Try the other",
      "HOLD"
    );
    expect(r.pass).toBe(false);
    expect(r.blockGeneration).toBe(true);
  });

  it("topicGroundingGuard short-reply exemption does NOT block", () => {
    // Brief "That sounds difficult." to a 3+-noun user message — legitimate brief validation, not hallucination
    const r = topicGroundingGuard(
      "That sounds difficult.",
      "my sister betrayed my trust at the family dinner"
    );
    expect(r.pass).toBe(true);
    expect(r.blockGeneration).toBeFalsy();
  });

  it("topicGroundingGuard partial-grounding advisory does NOT block", () => {
    const r = topicGroundingGuard(
      "I am really sorry to hear that something painful happened and this seems heavy. " +
      "I can feel the weight of what you are carrying right now.",
      "my sister told everyone about my episode at the family dinner and I feel broken"
    );
    expect(r.pass).toBe(true);
    expect(r.blockGeneration).toBeFalsy();
    expect(r.reason).toContain("advisory");
  });

  it("lengthGuard too-long advisory does NOT block", () => {
    const long = Array(150).fill("word").join(" ");
    const r = lengthGuard(long, "REFLECT_ASK");
    expect(r.pass).toBe(true);
    expect(r.blockGeneration).toBeFalsy();
    expect(r.reason).toContain("advisory");
  });
});