import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import {
  noteChatAffect,
  todayAffectBucket,
  recentAffectDays,
  setAffectAccentPersistenceEnabled,
  computeConversationToneSummary,
} from "./chatAffect";
import { localDateKey } from "./storageUtils";

const KEY = "nilamind_chat_affect";

beforeEach(() => {
  store = {};
  setAffectAccentPersistenceEnabled(true); // tests exercise the read paths by default; the two "disabled" tests override this locally
});

afterEach(() => {
  setAffectAccentPersistenceEnabled(false); // restore the real default so it can't leak into other test files
});

describe("chatAffect — day-bucketed rolling affect history (Phase 2)", () => {
  it("writes nothing before any note", () => {
    expect(store[KEY]).toBeUndefined();
  });

  it("notes a reading into today's bucket, unmodified — the regression pin for 'stores the raw blended value, never render-damped' (Fable review)", () => {
    const now = Date.now();
    noteChatAffect({ valence: 0.4, arousal: -0.2 }, now);
    const stored = JSON.parse(store[KEY]);
    const today = localDateKey(new Date(now));
    expect(stored[today]).toEqual({ valence: 0.4, arousal: -0.2, count: 1 });
  });

  it("folds a second same-day reading into a running average", () => {
    const now = Date.now();
    noteChatAffect({ valence: 0.4, arousal: -0.2 }, now);
    noteChatAffect({ valence: -0.6, arousal: 0.6 }, now);
    const stored = JSON.parse(store[KEY]);
    const today = localDateKey(new Date(now));
    expect(stored[today].valence).toBeCloseTo(-0.1, 5);
    expect(stored[today].arousal).toBeCloseTo(0.2, 5);
    expect(stored[today].count).toBe(2);
  });

  it("a new local day creates a new bucket rather than continuing yesterday's average", () => {
    const day1 = new Date(2026, 6, 10).getTime();
    const day2 = new Date(2026, 6, 11).getTime();
    noteChatAffect({ valence: -0.9, arousal: 0.9 }, day1);
    noteChatAffect({ valence: 0.5, arousal: -0.5 }, day2);
    const stored = JSON.parse(store[KEY]);
    expect(stored["2026-07-10"]).toEqual({ valence: -0.9, arousal: 0.9, count: 1 });
    expect(stored["2026-07-11"]).toEqual({ valence: 0.5, arousal: -0.5, count: 1 });
  });

  it("prunes buckets older than 30 days on write", () => {
    const old = new Date(2026, 5, 1).getTime();
    const recent = new Date(2026, 6, 19).getTime();
    noteChatAffect({ valence: 0.1, arousal: 0.1 }, old);
    noteChatAffect({ valence: -0.1, arousal: -0.1 }, recent);
    const stored = JSON.parse(store[KEY]);
    expect(stored["2026-06-01"]).toBeUndefined();
    expect(stored["2026-07-19"]).toBeDefined();
  });

  it("defaults `now` to Date.now() when omitted", () => {
    noteChatAffect({ valence: 0.1, arousal: 0.1 });
    const stored = JSON.parse(store[KEY]);
    expect(stored[localDateKey()]).toBeDefined();
  });

  describe("todayAffectBucket", () => {
    it("returns null when there's no bucket for today", () => {
      expect(todayAffectBucket()).toBeNull();
    });

    it("returns today's bucket", () => {
      const now = Date.now();
      noteChatAffect({ valence: 0.3, arousal: 0.2 }, now);
      expect(todayAffectBucket(now)).toEqual({ valence: 0.3, arousal: 0.2, count: 1 });
    });

    it("returns null when persistence reads are disabled, even with data present", () => {
      const now = Date.now();
      noteChatAffect({ valence: 0.3, arousal: 0.2 }, now);
      setAffectAccentPersistenceEnabled(false);
      expect(todayAffectBucket(now)).toBeNull();
    });
  });

  describe("recentAffectDays", () => {
    it("returns [] when there's no history", () => {
      expect(recentAffectDays(7)).toEqual([]);
    });

    it("returns only days within the window, most recent first, sparse days omitted", () => {
      const d1 = new Date(2026, 6, 10).getTime();
      const d2 = new Date(2026, 6, 15).getTime();
      const d3 = new Date(2026, 6, 19).getTime();
      noteChatAffect({ valence: -0.9, arousal: 0.1 }, d1);
      noteChatAffect({ valence: 0.2, arousal: 0.1 }, d2);
      noteChatAffect({ valence: -0.2, arousal: 0.1 }, d3);
      const days = recentAffectDays(7, d3);
      expect(days.map((d) => d.date)).toEqual(["2026-07-19", "2026-07-15"]);
    });

    it("returns [] when persistence reads are disabled, even with data present", () => {
      noteChatAffect({ valence: 0.3, arousal: 0.2 });
      setAffectAccentPersistenceEnabled(false);
      expect(recentAffectDays(7)).toEqual([]);
    });
  });
});

