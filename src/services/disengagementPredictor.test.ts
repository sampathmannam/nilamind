import { describe, it, expect, beforeEach } from "vitest";
import { secureLocal } from "./secureLocal";
import {
  assessDisengagementRisk,
  getDisengagementContextBlock,
  type DisengagementParams,
} from "./disengagementPredictor";

const NOW = "2026-07-13T12:00:00.000Z";
const YMD = "2026-07-13";

function makeParams(overrides: Partial<DisengagementParams> = {}): DisengagementParams {
  return {
    checkinDates: [],
    appOpenDays: [],
    protocolAdherenceRate: 0,
    allianceTrend: "insufficient_data",
    daysSinceLastCheckin: 0,
    daysSinceLastAppOpen: 0,
    protocolCount: 0,
    featureCount: 0,
    ...overrides,
  };
}

describe("assessDisengagementRisk", () => {
  it("returns low risk for a fully engaged user", () => {
    const result = assessDisengagementRisk(makeParams({
      checkinDates: ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"],
      appOpenDays: ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"],
      protocolAdherenceRate: 0.8,
      allianceTrend: "improving",
      daysSinceLastCheckin: 0,
      daysSinceLastAppOpen: 0,
      protocolCount: 3,
      featureCount: 6,
    }), NOW);
    expect(result.riskLevel).toBe("low");
    expect(result.score).toBeLessThan(30);
  });

  it("returns high risk for an inactive user", () => {
    const result = assessDisengagementRisk(makeParams({
      checkinDates: ["2026-06-01"],
      appOpenDays: ["2026-06-01"],
      protocolAdherenceRate: 0,
      allianceTrend: "declining",
      daysSinceLastCheckin: 42,
      daysSinceLastAppOpen: 42,
      protocolCount: 2,
      featureCount: 1,
    }), NOW);
    expect(result.riskLevel).toBe("high");
    expect(result.score).toBeGreaterThan(70);
  });

  it("returns elevated risk for declining engagement", () => {
    const result = assessDisengagementRisk(makeParams({
      checkinDates: [
        "2026-07-01", "2026-07-02", "2026-07-05", "2026-07-06",
        "2026-07-09", "2026-07-10",
      ],
      appOpenDays: [
        "2026-07-01", "2026-07-02", "2026-07-05", "2026-07-06",
        "2026-07-09", "2026-07-10",
      ],
      protocolAdherenceRate: 0.33,
      allianceTrend: "declining",
      daysSinceLastCheckin: 3,
      daysSinceLastAppOpen: 3,
      protocolCount: 1,
      featureCount: 3,
    }), NOW);
    expect(result.riskLevel).toBe("elevated");
    expect(result.score).toBeGreaterThanOrEqual(45);
  });

  it("detects declining frequency trend from sparse check-ins", () => {
    // Many check-ins early (older period), few in recent period
    const result = assessDisengagementRisk(makeParams({
      checkinDates: [
        // Older period (14-28 days ago: Jun 15 - Jun 29)
        "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20",
        "2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25",
        // Recent period (0-14 days ago: Jun 29 - Jul 13)
        "2026-07-05", "2026-07-10",
      ],
      appOpenDays: ["2026-07-10", "2026-07-11", "2026-07-12"],
      daysSinceLastCheckin: 3,
      daysSinceLastAppOpen: 1,
    }), NOW);
    expect(result.frequencyTrend).toBe("declining");
  });

  it("reports low risk with no data (new user)", () => {
    const result = assessDisengagementRisk(makeParams({
      checkinDates: [],
      appOpenDays: [],
      daysSinceLastCheckin: 0,
      daysSinceLastAppOpen: 0,
    }), NOW);
    expect(result.frequencyTrend).toBe("insufficient_data");
    expect(result.riskLevel).toBe("low");
  });

  it("includes signal details in the result", () => {
    const result = assessDisengagementRisk(makeParams({
      daysSinceLastCheckin: 10,
      daysSinceLastAppOpen: 10,
      allianceTrend: "declining",
    }), NOW);
    expect(result.signals.length).toBeGreaterThan(0);
    const inactivitySignal = result.signals.find((s) => s.name === "checkin_recency");
    expect(inactivitySignal).toBeDefined();
    expect(inactivitySignal!.contributing).toBe(true);
  });
});

describe("getDisengagementContextBlock", () => {
  it("returns empty string for low risk", () => {
    const block = getDisengagementContextBlock(makeParams({
      checkinDates: ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"],
      appOpenDays: ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"],
      protocolCount: 2,
      featureCount: 4,
      daysSinceLastCheckin: 0,
      daysSinceLastAppOpen: 0,
    }), NOW);
    expect(block).toBe("");
  });

  it("returns a context block for elevated risk", () => {
    const block = getDisengagementContextBlock(makeParams({
      checkinDates: ["2026-06-01"],
      appOpenDays: ["2026-06-01"],
      daysSinceLastCheckin: 42,
      daysSinceLastAppOpen: 42,
      protocolCount: 1,
      allianceTrend: "declining",
    }), NOW);
    expect(block).toContain("ENGAGEMENT");
    expect(block).toContain("42");
  });

  it("returns a context block for elevated risk", () => {
    const block = getDisengagementContextBlock(makeParams({
      checkinDates: ["2026-07-01", "2026-07-05", "2026-07-10"],
      appOpenDays: ["2026-07-10", "2026-07-11"],
      daysSinceLastCheckin: 3,
      daysSinceLastAppOpen: 2,
      protocolCount: 1,
      allianceTrend: "declining",
    }), NOW);
    expect(block).toContain("ENGAGEMENT");
    // Frequency trend won't be "declining" with 3 check-ins spread across 10 days
    // (insufficient_data), but it will still show risk
  });
});
