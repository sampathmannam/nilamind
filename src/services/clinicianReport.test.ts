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

  it("includes the cover ID when provided", () => {
    const report = buildClinicianReport({ ...baseInput, coverId: "apple-rocket-ocean" });
    expect(report).toContain("Cover ID: apple-rocket-ocean");
  });

  it("omits the cover ID when not provided", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Cover ID");
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

// Phase 20.1 B7 — medication-mood correlation render
describe("medCorrelation render (Phase 20.1 B7)", () => {
  it("renders Medication-Mood Correlation when medCorrelation has perMed entries", () => {
    const report = buildClinicianReport({
      ...baseInput,
      medCorrelation: {
        overallAdherence: 80,
        perMed: [
          { name: "Sertraline", adherenceRate: 100, avgMoodWhenTaken: 3.2, avgMoodWhenMissed: null, daysInPeriod: 30, daysTaken: 30, daysMissed: 0 },
          { name: "Lithium", adherenceRate: 70, avgMoodWhenTaken: 4.1, avgMoodWhenMissed: 7.3, daysInPeriod: 30, daysTaken: 21, daysMissed: 9 },
        ],
      },
    });
    expect(report).toContain("Medication-Mood Correlation");
    expect(report).toContain("Overall adherence: 80%");
    expect(report).toContain("Sertraline: 100% adherence (30 taken / 0 missed)");
    expect(report).toContain("Lithium: 70% adherence (21 taken / 9 missed)");
    expect(report).toContain("taken=4.1 vs missed=7.3");
  });

  it("omits Medication-Mood Correlation when absent or empty", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Medication-Mood Correlation");
  });
});

// Phase 20.1 B10 — supports recap render
describe("supportsRecap render (Phase 20.1 B10)", () => {
  it("renders Supports Recap when supportsRecap has data", () => {
    const report = buildClinicianReport({
      ...baseInput,
      supportsRecap: {
        caregiverCount: 3,
        relationships: ["parent", "sibling"],
        peerSessionCount: 5,
        avgMoodImprovement: 1.8,
        hasPeerData: true,
      },
    });
    expect(report).toContain("Supports Recap");
    expect(report).toContain("Caregiver contacts: 3");
    expect(report).toContain("parent, sibling");
    expect(report).toContain("Peer support sessions: 5");
    expect(report).toContain("+1.8");
  });

  it("renders caregiver-only supports (no peer data)", () => {
    const report = buildClinicianReport({
      ...baseInput,
      supportsRecap: {
        caregiverCount: 2,
        relationships: ["friend"],
        peerSessionCount: 0,
        avgMoodImprovement: null,
        hasPeerData: false,
      },
    });
    expect(report).toContain("Supports Recap");
    expect(report).toContain("Caregiver contacts: 2");
    expect(report).not.toContain("Peer support sessions");
  });

  it("omits Supports Recap when absent or empty", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Supports Recap");
  });
});

// Phase 20.6 — voice signal (opt-in by structure)
describe("voiceSignal render (Phase 20.6)", () => {
  it("renders Voice Signal section when voiceSignal is present", () => {
    const report = buildClinicianReport({
      ...baseInput,
      voiceSignal: {
        sessionCount: 12,
        avgSpeakingRate: 125,
        signal: "anxiety",
      },
    });
    expect(report).toContain("Voice Signal");
    expect(report).toContain("Sessions: 12");
    expect(report).toContain("Avg speaking rate: 125 wpm");
    expect(report).toContain("Signal: anxiety");
  });

  it("omits signal line when signal is null", () => {
    const report = buildClinicianReport({
      ...baseInput,
      voiceSignal: { sessionCount: 5, avgSpeakingRate: 100, signal: null },
    });
    expect(report).toContain("Voice Signal");
    expect(report).toContain("Sessions: 5");
    expect(report).not.toContain("Signal:");
  });

  it("omits Voice Signal when absent (opt-in by structure)", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Voice Signal");
  });
});

