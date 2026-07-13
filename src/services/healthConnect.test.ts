import { describe, it, expect, vi } from "vitest";

// healthConnect.ts calls registerPlugin('HealthConnect') at module load; stub the native layer so the
// PURE logic (mapSleepSessions, shortSleepSignal) is testable in node without a device.
vi.mock("@capacitor/core", () => ({
  registerPlugin: () => ({}),
  Capacitor: { isNativePlatform: () => false },
}));

import { mapSleepSessions, shortSleepSignal, type SleepNight } from "./healthConnect";

describe("mapSleepSessions", () => {
  it("sums fragmented sessions into total sleep (timezone-robust)", () => {
    const out = mapSleepSessions([
      { startTime: "2026-06-28T23:00:00Z", endTime: "2026-06-29T03:00:00Z" }, // 4h
      { startTime: "2026-06-29T03:30:00Z", endTime: "2026-06-29T06:30:00Z" }, // 3h
    ]);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.reduce((a, n) => a + n.hours, 0)).toBeCloseTo(7, 5);
  });
  it("drops garbage (unparseable, zero/negative, >24h)", () => {
    expect(mapSleepSessions([{ startTime: "x", endTime: "y" }])).toEqual([]);
    expect(mapSleepSessions([{ startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-03T00:00:00Z" }])).toEqual([]);
  });

  // Group C (real Sleep Regularity Index, Phillips et al. 2017): the ONLY source of actual bed/wake clock
  // times is these Health Connect session timestamps — previously discarded entirely once summed into
  // {date, hours}. Retaining them (additive fields; existing {date, hours} consumers unaffected) is the
  // precondition for reconstructing a real per-night bed/wake series.
  it("retains the earliest session start / latest session end per night (additive — for SRI reconstruction)", () => {
    const out = mapSleepSessions([
      { startTime: "2026-06-28T23:00:00Z", endTime: "2026-06-29T03:00:00Z" }, // 4h
      { startTime: "2026-06-29T03:30:00Z", endTime: "2026-06-29T06:30:00Z" }, // 3h
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe("2026-06-29");
    expect(out[0].startTime).toBe("2026-06-28T23:00:00.000Z"); // earliest fragment start
    expect(out[0].endTime).toBe("2026-06-29T06:30:00.000Z"); // latest fragment end
  });

  it("still returns no timestamp fields (and no crash) when there are no sessions", () => {
    expect(mapSleepSessions([])).toEqual([]);
  });
});

describe("shortSleepSignal — manic-prodrome short-sleep run", () => {
  const night = (date: string, hours: number): SleepNight => ({ date, hours });
  const days = (n: number, hours: number): SleepNight[] =>
    Array.from({ length: n }, (_, i) => night(`2026-06-${String(1 + i).padStart(2, "0")}`, hours));

  it("null when there's not enough history yet (cold-start)", () => {
    expect(shortSleepSignal(days(3, 8))).toBeNull();
  });

  it("fires on a 3-night run well below the personal baseline", () => {
    const nights = [...days(10, 8), night("2026-06-11", 4), night("2026-06-12", 4), night("2026-06-13", 3.5)];
    const sig = shortSleepSignal(nights)!;
    expect(sig.firing).toBe(true);
    expect(sig.nightsBelow).toBe(3);
    expect(sig.baselineHours).toBeCloseTo(8, 5);
  });

  it("does NOT fire on stable sleep", () => {
    expect(shortSleepSignal(days(14, 7.5))!.firing).toBe(false);
  });

  it("does NOT fire on a single off night (no false alarm)", () => {
    const nights = [...days(12, 8), night("2026-06-13", 4)];
    expect(shortSleepSignal(nights)!.firing).toBe(false);
  });
});
