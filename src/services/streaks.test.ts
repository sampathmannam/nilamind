import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: vi.fn(),
}));

import { ymd, computeCompassionateStreak } from "./streaks";
import { DAY_MS } from "./storageUtils";

// checkin.ts / diary store the UTC calendar date: new Date().toISOString().split("T")[0].
const utcDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const setCheckins = (dates: string[]) =>
  store.set("nilamind_checkins", JSON.stringify(dates.map((d) => ({ date: d, mood: "okay", intensity: 3 }))));

describe("streaks — UTC day frame (audit #7)", () => {
  beforeEach(() => store.clear());

  it("ymd matches the UTC calendar date that checkin.ts persists", () => {
    // 20:30 UTC Jul 9 == 02:00 IST Jul 10 == 13:30 PDT Jul 9. Storage writes the UTC date ("2026-07-09"),
    // so ymd MUST use the same frame or a fresh check-in isn't credited.
    const inst = new Date("2026-07-09T20:30:00Z");
    expect(ymd(inst)).toBe(inst.toISOString().slice(0, 10));
    expect(ymd(inst)).toBe("2026-07-09");
  });

  it("credits a check-in stored 'today' in the storage frame", () => {
    const now = new Date();
    setCheckins([utcDay(now.getTime())]);
    const s = computeCompassionateStreak(now);
    expect(s.activeToday).toBe(true);
    expect(s.current).toBe(1);
  });
});

// audit #25: the compassionate-streak date math had no real test (its only consumer mocked it).
describe("computeCompassionateStreak — grace + freeze budget (audit #25)", () => {
  beforeEach(() => store.clear());
  const today = new Date("2026-06-15T12:00:00Z");

  it("today-grace: an unlogged today keeps yesterday's streak", () => {
    setCheckins([utcDay(today.getTime() - DAY_MS), utcDay(today.getTime() - 2 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.activeToday).toBe(false);
    expect(s.current).toBe(2);
    expect(s.daysSinceLast).toBe(1);
  });

  it("a single missed day is bridged by one freeze", () => {
    setCheckins([utcDay(today.getTime()), utcDay(today.getTime() - 2 * DAY_MS), utcDay(today.getTime() - 3 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.current).toBe(3);
    expect(s.freezesUsed).toBe(1);
  });

  it("3-day forgiving window: 2 missed days is NOT lapsed", () => {
    setCheckins([utcDay(today.getTime() - 2 * DAY_MS), utcDay(today.getTime() - 3 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.lapsed).toBe(false);
    expect(s.daysSinceLast).toBe(2);
  });

  it("3-day forgiving window: 3 missed days is NOT lapsed", () => {
    setCheckins([utcDay(today.getTime() - 3 * DAY_MS), utcDay(today.getTime() - 4 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.lapsed).toBe(false);
    expect(s.daysSinceLast).toBe(3);
  });

  it("3-day forgiving window: 4 missed days IS lapsed (welcome back)", () => {
    setCheckins([utcDay(today.getTime() - 4 * DAY_MS), utcDay(today.getTime() - 5 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.lapsed).toBe(true);
    expect(s.daysSinceLast).toBe(4);
  });
});
