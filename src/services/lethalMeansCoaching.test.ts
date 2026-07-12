import { describe, it, expect } from "vitest";
import {
  getMeansSafetyCategories,
  getCoachingSteps,
  generateSafeEnvironmentBlock,
  generateMeansSafetyContextBlock,
  type MeansCoachingProgress,
} from "./lethalMeansCoaching";

const emptyProgress: MeansCoachingProgress = {
  startedAt: 0,
  completedCategories: [],
  selectedStrategies: {},
  commitmentText: "",
  completed: false,
};

describe("getMeansSafetyCategories", () => {
  it("returns at least 4 categories", () => {
    const cats = getMeansSafetyCategories();
    expect(cats.length).toBeGreaterThanOrEqual(4);
  });

  it("every category has id, label, description, examples, prompt, and strategies", () => {
    for (const c of getMeansSafetyCategories()) {
      expect(c.id).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.examples.length).toBeGreaterThan(0);
      expect(c.collaborativePrompt).toBeTruthy();
      expect(c.strategies.length).toBeGreaterThan(0);
    }
  });

  it("no category uses alarmist language", () => {
    const alarm = /\b(must|should|need to|warning|danger|urgent|immediate|critical|never)\b/i;
    for (const c of getMeansSafetyCategories()) {
      expect(c.description).not.toMatch(alarm);
      expect(c.collaborativePrompt).not.toMatch(alarm);
      for (const s of c.strategies) expect(s).not.toMatch(alarm);
    }
  });

  it("includes a medications category", () => {
    const cats = getMeansSafetyCategories();
    expect(cats.some((c) => c.id === "medications")).toBe(true);
  });

  it("includes a sharp-objects category", () => {
    const cats = getMeansSafetyCategories();
    expect(cats.some((c) => c.id === "sharp-objects")).toBe(true);
  });
});

describe("getCoachingSteps", () => {
  it("returns an ordered array starting with intro", () => {
    const steps = getCoachingSteps();
    expect(steps.length).toBeGreaterThan(3);
    expect(steps[0].phase).toBe("intro");
  });

  it("every step has id, phase, title, content, and prompt", () => {
    for (const s of getCoachingSteps()) {
      expect(s.id).toBeTruthy();
      expect(["intro", "explore", "strategize", "commit", "connect"]).toContain(s.phase);
      expect(s.title).toBeTruthy();
      expect(s.content).toBeTruthy();
      expect(s.prompt).toBeTruthy();
    }
  });

  it("never uses alarmist language", () => {
    const alarm = /\b(must|should|need to|warning|danger|urgent|immediate|critical|never)\b/i;
    for (const s of getCoachingSteps()) {
      expect(s.content).not.toMatch(alarm);
      expect(s.prompt).not.toMatch(alarm);
    }
  });
});

describe("generateSafeEnvironmentBlock", () => {
  it("returns a non-empty string", () => {
    const block = generateSafeEnvironmentBlock(emptyProgress);
    expect(block.length).toBeGreaterThan(0);
  });

  it("mentions safety when categories completed", () => {
    const progress: MeansCoachingProgress = {
      ...emptyProgress,
      completedCategories: ["medications", "sharp-objects"],
    };
    const block = generateSafeEnvironmentBlock(progress);
    expect(block).toContain("Medications");
    expect(block).toContain("Sharp objects");
  });

  it("never uses alarmist language", () => {
    const alarm = /\b(must|should|need to|warning|danger|urgent|immediate|critical|never)\b/i;
    const block = generateSafeEnvironmentBlock(emptyProgress);
    expect(block).not.toMatch(alarm);
  });

  it('returns general guidance when no categories completed', () => {
    const block = generateSafeEnvironmentBlock(emptyProgress);
    expect(block).toBeTruthy();
    expect(block.length).toBeGreaterThan(10);
  });
});

describe("generateMeansSafetyContextBlock", () => {
  it("returns empty string when no coaching started", () => {
    expect(generateMeansSafetyContextBlock(null)).toBe("");
  });

  it("returns empty string when never started", () => {
    expect(generateMeansSafetyContextBlock(undefined)).toBe("");
  });

  it("returns context when coaching is in progress", () => {
    const progress: MeansCoachingProgress = {
      ...emptyProgress,
      startedAt: Date.now(),
      completedCategories: ["medications"],
    };
    const block = generateMeansSafetyContextBlock(progress);
    expect(block.length).toBeGreaterThan(0);
    expect(block).toMatch(/means safety/i);
  });

  it("never uses alarmist language", () => {
    const alarm = /\b(must|should|need to|warning|danger|urgent|immediate|critical|never)\b/i;
    const progress: MeansCoachingProgress = {
      ...emptyProgress,
      startedAt: Date.now(),
      completedCategories: ["medications"],
    };
    expect(generateMeansSafetyContextBlock(progress)).not.toMatch(alarm);
  });
});
