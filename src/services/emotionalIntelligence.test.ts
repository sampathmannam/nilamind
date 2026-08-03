import { describe, it, expect } from "vitest";
import { detectEmotion, getEmotionGuidance, emotionalSteer } from "./emotionalIntelligence";

describe("detectEmotion", () => {
  it("detects anxiety from anxious text", () => {
    expect(detectEmotion("I'm so anxious about everything")).toBe("anxiety");
  });

  it("detects celebration from happy text", () => {
    expect(detectEmotion("I'm happy and everything went well")).toBe("celebration");
  });

  it("returns neutral for empty string", () => {
    expect(detectEmotion("")).toBe("neutral");
  });

  it("detects sadness", () => {
    expect(detectEmotion("I feel so sad and down")).toBe("sadness");
  });

  it("detects anger", () => {
    expect(detectEmotion("I'm furious about what happened")).toBe("anger");
  });

  it("detects loneliness", () => {
    expect(detectEmotion("I feel so lonely tonight")).toBe("loneliness");
  });

  it("detects hopelessness", () => {
    expect(detectEmotion("I feel hopeless about everything")).toBe("hopelessness");
  });

  it("detects numbness", () => {
    expect(detectEmotion("I feel completely numb inside")).toBe("numbness");
  });

  it("returns neutral for unrecognized input", () => {
    expect(detectEmotion("the weather is nice today")).toBe("neutral");
  });
});

describe("getEmotionGuidance", () => {
  it("returns non-empty string for emotional input", () => {
    const guidance = getEmotionGuidance("I'm so anxious about everything");
    expect(guidance.length).toBeGreaterThan(0);
    expect(guidance).toContain("EMOTION:");
  });

  it("returns empty string for neutral input", () => {
    expect(getEmotionGuidance("")).toBe("");
    expect(getEmotionGuidance("the sky is blue")).toBe("");
  });

  it("returns guidance with validation info for sad text", () => {
    const guidance = getEmotionGuidance("I feel really sad today");
    expect(guidance).toContain("Validate:");
    expect(guidance).toContain("NEVER say:");
  });

  it("returns guidance for celebration", () => {
    const guidance = getEmotionGuidance("I'm so happy I got the job!");
    expect(guidance).toContain("celebration");
  });
});

describe("emotionalSteer", () => {
  it("wraps guidance in EMOTIONAL GUIDANCE block", () => {
    const result = emotionalSteer("I'm so anxious about the test");
    expect(result).toContain("[EMOTIONAL GUIDANCE");
    expect(result).toContain("EMOTION:");
  });

  it("returns empty string for neutral input", () => {
    expect(emotionalSteer("")).toBe("");
    expect(emotionalSteer("the weather is nice")).toBe("");
  });

  it("includes validation instructions", () => {
    const result = emotionalSteer("I feel hopeless about everything");
    expect(result).toContain("Validate:");
  });
});
