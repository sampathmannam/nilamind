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
        retention: {
          firstActiveIso: "2026-06-12",
          totalActiveDays: 24,
          currentStreak: 5,
          day7Active: true,
          day30Active: false,
        },
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

  it("renders self-logged bipolar phase markers (Phase 18) when present", () => {
    const report = buildClinicianReport({
      ...baseInput,
      phaseMarkers: [
        { id: "m1", startDate: "2026-06-01", endDate: "2026-06-30", phase: "elevated", note: "less sleep", createdAt: "2026-06-01T10:00:00" },
        { id: "m2", startDate: "2026-07-05", endDate: "2026-07-05", phase: "depressed", note: "", createdAt: "2026-07-05T10:00:00" },
      ],
    });
    expect(report).toContain("Bipolar Phase Markers (self-logged)");
    expect(report).toContain("2026-06-01 – 2026-06-30: Elevated (less sleep)");
    expect(report).toContain("2026-07-05: Depressed");
    expect(report).toContain("not a clinical diagnosis");
  });

  it("omits the phase-marker section when none provided", () => {
    const report = buildClinicianReport({ ...baseInput, phaseMarkers: [] });
    expect(report).not.toContain("Bipolar Phase Markers");
  });

  it("renders the DBT diary card summary when provided", () => {
    const report = buildClinicianReport({
      ...baseInput,
      diaryCardSummary: {
        daysLogged: 18,
        periodDays: 30,
        urges: [
          { key: "selfHarm", label: "Urge to self-harm", avgIntensity: 1.2, peakIntensity: 4, daysActedOn: 1 },
          { key: "suicidal", label: "Suicidal urge", avgIntensity: 0.6, peakIntensity: 3, daysActedOn: 0 },
        ],
        emotionAverages: { misery: 2.1, shame: 1.4, anger: 1.8, fear: 1.2, joy: 2.6, love: 3.0 },
        emotionPeaks: { misery: 4, shame: 3, anger: 4, fear: 2, joy: 5, love: 4 },
        skills: [
          { skill: "TIPP", timesUsed: 9, timesHelped: 7, timesNoHelp: 2 },
          { skill: "Opposite Action", timesUsed: 4, timesHelped: 2, timesNoHelp: 2 },
        ],
        avgMisery: 2.1,
        notableDays: [{ date: "2026-07-09", reason: "urge to self-harm acted on" }],
      },
    });
    expect(report).toContain("DBT Diary Card Summary");
    expect(report).toContain("Days logged: 18/30");
    expect(report).toContain("Urge to self-harm: avg 1.2, peak 4 — acted on 1 day");
    expect(report).toContain("Suicidal urge: avg 0.6, peak 3 — acted on 0 days");
    expect(report).toContain("Misery 2.1");
    expect(report).toContain("TIPP (used 9×, helped 7×, no help 2×)");
    expect(report).toContain("2026-07-09: urge to self-harm acted on");
  });

  it("omits the diary card section when not provided", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("DBT Diary Card Summary");
  });
});
