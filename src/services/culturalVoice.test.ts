import { describe, it, expect } from "vitest";
import { CULTURAL_SKILL_SCRIPTS, getLocalisedScript } from "./culturalVoice";

describe("culturalVoice", () => {
  describe("CULTURAL_SKILL_SCRIPTS", () => {
    it("has scripts for all 5 skill IDs", () => {
      expect(Object.keys(CULTURAL_SKILL_SCRIPTS)).toHaveLength(5);
    });

    it("every skill has an English script", () => {
      for (const [id, scripts] of Object.entries(CULTURAL_SKILL_SCRIPTS)) {
        expect(scripts.en, `Missing English script for ${id}`).toBeDefined();
        expect(scripts.en!.microScript.length).toBeGreaterThan(20);
        expect(scripts.en!.followUp.length).toBeGreaterThan(5);
      }
    });
  });

  describe("getLocalisedScript", () => {
    it("returns English script for English", () => {
      const s = getLocalisedScript("urge_surfing", "en");
      expect(s.microScript).toContain("wave");
    });

    it("returns Hindi script for Hindi", () => {
      const s = getLocalisedScript("urge_surfing", "hi");
      expect(s.microScript).toContain("\u0932\u0939\u0930"); // "lahar" (wave)
    });

    it("falls back to English for an unsupported language", () => {
      // French is not in the data, so should fall back
      const fr = getLocalisedScript("stop", "fr" as any);
      expect(fr.microScript).toContain("Stop");
    });

    it("returns a valid script for every skill in English", () => {
      const skillIds = ["urge_surfing", "stop", "check_the_facts", "accumulate_positives", "paced_breathing"] as const;
      for (const id of skillIds) {
        const s = getLocalisedScript(id, "en");
        expect(s.microScript).toBeTruthy();
        expect(s.followUp).toBeTruthy();
      }
    });
  });
});