// Phase 20.1b G3 — dose change timeline in clinician report
describe("buildClinicianReport — dose changes (G3)", () => {
  it("includes dose change timeline when doseChanges exist", () => {
    const report = buildClinicianReport({
      ...baseInput,
      doseChanges: {
        hasData: true,
        changes: [
          { medName: "Lithium", oldDose: "300mg", newDose: "600mg", date: "2026-07-10" },
          { medName: "Lithium", oldDose: "150mg", newDose: "300mg", date: "2026-06-01" },
        ],
      },
    });
    expect(report).toContain("Medication Dose Changes");
    expect(report).toContain("Lithium: 300mg → 600mg (2026-07-10)");
    expect(report).toContain("Lithium: 150mg → 300mg (2026-06-01)");
  });

  it("omits dose change section when hasData is false", () => {
    const report = buildClinicianReport({
      ...baseInput,
      doseChanges: { hasData: false, changes: [] },
    });
    expect(report).not.toContain("Medication Dose Changes");
  });

  it("omits dose change section when not provided", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Medication Dose Changes");
  });
});

// Phase 20.1b G4 — side-effect duration in clinician report
describe("buildClinicianReport — side-effect duration (G4)", () => {
  it("includes side-effect summary when data exists", () => {
    const report = buildClinicianReport({
      ...baseInput,
      sideEffectDuration: {
        hasData: true,
        activeSideEffects: [
          { symptom: "nausea", occurrenceCount: 3, avgSeverity: 5 },
        ],
        resolvedSideEffects: [
          { symptom: "headache", occurrenceCount: 1, avgSeverity: 6, avgDurationDays: 3 },
        ],
      },
    });
    expect(report).toContain("Side-Effect Duration");
    expect(report).toContain("Active: nausea (3×, avg severity 5/10)");
    expect(report).toContain("Resolved: headache (3 days avg)");
  });

  it("omits side-effect section when no data", () => {
    const report = buildClinicianReport({
      ...baseInput,
      sideEffectDuration: { hasData: false, activeSideEffects: [], resolvedSideEffects: [] },
    });
    expect(report).not.toContain("Side-Effect Duration");
  });

  it("omits side-effect section when not provided", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Side-Effect Duration");
  });
});

// Phase 20.1b G8 — relapse plan in clinician report
describe("buildClinicianReport — relapse plan (G8)", () => {
  it("includes relapse plan summary when data exists", () => {
    const report = buildClinicianReport({
      ...baseInput,
      relapsePlan: {
        hasData: true,
        greenSignalsCount: 2,
        greenActionsCount: 3,
        orangeSignalsCount: 1,
        orangeActionsCount: 2,
        redCrisisResources: 1,
        lastUpdated: "2026-07-10",
        lastReviewed: "2026-07-05",
      },
    });
    expect(report).toContain("Relapse Prevention Plan");
    expect(report).toContain("Green phase: 2 signals, 3 actions");
    expect(report).toContain("Orange phase: 1 signals, 2 actions");
    expect(report).toContain("Red phase: 1 crisis resources");
    expect(report).toContain("Last updated: 2026-07-10");
    expect(report).toContain("Last reviewed: 2026-07-05");
  });

  it("omits relapse plan section when hasData is false", () => {
    const report = buildClinicianReport({
      ...baseInput,
      relapsePlan: { hasData: false, greenSignalsCount: 0, greenActionsCount: 0, orangeSignalsCount: 0, orangeActionsCount: 0, redCrisisResources: 0, lastUpdated: null, lastReviewed: null },
    });
    expect(report).not.toContain("Relapse Prevention Plan");
  });

  it("omits relapse plan section when not provided", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Relapse Prevention Plan");
  });

  it("omits last-reviewed line when lastReviewed is null", () => {
    const report = buildClinicianReport({
      ...baseInput,
      relapsePlan: { hasData: true, greenSignalsCount: 0, greenActionsCount: 0, orangeSignalsCount: 0, orangeActionsCount: 0, redCrisisResources: 0, lastUpdated: "2026-07-10", lastReviewed: null },
    });
    expect(report).toContain("Relapse Prevention Plan");
    expect(report).not.toContain("Last reviewed:");
  });
});

