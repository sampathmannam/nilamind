import { describe, it, expect } from "vitest";
import { selectSkill, formatSkillOffer, SKILL_OFFERS } from "./skillCoach";

describe("skillCoach", () => {
  describe("selectSkill", () => {
    it("returns urge surfing for urge-related messages", () => {
      const s = selectSkill("I have an urge to cut");
      expect(s).toBeDefined();
      expect(s!.skillId).toBe("urge_surfing");
    });

    it("returns STOP for panic/overwhelm messages", () => {
      const s = selectSkill("I'm panicking and can't breathe");
      expect(s).toBeDefined();
      expect(s!.skillId).toBe("stop");
    });

    it("returns check_the_facts for shame/self-criticism messages", () => {
      const s = selectSkill("Everyone thinks I'm a failure");
      expect(s).toBeDefined();
      expect(s!.skillId).toBe("check_the_facts");
    });

    it("returns accumulate_positives for anhedonia/emptiness messages", () => {
      const s = selectSkill("Nothing feels good anymore, no point in anything");
      expect(s).toBeDefined();
      expect(s!.skillId).toBe("accumulate_positives");
    });

    it("returns paced_breathing for anxiety/tension messages", () => {
      const s = selectSkill("I'm so anxious and wound up");
      expect(s).toBeDefined();
      expect(s!.skillId).toBe("paced_breathing");
    });

    it("returns null for neutral messages", () => {
      expect(selectSkill("What time is it?")).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(selectSkill("")).toBeNull();
    });

    it("returns the most specific match (first match wins)", () => {
      const s = selectSkill("I'm having an urge to drink and I'm panicking");
      expect(s).toBeDefined();
      // urge_surfing is first in SKILL_OFFERS and matches "urge"
      expect(s!.skillId).toBe("urge_surfing");
    });

    it("handles case-insensitive matching", () => {
      const s = selectSkill("I WANT TO CUT");
      expect(s).toBeDefined();
      expect(s!.skillId).toBe("urge_surfing");
    });

    it("handles contractions", () => {
      const s = selectSkill("can't resist the urge");
      expect(s).toBeDefined();
      expect(s!.skillId).toBe("urge_surfing");
    });
  });

  describe("formatSkillOffer", () => {
    it("returns a formatted string with skill name and script", () => {
      const offer = selectSkill("I'm panicking")!;
      const msg = formatSkillOffer(offer);
      expect(msg).toContain("Stop");
      expect(msg).not.toContain("Urge surfing"); // wrong skill shouldn't appear
      expect(msg).toContain("Did STOP help");
    });

    it("capitalises the skill id into a readable name", () => {
      const offer = selectSkill("Everyone thinks I'm a failure")!;
      const msg = formatSkillOffer(offer);
      expect(msg).toContain("Check The Facts");
    });
  });

  describe("SKILL_OFFERS", () => {
    it("contains 5 offers", () => {
      expect(SKILL_OFFERS).toHaveLength(5);
    });

    it("every offer has a unique skillId", () => {
      const ids = SKILL_OFFERS.map((o) => o.skillId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("every offer has a non-empty microScript", () => {
      for (const o of SKILL_OFFERS) {
        expect(o.microScript.length).toBeGreaterThan(20);
      }
    });

    it("every offer has a follow-up", () => {
      for (const o of SKILL_OFFERS) {
        expect(o.followUp).toBeTruthy();
      }
    });
  });
});
