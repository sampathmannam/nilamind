import { describe, it, expect } from "vitest";
import { suggestGranularEmotions, granularityPrompt } from "./emotionGranularity";
import { MOOD_CHIPS } from "./nilaCheckinReducer";

describe("suggestGranularEmotions", () => {
  it("returns 3 suggestions for a known broad primary-emotion label", () => {
    const r = suggestGranularEmotions("Sadness");
    expect(r).toHaveLength(3);
    expect(["Disappointed", "Drained", "Numb"]).toContain(r[0]);
  });

  it("returns 3 suggestions for common check-in labels (Low, Anxious, Angry)", () => {
    expect(suggestGranularEmotions("Low")).toHaveLength(3);
    expect(suggestGranularEmotions("Anxious")).toHaveLength(3);
    expect(suggestGranularEmotions("Anger")).toHaveLength(3);
    expect(suggestGranularEmotions("Fear")).toHaveLength(3);
    expect(suggestGranularEmotions("Okay")).toHaveLength(3);
  });

  it("returns empty for an unknown label", () => {
    expect(suggestGranularEmotions("Zzz")).toEqual([]);
    expect(suggestGranularEmotions("")).toEqual([]);
  });

  it("boosts context-matched words above the default order", () => {
    const r = suggestGranularEmotions("Anger", "I felt so betrayed by my friend");
    expect(r).toContain("Betrayed");
  });

  it("returns suggestions even when context is empty or unrelated", () => {
    const r = suggestGranularEmotions("Anxious");
    expect(r).toHaveLength(3);
    const r2 = suggestGranularEmotions("Anxious", "unrelated text about pizza");
    expect(r2).toHaveLength(3);
  });

  it("handles Fear and Surprise -> Anxious family", () => {
    const r = suggestGranularEmotions("Fear");
    expect(r).toHaveLength(3);
    const r2 = suggestGranularEmotions("Surprise");
    expect(r2).toHaveLength(3);
    // both map to Anxious family
    expect(r[0]).toBe(r2[0]);
  });

  it("handles Numb → Shame family", () => {
    const r = suggestGranularEmotions("Numb");
    expect(r).toHaveLength(3);
  });

  // audit #10: "Overwhelmed" returned [] → the granularity step (and its only Skip button) rendered nothing,
  // dead-ending the mandatory opening check-in. EVERY mood chip must yield suggestions.
  it("returns suggestions for EVERY opening check-in mood chip", () => {
    for (const mood of MOOD_CHIPS) {
      expect(suggestGranularEmotions(mood).length, `mood "${mood}" produced no granular suggestions`).toBeGreaterThan(0);
    }
  });
});

describe("granularityPrompt", () => {
  it("builds a numbered conversational prompt", () => {
    const p = granularityPrompt(["Disappointed", "Drained", "Numb"]);
    expect(p).toContain("1. Disappointed");
    expect(p).toContain("2. Drained");
    expect(p).toContain("3. Numb");
    expect(p).toContain("precisely");
  });
});
