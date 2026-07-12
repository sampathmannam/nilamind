// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  periodCutoffIso,
  filterByDate,
  protocolsCompletedInPeriod,
  appOpenDaysInPeriod,
  nilaTurnsInPeriod,
  gatherClinicianUsage,
  type ReportPeriod,
} from "./clinicianPeriod";
import { secureLocal } from "./secureLocal";

vi.mock("./secureLocal", () => {
  const store: Record<string, string> = {};
  return {
    SENSITIVE_KEYS: [],
    secureLocal: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  };
});

const NOW = new Date("2026-07-12T12:00:00Z");
const seed = async (key: string, val: unknown) => {
  await secureLocal.setItem(key, JSON.stringify(val));
};

describe("clinicianPeriod — pure period helpers", () => {
  it("periodCutoffIso returns the inclusive start date (YYYY-MM-DD)", () => {
    expect(periodCutoffIso(7, NOW)).toBe("2026-07-05");
    expect(periodCutoffIso(30, NOW)).toBe("2026-06-12");
    expect(periodCutoffIso(90, NOW)).toBe("2026-04-13");
  });

  it("filterByDate keeps only records within the window", () => {
    const items = [
      { date: "2026-07-01" },
      { date: "2026-06-12" },
      { date: "2026-06-11" },
    ];
    expect(filterByDate(items, "2026-06-12").map((i) => i.date)).toEqual([
      "2026-07-01",
      "2026-06-12",
    ]);
  });

  it("protocolsCompletedInPeriod counts completions in the window", () => {
    const comps = [{ at: "2026-07-01T10:00:00Z" }, { at: "2026-05-01T10:00:00Z" }];
    expect(protocolsCompletedInPeriod(comps, "2026-06-12")).toBe(1);
  });

  it("appOpenDaysInPeriod / nilaTurnsInPeriod filter by day", () => {
    expect(appOpenDaysInPeriod(["2026-07-02", "2026-06-15", "2026-05-01"], "2026-06-12")).toBe(2);
    expect(nilaTurnsInPeriod([{ date: "2026-07-03" }, { date: "2026-06-10" }], "2026-06-12")).toBe(1);
  });
});

describe("gatherClinicianUsage — on-device usage for the window", () => {
  beforeEach(async () => {
    await secureLocal.setItem("nilamind_checkins", JSON.stringify([]));
    await secureLocal.setItem("nilamind_app_opens", JSON.stringify([]));
    await secureLocal.setItem("nilamind_nila_sessions", JSON.stringify([]));
  });

  it("aggregates check-in days, sleep, app-opens and Nila turns inside the window", async () => {
    await seed("nilamind_checkins", [
      { id: "a", date: "2026-07-01", emotion: "low", intensity: 6, sleepHours: 7 },
      { id: "b", date: "2026-06-20", emotion: "anxious", intensity: 5, sleepHours: 6 },
      { id: "c", date: "2026-05-01", emotion: "calm", intensity: 2, sleepHours: 8 }, // outside 30d
    ]);
    await seed("nilamind_app_opens", ["2026-07-02", "2026-06-15", "2026-05-01"]);
    await seed("nilamind_nila_sessions", [
      { id: "s1", date: "2026-07-03", timestamp: "", surface: "coach", snippet: "hi" },
      { id: "s2", date: "2026-06-10", timestamp: "", surface: "coach", snippet: "hi" },
    ]);

    const u = gatherClinicianUsage(30, NOW);
    expect(u.periodDays).toBe(30);
    expect(u.daysActive).toBe(2); // 2 check-ins in window
    expect(u.avgSleepHours).toBeCloseTo(6.5, 5);
    expect(u.appOpenDays).toBe(2); // 2 app-open days in window
    expect(u.nilaTurns).toBe(1); // 1 Nila turn in window
    expect(Array.isArray(u.featuresUsed)).toBe(true);
  });

  it("reports null sleep when no sleep logged in the window", async () => {
    await seed("nilamind_checkins", [
      { id: "a", date: "2026-07-01", emotion: "low", intensity: 6 },
    ]);
    const u = gatherClinicianUsage(30, NOW);
    expect(u.avgSleepHours).toBeNull();
    expect(u.daysActive).toBe(1);
  });
});
