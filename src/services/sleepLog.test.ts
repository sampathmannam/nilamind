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

import {
  logSleepNight,
  getSleepLog,
  hasSleepLogForDate,
  manualSleepNights,
  sleepHoursBetween,
  markMorningSleepDismissed,
  shouldPromptMorningSleepLog,
} from "./sleepLog";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

beforeEach(() => { store = {}; });

describe("sleepLog — P8.1", () => {
  it("computes nightly hours across a midnight wrap", () => {
    expect(sleepHoursBetween("23:00", "07:00")).toBeCloseTo(8);
    expect(sleepHoursBetween("22:30", "06:15")).toBeCloseTo(7.8, 1);
  });

  it("computes hours when both times are on the same clock day (no wrap)", () => {
    expect(sleepHoursBetween("13:00", "15:00")).toBeCloseTo(2);
  });

  it("logs a night keyed to the wake day and stores bed/wake", () => {
    const date = "2026-07-10";
    logSleepNight(date, "23:00", "07:00");
    expect(hasSleepLogForDate(date)).toBe(true);
    const entry = getSleepLog()[0];
    expect(entry.hours).toBeCloseTo(8);
    expect(entry.bedTime).toBe("23:00");
    expect(entry.wakeTime).toBe("07:00");
  });

  it("manualSleepNights exposes the logged night as a SleepNight for the signal", () => {
    const date = "2026-07-10";
    logSleepNight(date, "23:00", "07:00");
    const nights = manualSleepNights();
    expect(nights).toContainEqual({ date, hours: 8 });
  });

  it("only prompts in the morning, without Health Connect, when nothing logged yet today", () => {
    const morning = new Date(2026, 6, 10, 8, 0); // 8am
    expect(shouldPromptMorningSleepLog(morning, false)).toBe(true);
    // not morning
    expect(shouldPromptMorningSleepLog(new Date(2026, 6, 10, 20, 0), false)).toBe(false);
    // health connect on → don't ask (auto data)
    expect(shouldPromptMorningSleepLog(morning, true)).toBe(false);
    // already logged today
    logSleepNight(ymd(morning), "23:00", "07:00");
    expect(shouldPromptMorningSleepLog(morning, false)).toBe(false);
  });

  it("does not prompt again the same day after dismissal", () => {
    const morning = new Date(2026, 6, 10, 8, 0);
    expect(shouldPromptMorningSleepLog(morning, false)).toBe(true);
    markMorningSleepDismissed(ymd(morning));
    expect(shouldPromptMorningSleepLog(morning, false)).toBe(false);
  });
});
