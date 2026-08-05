import { describe, it, expect } from "vitest";
import {
  auditId,
  computeVulnerabilityWindow,
  generateNudge,
  pleaseTotal,
  PLEASE_ITEMS,
  type PleaseAudit,
} from "./pleaseAudit";

const fullAudit: PleaseAudit = {
  id: "test",
  date: "2026-01-01",
  timestamp: "2026-01-01T08:00:00",
  sleep: 3,
  food: 3,
  movement: 3,
  substances: 3,
  mastery: 3,
};

describe("pleaseAudit", () => {
  describe("auditId", () => {
    it("returns a string starting with please_", () => {
      expect(auditId()).toMatch(/^please_\d+_\d+$/);
    });

    it("produces unique ids", () => {
      const ids = new Set(Array.from({ length: 50 }, () => auditId()));
      expect(ids.size).toBe(50);
    });
  });

  describe("PLEASE_ITEMS", () => {
    it("has 5 items", () => {
      expect(PLEASE_ITEMS).toHaveLength(5);
    });

    it("covers sleep, food, movement, substances, mastery", () => {
      const keys = PLEASE_ITEMS.map((i) => i.key);
      expect(keys).toEqual(["sleep", "food", "movement", "substances", "mastery"]);
    });
  });

  describe("computeVulnerabilityWindow", () => {
    it("returns 'low' when all items are 3 (score 15)", () => {
      expect(computeVulnerabilityWindow(fullAudit)).toBe("low");
    });

    it("returns 'high' when score ≤ 5", () => {
      expect(computeVulnerabilityWindow({ sleep: 1, food: 1, movement: 1, substances: 1, mastery: 1 })).toBe("high");
      expect(computeVulnerabilityWindow({ sleep: 0, food: 0, movement: 0, substances: 0, mastery: 0 })).toBe("high");
    });

    it("returns 'moderate' when score is 6–8", () => {
      expect(computeVulnerabilityWindow({ sleep: 2, food: 2, movement: 2, substances: 1, mastery: 1 })).toBe("moderate");
      expect(computeVulnerabilityWindow({ sleep: 2, food: 2, movement: 2, substances: 2, mastery: 0 })).toBe("moderate");
    });

    it("returns 'high' when sleep < 6 hours regardless of score", () => {
      expect(computeVulnerabilityWindow(fullAudit, 5)).toBe("high");
      expect(computeVulnerabilityWindow(fullAudit, 4)).toBe("high");
    });

    it("returns 'low' when sleep ≥ 6 hours and score > 8", () => {
      expect(computeVulnerabilityWindow(fullAudit, 6)).toBe("low");
      expect(computeVulnerabilityWindow(fullAudit, 8)).toBe("low");
    });

    it("ignores sleepHours when undefined", () => {
      expect(computeVulnerabilityWindow(fullAudit, undefined)).toBe("low");
    });
  });

  describe("generateNudge", () => {
    it("returns a nudge for 'high' vulnerability", () => {
      const nudge = generateNudge("high");
      expect(nudge).toBeTruthy();
      expect(nudge).toContain("vulnerable");
    });

    it("returns a nudge for 'moderate' vulnerability", () => {
      const nudge = generateNudge("moderate");
      expect(nudge).toBeTruthy();
      expect(nudge).toContain("small thing");
    });

    it("returns null for 'low' vulnerability", () => {
      expect(generateNudge("low")).toBeNull();
    });
  });

  describe("pleaseTotal", () => {
    it("sums all 5 items", () => {
      expect(pleaseTotal(fullAudit)).toBe(15);
    });

    it("returns 0 for all-zero audit", () => {
      expect(pleaseTotal({ sleep: 0, food: 0, movement: 0, substances: 0, mastery: 0 })).toBe(0);
    });
  });
});
