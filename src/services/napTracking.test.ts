import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  }),
}));
// Provide sleep nights so the signal can correlate nap-days with following-night sleep.
vi.mock("./sleepInsight", () => ({
  selfReportedSleepNights: () => [
    { date: "2026-07-08", hours: 7 }, // night after 07-07 nap
    { date: "2026-07-09", hours: 6 }, // night after 07-08 nap (shorter)
    { date: "2026-07-10", hours: 7.5 },
  ],
}));

import { logNap, getNaps, napDisruptionSignal, isLateLongNap } from "./napTracking";

beforeEach(() => { store = {}; });

describe("napTracking — P8.4", () => {
  it("logs a nap and stores start + minutes", () => {
    logNap("2026-07-08", "16:00", 60);
    expect(getNaps()).toHaveLength(1);
    expect(getNaps()[0]).toMatchObject({ date: "2026-07-08", start: "16:00", minutes: 60 });
  });

  it("isLateLongNap flags naps >30min at/after 3pm", () => {
    expect(isLateLongNap("15:00", 31)).toBe(true);
    expect(isLateLongNap("16:30", 90)).toBe(true);
    expect(isLateLongNap("14:59", 90)).toBe(false); // before 3pm
    expect(isLateLongNap("16:00", 30)).toBe(false); // not >30
    expect(isLateLongNap("16:00", 29)).toBe(false);
  });

  it("signal does not fire when no late-long naps exist", () => {
    logNap("2026-07-08", "14:00", 120); // before 3pm
    logNap("2026-07-09", "16:00", 20); // too short
    expect(napDisruptionSignal().firing).toBe(false);
  });

  it("signal fires and notes the disruption when a late-long nap is logged", () => {
    logNap("2026-07-08", "16:00", 60);
    // Explicit `now` pins the 14-day lookback window — the default (real wall clock) drifts
    // as time passes, which would push this nap outside the window and falsely flip the signal.
    const sig = napDisruptionSignal(new Date("2026-07-10"));
    expect(sig.firing).toBe(true);
    expect(sig.note.toLowerCase()).toContain("nap");
  });

  it("signal only considers recent naps (last 14 days)", () => {
    logNap("2026-01-01", "18:00", 90); // old
    expect(napDisruptionSignal(new Date("2026-07-10")).firing).toBe(false);
  });
});
