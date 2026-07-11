import { describe, it, expect } from "vitest";
import { generateCsvReport, buildTextReport, generatePdfBlob, buildClinicalJson } from "./exportReport";
import type { CheckInEntry } from "../types";
import type { AssessmentEntry } from "./assessments";

function mockEntry(overrides: Partial<CheckInEntry> = {}): CheckInEntry {
  return {
    id: "test-id",
    date: "2026-06-15",
    timestamp: "2026-06-15T10:00:00.000Z",
    emotion: "Anxious",
    intensity: 6,
    context: "work",
    ...overrides,
  };
}

describe("generateCsvReport", () => {
  it("returns empty string for empty array", () => {
    expect(generateCsvReport([])).toBe("");
  });

  it("returns empty string for null/undefined", () => {
    // @ts-expect-error testing edge case
    expect(generateCsvReport(null)).toBe("");
    // @ts-expect-error testing edge case
    expect(generateCsvReport(undefined)).toBe("");
  });

  it("returns CSV with header, rows, and disclaimer for valid data", () => {
    const checkins = [
      mockEntry({ date: "2026-06-15", emotion: "Anxious", intensity: 6, sleepHours: 7, context: "work" }),
      mockEntry({ date: "2026-06-16", emotion: "Calm", intensity: 3, sleepHours: 8, context: "home", granularEmotion: "Peaceful" }),
    ];
    const csv = generateCsvReport(checkins);
    expect(csv).toContain("Date,Emotion,Intensity (1-10),Sleep Hours,Context,Granular Emotion");
    expect(csv).toContain("2026-06-15,Anxious,6,7,work,");
    expect(csv).toContain("2026-06-16,Calm,3,8,home,Peaceful");
    expect(csv).toContain("not a clinical or diagnostic tool");
  });

  it("strips '(Nila)' suffix from emotion labels in CSV", () => {
    const checkins = [mockEntry({ emotion: "Anxious (Nila)" })];
    const csv = generateCsvReport(checkins);
    expect(csv).toContain("Anxious,");
    expect(csv).not.toContain("(Nila)");
  });
});

describe("buildTextReport", () => {
  it("returns report with disclaimer", () => {
    const text = buildTextReport([]);
    expect(text).toContain("NilaMind Wellness Report");
    expect(text).toContain("No check-ins recorded yet.");
    expect(text).toContain("not a clinical or diagnostic tool");
  });

  it("reports average distress intensity", () => {
    const checkins = [mockEntry({ intensity: 6 }), mockEntry({ intensity: 4 })];
    const text = buildTextReport(checkins);
    expect(text).toContain("Total check-ins logged: 2");
    expect(text).toContain("Average distress intensity: 5.0/10");
  });

  it("reports average sleep when data available", () => {
    const checkins = [mockEntry({ sleepHours: 7 }), mockEntry({ sleepHours: 9 })];
    const text = buildTextReport(checkins);
    expect(text).toContain("Average sleep: 8.0h");
    expect(text).toContain("2 nights");
  });

  it("includes assessment count when provided", () => {
    const text = buildTextReport([mockEntry()], 5);
    expect(text).toContain("Screenings completed: 5");
  });

  it("skips assessment section when count is 0 or missing", () => {
    const text0 = buildTextReport([mockEntry()], 0);
    expect(text0).not.toContain("Screenings");
    const textUndef = buildTextReport([mockEntry()]);
    expect(textUndef).not.toContain("Screenings");
  });

  it("includes the retention block when a summary with a firstUseDay is provided", () => {
    const text = buildTextReport([mockEntry()], undefined, {
      firstUseDay: "2026-06-01",
      daysSinceFirstUse: 40,
      totalActiveDays: 4,
      lastOpenDay: "2026-07-01",
      spanDays: 30,
      currentGapDays: 10,
      longestGapDays: 23,
      activeDaysLast7: 0,
      activeDaysLast30: 1,
      retainedDay1: true,
      retainedDay7: true,
      retainedDay14: true,
      retainedDay30: true,
    });
    expect(text).toContain("Retention & engagement");
    expect(text).toContain("First used: 2026-06-01 (40 days ago)");
    expect(text).toContain("Days you opened NilaMind: 4");
    expect(text).toContain("Active days in the last 7 / 30: 0 / 1");
    expect(text).toContain("Last opened: 2026-07-01 (10 days ago)");
    expect(text).toContain("Still opening after 1 / 7 / 14 / 30 days: yes / yes / yes / yes");
  });

  it("omits the retention block when no summary is given (existing callers unaffected)", () => {
    expect(buildTextReport([mockEntry()])).not.toContain("Retention & engagement");
  });

  it("includes the pilot pre/post block when a pilot summary is provided", () => {
    const text = buildTextReport([mockEntry()], undefined, undefined, {
      enrolledDay: "2026-06-01",
      endpointDueDay: "2026-06-29",
      endpointReached: true,
      daysRemaining: 0,
      instruments: [
        { id: "PHQ-9", label: "PHQ-9 (depression, lower is better)", higherIsBetter: false,
          baseline: { total: 15, date: "2026-06-01" }, endpoint: { total: 8, date: "2026-06-30" }, change: -7, improved: true },
        { id: "WHO-5", label: "WHO-5 (wellbeing, higher is better)", higherIsBetter: true,
          baseline: { total: 40, date: "2026-06-01" }, endpoint: null, change: null, improved: null },
      ],
    });
    expect(text).toContain("Research pilot");
    expect(text).toContain("Enrolled: 2026-06-01; endpoint due: 2026-06-29 (reached)");
    expect(text).toContain("PHQ-9 (depression, lower is better): 15 -> 8 (change -7, improved)");
    expect(text).toContain("WHO-5 (wellbeing, higher is better): baseline 40; endpoint not yet recorded");
    expect(text).toContain("single-arm pre/post");
  });

  it("omits the pilot block when no pilot summary is given", () => {
    expect(buildTextReport([mockEntry()])).not.toContain("Research pilot");
  });
});

