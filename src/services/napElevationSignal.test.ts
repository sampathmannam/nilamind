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
// napDisruptionSignal is the only consumer of selfReportedSleepNights; provide a no-op.
vi.mock("./sleepInsight", () => ({ selfReportedSleepNights: () => [] }));

import { logNap } from "./napTracking";
import { napElevationSignal } from "./elevationGuard";

beforeEach(() => { store = {}; });

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("napElevationSignal — P8.4 elevation prodrome", () => {
  it("returns none when no naps logged", () => {
    expect(napElevationSignal()).toBe("none");
  });

  it("returns none for a single quiet afternoon nap (high precision)", () => {
    logNap(daysAgo(2), "14:00", 20);
    expect(napElevationSignal()).toBe("none");
  });

  it("returns elevated when ≥3 naps include a late-long one within 14 days", () => {
    logNap(daysAgo(1), "16:00", 60);
    logNap(daysAgo(3), "13:00", 20);
    logNap(daysAgo(5), "12:00", 15);
    expect(napElevationSignal()).toBe("elevated");
  });

  it("returns high for frequent + repeated late-long napping", () => {
    logNap(daysAgo(1), "17:00", 90);
    logNap(daysAgo(3), "16:00", 45);
    logNap(daysAgo(5), "18:00", 60);
    logNap(daysAgo(7), "15:30", 40);
    logNap(daysAgo(9), "16:30", 50);
    expect(napElevationSignal()).toBe("high");
  });

  it("ignores naps older than the 14-day lookback", () => {
    logNap(daysAgo(20), "17:00", 90);
    logNap(daysAgo(21), "16:00", 60);
    logNap(daysAgo(22), "15:30", 45);
    expect(napElevationSignal()).toBe("none");
  });
});
