import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPilotState,
  enrollPilot,
  withdrawPilot,
  isPilotEnrolled,
  markEndpointReminderScheduled,
  computePilotSummary,
  PILOT_ENDPOINT_DAYS,
} from "./pilotStudy";
import type { AssessmentEntry, InstrumentId } from "./assessments";

// pilotStudy -> assessments + retentionMetrics -> identity, which spreads SENSITIVE_KEYS at import; provide it.
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [],
  flush: () => {},
}));

const at = (iso: string) => new Date(iso);
let seq = 0;
const entry = (instrument: InstrumentId, date: string, total: number): AssessmentEntry => ({
  id: `a${seq++}`, date, timestamp: `${date}T10:00:00.000Z`, instrument,
  responses: [], total, severity: "band", safetyFlag: false,
});
const seedAssessments = (...es: AssessmentEntry[]) => store.set("nilamind_assessments", JSON.stringify(es));

beforeEach(() => { store.clear(); seq = 0; });

describe("enrollment", () => {
  it("starts un-enrolled", () => {
    expect(getPilotState()).toBeNull();
    expect(isPilotEnrolled()).toBe(false);
    expect(computePilotSummary()).toBeNull();
  });

  it("enrolls today and sets the endpoint due day (+28)", () => {
    const s = enrollPilot(at("2026-06-01T10:00:00Z"));
    expect(s.enrolled).toBe(true);
    expect(s.enrolledDay).toBe("2026-06-01");
    expect(s.endpointDueDay).toBe("2026-06-29"); // 06-01 + 28 days
    expect(s.endpointReminderScheduled).toBe(false);
    expect(PILOT_ENDPOINT_DAYS).toBe(28);
    expect(isPilotEnrolled()).toBe(true);
  });

  it("is idempotent — re-enrolling keeps the original baseline day", () => {
    enrollPilot(at("2026-06-01T10:00:00Z"));
    const again = enrollPilot(at("2026-06-05T10:00:00Z"));
    expect(again.enrolledDay).toBe("2026-06-01");
  });

  it("withdraws cleanly", () => {
    enrollPilot(at("2026-06-01T10:00:00Z"));
    withdrawPilot();
    expect(getPilotState()).toBeNull();
    expect(isPilotEnrolled()).toBe(false);
  });

  it("marks the endpoint reminder scheduled (and only while enrolled)", () => {
    markEndpointReminderScheduled(); // no-op when not enrolled
    expect(getPilotState()).toBeNull();
    enrollPilot(at("2026-06-01T10:00:00Z"));
    markEndpointReminderScheduled();
    expect(getPilotState()?.endpointReminderScheduled).toBe(true);
  });
});

describe("computePilotSummary", () => {
  it("pairs baseline -> endpoint and computes change + improved per instrument", () => {
    enrollPilot(at("2026-06-01T10:00:00Z"));
    seedAssessments(
      entry("PHQ-9", "2026-06-01", 15), entry("PHQ-9", "2026-06-30", 8),
      entry("GAD-7", "2026-06-01", 12), entry("GAD-7", "2026-06-30", 9),
      entry("WHO-5", "2026-06-01", 40), entry("WHO-5", "2026-06-30", 60),
    );
    const s = computePilotSummary(at("2026-06-30T10:00:00Z"))!;
    expect(s.endpointReached).toBe(true);
    expect(s.daysRemaining).toBe(0);

    const phq = s.instruments.find((i) => i.id === "PHQ-9")!;
    expect(phq.baseline).toEqual({ total: 15, date: "2026-06-01" });
    expect(phq.endpoint).toEqual({ total: 8, date: "2026-06-30" });
    expect(phq.change).toBe(-7);
    expect(phq.improved).toBe(true); // lower is better

    const who = s.instruments.find((i) => i.id === "WHO-5")!;
    expect(who.change).toBe(20);
    expect(who.improved).toBe(true); // higher is better
  });

  it("uses an assessment taken just BEFORE enrollment as the baseline", () => {
    enrollPilot(at("2026-06-01T10:00:00Z"));
    seedAssessments(entry("PHQ-9", "2026-05-30", 18), entry("PHQ-9", "2026-06-30", 10));
    const phq = computePilotSummary(at("2026-06-30T10:00:00Z"))!.instruments.find((i) => i.id === "PHQ-9")!;
    expect(phq.baseline).toEqual({ total: 18, date: "2026-05-30" });
    expect(phq.endpoint).toEqual({ total: 10, date: "2026-06-30" });
  });

  it("never counts a single assessment as both baseline and endpoint", () => {
    enrollPilot(at("2026-06-01T10:00:00Z"));
    seedAssessments(entry("PHQ-9", "2026-06-30", 9)); // one entry, after the endpoint day
    const phq = computePilotSummary(at("2026-06-30T10:00:00Z"))!.instruments.find((i) => i.id === "PHQ-9")!;
    expect(phq.baseline).toEqual({ total: 9, date: "2026-06-30" });
    expect(phq.endpoint).toBeNull();
    expect(phq.change).toBeNull();
    expect(phq.improved).toBeNull();
  });

  it("reports days remaining before the endpoint is reached", () => {
    enrollPilot(at("2026-06-01T10:00:00Z"));
    const s = computePilotSummary(at("2026-06-15T10:00:00Z"))!;
    expect(s.endpointReached).toBe(false);
    expect(s.daysRemaining).toBe(14); // 06-15 -> 06-29
  });

  it("returns null baselines/endpoints when there are no assessments", () => {
    enrollPilot(at("2026-06-01T10:00:00Z"));
    const s = computePilotSummary(at("2026-06-30T10:00:00Z"))!;
    for (const i of s.instruments) {
      expect(i.baseline).toBeNull();
      expect(i.endpoint).toBeNull();
      expect(i.change).toBeNull();
    }
  });
});