describe("buildClinicalJson", () => {
  const assess = (over: Partial<AssessmentEntry> = {}): AssessmentEntry => ({
    id: over.id ?? "a1", date: over.date ?? "2026-06-15", timestamp: over.timestamp ?? "2026-06-15T10:00:00.000Z",
    instrument: over.instrument ?? "PHQ-9", responses: over.responses ?? [], total: over.total ?? 12,
    severity: over.severity ?? "Moderate", safetyFlag: over.safetyFlag ?? false,
  });

  it("emits schema-versioned, parseable JSON with a check-in summary and sorted assessments", () => {
    const json = buildClinicalJson({
      generatedAt: "2026-07-11T00:00:00.000Z",
      checkins: [
        mockEntry({ date: "2026-06-16", intensity: 4, sleepHours: 8 }),
        mockEntry({ date: "2026-06-15", intensity: 6, sleepHours: 6 }),
      ],
      assessments: [assess({ date: "2026-06-30", total: 8, severity: "Mild" }), assess({ date: "2026-06-01", total: 15, severity: "Moderately severe" })],
    });
    const parsed = JSON.parse(json);
    expect(parsed.schema).toBe("nilamind.clinical-export/v1");
    expect(parsed.disclaimer).toMatch(/not a clinical or diagnostic tool/);
    expect(parsed.checkins).toMatchObject({ count: 2, averageIntensity: 5, averageSleepHours: 7, firstDate: "2026-06-15", lastDate: "2026-06-16" });
    expect(parsed.assessments.map((a: { date: string }) => a.date)).toEqual(["2026-06-01", "2026-06-30"]); // sorted ascending
    expect(parsed.assessments[0]).toMatchObject({ instrument: "PHQ-9", total: 15, severity: "Moderately severe", safetyFlag: false });
  });

  it("passes retention/pilot through, or null when absent", () => {
    const parsed = JSON.parse(buildClinicalJson({ generatedAt: "2026-07-11T00:00:00.000Z", checkins: [], assessments: [] }));
    expect(parsed.retention).toBeNull();
    expect(parsed.pilot).toBeNull();
    expect(parsed.checkins).toMatchObject({ count: 0, averageIntensity: null });
  });
});

describe("generatePdfBlob", () => {
  it("returns Blob with PDF content when jsPDF is available", () => {
    // jsPDF is available in the test env via node_modules
    const result = generatePdfBlob("NilaMind Wellness Report\ntest content");
    expect(result).toBeInstanceOf(Blob);
    expect(result!.type).toBe("application/pdf");
    expect(result!.size).toBeGreaterThan(0);
  });
});
