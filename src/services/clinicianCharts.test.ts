import { describe, it, expect } from "vitest";
import {
  buildIntensitySeries,
  buildSleepSeries,
  buildRiskGaugeSpec,
  buildRiskFactorBars,
  buildAdherenceBars,
  buildEngagementStrip,
} from "./clinicianCharts";
import type { CheckInEntry } from "../types";
import type { RiskAssessment } from "./temporalRiskAssessment";
import type { ClinicianMedication } from "./clinicianReport";

function mockCheckin(overrides: Partial<CheckInEntry> = {}): CheckInEntry {
  return {
    id: "id",
    date: "2026-07-10",
    timestamp: "2026-07-10T10:00:00.000Z",
    emotion: "Anxious",
    intensity: 5,
    context: "work",
    ...overrides,
  };
}

describe("buildIntensitySeries", () => {
  it("marks a series with fewer than 3 distinct days as insufficient", () => {
    const checkins = [mockCheckin({ date: "2026-07-14", intensity: 9 })];
    const series = buildIntensitySeries(checkins, "2026-06-15");
    expect(series.sufficient).toBe(false);
    expect(series.points).toEqual([{ date: "2026-07-14", intensity: 9 }]);
  });

  it("marks a series with 3+ distinct days as sufficient and sorts by date", () => {
    const checkins = [
      mockCheckin({ date: "2026-07-03", intensity: 6 }),
      mockCheckin({ date: "2026-07-01", intensity: 4 }),
      mockCheckin({ date: "2026-07-02", intensity: 5 }),
    ];
    const series = buildIntensitySeries(checkins, "2026-06-15");
    expect(series.sufficient).toBe(true);
    expect(series.points.map((p) => p.date)).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
  });

  it("collapses multiple same-day check-ins to the latest one and excludes entries before cutoff", () => {
    const checkins = [
      mockCheckin({ date: "2026-05-01", intensity: 1 }), // before cutoff
      mockCheckin({ date: "2026-07-01", intensity: 3 }),
      mockCheckin({ date: "2026-07-01", intensity: 7 }), // same day, should win (last one wins)
    ];
    const series = buildIntensitySeries(checkins, "2026-06-15");
    expect(series.points).toEqual([{ date: "2026-07-01", intensity: 7 }]);
  });

  it("ignores entries with a non-numeric intensity", () => {
    const checkins = [mockCheckin({ date: "2026-07-01", intensity: undefined as unknown as number })];
    const series = buildIntensitySeries(checkins, "2026-06-15");
    expect(series.points).toEqual([]);
    expect(series.sufficient).toBe(false);
  });
});

describe("buildSleepSeries", () => {
  it("is insufficient with fewer than 3 nights logged", () => {
    const checkins = [mockCheckin({ date: "2026-07-01", sleepHours: 6 })];
    const series = buildSleepSeries(checkins, "2026-06-15");
    expect(series.sufficient).toBe(false);
  });

  it("excludes check-ins with no sleepHours or zero sleepHours", () => {
    const checkins = [
      mockCheckin({ date: "2026-07-01", sleepHours: undefined }),
      mockCheckin({ date: "2026-07-02", sleepHours: 0 }),
      mockCheckin({ date: "2026-07-03", sleepHours: 7.5 }),
    ];
    const series = buildSleepSeries(checkins, "2026-06-15");
    expect(series.points).toEqual([{ date: "2026-07-03", hours: 7.5 }]);
  });
});

function mockRisk(overrides: Partial<RiskAssessment> = {}): RiskAssessment {
  return {
    timestamp: "2026-07-15T00:00:00.000Z",
    riskLevel: "low",
    riskScore: 0,
    trend: "stable",
    confidence: 0.37,
    windowDays: 28,
    recommendations: [],
    factors: {
      sleepDeprivation: 0,
      sleepVariability: 0,
      rhythmIrregularity: 0,
      moodDeterioration: 0,
      affectiveLability: 0,
      socialWithdrawal: 0,
      activityReduction: 0,
      depressionSeverity: 0,
      anxietySeverity: 0,
      suicidalIdeation: 0,
      acuteRisk: 0,
      subacuteRisk: 0,
    },
    ...overrides,
  };
}

describe("buildRiskGaugeSpec", () => {
  it("returns null when no risk assessment is available", () => {
    expect(buildRiskGaugeSpec(undefined)).toBeNull();
  });

  it("converts 0-1 fractions to rounded percentages", () => {
    const spec = buildRiskGaugeSpec(mockRisk({ riskScore: 0.417, confidence: 0.373, riskLevel: "moderate", trend: "worsening" }));
    expect(spec).toEqual({ scorePct: 42, confidencePct: 37, level: "moderate", trend: "worsening" });
  });
});

describe("buildRiskFactorBars", () => {
  it("returns an empty array when factors are absent", () => {
    expect(buildRiskFactorBars(undefined)).toEqual([]);
  });

  it("sorts factors descending by percentage and caps at 5", () => {
    const bars = buildRiskFactorBars(
      mockRisk({
        factors: {
          sleepDeprivation: 0.1,
          sleepVariability: 0.9,
          rhythmIrregularity: 0.5,
          moodDeterioration: 0.7,
          affectiveLability: 0.3,
          socialWithdrawal: 0.6,
          activityReduction: 0,
          depressionSeverity: 0.2,
          anxietySeverity: 0.8,
          suicidalIdeation: 0,
          acuteRisk: 0,
          subacuteRisk: 0,
        },
      }).factors,
    );
    expect(bars).toHaveLength(5);
    expect(bars.map((b) => b.pct)).toEqual([90, 80, 70, 60, 50]);
    expect(bars[0].label).toBe("Sleep variability");
  });

  it("never surfaces the internal acuteRisk/subacuteRisk composites as a labeled bar", () => {
    const bars = buildRiskFactorBars(mockRisk({ factors: { ...mockRisk().factors, acuteRisk: 1, subacuteRisk: 1 } }).factors);
    expect(bars.every((b) => !b.label.toLowerCase().includes("risk"))).toBe(true);
  });
});

describe("buildAdherenceBars", () => {
  it("maps medications to labeled percentage bars", () => {
    const meds: ClinicianMedication[] = [
      { name: "Lamotrigine", dose: "200mg", adherenceRate: 91.6, commonSideEffects: [] },
    ];
    expect(buildAdherenceBars(meds)).toEqual([{ label: "Lamotrigine 200mg", pct: 92 }]);
  });

  it("returns an empty array for no medications", () => {
    expect(buildAdherenceBars([])).toEqual([]);
  });
});

describe("buildEngagementStrip", () => {
  it("produces one entry per day in the window, marking active days", () => {
    const now = new Date("2026-07-05T12:00:00.000Z");
    const strip = buildEngagementStrip(["2026-07-02", "2026-07-04"], "2026-07-01", now);
    expect(strip).toEqual([
      { date: "2026-07-01", active: false },
      { date: "2026-07-02", active: true },
      { date: "2026-07-03", active: false },
      { date: "2026-07-04", active: true },
      { date: "2026-07-05", active: false },
    ]);
  });
});
