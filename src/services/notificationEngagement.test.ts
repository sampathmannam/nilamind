import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  }),
  DAY_MS: 86_400_000,
}));

import { recordNotificationOpen, getEngagement, optimalFireHour, optimalFireHourNow, hasEnoughEngagementData } from "./notificationEngagement";

beforeEach(() => { store = {}; });

const day = (offsetDays: number, hour: number): number => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

describe("notificationEngagement — P6.2 timing learner", () => {
  it("records and returns engagement timestamps", () => {
    recordNotificationOpen(day(0, 10));
    expect(getEngagement(30)).toEqual([day(0, 10)]);
  });

  it("optimalFireHour returns null with too few points", () => {
    const ts = [day(0, 9), day(1, 9), day(2, 9)];
    expect(optimalFireHour(ts)).toBeNull();
  });

  it("optimalFireHour returns null until 7 distinct days of signal", () => {
    // 6 distinct days, all at 9am
    const ts = [0, 1, 2, 3, 4, 5].map((i) => day(i, 9));
    expect(optimalFireHour(ts)).toBeNull();
  });

  it("picks the most-engaged hour after 7+ days", () => {
    const ts: number[] = [];
    // 7 days, mostly at 10am, a couple at 14
    for (let i = 0; i < 7; i++) ts.push(day(i, 10));
    ts.push(day(0, 14), day(1, 14));
    expect(optimalFireHour(ts)).toBe(10);
  });

  it("resolves ties to the earliest hour", () => {
    const ts: number[] = [];
    for (let i = 0; i < 8; i++) { ts.push(day(i, 7)); ts.push(day(i, 18)); }
    expect(optimalFireHour(ts)).toBe(7);
  });

  it("optimalFireHourNow + hasEnoughEngagementData read the store", () => {
    for (let i = 0; i < 7; i++) recordNotificationOpen(day(i, 8));
    expect(optimalFireHourNow()).toBe(8);
    expect(hasEnoughEngagementData()).toBe(true);
  });
});
