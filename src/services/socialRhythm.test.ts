import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseTime,
  circularStats,
  loadRhythm,
  recordRhythm,
  computeRhythmRegularity,
  MIN_RHYTHM_DAYS,
  type RhythmEntry,
  type RhythmAnchors,
} from "./socialRhythm";

// socialRhythm -> retentionMetrics -> identity, which spreads SENSITIVE_KEYS at import; provide it.
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

const KEY = "nilamind_social_rhythm";
const at = (iso: string) => new Date(iso);
const seed = (...entries: RhythmEntry[]) => store.set(KEY, JSON.stringify(entries));
beforeEach(() => store.clear());

describe("parseTime", () => {
  it("parses valid HH:MM to minutes", () => {
    expect(parseTime("07:00")).toBe(420);
    expect(parseTime("23:59")).toBe(1439);
    expect(parseTime("00:00")).toBe(0);
  });
  it("rejects malformed / out-of-range times", () => {
    expect(parseTime("7am")).toBeNull();
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("07:60")).toBeNull();
    expect(parseTime("")).toBeNull();
  });
});

describe("circularStats", () => {
  it("is zero-variance for identical times", () => {
    const { meanMin, sdMin } = circularStats([420, 420, 420]);
    expect(meanMin).toBe(420);
    expect(sdMin).toBe(0);
  });

  it("handles the midnight wrap correctly (23:50 & 00:10 average to ~midnight, not noon)", () => {
    const { meanMin, sdMin } = circularStats([1430, 10]);
    expect(Math.min(meanMin, 1440 - meanMin)).toBeLessThan(5); // within 5 min of 00:00
    expect(sdMin).toBeLessThan(20); // tight — NOT the ~720 a naive linear SD would give
  });

  it("grows with spread", () => {
    const tight = circularStats([420, 425, 415]).sdMin;
    const wide = circularStats([300, 540, 420]).sdMin; // 05:00 / 09:00 / 07:00
    expect(wide).toBeGreaterThan(tight);
  });
});

describe("recordRhythm / loadRhythm", () => {
  it("records today's anchors", () => {
    recordRhythm({ wake: "07:00", bed: "23:00" }, at("2026-07-11T09:00:00Z"));
    const all = loadRhythm();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual({ date: "2026-07-11", anchors: { wake: "07:00", bed: "23:00" } });
  });

  it("merges anchors logged for the same day", () => {
    recordRhythm({ wake: "07:00" }, at("2026-07-11T09:00:00Z"));
    recordRhythm({ dinner: "19:00" }, at("2026-07-11T20:00:00Z"));
    expect(loadRhythm()[0].anchors).toEqual({ wake: "07:00", dinner: "19:00" });
  });

  it("ignores malformed times", () => {
    recordRhythm({ wake: "not-a-time", dinner: "19:00" }, at("2026-07-11T20:00:00Z"));
    expect(loadRhythm()[0].anchors).toEqual({ dinner: "19:00" });
  });

  it("tolerates corrupt storage", () => {
    store.set(KEY, "{bad json");
    expect(loadRhythm()).toEqual([]);
  });
});

describe("computeRhythmRegularity", () => {
  const days = (n: number, anchors: (i: number) => RhythmAnchors): RhythmEntry[] =>
    Array.from({ length: n }, (_, i) => ({ date: `2026-07-${String(1 + i).padStart(2, "0")}`, anchors: anchors(i) }));

  it("reports 'insufficient' below the day floor", () => {
    seed(...days(3, () => ({ wake: "07:00" })));
    const r = computeRhythmRegularity(at("2026-07-03T10:00:00Z"));
    expect(r.daysLogged).toBe(3);
    expect(r.band).toBe("insufficient");
    expect(r.overallVariabilityMin).toBeNull();
  });

  it("reports 'regular' for a steady routine", () => {
    seed(...days(6, () => ({ wake: "07:00", bed: "23:00" })));
    const r = computeRhythmRegularity(at("2026-07-06T10:00:00Z"));
    expect(r.daysLogged).toBe(6);
    expect(r.overallVariabilityMin).toBe(0);
    expect(r.band).toBe("regular");
    const wake = r.anchors.find((a) => a.key === "wake")!;
    expect(wake.meanTime).toBe("07:00");
    expect(wake.daysLogged).toBe(6);
  });

  it("reports 'irregular' for a scattered routine", () => {
    const times = ["05:00", "09:30", "06:15", "11:00", "04:30", "10:15"];
    seed(...days(6, (i) => ({ wake: times[i] })));
    const r = computeRhythmRegularity(at("2026-07-06T10:00:00Z"));
    expect(r.overallVariabilityMin).toBeGreaterThan(90);
    expect(r.band).toBe("irregular");
  });

  it("respects the trailing window (old entries drop out)", () => {
    seed(
      { date: "2026-06-01", anchors: { wake: "07:00" } }, // far outside the 14-day window
      ...days(5, () => ({ wake: "07:00" })),
    );
    const r = computeRhythmRegularity(at("2026-07-05T10:00:00Z"), 14);
    expect(r.daysLogged).toBe(5); // the June entry is excluded
  });

  it("only scores anchors that clear the day floor", () => {
    // wake logged 6 days, dinner only twice -> dinner excluded from the overall figure
    seed(...days(6, (i) => (i < 2 ? { wake: "07:00", dinner: "19:00" } : { wake: "07:00" })));
    const r = computeRhythmRegularity(at("2026-07-06T10:00:00Z"));
    const dinner = r.anchors.find((a) => a.key === "dinner")!;
    expect(dinner.daysLogged).toBe(2);
    expect(r.overallVariabilityMin).toBe(0); // driven by wake only (dinner below floor)
    expect(MIN_RHYTHM_DAYS).toBe(5);
  });
});
