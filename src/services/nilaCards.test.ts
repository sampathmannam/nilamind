import { describe, it, expect } from "vitest";
import { skillCardFromReply, skillCardFromMessage, cardsForReply, protocolCard } from "./nilaCards";
import { CheckInEntry } from "../types";

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