function seedDay(now: number, offsetDays: number, valence: number, count: number) {
  const ts = now - offsetDays * 86400000;
  for (let i = 0; i < count; i++) noteChatAffect({ valence, arousal: 0 }, ts);
}

const VERB_TEMPLATE = /^Model estimate — \d+ days of conversation across the last \d+ days: (trended difficult|trended positive|was mostly difficult|was mostly positive|was mixed)\. This is an automatic tone estimate from the app's on-device model, not something the patient explicitly told the app, and it is not a clinically validated measure\. If this conflicts with other self-reported data in this summary, trust the self-reported data\.( \(Conversation-tone history is kept for 30 days, so this covers the most recent 30 only\.\))?$/;

describe("computeConversationToneSummary — closed-vocabulary clinician-report line", () => {
  it("returns null below the day-count floor (7-day window needs 3 days)", () => {
    const now = Date.now();
    seedDay(now, 0, -0.5, 4);
    seedDay(now, 1, -0.5, 4);
    expect(computeConversationToneSummary(7, now)).toBeNull();
  });

  it("returns null below the total-readings floor even when the day-count floor clears", () => {
    const now = Date.now();
    seedDay(now, 0, -0.5, 1);
    seedDay(now, 1, -0.5, 1);
    seedDay(now, 2, -0.5, 1); // 3 distinct days (clears the 7-day floorDays=3) but only 3 total readings (<10)
    expect(computeConversationToneSummary(7, now)).toBeNull();
  });

  it("floorDays scales with the capped window: 30-day period needs 9 days, not 3", () => {
    const now = Date.now();
    for (let d = 0; d < 8; d++) seedDay(now, d, -0.5, 2); // 8 days, 16 readings — clears totals, misses the 9-day floor for a 30-day window
    expect(computeConversationToneSummary(30, now)).toBeNull();
    seedDay(now, 8, -0.5, 2); // 9th day
    expect(computeConversationToneSummary(30, now)).not.toBeNull();
  });

  it("a genuinely worsening run of ≥5 days produces 'trended difficult'", () => {
    const now = Date.now();
    // chronological (oldest first): day4=-0.1, day3=-0.15, day2=-0.3, day1=-0.5, day0=-0.6
    seedDay(now, 4, -0.1, 2);
    seedDay(now, 3, -0.15, 2);
    seedDay(now, 2, -0.3, 2);
    seedDay(now, 1, -0.5, 2);
    seedDay(now, 0, -0.6, 2);
    const result = computeConversationToneSummary(7, now);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("trended difficult");
  });

  it("a FLAT run of uniformly negative days at the same day count produces level language, not a trend", () => {
    const now = Date.now();
    for (let d = 0; d < 5; d++) seedDay(now, d, -0.4, 2); // same valence every day — no direction
    const result = computeConversationToneSummary(7, now);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("was mostly difficult");
    expect(result!.text).not.toContain("trended");
  });

  it("fewer than 5 distinct days never uses trajectory language, even with a real difference between readings", () => {
    const now = Date.now();
    seedDay(now, 0, -0.6, 4);
    seedDay(now, 1, -0.6, 4);
    seedDay(now, 2, -0.1, 4); // 3 days / 12 total readings — clears both floors, but below TRAJECTORY_MIN_DAYS (5)
    const result = computeConversationToneSummary(7, now);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("was mostly difficult");
    expect(result!.text).not.toContain("trended");
  });

  it("'mixed' NEVER takes trajectory language, even when a real swing is detected", () => {
    const now = Date.now();
    // chronological: +0.8, +0.7, 0.0, -0.7, -0.8 — big swing, but averages to ~0 (mixed)
    seedDay(now, 4, 0.8, 2);
    seedDay(now, 3, 0.7, 2);
    seedDay(now, 2, 0.0, 2);
    seedDay(now, 1, -0.7, 2);
    seedDay(now, 0, -0.8, 2);
    const result = computeConversationToneSummary(7, now);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("was mixed");
    expect(result!.text).not.toMatch(/trended|stayed/);
  });

  it("includes the 30-day-cap disclosure only when periodDays > 30", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    expect(computeConversationToneSummary(30, now)!.text).not.toContain("kept for 30 days");
    expect(computeConversationToneSummary(90, now)!.text).toContain("kept for 30 days");
  });

  it("windowDays is capped at 30 regardless of periodDays", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    expect(computeConversationToneSummary(90, now)!.windowDays).toBe(30);
  });

  it("returns null when persistence reads are disabled, even with data present", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    setAffectAccentPersistenceEnabled(false);
    expect(computeConversationToneSummary(30, now)).toBeNull();
  });

  it("every non-null result matches the full closed template", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    const result = computeConversationToneSummary(90, now);
    expect(result).not.toBeNull();
    expect(result!.text).toMatch(VERB_TEMPLATE);
  });
});