// Phase 20.7 — WHO-5 wellbeing trajectory
describe("buildClinicianReport — WHO-5 trajectory (20.7)", () => {
  it("includes WHO-5 trajectory when data exists", () => {
    const report = buildClinicianReport({
      ...baseInput,
      who5Trajectory: {
        hasData: true,
        entries: [
          { date: "2026-06-01", score: 12, severity: "Low wellbeing" },
          { date: "2026-07-01", score: 36, severity: "Good wellbeing" },
        ],
        trend: "improving",
        latestScore: 36,
        belowThresholdCount: 1,
      },
    });
    expect(report).toContain("Wellbeing Trajectory (WHO-5)");
    expect(report).toContain("2026-06-01: 12/100 (Low wellbeing)");
    expect(report).toContain("Trend: improving");
    expect(report).toContain("Low wellbeing days (≤13): 1 of 2");
  });

  it("omits WHO-5 section when no data", () => {
    const report = buildClinicianReport({
      ...baseInput,
      who5Trajectory: { hasData: false, entries: [], trend: null, latestScore: null, belowThresholdCount: 0 },
    });
    expect(report).not.toContain("Wellbeing Trajectory");
  });

  it("omits WHO-5 section when not provided", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Wellbeing Trajectory");
  });
});

// Phase 20.4 — sleep→intensity correlation
describe("buildClinicianReport — sleep-mood correlation (20.4)", () => {
  it("includes correlation when provided", () => {
    const report = buildClinicianReport({
      ...baseInput,
      sleepIntensityCorrelation: { correlation: -0.72, sampleSize: 14 },
    });
    expect(report).toContain("Sleep–Mood Correlation");
    expect(report).toContain("r = -0.72 (n=14");
  });

  it("omits correlation section when null", () => {
    const report = buildClinicianReport({ ...baseInput, sleepIntensityCorrelation: null });
    expect(report).not.toContain("Sleep–Mood Correlation");
  });

  it("omits correlation section when not provided", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Sleep–Mood Correlation");
  });
});

// Phase 20.4 — trigger→context distribution
describe("buildClinicianReport — trigger-context distribution (20.4)", () => {
  it("includes trigger-context when data exists", () => {
    const report = buildClinicianReport({
      ...baseInput,
      triggerContextDistribution: {
        topTriggers: [{ theme: "work meeting", count: 3 }],
        topContexts: [{ context: "work", count: 5 }],
      },
    });
    expect(report).toContain("Trigger & Context Patterns");
    expect(report).toContain("Top triggers:");
    expect(report).toContain("Top contexts:");
  });

  it("omits section when empty", () => {
    const report = buildClinicianReport({
      ...baseInput,
      triggerContextDistribution: { topTriggers: [], topContexts: [] },
    });
    expect(report).not.toContain("Trigger & Context Patterns");
  });
});

// Phase 20.5 — risk event log
describe("buildClinicianReport — risk event log (20.5)", () => {
  it("includes event timeline when data exists", () => {
    const report = buildClinicianReport({
      ...baseInput,
      riskEventLog: {
        hasData: true,
        events: [
          { date: "2026-07-12", type: "episode" },
          { date: "2026-07-10", type: "prodrome", detail: "short_sleep" },
        ],
      },
    });
    expect(report).toContain("Event Timeline");
    expect(report).toContain("2026-07-12: episode");
    expect(report).toContain("2026-07-10: prodrome (short_sleep)");
  });

  it("omits event timeline when no data", () => {
    const report = buildClinicianReport({
      ...baseInput,
      riskEventLog: { hasData: false, events: [] },
    });
    expect(report).not.toContain("Event Timeline");
  });

  it("omits event timeline when not provided", () => {
    const report = buildClinicianReport(baseInput);
    expect(report).not.toContain("Event Timeline");
  });
});
