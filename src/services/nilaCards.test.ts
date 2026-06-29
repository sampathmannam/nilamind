import { describe, it, expect } from "vitest";
import { skillCardFromReply, cardsForReply } from "./nilaCards";
import { CheckInEntry } from "../types";

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
