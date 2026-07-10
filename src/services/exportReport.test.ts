import { describe, it, expect } from "vitest";
import { generateCsvReport, buildTextReport, generatePdfBlob } from "./exportReport";
import type { CheckInEntry } from "../types";

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
