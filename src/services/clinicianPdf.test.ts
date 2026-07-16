import { describe, it, expect } from "vitest";
import { generateClinicianPdfBlob } from "./clinicianPdf";
import type { ClinicianReportInput } from "./clinicianReport";
import type { CheckInEntry } from "../types";

const baseInput: ClinicianReportInput = {
  periodLabel: "Month ending 2026-07-15",
  periodDays: 30,
  totalCheckins: 1,
  daysActive: 1,
  avgIntensity: 9,
  avgSleepHours: 5.5,
  circadianScore: null,
  socialRhythmVariability: null,
  assessmentTrajectories: [],
  medications: [],
  episodes: { count: 0, byTimeOfDay: "", avgDurationMin: null },
  protocolsCompleted: 0,
  nilaSessions: 0,
  featuresUsed: [],
};

function mockCheckin(overrides: Partial<CheckInEntry> = {}): CheckInEntry {
  return {
    id: "id",
    date: "2026-07-15",
    timestamp: "2026-07-15T10:00:00.000Z",
    emotion: "Furious",
    intensity: 9,
    context: "relationships",
    ...overrides,
  };
}

describe("generateClinicianPdfBlob", () => {
  it("renders a PDF for the sparse-data case (1 check-in, no risk assessment) without throwing", () => {
    const blob = generateClinicianPdfBlob(baseInput, {
      checkins: [mockCheckin()],
      activeDayKeys: ["2026-07-15"],
      cutoff: "2026-06-15",
      now: new Date("2026-07-15T12:00:00.000Z"),
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe("application/pdf");
    expect(blob!.size).toBeGreaterThan(0);
  });

  it("renders a PDF for the rich-data case (full check-in history, risk assessment, medications)", () => {
    const checkins: CheckInEntry[] = Array.from({ length: 20 }, (_, i) =>
      mockCheckin({
        date: `2026-06-${String(16 + Math.floor(i / 2)).padStart(2, "0")}`,
        intensity: 3 + (i % 6),
        sleepHours: 6 + (i % 3),
      }),
    );
    const richInput: ClinicianReportInput = {
      ...baseInput,
      totalCheckins: 20,
      daysActive: 20,
      medications: [
        { name: "Lamotrigine", dose: "200mg", adherenceRate: 92, commonSideEffects: [] },
        { name: "Quetiapine", dose: "50mg", adherenceRate: 78, commonSideEffects: ["drowsiness"] },
      ],
      temporalRiskAssessment: {
        timestamp: "2026-07-15T00:00:00.000Z",
        riskLevel: "moderate",
        riskScore: 0.42,
        trend: "worsening",
        confidence: 0.8,
        windowDays: 28,
        recommendations: ["Maintain regular sleep schedule and bedtime routine"],
        factors: {
          sleepDeprivation: 0.6,
          sleepVariability: 0.5,
          rhythmIrregularity: 0.3,
          moodDeterioration: 0.7,
          affectiveLability: 0.4,
          socialWithdrawal: 0.2,
          activityReduction: 0.1,
          depressionSeverity: 0.5,
          anxietySeverity: 0.3,
          suicidalIdeation: 0,
          acuteRisk: 0.4,
          subacuteRisk: 0.3,
        },
      },
    };
    const blob = generateClinicianPdfBlob(richInput, {
      checkins,
      activeDayKeys: checkins.map((c) => c.date),
      cutoff: "2026-06-15",
      now: new Date("2026-07-15T12:00:00.000Z"),
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe("application/pdf");
    expect(blob!.size).toBeGreaterThan(0);
  });

  it("does not throw when there is zero data at all", () => {
    const blob = generateClinicianPdfBlob(
      { ...baseInput, totalCheckins: 0, daysActive: 0, avgIntensity: null, avgSleepHours: null },
      { checkins: [], activeDayKeys: [], cutoff: "2026-06-15", now: new Date("2026-07-15T12:00:00.000Z") },
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.size).toBeGreaterThan(0);
  });
});
