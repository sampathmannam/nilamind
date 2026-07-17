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
    entries: [
      {
        date: "2026-07-12", time: "11:42 PM", dayOfWeek: "Sunday", timeOfDay: "night",
        trigger: "argument with roommate", startIntensity: 8, peakIntensity: 9, endIntensity: 3,
        durationMinutes: 42, skillsHelpful: ["TIPP", "calling a friend"],
      },
      {
        date: "2026-07-08", time: "6:10 PM", dayOfWeek: "Wednesday", timeOfDay: "evening",
        trigger: null, startIntensity: 7, peakIntensity: 7, endIntensity: 5,
        durationMinutes: 20, skillsHelpful: [],
      },
    ],
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

  it("includes per-episode narrative entries with trigger, intensity arc, and skills that helped", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("2026-07-12 (Sunday) 11:42 PM");
    expect(report).toContain("argument with roommate");
    expect(report).toContain("8 → 9 → 3");
    expect(report).toContain("42 min");
    expect(report).toContain("TIPP, calling a friend");
  });

  it("labels a skipped trigger as not recorded rather than omitting the entry", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).toContain("2026-07-08 (Wednesday) 6:10 PM");
    expect(report).toContain("trigger not recorded");
  });

  it("caps rendered episode entries at 8 and notes how many more exist", () => {
    const manyEntries = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`, time: "9:00 PM", dayOfWeek: "Monday",
      timeOfDay: "evening", trigger: "test", startIntensity: 5, peakIntensity: 6, endIntensity: 4,
      durationMinutes: 10, skillsHelpful: [],
    }));
    const report = buildClinicianReport({
      ...baseInput,
      episodes: { count: 12, byTimeOfDay: "evening (12)", avgDurationMin: 10, entries: manyEntries },
    });
    expect(report).toContain("showing most recent 8 of 12");
  });

  // Phase 20.1 B12: pact state appears in the report as a privacy-respecting status block. The
  // trusted person's identity must NEVER appear — only "name recorded" / "contact recorded".
  it("renders the Support Arrangement (pact) block when pactState is supplied, without leaking PII", () => {
    const report = buildClinicianReport({
      ...baseInput,
      pactState: {
        exists: true,
        hasName: true,
        hasContact: false,
        writtenAt: "2026-01-15",
        ratifiedAt: "2026-06-30",
        isStale: false,
      },
    });
    expect(report).toContain("Support Arrangement");
    expect(report).toContain("Trusted-person name recorded: yes");
    expect(report).toContain("Contact recorded: no");
    expect(report).toContain("2026-06-30");
    expect(report).toContain("Stale re-confirmation");
    // Privacy boundary: nothing sensitive should leak into the rendered text.
    expect(report).not.toContain("Roommate Alex");
    expect(report).not.toContain("alex@example.test");
  });

  it("renders the Support Arrangement block as 'no pact on file' when exists=false, never silently omitting", () => {
    const report = buildClinicianReport({
      ...baseInput,
      pactState: {
        exists: false,
        hasName: false,
        hasContact: false,
        writtenAt: null,
        ratifiedAt: null,
        isStale: false,
      },
    });
    expect(report).toContain("Support Arrangement");
    expect(report).toContain("No pact on file");
  });

  it("omits the Support Arrangement block entirely when pactState is absent (legacy field optional)", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Support Arrangement");
  });

  // Phase 20.1 B8 — social connection summary
  it("renders the Social Connection block when connections is supplied", () => {
    const report = buildClinicianReport({
      ...baseInput,
      connections: {
        hasData: true,
        totalConnections: 8,
        byType: { call: 3, text: 4, in_person: 1 },
        recentLevel: "adequate",
        lastWeekCount: 3,
        persistentlyLow: false,
        weeklyCounts: [{ week: "2026-07-06", count: 3 }, { week: "2026-07-13", count: 5 }],
      },
    });
    expect(report).toContain("Social Connection");
    expect(report).toContain("8");
    expect(report).toContain("adequate");
    expect(report).toContain("call: 3");
    expect(report).toContain("text: 4");
    expect(report).toContain("in person: 1");
    expect(report).toContain("3 connections"); // last-week count
    expect(report).not.toContain("chronically low");
  });

  it("shows chronically-low pattern when persistentlyLow=true", () => {
    const report = buildClinicianReport({
      ...baseInput,
      connections: {
        hasData: true, totalConnections: 2, byType: { call: 2 },
        recentLevel: "low", lastWeekCount: 0, persistentlyLow: true,
        weeklyCounts: [{ week: "2026-07-06", count: 1 }, { week: "2026-07-13", count: 1 }],
      },
    });
    expect(report).toContain("chronically low");
  });

  it("omits the Social Connection block entirely when connections is absent", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Social Connection");
  });

  // Phase 20.1 B11 — what-didn't-help render
  it("renders What Did Not Help section when whatDidntHelp has entries", () => {
    const report = buildClinicianReport({
      ...baseInput,
      whatDidntHelp: {
        totalCount: 2,
        items: [
          { source: "diary", skill: "TIPP", date: "2026-07-10" },
          { source: "insight", text: "Caffeine worsens my anxiety", date: "2026-07-12" },
        ],
      },
    });
    expect(report).toContain("What Did Not Help");
    expect(report).toContain("Skill not helpful: TIPP");
    expect(report).toContain("Caffeine worsens my anxiety");
  });

  it("omits What Did Not Help when totalCount=0 or absent", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("What Did Not Help");
  });

  // Phase 20.1 B1 — thought record summary render
  it("renders Thought Record Summary section when thoughtRecords present", () => {
    const report = buildClinicianReport({
      ...baseInput,
      thoughtRecords: {
        count: 5,
        topEmotions: [{ emotion: "Anxious", count: 3 }, { emotion: "Calm", count: 2 }],
        topSituations: [{ theme: "work meeting", count: 2 }],
        excerpt: { situation: "A conflict at work", emotion: "Anxious" },
      },
    });
    expect(report).toContain("Thought Record Summary");
    expect(report).toContain("Total records: 5");
    expect(report).toContain("Anxious (3)");
    expect(report).toContain("work meeting (2)");
    expect(report).toContain("A conflict at work");
  });

  it("omits Thought Record Summary when count=0 or absent", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Thought Record Summary");
  });

  // Phase 20.1 B2 — safety plan state render
  it("renders Safety Plan section when hasAnySection=true", () => {
    const report = buildClinicianReport({
      ...baseInput,
      safetyPlan: {
        hasAnySection: true,
        sectionCounts: { warningSigns: 2, copingStrategies: 3 },
        lastUpdated: "2026-06-20",
      },
    });
    expect(report).toContain("Safety Plan (Stanley-Brown)");
    expect(report).toContain("Sections with entries: 2");
    expect(report).toContain("warningSigns: 2 entries");
    expect(report).toContain("copingStrategies: 3 entries");
    expect(report).toContain("Last updated: 2026-06-20");
  });

  it("omits Safety Plan section when hasAnySection=false or absent", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Safety Plan");
  });

  it("never renders a Temporal Risk Assessment section — F11/F12/F13/F14: computed risk scores shown to a clinician risk automation bias and fail FDA's Non-Device CDS exemption without disclosed validation", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Temporal Risk Assessment");
    expect(report).not.toContain("Risk Score");
    expect(report).not.toContain("Suicidal Ideation:");
  });

  it("never renders a Crisis Detection Performance section — this is model-QA telemetry (the classifier's own sensitivity/specificity), not patient information", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Crisis Detection Performance");
    expect(report).not.toContain("Sensitivity (Recall)");
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
      episodes: { count: 0, byTimeOfDay: "", avgDurationMin: null, entries: [] },
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
