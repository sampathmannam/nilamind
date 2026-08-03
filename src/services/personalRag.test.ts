import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./episodes", () => ({ loadEpisodes: vi.fn(() => []) }));
vi.mock("./episodeMarker", () => ({ readEpisodeMarkers: vi.fn(() => []) }));
vi.mock("./checkin", () => ({ loadCheckins: vi.fn(() => []) }));
vi.mock("./moodHistory", () => ({ loadMoodHistory: vi.fn(() => []) }));
vi.mock("./assessments", () => ({ loadAssessments: vi.fn(() => []) }));
vi.mock("./personaConfig", () => ({
  detectEmotionUnified: vi.fn(() => "sad"),
}));

import { retrievePersonalContext, personalRagBlock } from "./personalRag";
import { loadEpisodes } from "./episodes";
import { loadCheckins } from "./checkin";
import { loadMoodHistory } from "./moodHistory";
import { loadAssessments } from "./assessments";
import { readEpisodeMarkers } from "./episodeMarker";

beforeEach(() => {
  vi.mocked(loadEpisodes).mockReturnValue([]);
  vi.mocked(loadCheckins).mockReturnValue([]);
  vi.mocked(loadMoodHistory).mockReturnValue([]);
  vi.mocked(loadAssessments).mockReturnValue([]);
  vi.mocked(readEpisodeMarkers).mockReturnValue([]);
});

describe("personalRag", () => {
  describe("retrievePersonalContext", () => {
    it("returns object with correct shape", () => {
      const ctx = retrievePersonalContext("I need help with anxiety");
      expect(ctx).toHaveProperty("whatHelped");
      expect(ctx).toHaveProperty("recentMood");
      expect(ctx).toHaveProperty("recentCheckins");
      expect(ctx).toHaveProperty("relevantAssessments");
      expect(ctx).toHaveProperty("relevantEpisodes");
      expect(Array.isArray(ctx.whatHelped)).toBe(true);
    });

    it("returns empty whatHelped when message has no help-related keywords", () => {
      const ctx = retrievePersonalContext("The weather is nice today");
      expect(ctx.whatHelped).toEqual([]);
    });

    it("returns skills for emotional input with help keywords", () => {
      const ctx = retrievePersonalContext("I need help with anxiety");
      expect(ctx.whatHelped.length).toBeGreaterThan(0);
    });

    it("returns null for empty mood history", () => {
      const ctx = retrievePersonalContext("I need help");
      expect(ctx.recentMood).toBeNull();
    });

    it("returns mood summary when enough mood data exists", () => {
      vi.mocked(loadMoodHistory).mockReturnValue([
        { date: "2026-07-01", intensity: 4 },
        { date: "2026-07-02", intensity: 5 },
        { date: "2026-07-03", intensity: 6 },
      ] as any);
      const ctx = retrievePersonalContext("I need help");
      expect(ctx.recentMood).toContain("mixed");
    });

    it("returns null for empty check-ins", () => {
      const ctx = retrievePersonalContext("I need help");
      expect(ctx.recentCheckins).toBeNull();
    });

    it("returns null for empty assessments", () => {
      const ctx = retrievePersonalContext("I need help");
      expect(ctx.relevantAssessments).toBeNull();
    });

    it("returns null for empty episodes", () => {
      const ctx = retrievePersonalContext("I need help");
      expect(ctx.relevantEpisodes).toBeNull();
    });
  });

  describe("personalRagBlock", () => {
    it("returns empty string for non-emotional input with no history", () => {
      const block = personalRagBlock("The weather is nice today");
      expect(block).toBe("");
    });

    it("returns non-empty string for emotional input with help keywords", () => {
      vi.mocked(loadMoodHistory).mockReturnValue([
        { date: "2026-07-01", intensity: 8 },
        { date: "2026-07-02", intensity: 7 },
        { date: "2026-07-03", intensity: 9 },
      ] as any);
      const block = personalRagBlock("I need help with anxiety");
      expect(block.length).toBeGreaterThan(0);
    });

    it("includes PERSONAL CONTEXT header when non-empty", () => {
      vi.mocked(loadMoodHistory).mockReturnValue([
        { date: "2026-07-01", intensity: 8 },
        { date: "2026-07-02", intensity: 7 },
        { date: "2026-07-03", intensity: 9 },
      ] as any);
      const block = personalRagBlock("I need help with anxiety");
      expect(block).toContain("PERSONAL CONTEXT");
    });
  });
});
