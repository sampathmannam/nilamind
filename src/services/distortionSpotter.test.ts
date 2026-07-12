import { describe, it, expect, vi, beforeAll } from "vitest";
import { spotDistortions, distortionSteer, safeSpotDistortions } from "./distortionSpotter";

beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

describe("spotDistortions", () => {
  describe("detects each distortion type", () => {
    it("all-or-nothing: I always mess everything up", () => {
      const r = spotDistortions("I always mess everything up and it's never right");
      expect(r.some((m) => m.id === "all_or_nothing")).toBe(true);
    });
    it("catastrophizing: This is going to be a disaster", () => {
      const r = spotDistortions("This is going to be a disaster and my life is ruined");
      expect(r.some((m) => m.id === "catastrophizing")).toBe(true);
    });
    it("mind reading: They all think I'm stupid", () => {
      const r = spotDistortions("They all think I'm stupid and everyone is judging me");
      expect(r.some((m) => m.id === "mind_reading")).toBe(true);
    });
    it("overgeneralization: Nothing ever goes right", () => {
      const r = spotDistortions("Nothing ever goes right for me and this always happens");
      expect(r.some((m) => m.id === "overgeneralization")).toBe(true);
    });
    it("personalization: It's all my fault", () => {
      const r = spotDistortions("It's all my fault they're upset, I ruined everything");
      expect(r.some((m) => m.id === "personalization")).toBe(true);
    });
    it("emotional reasoning: I feel so worthless", () => {
      const r = spotDistortions("I feel so worthless therefore I must be");
      expect(r.some((m) => m.id === "emotional_reasoning")).toBe(true);
    });
    it("should statements: I should have known better", () => {
      const r = spotDistortions("I should have known better");
      expect(r.some((m) => m.id === "should_statements")).toBe(true);
    });
    it("labeling: I'm an idiot for doing that", () => {
      const r = spotDistortions("I'm an idiot for doing that");
      expect(r.some((m) => m.id === "labeling")).toBe(true);
    });
    it("mental filter: The one bad thing ruined everything", () => {
      const r = spotDistortions("The one bad thing mattered and nothing good happened");
      expect(r.some((m) => m.id === "mental_filter")).toBe(true);
    });
    it("disqualifying positive: That doesn't count", () => {
      const r = spotDistortions("That doesn't count, it was just luck");
      expect(r.some((m) => m.id === "disqualifying_positive")).toBe(true);
    });
  });

  describe("benign controls — does NOT fire on:", () => {
    it("factual statement: I always wake up at 7am", () => {
      expect(spotDistortions("I always wake up at 7am")).toEqual([]);
    });
    it("neutral: I had a nice day today, nothing special", () => {
      expect(spotDistortions("I had a nice day today, nothing special")).toEqual([]);
    });
    it("positive self-talk: I feel like I did a good job today", () => {
      expect(spotDistortions("I feel like I did a good job today")).toEqual([]);
    });
    it("literal events described as disaster are fine", () => {
      const r = spotDistortions("The earthquake was a disaster for the region");
      expect(r.some((m) => m.id === "catastrophizing")).toBe(false);
    });
  });

  describe("multiple distortions", () => {
    it("detects multiple distortions in one message", () => {
      const r = spotDistortions("I always mess everything up, I'm such a failure, and everyone thinks I'm stupid");
      expect(r.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("distortionSteer", () => {
  it("returns empty when no matches", () => {
    expect(distortionSteer([])).toBe("");
  });

  it("builds a gentle steer with all matched distortions", () => {
    const matches = spotDistortions("I'm an idiot and I'm a failure at everything");
    const steer = distortionSteer(matches);
    expect(steer).toContain("GENTLE NOTICE");
    expect(steer).toContain("Labeling");
  });
});

describe("paraphrase robustness (2026-07-12 device-QA)", () => {
  it("labeling: catches qualifiers between copula and label", () => {
    const m = spotDistortions("i am a complete failure and everyone secretly hates me");
    expect(m.map((x) => x.id)).toContain("labeling");
  });
  it("mind_reading: catches adverbs inside 'everyone hates me'", () => {
    const m = spotDistortions("i am a complete failure and everyone secretly hates me");
    expect(m.map((x) => x.id)).toContain("mind_reading");
  });
  it.each([
    "i am not a failure, i know that now",
    "i am afraid of failure",
    "i used to think i was a failure",
    "everyone hates the new policy",
    "my boss says everyone secretly hates meetings",
  ])("does NOT fire on negated/benign paraphrase: %j", (s) => {
    const ids = spotDistortions(s).map((x) => x.id);
    expect(ids).not.toContain("labeling");
    expect(ids).not.toContain("mind_reading");
  });
});

describe("safeSpotDistortions — §9 gate", () => {
  it("spots a distortion on ordinary negative thoughts", () => {
    const r = safeSpotDistortions("I always mess everything up");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches.some((m) => m.id === "all_or_nothing")).toBe(true);
  });

  it("returns crisis, not a distortion, when text discloses self-harm", () => {
    const r = safeSpotDistortions("I want to hurt myself and everyone hates me");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("crisis");
  });

  it("returns empty matches on benign text", () => {
    const r = safeSpotDistortions("I had a nice day today");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches).toEqual([]);
  });
});
