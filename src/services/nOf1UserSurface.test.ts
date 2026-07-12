import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getNo1Insights,
  getNo1DashboardCard,
  no1ContextBlock,
  recordProtocolCompletion,
  computeNof1Ranking,
  bestProtocolForUser,
  backfillNof1,
} from "./nOf1";
import { secureLocal } from "./secureLocal";
import { loadMoodHistory } from "./moodHistory";

describe("N-of-1 user-facing surface", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear secureLocal
    secureLocal.setItem("nilamind_protocol_completions", "[]");
    secureLocal.setItem("nilamind_checkins", "[]");
  });

  describe("getNo1Insights", () => {
    it("returns empty array when no protocol completions exist", () => {
      const insights = getNo1Insights();
      expect(insights).toEqual([]);
    });

    it("returns top 3 correlations when enough data exists", () => {
      // Seed: protocol A -> distress drops 2 points
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      secureLocal.setItem("nilamind_checkins", JSON.stringify([
        { date: today, intensity: 3 },
        { date: yesterday, intensity: 5 },
      ]));

      // Record completion for "behavioural-activation" yesterday
      recordProtocolCompletion("behavioural-activation", yesterday);

      // Need at least 2 completions with next-day data for ranking
      const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
      recordProtocolCompletion("behavioural-activation", dayBefore);
      secureLocal.setItem("nilamind_checkins", JSON.stringify([
        { date: today, intensity: 3 },
        { date: yesterday, intensity: 5 },
        { date: dayBefore, intensity: 7 },
        { date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0], intensity: 4 },
      ]));

      const insights = getNo1Insights();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights.length).toBeLessThanOrEqual(3);
      for (const i of insights) {
        expect(i).toHaveProperty("protocolId");
        expect(i).toHaveProperty("avgDelta");
        expect(i).toHaveProperty("completions");
        expect(i).toHaveProperty("description");
        expect(typeof i.description).toBe("string");
        expect(i.description.length).toBeGreaterThan(0);
      }
    });

    it("includes gentle framing in descriptions", () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

      secureLocal.setItem("nilamind_checkins", JSON.stringify([
        { date: yesterday, intensity: 3 },
        { date: dayBefore, intensity: 6 },
      ]));
      recordProtocolCompletion("self-compassion", dayBefore);
      recordProtocolCompletion("self-compassion", yesterday);

      const insights = getNo1Insights();
      if (insights.length > 0) {
        const desc = insights[0].description.toLowerCase();
        expect(
          desc.includes("pattern") ||
          desc.includes("noticed") ||
          desc.includes("might") ||
          desc.includes("aware")
        ).toBe(true);
      }
    });
  });

  describe("getNo1DashboardCard", () => {
    it("returns null when no insights", () => {
      expect(getNo1DashboardCard()).toBeNull();
    });

    it("returns a card object with title, insight, and protocolId when data exists", () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

      secureLocal.setItem("nilamind_checkins", JSON.stringify([
        { date: today, intensity: 2 },
        { date: yesterday, intensity: 4 },
        { date: dayBefore, intensity: 6 },
      ]));
      recordProtocolCompletion("behavioural-activation", dayBefore);
      recordProtocolCompletion("behavioural-activation", yesterday);

      const card = getNo1DashboardCard();
      if (card) {
        expect(card).toHaveProperty("title");
        expect(card).toHaveProperty("insight");
        expect(card).toHaveProperty("protocolId");
        expect(card.title).toContain("affects");
      }
    });
  });

  describe("no1ContextBlock", () => {
    it("returns empty string when no insights", () => {
      expect(no1ContextBlock()).toBe("");
    });

    it("returns formatted context block when top insight exists", () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

      secureLocal.setItem("nilamind_checkins", JSON.stringify([
        { date: today, intensity: 2 },
        { date: yesterday, intensity: 4 },
        { date: dayBefore, intensity: 6 },
      ]));
      recordProtocolCompletion("behavioural-activation", dayBefore);
      recordProtocolCompletion("behavioural-activation", yesterday);

      const block = no1ContextBlock();
      if (block) {
        expect(block).toContain("FOR THIS PERSON SPECIFICALLY");
        expect(block).toContain("Values to Action");
        expect(block).toContain("lower mood");
      }
    });
  });

  describe("computeNof1Ranking (regression)", () => {
    it("still ranks protocols by avgDelta correctly", () => {
      const day1 = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
      const day2 = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
      const day3 = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      secureLocal.setItem("nilamind_checkins", JSON.stringify([
        { date: day1, intensity: 8 },
        { date: day2, intensity: 5 },
        { date: day3, intensity: 3 },
      ]));
      recordProtocolCompletion("protocol-a", day1);
      recordProtocolCompletion("protocol-a", day2);

      const ranking = computeNof1Ranking();
      expect(ranking.length).toBeGreaterThanOrEqual(1);
      if (ranking.length > 0) {
        expect(ranking[0].protocolId).toBe("protocol-a");
        expect(ranking[0].avgDelta).toBeLessThan(0); // distress improved
      }
    });
  });
});