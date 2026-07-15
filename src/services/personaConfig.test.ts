import { describe, it, expect } from "vitest";
import {
  WELCOME_GREETING, WELCOME_FIRST, WELCOME_RETURNING, WELCOME_SEED,
  WELCOME_BACK_LONG, WELCOME_BACK_MEDIUM, WELCOME_BACK_SHORT,
  STATE_MESSAGES, CRISIS_RESPONSE, ANTI_SYCHOPHANCY_BLOCK,
  NILA_ORIGIN, IDENTITY_DISCLOSURE, EMOTION_KEYWORDS,
  detectEmotionUnified,
} from "./personaConfig";

describe("personaConfig", () => {
  it("WELCOME_GREETING has all four parts of day", () => {
    expect(WELCOME_GREETING.morning).toBeTruthy();
    expect(WELCOME_GREETING.afternoon).toBeTruthy();
    expect(WELCOME_GREETING.evening).toBeTruthy();
    expect(WELCOME_GREETING.night).toBeTruthy();
  });

  it("WELCOME_FIRST names Nila and discloses AI status", () => {
    expect(WELCOME_FIRST).toContain("I'm Nila");
    expect(WELCOME_FIRST).toContain("AI, not a therapist");
  });

  it("WELCOME_RETURNING discloses AI status", () => {
    expect(WELCOME_RETURNING).toContain("AI, not a therapist");
  });

  it("WELCOME_SEED is a short intro", () => {
    expect(WELCOME_SEED).toContain("I'm Nila");
    expect(WELCOME_SEED.length).toBeLessThan(120);
  });

  it("welcome-back messages form a descending duration ladder", () => {
    expect(WELCOME_BACK_LONG).toContain("while");
    expect(WELCOME_BACK_MEDIUM).toContain("few days");
    expect(WELCOME_BACK_SHORT).toContain("bit");
  });

  it("STATE_MESSAGES covers anxious, low, elevated", () => {
    expect(STATE_MESSAGES.anxious).toBeTruthy();
    expect(STATE_MESSAGES.low).toBeTruthy();
    expect(STATE_MESSAGES.elevated).toBeTruthy();
  });

  it("CRISIS_RESPONSE contains the placeholder for region-specific lines", () => {
    expect(CRISIS_RESPONSE).toContain("[REGION_CRISIS_LINES]");
    expect(CRISIS_RESPONSE).toContain("reach out");
  });

  it("ANTI_SYCHOPHANCY_BLOCK is a non-empty string with key rules", () => {
    expect(ANTI_SYCHOPHANCY_BLOCK).toContain("ANTI-SYCOPHANCY");
    expect(ANTI_SYCHOPHANCY_BLOCK).toContain("grandiosity");
  });

  it("NILA_ORIGIN is a short backstory", () => {
    expect(NILA_ORIGIN).toContain("friend");
    expect(NILA_ORIGIN.length).toBeLessThan(200);
  });

  it("IDENTITY_DISCLOSURE is the canonical AI disclosure", () => {
    expect(IDENTITY_DISCLOSURE).toBe("I'm an AI, not a therapist");
  });

  it("EMOTION_KEYWORDS covers crisis, anxiety, sadness, anger, numb, happy", () => {
    expect(EMOTION_KEYWORDS.crisis).toBeDefined();
    expect(EMOTION_KEYWORDS.anxious).toBeDefined();
    expect(EMOTION_KEYWORDS.sad).toBeDefined();
    expect(EMOTION_KEYWORDS.angry).toBeDefined();
    expect(EMOTION_KEYWORDS.numb).toBeDefined();
    expect(EMOTION_KEYWORDS.happy).toBeDefined();
  });

  describe("detectEmotionUnified", () => {
    it("detects crisis from suicidal ideation", () => {
      expect(detectEmotionUnified("I want to kill myself")).toBe("crisis");
    });
    it("detects anxiety", () => {
      expect(detectEmotionUnified("I'm feeling really anxious today")).toBe("anxious");
    });
    it("detects sadness", () => {
      expect(detectEmotionUnified("I've been crying all day")).toBe("sad");
    });
    it("detects anger", () => {
      expect(detectEmotionUnified("I'm so furious right now")).toBe("angry");
    });
    it("detects numbness", () => {
      expect(detectEmotionUnified("I feel nothing, just empty")).toBe("numb");
    });
    it("detects happiness", () => {
      expect(detectEmotionUnified("Today was amazing, I'm so grateful")).toBe("happy");
    });
    it("detects hopelessness", () => {
      expect(detectEmotionUnified("nothing matters anymore, what's the point")).toBe("hopeless");
    });
    it("detects loneliness", () => {
      expect(detectEmotionUnified("I feel so alone, nobody cares")).toBe("lonely");
    });
    it("returns neutral for unmatched text", () => {
      expect(detectEmotionUnified("the weather is okay")).toBe("neutral");
    });
  });
});
