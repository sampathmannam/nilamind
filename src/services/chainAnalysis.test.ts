import { describe, it, expect } from "vitest";
import {
  prefillVulnerability,
  chainId,
  suggestSkillForEmotion,
  summariseChain,
  type ChainAnalysis,
} from "./chainAnalysis";

describe("chainAnalysis", () => {
  describe("prefillVulnerability", () => {
    it("returns safe defaults", () => {
      const v = prefillVulnerability();
      expect(v.sleepProdrome).toBe(false);
      expect(v.elevationLevel).toBe("none");
      expect(v.checkinDistress).toBe(0);
      expect(v.elevatedHours).toBe(0);
      expect(v.other).toEqual([]);
    });
  });

  describe("chainId", () => {
    it("returns a string starting with chain_", () => {
      expect(chainId()).toMatch(/^chain_\d+_\d+$/);
    });

    it("produces unique ids", () => {
      const ids = new Set(Array.from({ length: 50 }, () => chainId()));
      expect(ids.size).toBe(50);
    });
  });

  describe("suggestSkillForEmotion", () => {
    it("suggests distress_tolerance for anger emotions", () => {
      expect(suggestSkillForEmotion("furious")).toBe("distress_tolerance");
      expect(suggestSkillForEmotion("seething")).toBe("distress_tolerance");
    });

    it("suggests emotion_regulation for anxiety emotions", () => {
      expect(suggestSkillForEmotion("panicked")).toBe("emotion_regulation");
      expect(suggestSkillForEmotion("overwhelmed")).toBe("emotion_regulation");
    });

    it("suggests emotion_regulation for sadness emotions", () => {
      expect(suggestSkillForEmotion("empty")).toBe("emotion_regulation");
      expect(suggestSkillForEmotion("numb")).toBe("emotion_regulation");
    });

    it("suggests distress_tolerance for shame emotions", () => {
      expect(suggestSkillForEmotion("guilty")).toBe("distress_tolerance");
    });

    it("suggests mindfulness for positive emotions", () => {
      expect(suggestSkillForEmotion("grateful")).toBe("mindfulness");
      expect(suggestSkillForEmotion("calm")).toBe("mindfulness");
    });

    it("returns undefined for undefined or empty input", () => {
      expect(suggestSkillForEmotion(undefined)).toBeUndefined();
      expect(suggestSkillForEmotion("")).toBeUndefined();
    });

    it("returns undefined for unrecognised emotions", () => {
      expect(suggestSkillForEmotion("confused")).toBeUndefined();
    });
  });

  describe("summariseChain", () => {
    it("mentions elevation if present", () => {
      const chain: ChainAnalysis = {
        id: "c1",
        date: "2026-01-01",
        vulnerability: { sleepProdrome: false, elevationLevel: "high", checkinDistress: 0, elevatedHours: 4, other: [] },
        promptingEvent: "argument",
        chainLinks: [],
        behavior: "yelled",
        consequences: "regret",
      };
      expect(summariseChain(chain)).toContain("Elevated state (high)");
    });

    it("mentions chain link count", () => {
      const chain: ChainAnalysis = {
        id: "c1",
        date: "2026-01-01",
        vulnerability: { sleepProdrome: false, elevationLevel: "none", checkinDistress: 0, elevatedHours: 0, other: [] },
        promptingEvent: "trigger",
        chainLinks: [{ moment: "link1" }, { moment: "link2" }, { moment: "link3" }],
        behavior: "acted",
        consequences: "after",
      };
      expect(summariseChain(chain)).toContain("3 chain links");
    });

    it("mentions intervention point", () => {
      const chain: ChainAnalysis = {
        id: "c1",
        date: "2026-01-01",
        vulnerability: { sleepProdrome: false, elevationLevel: "none", checkinDistress: 0, elevatedHours: 0, other: [] },
        promptingEvent: "trigger",
        chainLinks: [{ moment: "a" }, { moment: "b" }],
        behavior: "acted",
        consequences: "after",
        interventionPoint: { linkIndex: 1, skillId: "opposite_action", plan: "do the opposite" },
      };
      expect(summariseChain(chain)).toContain("intervention at link 2 using opposite_action");
    });

    it("returns generic message when chain is empty", () => {
      const chain: ChainAnalysis = {
        id: "c1",
        date: "2026-01-01",
        vulnerability: { sleepProdrome: false, elevationLevel: "none", checkinDistress: 0, elevatedHours: 0, other: [] },
        promptingEvent: "",
        chainLinks: [],
        behavior: "",
        consequences: "",
      };
      expect(summariseChain(chain)).toBe("Chain analysis recorded");
    });
  });
});
