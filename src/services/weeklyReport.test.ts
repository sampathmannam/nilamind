import { describe, it, expect } from "vitest";
import { buildWeeklyReport, type WeeklyReportInput } from "./weeklyReport";

const baseInput: WeeklyReportInput = {
  weekEnding: "2026-07-12",
  totalCheckins: 12,
  daysActive: 7,
  avgIntensity: 5.2,
  minIntensity: 2,
  maxIntensity: 9,
  topEmotion: "anxious",
  avgSleepHours: 7.1,
  protocolsCompleted: 2,
  nilaSessions: 5,
  currentStreak: 7,
  longestStreak: 14,
  featuresUsed: ["values_snapshot", "diary_cards"],
  circadianScore: 72,
};

describe("buildWeeklyReport", () => {
  it("returns a non-empty string", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report.length).toBeGreaterThan(100);
  });

  it("includes the week ending date", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report).toContain("2026-07-12");
  });

  it("includes check-in summary stats", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report).toContain("12");
    expect(report).toContain("5.2");
    expect(report).toContain("2");
    expect(report).toContain("9");
  });

  it("includes top emotion", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report.toLowerCase()).toContain("anxious");
  });

  it("includes protocol completions", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report).toContain("2");
  });

  it("includes nila session count", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report).toContain("5");
  });

  it("includes circadian score when provided", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report).toContain("72");
  });

  it("omits circadian section when score is null", () => {
    const input: WeeklyReportInput = { ...baseInput, circadianScore: null };
    const report = buildWeeklyReport(input);
    expect(report).not.toContain("Rhythm");
  });

  it("includes streak info", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report).toContain("7");
    expect(report).toContain("14");
  });

  it("includes privacy disclaimer", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report).toContain("not a clinical");
  });

  it("handles zero checkins gracefully", () => {
    const input: WeeklyReportInput = {
      ...baseInput,
      totalCheckins: 0,
      daysActive: 0,
      avgIntensity: null,
      minIntensity: null,
      maxIntensity: null,
      topEmotion: null,
    };
    const report = buildWeeklyReport(input);
    expect(report).toContain("No check-ins");
    expect(report).toContain("0");
  });

  it("includes the report header", () => {
    const report = buildWeeklyReport(baseInput);
    expect(report).toContain("NilaMind Weekly Report");
  });
});
