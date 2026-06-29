import { describe, it, expect, vi } from "vitest";

// healthConnect registers a native plugin at load; stub it (and force non-native so readRecentSleep → []).
vi.mock("@capacitor/core", () => ({ registerPlugin: () => ({}), Capacitor: { isNativePlatform: () => false } }));

const moodData: Array<{ date: string; sleepHours: number | null }> = [];
vi.mock("./moodHistory", () => ({ loadMoodHistory: () => moodData }));

import { selfReportedSleepNights, selfReportSleepSignal, currentSleepSignal } from "./sleepInsight";

function setMood(days: Array<{ date: string; sleepHours: number | null }>) {
  moodData.length = 0;
  moodData.push(...days);
}
const runDays = (n: number, sleepHours: number) =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-06-${String(1 + i).padStart(2, "0")}`, sleepHours }));

describe("sleepInsight — self-report wiring + source preference", () => {
  it("maps logged sleepHours to nights, skipping null and 0", () => {
    setMood([
      { date: "2026-06-01", sleepHours: 7 },
      { date: "2026-06-02", sleepHours: null },
      { date: "2026-06-03", sleepHours: 0 },
      { date: "2026-06-04", sleepHours: 6.5 },
    ]);
    expect(selfReportedSleepNights()).toEqual([
      { date: "2026-06-01", hours: 7 },
      { date: "2026-06-04", hours: 6.5 },
    ]);
  });

  it("fires the manic-prodrome signal from self-report alone (no wearable)", () => {
    setMood([...runDays(10, 8), { date: "2026-06-11", sleepHours: 4 }, { date: "2026-06-12", sleepHours: 4 }, { date: "2026-06-13", sleepHours: 3.5 }]);
    const sig = selfReportSleepSignal()!;
    expect(sig.firing).toBe(true);
    expect(sig.nightsBelow).toBe(3);
  });

  it("currentSleepSignal falls back to self-report when Health Connect is empty", async () => {
    setMood(runDays(14, 7.5)); // stable sleep
    const sig = await currentSleepSignal();
    expect(sig?.firing).toBe(false);
  });

  it("null when there isn't enough sleep history yet (cold-start)", () => {
    setMood(runDays(4, 7));
    expect(selfReportSleepSignal()).toBeNull();
  });
});
