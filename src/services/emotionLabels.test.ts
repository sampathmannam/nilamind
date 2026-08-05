import { describe, it, expect } from "vitest";
import {
  DISCRETE_EMOTIONS,
  getDiscrete,
  differentiateEmotion,
  countDistinctEmotions,
} from "./emotionLabels";

describe("emotionLabels", () => {
  it("has exactly 10 curated emotions", () => {
    expect(DISCRETE_EMOTIONS).toHaveLength(10);
  });

  it("every emotion has a unique id", () => {
    const ids = DISCRETE_EMOTIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getDiscrete returns the emotion for a known id", () => {
    const e = getDiscrete("furious");
    expect(e).toBeDefined();
    expect(e!.label).toBe("Furious");
    expect(e!.valence).toBe("negative");
    expect(e!.arousal).toBe("high");
  });

  it("getDiscrete returns undefined for an unknown id", () => {
    expect(getDiscrete("zzz")).toBeUndefined();
  });

  describe("differentiateEmotion", () => {
    it("enriches broad label with discrete label", () => {
      expect(differentiateEmotion("misery", "heavy")).toBe("Misery → heavy");
    });

    it("capitalises the broad label", () => {
      expect(differentiateEmotion("anger", "furious")).toBe("Anger → furious");
    });

    it("returns broad label unchanged for unknown discrete id", () => {
      expect(differentiateEmotion("fear", "zzz")).toBe("Fear");
    });

    it("handles lowercase broad label", () => {
      expect(differentiateEmotion("low", "numb")).toBe("Low → numb");
    });
  });

  describe("countDistinctEmotions", () => {
    it("counts unique valid emotion ids across entries", () => {
      const entries = [
        { discreteEmotions: ["furious", "heavy"] },
        { discreteEmotions: ["heavy", "numb"] },
        { discreteEmotions: ["furious"] },
      ];
      expect(countDistinctEmotions(entries)).toBe(3);
    });

    it("returns 0 for entries with no discrete emotions", () => {
      expect(countDistinctEmotions([{ discreteEmotions: [] }])).toBe(0);
      expect(countDistinctEmotions([{}])).toBe(0);
    });

    it("ignores unknown ids", () => {
      const entries = [{ discreteEmotions: ["furious", "zzz"] }];
      expect(countDistinctEmotions(entries)).toBe(1);
    });

    it("handles empty input", () => {
      expect(countDistinctEmotions([])).toBe(0);
    });
  });
});
