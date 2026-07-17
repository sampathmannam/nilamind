// 15-day time-travel simulation (2026-07-17 QA pass).
//
// Simulates a real user opening the app once a day for 15 consecutive days, INCLUDING several late-night
// (00:00–05:30 IST) sessions — the exact window the old UTC day-bucketing mis-stamped as "yesterday". It
// drives the REAL streaks + retention + assessment-cadence services through a fake clock and asserts the
// data surfaces stay correct across the whole span. This is the harness form of the on-device 15-day run
// (device inference is too slow to click through 15 days; the data surfaces below need no model).
//
// Why a test and not a device script: the surfaces that actually change over 15 days — streak count, active
// days, retention window, "due" cadence, day-key bucketing — are pure functions of the stored entries + the
// clock. Exercising them here is deterministic and covers the timezone edge the emulator can't easily hit.

import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: vi.fn(),
  SENSITIVE_KEYS: [] as string[],
}));

import { ymd, computeCompassionateStreak, computeStreak } from "./streaks";
import { dayKey, recordAppOpen, loadAppOpens, computeRetention } from "./retentionMetrics";
import { localDateKey } from "./storageUtils";

// A run of 15 consecutive LOCAL days. Each day's session is at a varied hour; days 3, 8 and 12 are late-night
// (01:30 / 00:45 / 02:15 local) — the entries the UTC frame would have mis-dated. Constructed with local Date
// components so "the local day" is unambiguous in any timezone the suite runs under.
const SESSION_HOURS = [9, 21, 1, 14, 8, 23, 18, 0, 12, 7, 20, 2, 16, 10, 22];
const START = { y: 2026, m: 5, d: 1 }; // 2026-06-01 (m is 0-based → June)
function sessionInstant(dayIdx: number): Date {
  return new Date(START.y, START.m, START.d + dayIdx, SESSION_HOURS[dayIdx], 30);
}
const seedCheckins = (days: string[]) =>
  store.set("nilamind_checkins", JSON.stringify(days.map((d) => ({ date: d, mood: "okay", intensity: 3 }))));

describe("15-day simulation — day bucketing, streaks, retention (2026-07-17 QA)", () => {
  beforeEach(() => store.clear());

  it("stamps each of 15 daily sessions on its own LOCAL calendar day (incl. 3 late-night ones)", () => {
    const keys = SESSION_HOURS.map((_, i) => dayKey(sessionInstant(i)));
    // 15 distinct day keys, strictly increasing, one per calendar day.
    expect(new Set(keys).size).toBe(15);
    for (let i = 1; i < keys.length; i++) expect(keys[i] > keys[i - 1]).toBe(true);
    // The late-night sessions (idx 2, 7, 11 → hours 1, 0, 2) land on their OWN day, not the previous one.
    expect(dayKey(sessionInstant(2))).toBe(localDateKey(new Date(2026, 5, 3, 1, 30)));
    expect(dayKey(sessionInstant(7))).toBe(localDateKey(new Date(2026, 5, 8, 0, 30)));
    expect(dayKey(sessionInstant(11))).toBe(localDateKey(new Date(2026, 5, 12, 2, 30)));
  });

  it("streak counts 15 unbroken days when viewed on the 15th day", () => {
    const days = SESSION_HOURS.map((_, i) => ymd(sessionInstant(i)));
    seedCheckins(days);
    const s = computeCompassionateStreak(sessionInstant(14)); // "today" = the 15th session
    expect(s.current).toBe(15);
    expect(s.activeToday).toBe(true);
    expect(s.longest).toBe(15);
    expect(s.daysSinceLast).toBe(0);
    expect(s.lapsed).toBe(false);
    expect(s.milestone).toBeNull(); // milestone fires only on the exact day reached; 15 isn't a milestone

    // Viewed one day earlier (the 14th session), the 14-day milestone fires.
    const day14 = computeCompassionateStreak(sessionInstant(13));
    expect(day14.current).toBe(14);
    expect(day14.milestone).toBe(14);
  });

  it("a single skipped day (day 6) is bridged by a freeze, not counted as a break", () => {
    const days = SESSION_HOURS.map((_, i) => ymd(sessionInstant(i))).filter((_, i) => i !== 5);
    seedCheckins(days);
    const s = computeCompassionateStreak(sessionInstant(14));
    expect(s.freezesUsed).toBe(1);       // the one gap is forgiven
    expect(s.current).toBe(14);          // 15 days minus the skipped one
    expect(s.lapsed).toBe(false);
  });

  it("retention log accumulates exactly 15 distinct local days and reports 15-day span", () => {
    for (let i = 0; i < 15; i++) recordAppOpen(sessionInstant(i));
    // Idempotent re-opens on a couple of the same local days shouldn't inflate the count.
    recordAppOpen(new Date(2026, 5, 3, 23, 0)); // another open on day 3
    recordAppOpen(new Date(2026, 5, 8, 6, 0));  // another open on day 8
    const opens = loadAppOpens();
    expect(opens.length).toBe(15);
    const r = computeRetention(sessionInstant(14));
    expect(r.totalActiveDays).toBe(15);
    expect(r.spanDays).toBe(14);        // first open → last open = 14 whole days
    expect(r.retainedDay14).toBe(true); // still opening 14 days after first use
    expect(r.currentGapDays).toBe(0);
  });

  it("computeStreak (base) and daysSinceLast track a lapse after the 15-day run", () => {
    const days = SESSION_HOURS.map((_, i) => ymd(sessionInstant(i)));
    seedCheckins(days);
    // Look 4 days after the last session — beyond the 3-day forgiving window.
    const later = new Date(2026, 5, START.d + 18, 12, 0);
    const s = computeCompassionateStreak(later);
    expect(s.lapsed).toBe(true);
    expect(s.daysSinceLast).toBe(4);
    // The historical longest run is still credited.
    expect(computeStreak().longest).toBe(15);
  });
});
