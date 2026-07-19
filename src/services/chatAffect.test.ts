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
