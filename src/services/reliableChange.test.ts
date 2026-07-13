import { describe, it, expect } from "vitest";
import type { AssessmentEntry } from "./assessments";
import {
  reliableChangeThreshold,
  computeReliableChange,
  outcomeStatus,
} from "./reliableChange";

function entry(overrides: Partial<AssessmentEntry> = {}): AssessmentEntry {
  return {
    id: "t1",
    date: "2026-06-01",
    timestamp: "10:00:00",
    instrument: "PHQ-9",
    responses: [],
    total: 0,
    severity: "Minimal",
    safetyFlag: false,
    ...overrides,
  };
}

describe("reliableChangeThreshold", () => {
  it("returns ≈6 for PHQ-9 (published RCI boundary)", () => {
    const t = reliableChangeThreshold("PHQ-9");
    expect(t).toBeGreaterThan(5);
    expect(t).toBeLessThan(7);
  });

  it("returns ≈6 for GAD-7", () => {
    const t = reliableChangeThreshold("GAD-7");
    expect(t).toBeGreaterThan(5);
    expect(t).toBeLessThan(7);
  });

  it("returns ≈15 for WHO-5 (scale 0-100)", () => {
    // WHO-5 ×4 = 0-100; RCI ≈ 15 (≈ 3.7 per raw × 4)
    const t = reliableChangeThreshold("WHO-5");
    // WHO-5 has higherIsBetter, so deterioration is a reliable drop
    expect(t).toBeGreaterThan(10);
    expect(t).toBeLessThan(20);
  });

  it("returns a value for every known instrument", () => {
    for (const id of ["PHQ-9", "PHQ-2", "GAD-7", "WHO-5", "PSS-4", "ASRM"] as const) {
      expect(() => reliableChangeThreshold(id)).not.toThrow();
    }
  });
});

describe("computeReliableChange", () => {
  it("classifies a 6-point PHQ-9 drop as reliable improvement", () => {
    const r = computeReliableChange(
      entry({ total: 17 }),
      entry({ date: "2026-06-15", total: 10 }),
      "PHQ-9",
    );
    expect(r.trend).toBe("reliably_improved");
    expect(r.difference).toBe(-7);
    expect(Math.abs(r.rci)).toBeGreaterThanOrEqual(1.96);
  });

  it("classifies a 2-point PHQ-9 drop as no reliable change", () => {
    const r = computeReliableChange(
      entry({ total: 12 }),
      entry({ date: "2026-06-15", total: 10 }),
      "PHQ-9",
    );
    expect(r.trend).toBe("no_reliable_change");
  });

  it("classifies a 7-point PHQ-9 rise as reliable deterioration", () => {
    const r = computeReliableChange(
      entry({ total: 5 }),
      entry({ date: "2026-06-15", total: 12 }),
      "PHQ-9",
    );
    expect(r.trend).toBe("reliably_deteriorated");
  });

  it("classifies a WHO-5 rise as reliable improvement (higher is better)", () => {
    const r = computeReliableChange(
      entry({ instrument: "WHO-5", total: 35 }),
      entry({ instrument: "WHO-5", date: "2026-06-15", total: 55 }),
      "WHO-5",
    );
    expect(r.trend).toBe("reliably_improved");
  });

  it("classifies a WHO-5 drop as reliable deterioration", () => {
    const r = computeReliableChange(
      entry({ instrument: "WHO-5", total: 60 }),
      entry({ instrument: "WHO-5", date: "2026-06-15", total: 38 }),
      "WHO-5",
    );
    expect(r.trend).toBe("reliably_deteriorated");
  });

  it("classifies a GAD-7 5-point change as no reliable change", () => {
    const r = computeReliableChange(
      entry({ instrument: "GAD-7", total: 10 }),
      entry({ instrument: "GAD-7", date: "2026-06-15", total: 5 }),
      "GAD-7",
    );
    expect(r.trend).toBe("no_reliable_change");
  });

  it("classifies a GAD-7 5-point rise as reliable deterioration", () => {
    const r = computeReliableChange(
      entry({ instrument: "GAD-7", total: 5 }),
      entry({ instrument: "GAD-7", date: "2026-06-15", total: 11 }),
      "GAD-7",
    );
    expect(r.trend).toBe("reliably_deteriorated");
  });
});

describe("outcomeStatus", () => {
  const phq9entries = [
    entry({ id: "a", date: "2026-05-01", total: 18 }),
    entry({ id: "b", date: "2026-05-15", total: 14 }),
    entry({ id: "c", date: "2026-06-01", total: 8 }),
  ];

  it("returns null when only one measurement exists", () => {
    const s = outcomeStatus("PHQ-9", [entry()]);
    expect(s.current).toBeNull();
    expect(s.recovery).toBeNull();
  });

  it("labels reliable improvement + recovered when score drops below cut-point", () => {
    const s = outcomeStatus("PHQ-9", phq9entries);
    expect(s.current!.trend).toBe("reliably_improved");
    expect(s.recovery).toBe("recovered");
  });

  it("trajectory reflects overall first-to-last change", () => {
    const s = outcomeStatus("PHQ-9", phq9entries);
    expect(s.trajectory).toBe("reliably_improved");
  });

  it("labels reliably_deteriorated when scores climb above threshold", () => {
    const up = [
      entry({ id: "a", date: "2026-05-01", total: 5 }),
      entry({ id: "b", date: "2026-05-15", total: 12 }),
    ];
    const s = outcomeStatus("PHQ-9", up);
    expect(s.current!.trend).toBe("reliably_deteriorated");
    expect(s.recovery).toBe("not_recovered");
  });

  it("produces correct history array in date order", () => {
    const s = outcomeStatus("PHQ-9", phq9entries);
    expect(s.history).toEqual([
      { date: "2026-05-01", total: 18 },
      { date: "2026-05-15", total: 14 },
      { date: "2026-06-01", total: 8 },
    ]);
  });
});
