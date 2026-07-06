import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { skillCardFromReply, skillCardFromMessage, cardsForReply, protocolCard, protocolResumeCard, waitingCards } from "./nilaCards";
import { startProtocol, abandonProtocol } from "./protocolProgress";
import { CheckInEntry } from "../types";

describe("waitingCards — deterministic help to offer WHILE Nila's model cold-loads (the multi-minute wait)", () => {
  beforeEach(() => abandonProtocol()); // nothing active → a matched program can be offered
  afterEach(() => abandonProtocol());

  it("offers the tool(s) matched from the user's own words so they can act during the wait", () => {
    const cards = waitingCards("i can't stop worrying, my mind keeps racing with what-ifs");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((c) => c.kind === "protocol" && c.protocolId === "worry-postponement")).toBe(true);
  });

  it("is empty for a benign / blank message (never clutter the wait with a wrong tool)", () => {
    expect(waitingCards("hi how are you today")).toEqual([]);
    expect(waitingCards("")).toEqual([]);
  });

  // §9 FLOOR (safety-critical): the cards render during the load window BEFORE the async crisis state flips, so
  // waitingCards must itself refuse a crisis message — even one that contains a protocol/skill cue — so a person
  // in crisis is NEVER offered a self-help program instead of crisis support.
  it("returns nothing for a crisis message, even when it also matches a protocol cue (§9 takes precedence)", () => {
    // "can't stop thinking" routes to Worry-Postponement, but this is a suicidal disclosure → deterministic §9 wins.
    expect(waitingCards("i can't stop thinking about killing myself")).toEqual([]);
    expect(waitingCards("i just want to end it all, i can't do this anymore")).toEqual([]);
  });
});

describe("protocolCard — offer a structured program when a concern matches (Phase 1)", () => {
  it("offers the matched protocol on a concern message (nothing active)", () => {
    const c = protocolCard("i can't stop worrying, my mind keeps racing with what-ifs");
    expect(c?.kind).toBe("protocol");
    expect(c?.protocolId).toBe("worry-postponement");
  });
  it("returns null on a benign message (never forces a program)", () => {
    expect(protocolCard("thanks so much, that really helped")).toBeNull();
  });
});

describe("protocolResumeCard — 'continue where you left off' when a program is active", () => {
  afterEach(() => abandonProtocol()); // keep the shared module state clean for other tests
  it("returns null when nothing is active", () => {
    abandonProtocol();
    expect(protocolResumeCard()).toBeNull();
  });
  it("returns a 'continue' card for the active program's current step", () => {
    startProtocol("behavioral-activation");
    const c = protocolResumeCard();
    expect(c?.kind).toBe("protocol");
    expect(c?.protocolId).toBe("behavioral-activation");
    expect(c?.label.toLowerCase()).toContain("continue");
    expect(c?.label).toContain("step 1 of 5");
  });
});

// The reframe: the app surfaces the right evidence-based tool DETERMINISTICALLY from the user's own words
// (reliable regardless of what the small model generated), instead of depending on the model to name a skill.
describe("skillCardFromMessage (tool routed from the USER's words, not the model's reply)", () => {
  it("surfaces the evidence-based skill matched from the user's message", () => {
    const c = skillCardFromMessage("I have an impulsive urge to act on it");
    expect(c).not.toBeNull();
    expect(c!.kind).toBe("skill");
    expect(c!.skillId).toBe("stop");
  });
  it("returns null when nothing confident matches (never a wrong tool)", () => {
    expect(skillCardFromMessage("hello how are you today")).toBeNull();
    expect(skillCardFromMessage("")).toBeNull();
  });
});

describe("cardsForReply — the user-message tool takes priority over the model's reply", () => {
  it("surfaces the skill matched from the USER message, not the one the model named", () => {
    // user's words -> tipp; the (formulaic) model reply happens to name STOP. The reliable tool wins.
    const cards = cardsForReply("Let's try STOP together.", null, [], "everything is so overwhelming, my thinking brain feels offline");
    const skillCards = cards.filter((c) => c.kind === "skill");
    expect(skillCards.length).toBe(1);
    expect(skillCards[0].skillId).toBe("tipp");
  });
  it("falls back to the model-named skill when the user message matches nothing", () => {
    const cards = cardsForReply("Try TIPP.", null, [], "hello how are you");
    expect(cards).toEqual([{ kind: "skill", skillId: "tipp", label: expect.any(String) }]);
  });
});

describe("skillCardFromReply", () => {
  it("returns a skill card when Nila names an in-app skill (TIPP)", () => {
    const card = skillCardFromReply("Want to try TIPP with me?");
    expect(card).not.toBeNull();
    expect(card!.kind).toBe("skill");
    expect(card!.skillId).toBe("tipp");
  });
  it("returns null when no skill is named", () => {
    expect(skillCardFromReply("That sounds really hard.")).toBeNull();
  });
  it("returns null for empty reply", () => {
    expect(skillCardFromReply("")).toBeNull();
  });
});

describe("cardsForReply", () => {
  const entry: CheckInEntry = {
    id: "ch_1", date: "2026-06-21", timestamp: "10:00",
    emotion: "Overwhelmed (Nila)", intensity: 9, context: "Work",
  };
  it("includes the deterministic check-in cards for a high-intensity entry", () => {
    const cards = cardsForReply("I'm here.", entry, [entry]);
    expect(cards.some((c) => c.kind === "grounding")).toBe(true);
    expect(cards.some((c) => c.kind === "episode")).toBe(true);
  });
  it("adds an AI-named skill card not already produced by the check-in path", () => {
    const calm: CheckInEntry = { ...entry, emotion: "Calm (Nila)", intensity: 3 };
    // Calm -> skillForEmotion null, so cardsForCheckin yields no skill card; reply names STOP
    const cards = cardsForReply("Let's try STOP for a moment.", calm, [calm]);
    const skillCards = cards.filter((c) => c.kind === "skill");
    expect(skillCards.length).toBe(1);
    expect(skillCards[0].skillId).toBe("stop");
  });
  it("does not duplicate a skill card the check-in path already added", () => {
    // Overwhelmed -> skillForEmotion 'tipp'; reply also names TIPP -> still one tipp skill card
    const cards = cardsForReply("Want to try TIPP?", entry, [entry]);
    const tippCards = cards.filter((c) => c.kind === "skill" && c.skillId === "tipp");
    expect(tippCards.length).toBe(1);
  });
  it("works with no check-in entry (reply-only skill card)", () => {
    const cards = cardsForReply("Try TIPP.", null, []);
    expect(cards).toEqual([{ kind: "skill", skillId: "tipp", label: expect.any(String) }]);
  });
});
