import { describe, it, expect } from "vitest";
import {
  DEFAULT_LADDER,
  createSkillsBridge,
  markUsed,
  isInCooldown,
  nextStep,
} from "./safetyPlanSkills";

describe("safetyPlanSkills", () => {
  describe("DEFAULT_LADDER", () => {
    it("has 6 steps", () => {
      expect(DEFAULT_LADDER).toHaveLength(6);
    });

    it("starts with STOP and ends with Reach Out", () => {
      expect(DEFAULT_LADDER[0].skillId).toBe("stop");
      expect(DEFAULT_LADDER[5].skillId).toBe("reach");
    });

    it("every step has a skillId, label, and instructions", () => {
      for (const step of DEFAULT_LADDER) {
        expect(step.skillId).toBeTruthy();
        expect(step.label).toBeTruthy();
        expect(step.instructions).toBeTruthy();
      }
    });
  });

  describe("createSkillsBridge", () => {
    it("returns a bridge with the default ladder", () => {
      const bridge = createSkillsBridge();
      expect(bridge.steps).toHaveLength(6);
      expect(bridge.lastUsed).toBeUndefined();
      expect(bridge.cooldownUntil).toBeUndefined();
    });

    it("returns a copy of the default ladder (not the same reference)", () => {
      const bridge = createSkillsBridge();
      expect(bridge.steps).not.toBe(DEFAULT_LADDER);
    });
  });

  describe("markUsed", () => {
    it("sets lastUsed and cooldownUntil", () => {
      const bridge = createSkillsBridge();
      const now = new Date("2026-01-15T12:00:00Z");
      const marked = markUsed(bridge, now);
      expect(marked.lastUsed).toBe("2026-01-15T12:00:00.000Z");
      expect(marked.cooldownUntil).toBe("2026-01-16T12:00:00.000Z");
    });

    it("preserves the steps", () => {
      const bridge = createSkillsBridge();
      const marked = markUsed(bridge, new Date());
      expect(marked.steps).toHaveLength(6);
    });
  });

  describe("isInCooldown", () => {
    it("returns false when never used", () => {
      expect(isInCooldown(createSkillsBridge())).toBe(false);
    });

    it("returns true when within 24h of use", () => {
      const bridge = markUsed(createSkillsBridge(), new Date("2026-01-15T12:00:00Z"));
      expect(isInCooldown(bridge, new Date("2026-01-15T18:00:00Z"))).toBe(true);
    });

    it("returns false when 24h have passed", () => {
      const bridge = markUsed(createSkillsBridge(), new Date("2026-01-15T12:00:00Z"));
      expect(isInCooldown(bridge, new Date("2026-01-16T12:00:01Z"))).toBe(false);
    });
  });

  describe("nextStep", () => {
    it("returns the next step after STOP", () => {
      const bridge = createSkillsBridge();
      const next = nextStep(bridge, "stop");
      expect(next).toBeDefined();
      expect(next!.skillId).toBe("pace");
    });

    it("returns the next step after pacing", () => {
      const bridge = createSkillsBridge();
      const next = nextStep(bridge, "pace");
      expect(next).toBeDefined();
      expect(next!.skillId).toBe("surf");
    });

    it("returns undefined for the last step", () => {
      const bridge = createSkillsBridge();
      expect(nextStep(bridge, "reach")).toBeUndefined();
    });

    it("returns undefined for an unknown skillId", () => {
      const bridge = createSkillsBridge();
      expect(nextStep(bridge, "unknown")).toBeUndefined();
    });
  });
});
