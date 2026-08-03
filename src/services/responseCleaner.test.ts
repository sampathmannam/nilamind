import { describe, it, expect } from "vitest";
import { cleanResponse, qualityScore } from "./responseCleaner";

describe("cleanResponse", () => {
  it("strips 'I'm not a therapist' phrases", () => {
    const input = "How may I assist you? I'm here to support you today.";
    const cleaned = cleanResponse(input);
    expect(cleaned).not.toMatch(/how may i assist you/i);
    expect(cleaned).not.toMatch(/i'm here to support you/i);
  });

  it("normalizes double exclamation marks", () => {
    const cleaned = cleanResponse("That is great!!");
    expect(cleaned).toBe("That is great!");
  });

  it("normalizes double question marks", () => {
    const cleaned = cleanResponse("Really??");
    expect(cleaned).toBe("Really?");
  });

  it("normalizes excessive ellipsis", () => {
    const cleaned = cleanResponse("Well.......");
    expect(cleaned).toBe("Well...");
  });

  it("removes '— Nila' signature", () => {
    const cleaned = cleanResponse("You're doing great — Nila");
    expect(cleaned).not.toMatch(/—\s*Nila/i);
    expect(cleaned).toContain("You're doing great");
  });

  it("removes '- Nila' signature", () => {
    const cleaned = cleanResponse("Keep going - Nila");
    expect(cleaned).not.toMatch(/-\s*Nila$/i);
  });

  it("removes '– Nila' signature", () => {
    const cleaned = cleanResponse("You matter – Nila");
    expect(cleaned).not.toMatch(/–\s*Nila$/i);
  });

  it("trims 'i'm here for you.' opening", () => {
    const cleaned = cleanResponse("I'm here for you. Grounding might help right now.");
    expect(cleaned).not.toMatch(/^i'm here for you/i);
    expect(cleaned).toContain("Grounding");
  });

  it("ensures trailing punctuation", () => {
    const cleaned = cleanResponse("You did well");
    expect(cleaned).toMatch(/[.!?]$/);
  });

  it("preserves already-clean text", () => {
    const input = "That takes courage to share.";
    expect(cleanResponse(input)).toBe(input);
  });
});

describe("qualityScore", () => {
  it("returns 10 for a clean, well-formed response", () => {
    const score = qualityScore("It sounds like you had a tough evening. What helped last time?");
    expect(score).toBe(10);
  });

  it("penalizes anti-patterns", () => {
    const score = qualityScore("That's a great question. How may I assist you?");
    expect(score).toBeLessThan(10);
  });

  it("penalizes text that is too short", () => {
    const score = qualityScore("OK.");
    expect(score).toBeLessThanOrEqual(7);
  });

  it("penalizes text that is too long", () => {
    const long = "A".repeat(401);
    const score = qualityScore(long);
    expect(score).toBeLessThanOrEqual(8);
  });

  it("returns 0 for a response that is just a trim phrase", () => {
    const score = qualityScore("I hear you.");
    expect(score).toBe(0);
  });

  it("clamps at 0 minimum", () => {
    const score = qualityScore("that's a great question. please don't hesitate to reach out whenever feel free to");
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
