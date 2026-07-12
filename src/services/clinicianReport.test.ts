import { describe, it, expect } from "vitest";
import { buildClinicianReport, type ClinicianReportInput } from "./clinicianReport";

const baseInput: ClinicianReportInput = {
  periodLabel: "Month ending 2026-07-12",
  periodDays: 30,
  totalCheckins: 45,
  daysActive: 28,
  avgIntensity: 4.8,
  avgSleepHours: 7.2,
  circadianScore: 68,
  socialRhythmVariability: 52,
  assessmentTrajectories: [
    {
      instrument: "PHQ-9",
      entries: [
        { date: "2026-06-14", total: 12, severity: "moderate" },
        { date: "2026-06-28", total: 9, severity: "mild" },
        { date: "2026-07-12", total: 7, severity: "mild" },
      ],
    },
    {
      instrument: "GAD-7",
      entries: [
        { date: "2026-06-14", total: 8, severity: "mild" },
        { date: "2026-07-12", total: 5, severity: "mild" },
      ],
    },
  ],
  medications: [
    { name: "Lamotrigine", dose: "200mg", adherenceRate: 92, commonSideEffects: [] },
    { name: "Quetiapine", dose: "50mg", adherenceRate: 78, commonSideEffects: ["drowsiness"] },
  ],
  episodes: {
    count: 3,
    byTimeOfDay: "evening (2), afternoon (1)",
    avgDurationMin: 45,
  },
  protocolsCompleted: 4,
  nilaSessions: 12,
  featuresUsed: ["values_snapshot", "diary_cards", "social_rhythm"],
};

describe("buildClinicianReport", () => {
  it("returns a non-empty string", () => {
    const report = buildClinicianReport(baseInput);
    expect(report.length).toBeGreaterThan(100);
  });

  it("includes the period label in the header", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("Month ending 2026-07-12");
  });

  it("includes the clinician header", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("Clinician Summary");
  });

  it("includes check-in summary stats", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("45");
    expect(report).toContain("4.8");
  });

  it("includes sleep hours", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("7.2");
  });

  it("includes circadian score", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("68");
  });

  it("includes social rhythm variability", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("52");
    expect(report).toContain("Social rhythm");
  });

  it("includes assessment trajectories with trend direction", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("PHQ-9");
    expect(report).toContain("GAD-7");
    // PHQ-9 went 12 -> 7 (improving)
    expect(report).toContain("improving");
  });

  it("includes medication adherence rates", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("Lamotrigine");
    expect(report).toContain("92%");
    expect(report).toContain("Quetiapine");
    expect(report).toContain("78%");
  });

  it("includes medication side effects when present", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("drowsiness");
  });

  it("includes episode summary", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("3");
    expect(report).toContain("45 min");
  });

  it("includes engagement section", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("4");
    expect(report).toContain("12");
    expect(report).toContain("values snapshot");
  });

  it("includes privacy disclaimer", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("not a clinical");
  });

  it("shows a note about the period length", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("30-day");
  });

  it("handles empty assessment data gracefully", () => {
    const input: ClinicianReportInput = {
      ...baseInput,
      assessmentTrajectories: [],
    };
    const report = buildClinicianReport(input);
    expect(report).not.toContain("PHQ-9");
    expect(report).toContain("No assessments");
  });

  it("handles empty medication data gracefully", () => {
    const input: ClinicianReportInput = {
      ...baseInput,
      medications: [],
    };
    const report = buildClinicianReport(input);
    expect(report).not.toContain("Lamotrigine");
    expect(report).toContain("No medications");
  });

  it("handles zero episodes gracefully", () => {
    const input: ClinicianReportInput = {
      ...baseInput,
      episodes: { count: 0, byTimeOfDay: "", avgDurationMin: null },
    };
    const report = buildClinicianReport(input);
    expect(report).toContain("No episodes");
  });

  it("renders the on-device App & Conversation Usage section when usage is provided", () => {
    const input: ClinicianReportInput = {
      ...baseInput,
      usage: {
        periodDays: 30,
        cutoff: "2026-06-12",
        daysActive: 28,
        appOpenDays: 21,
        nilaTurns: 12,
        avgSleepHours: 7.2,
        featuresUsed: ["values_snapshot", "diary_cards"],
      },
    };
    const report = buildClinicianReport(input);
    expect(report).toContain("App & Conversation Usage (on-device)");
    expect(report).toContain("Active check-in days: 28/30");
    expect(report).toContain("App-open days: 21/30");
    expect(report).toContain("Nila conversation turns: 12");
    expect(report).toContain("Avg sleep (from check-ins): 7.2h");
    expect(report).toContain("values snapshot, diary cards");
  });

  it("omits the usage section when usage is absent", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("App & Conversation Usage");
  });
});
