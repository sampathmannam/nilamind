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
import { DAY_MS, localDateKey } from "./storageUtils";

// 2026-07-17 QA: the day-bucketing system was unified on the LOCAL calendar day (streaks.ts). checkin.ts /
// diary persist localDateKey(); `ymd` MUST use the same LOCAL frame or a fresh check-in isn't credited. We
// seed check-ins via `ymd` itself (the storage frame) so these tests stay correct in any timezone.
const dayOf = (t: number) => ymd(new Date(t));
const setCheckins = (dates: string[]) =>
  store.set("nilamind_checkins", JSON.stringify(dates.map((d) => ({ date: d, mood: "okay", intensity: 3 }))));

describe("streaks — local day frame (2026-07-17 unification; audit #7 predecessor)", () => {
  beforeEach(() => store.clear());

  it("ymd matches the LOCAL calendar date that checkin.ts persists", () => {
    // A late-night IST instant (02:00 IST Jul 10 = 20:30 UTC Jul 9) belongs to the LOCAL day Jul 10 —
    // the old UTC frame stamped it Jul 9, silently dropping the streak credit. ymd now agrees with storage.
    const inst = new Date("2026-07-09T20:30:00Z");
    expect(ymd(inst)).toBe(localDateKey(inst));
    if (new Date().getTimezoneOffset() === -330) expect(ymd(inst)).toBe("2026-07-10"); // IST-specific check
  });

  it("credits a check-in stored 'today' in the storage frame", () => {
    const now = new Date();
    setCheckins([dayOf(now.getTime())]);
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
    setCheckins([dayOf(today.getTime() - DAY_MS), dayOf(today.getTime() - 2 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.activeToday).toBe(false);
    expect(s.current).toBe(2);
    expect(s.daysSinceLast).toBe(1);
  });

  it("a single missed day is bridged by one freeze", () => {
    setCheckins([dayOf(today.getTime()), dayOf(today.getTime() - 2 * DAY_MS), dayOf(today.getTime() - 3 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.current).toBe(3);
    expect(s.freezesUsed).toBe(1);
  });

  it("3-day forgiving window: 2 missed days is NOT lapsed", () => {
    setCheckins([dayOf(today.getTime() - 2 * DAY_MS), dayOf(today.getTime() - 3 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.lapsed).toBe(false);
    expect(s.daysSinceLast).toBe(2);
  });

  it("3-day forgiving window: 3 missed days is NOT lapsed", () => {
    setCheckins([dayOf(today.getTime() - 3 * DAY_MS), dayOf(today.getTime() - 4 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.lapsed).toBe(false);
    expect(s.daysSinceLast).toBe(3);
  });

  it("3-day forgiving window: 4 missed days IS lapsed (welcome back)", () => {
    setCheckins([dayOf(today.getTime() - 4 * DAY_MS), dayOf(today.getTime() - 5 * DAY_MS)]);
    const s = computeCompassionateStreak(today);
    expect(s.lapsed).toBe(true);
    expect(s.daysSinceLast).toBe(4);
  });
});
