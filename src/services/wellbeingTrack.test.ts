import { describe, it, expect } from "vitest";
import {
  isWellbeingDue,
  wellbeingCadence,
  wellbeingLongitudinal,
  readWellbeingHistory,
  WELLBEING_RECALL_DAYS,
} from "./wellbeingTrack";
import type { AssessmentEntry } from "./assessments";

function who5(date: string, total: number): AssessmentEntry {
  return {
    id: "w_" + date,
    date,
    timestamp: "10:00:00",
    instrument: "WHO-5",
    responses: [],
    total,
    severity: "Good wellbeing",
    safetyFlag: false,
  };
}

function phq(date: string, total: number): AssessmentEntry {
  return {
    id: "p_" + date,
    date,
    timestamp: "10:00:00",
    instrument: "PHQ-9",
    responses: [],
    total,
    severity: "x",
    safetyFlag: false,
  };
}

describe("readWellbeingHistory", () => {
  it("returns only WHO-5 entries, sorted by date", () => {
    const all = [phq("2026-01-01", 5), who5("2026-01-02", 60), who5("2026-01-01", 50)];
    const h = readWellbeingHistory(all);
    expect(h.map((e) => e.date)).toEqual(["2026-01-01", "2026-01-02"]);
    expect(h.every((e) => e.instrument === "WHO-5")).toBe(true);
  });
});

describe("isWellbeingDue", () => {
  it("is due when there is no history", () => {
    expect(isWellbeingDue([], "2026-01-15")).toBe(true);
  });
  it("is not due within the recall window", () => {
    expect(isWellbeingDue([who5("2026-01-10", 60)], "2026-01-15")).toBe(false);
  });
  it("is due at and after the recall window", () => {
    expect(isWellbeingDue([who5("2026-01-01", 60)], "2026-01-15")).toBe(true);
    expect(isWellbeingDue([who5("2026-01-02", 60)], "2026-01-16")).toBe(true);
  });
});

describe("wellbeingCadence", () => {
  it("reports a null cadence before the first check", () => {
    expect(wellbeingCadence([], "2026-01-15")).toEqual({
      daysSinceLast: null,
      dueInDays: null,
      isDue: true,
    });
  });
  it("counts down to the next due day", () => {
    const c = wellbeingCadence([who5("2026-01-05", 60)], "2026-01-15");
    expect(c.daysSinceLast).toBe(10);
    expect(c.dueInDays).toBe(WELLBEING_RECALL_DAYS - 10);
    expect(c.isDue).toBe(false);
  });
});

describe("wellbeingLongitudinal", () => {
  it("summarises a steadily improving trajectory and reports due past the window", () => {
    const h = [who5("2026-01-01", 40), who5("2026-01-15", 70), who5("2026-02-01", 85)];
    const r = wellbeingLongitudinal(h, "2026-02-20");
    expect(r.taken).toBe(true);
    expect(r.trajectory).toBe("reliably_improved");
    expect(r.summary).toMatch(/improving/);
    expect(r.isDue).toBe(true);
  });
  it("handles no history gracefully", () => {
    const r = wellbeingLongitudinal([], "2026-02-10");
    expect(r.taken).toBe(false);
    expect(r.latest).toBeNull();
    expect(r.isDue).toBe(true);
    expect(r.summary).toMatch(/No wellbeing/);
  });
  it("reports not-due shortly after a check", () => {
    const h = [who5("2026-02-10", 70), who5("2026-02-20", 80)];
    const r = wellbeingLongitudinal(h, "2026-02-25");
    expect(r.isDue).toBe(false);
    expect(r.dueInDays).toBe(WELLBEING_RECALL_DAYS - 5);
  });
});
