import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
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
  MAX_NON_CRISIS_PER_DAY,
  peekRemaining,
  commitClaim,
  recordNonCrisisSent,
  getSentToday,
  recordEngagement,
  recordDismissal,
  dismissStreak,
  skipActive,
  startOfDay,
} from "./notificationBudget";

beforeEach(() => { store = {}; });

describe("notificationBudget — P6.3 frequency cap", () => {
  it("allows up to MAX_NON_CRISIS_PER_DAY per day", () => {
    const day = new Date(2026, 6, 10, 9, 0).getTime();
    expect(MAX_NON_CRISIS_PER_DAY).toBe(3);
    expect(peekRemaining(day)).toBe(3);
    commitClaim(2, day);
    expect(peekRemaining(day)).toBe(1);
    expect(getSentToday(day)).toBe(2);
  });

  it("never goes negative and records the committed count", () => {
    const day = new Date(2026, 6, 10, 9, 0).getTime();
    commitClaim(5, day);
    expect(getSentToday(day)).toBe(3);
    expect(peekRemaining(day)).toBe(0);
    commitClaim(1, day); // already at max — no-op
    expect(getSentToday(day)).toBe(3);
  });

  it("counts are scoped per calendar day", () => {
    const day1 = new Date(2026, 6, 10, 23, 0).getTime();
    const day2 = new Date(2026, 6, 11, 1, 0).getTime();
    commitClaim(3, day1);
    expect(peekRemaining(day1)).toBe(0);
    expect(peekRemaining(day2)).toBe(3); // fresh budget next day
  });

  it("recordNonCrisisSent is a convenience committer", () => {
    const day = new Date(2026, 6, 10, 9, 0).getTime();
    recordNonCrisisSent(1, day);
    expect(getSentToday(day)).toBe(1);
  });
});

describe("notificationBudget — progressive cooldown", () => {
  it("engagement resets the dismissal streak", () => {
    recordDismissal();
    recordDismissal();
    expect(dismissStreak()).toBe(2);
    recordEngagement();
    expect(dismissStreak()).toBe(0);
  });

  it("two consecutive dismissals activate a next-day skip", () => {
    recordDismissal();
    recordDismissal();
    const now = new Date(2026, 6, 10, 9, 0).getTime();
    expect(skipActive(now)).toBe(true);
  });

  it("skipActive is false before any dismissals", () => {
    expect(skipActive(Date.now())).toBe(false);
  });

  it("skip window covers the whole next day then clears", () => {
    const now = new Date(2026, 6, 10, 9, 0).getTime();
    recordDismissal(now);
    recordDismissal(now);
    const nextDayMorning = new Date(2026, 6, 11, 8, 0).getTime();
    const lateNextDay = new Date(2026, 6, 11, 23, 0).getTime();
    const dayAfter = new Date(2026, 6, 12, 8, 0).getTime();
    expect(skipActive(nextDayMorning)).toBe(true);
    expect(skipActive(lateNextDay)).toBe(true);
    expect(skipActive(dayAfter)).toBe(false);
  });

  it("engagement clears an active skip", () => {
    recordDismissal();
    recordDismissal();
    recordEngagement();
    expect(skipActive(Date.now())).toBe(false);
  });
});

describe("notificationBudget — startOfDay helper", () => {
  it("returns midnight of the given date", () => {
    const d = new Date(2026, 6, 10, 14, 30, 12).getTime();
    const sod = startOfDay(d);
    const dt = new Date(sod);
    expect(dt.getHours()).toBe(0);
    expect(dt.getMinutes()).toBe(0);
    expect(dt.getDate()).toBe(10);
  });
});
