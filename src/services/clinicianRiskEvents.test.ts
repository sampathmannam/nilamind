import { describe, it, expect } from "vitest";
import {
  buildRiskEventLog,
  type RiskEventLogEntry,
  type RiskEventLogForReport,
} from "./clinicianRiskEvents";

describe("clinicianRiskEvents (Phase 20.5)", () => {
  describe("buildRiskEventLog", () => {
    it("returns empty when no event sources provided", () => {
      const result = buildRiskEventLog({
        elevatedDistressDays: [],
        prodromeEvents: [],
        diaryNotableDays: [],
        episodeDates: [],
      });
      expect(result.hasData).toBe(false);
      expect(result.events).toEqual([]);
    });

    it("includes elevated distress events with dates and type", () => {
      const result = buildRiskEventLog({
        elevatedDistressDays: ["2026-07-10", "2026-07-12"],
        prodromeEvents: [],
        diaryNotableDays: [],
        episodeDates: [],
      });
      expect(result.hasData).toBe(true);
      expect(result.events.length).toBe(2);
      expect(result.events[0].type).toBe("elevated_distress");
      expect(result.events[0].date).toBe("2026-07-12"); // most recent first
    });

    it("includes prodrome events", () => {
      const result = buildRiskEventLog({
        elevatedDistressDays: [],
        prodromeEvents: [{ date: "2026-07-08", kind: "short_sleep" }],
        diaryNotableDays: [],
        episodeDates: [],
      });
      expect(result.events.length).toBe(1);
      expect(result.events[0].type).toBe("prodrome");
      expect(result.events[0].detail).toBe("short_sleep");
    });

    it("includes diary notable days", () => {
      const result = buildRiskEventLog({
        elevatedDistressDays: [],
        prodromeEvents: [],
        diaryNotableDays: [{ date: "2026-07-11", reason: "misery ≥4" }],
        episodeDates: [],
      });
      expect(result.events.length).toBe(1);
      expect(result.events[0].type).toBe("diary_notable");
    });

    it("includes episode dates", () => {
      const result = buildRiskEventLog({
        elevatedDistressDays: [],
        prodromeEvents: [],
        diaryNotableDays: [],
        episodeDates: ["2026-07-13"],
      });
      expect(result.events.length).toBe(1);
      expect(result.events[0].type).toBe("episode");
    });

    it("sorts all events by date descending (most recent first)", () => {
      const result = buildRiskEventLog({
        elevatedDistressDays: ["2026-07-05"],
        prodromeEvents: [{ date: "2026-07-15", kind: "energy_elevation" }],
        diaryNotableDays: [{ date: "2026-07-10", reason: "test" }],
        episodeDates: ["2026-07-08"],
      });
      const dates = result.events.map((e) => e.date);
      expect(dates).toEqual(["2026-07-15", "2026-07-10", "2026-07-08", "2026-07-05"]);
    });

    it("caps at 20 events to keep report concise", () => {
      const many = Array.from({ length: 30 }, (_, i) => `2026-07-${String(i + 1).padStart(2, "0")}`);
      const result = buildRiskEventLog({
        elevatedDistressDays: many,
        prodromeEvents: [],
        diaryNotableDays: [],
        episodeDates: [],
      });
      expect(result.events.length).toBe(20);
    });
  });

  // SAFETY GUARD: F11/F13/F14 — no risk level, score, category, or recommendation
  // must appear in the output. This test is the lock.
  describe("no-risk-level guard (F11/F13/F14)", () => {
    const FORBIDDEN_WORDS = [
      "risk", "level", "score", "gauge", "category", "low", "medium", "high",
      "moderate", "severe", "mild", "critical", "danger", "safe",
      "recommend", "suggest", "diagnos", "clinical judgment",
    ];

    it("no event type or detail string contains a forbidden clinical-level word", () => {
      const result = buildRiskEventLog({
        elevatedDistressDays: ["2026-07-10"],
        prodromeEvents: [{ date: "2026-07-08", kind: "short_sleep" }, { date: "2026-07-09", kind: "energy_elevation" }],
        diaryNotableDays: [{ date: "2026-07-11", reason: "misery ≥4" }],
        episodeDates: ["2026-07-12"],
      });

      const serialized = JSON.stringify(result).toLowerCase();
      for (const word of FORBIDDEN_WORDS) {
        expect(serialized).not.toContain(word);
      }
    });

    it("no event type is labelled as a risk level", () => {
      const result = buildRiskEventLog({
        elevatedDistressDays: ["2026-07-10"],
        prodromeEvents: [],
        diaryNotableDays: [],
        episodeDates: [],
      });
      const types = result.events.map((e) => e.type);
      for (const t of types) {
        expect(["elevated_distress", "prodrome", "diary_notable", "episode"]).toContain(t);
      }
    });
  });
});
