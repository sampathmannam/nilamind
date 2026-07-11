import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  dayKey,
  loadAppOpens,
  recordAppOpen,
  computeRetention,
} from "./retentionMetrics";

// Retention is encrypted at rest — the service reads/writes via secureLocal, and computeRetention reads the
// identity through the (real) loadIdentity, which itself reads secureLocal. So mock ONLY secureLocal (a Map)
// and drive the identity by seeding the "nilamind_identity" key when a test needs a createdAt anchor.
const store = new Map<string, string>();
// computeRetention -> loadIdentity -> identity.ts, which imports SENSITIVE_KEYS + flush from secureLocal
// (SENSITIVE_KEYS is spread at module load), so the mock must provide them too, not just `secureLocal`.
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [],
  flush: () => {},
}));

const OPENS_KEY = "nilamind_app_opens";
const IDENTITY_KEY = "nilamind_identity";
const at = (iso: string) => new Date(iso); // e.g. at("2026-07-11T09:00:00Z")
const seedOpens = (...days: string[]) => store.set(OPENS_KEY, JSON.stringify({ days }));
const seedCreatedAt = (iso: string) =>
  store.set(IDENTITY_KEY, JSON.stringify({ userId: "ma_x", mnemonic: "x", createdAt: iso }));

beforeEach(() => store.clear());

describe("dayKey", () => {
  it("buckets to a UTC YYYY-MM-DD day", () => {
    expect(dayKey(at("2026-07-11T23:59:00Z"))).toBe("2026-07-11");
    expect(dayKey(at("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
});

describe("loadAppOpens", () => {
  it("returns [] when nothing stored", () => {
    expect(loadAppOpens()).toEqual([]);
  });
  it("returns [] on corrupt storage", () => {
    store.set(OPENS_KEY, "{not json");
    expect(loadAppOpens()).toEqual([]);
  });
  it("parses, de-dupes, sorts, and drops malformed day strings", () => {
    store.set(OPENS_KEY, JSON.stringify({ days: ["2026-07-02", "2026-07-01", "2026-07-02", "nope", 7] }));
    expect(loadAppOpens()).toEqual(["2026-07-01", "2026-07-02"]);
  });
  it("tolerates a legacy bare-array shape", () => {
    store.set(OPENS_KEY, JSON.stringify(["2026-07-01", "2026-07-01"]));
    expect(loadAppOpens()).toEqual(["2026-07-01"]);
  });
});

describe("recordAppOpen", () => {
  it("records today's day", () => {
    recordAppOpen(at("2026-07-11T10:00:00Z"));
    expect(loadAppOpens()).toEqual(["2026-07-11"]);
  });
  it("is idempotent within the same calendar day (safe under StrictMode double-invoke)", () => {
    recordAppOpen(at("2026-07-11T08:00:00Z"));
    recordAppOpen(at("2026-07-11T20:00:00Z"));
    expect(loadAppOpens()).toEqual(["2026-07-11"]);
  });
  it("accumulates distinct days and keeps them sorted", () => {
    recordAppOpen(at("2026-07-11T10:00:00Z"));
    recordAppOpen(at("2026-07-09T10:00:00Z"));
    recordAppOpen(at("2026-07-10T10:00:00Z"));
    expect(loadAppOpens()).toEqual(["2026-07-09", "2026-07-10", "2026-07-11"]);
  });
  it("never throws when the store write fails", () => {
    const spy = vi.spyOn(store, "set").mockImplementationOnce(() => { throw new Error("quota"); });
    expect(() => recordAppOpen(at("2026-07-11T10:00:00Z"))).not.toThrow();
    spy.mockRestore();
  });
});

describe("computeRetention", () => {
  it("returns a zeroed summary when there is no history and no identity", () => {
    const r = computeRetention(at("2026-07-11T10:00:00Z"));
    expect(r.firstUseDay).toBeNull();
    expect(r.lastOpenDay).toBeNull();
    expect(r.totalActiveDays).toBe(0);
    expect(r.daysSinceFirstUse).toBe(0);
    expect(r.retainedDay1).toBe(false);
    expect(r.retainedDay30).toBe(false);
  });

  it("computes the full summary from an open history", () => {
    seedOpens("2026-06-01", "2026-06-02", "2026-06-08", "2026-07-01");
    const r = computeRetention(at("2026-07-11T10:00:00Z"));
    expect(r.firstUseDay).toBe("2026-06-01");
    expect(r.lastOpenDay).toBe("2026-07-01");
    expect(r.totalActiveDays).toBe(4);
    expect(r.daysSinceFirstUse).toBe(40); // 06-01 -> 07-11
    expect(r.spanDays).toBe(30); // 06-01 -> 07-01
    expect(r.currentGapDays).toBe(10); // 07-01 -> 07-11
    expect(r.longestGapDays).toBe(23); // 06-08 -> 07-01
    expect(r.activeDaysLast7).toBe(0); // nothing in the last 7 days
    expect(r.activeDaysLast30).toBe(1); // only 07-01 is within 30 days of 07-11
    expect(r.retainedDay1).toBe(true);
    expect(r.retainedDay7).toBe(true);
    expect(r.retainedDay14).toBe(true);
    expect(r.retainedDay30).toBe(true); // span is exactly 30
  });

  it("anchors first-use to identity.createdAt when it predates the earliest open", () => {
    seedCreatedAt("2026-05-20T12:00:00.000Z");
    seedOpens("2026-06-01", "2026-06-02");
    const r = computeRetention(at("2026-06-10T10:00:00Z"));
    expect(r.firstUseDay).toBe("2026-05-20");
    expect(r.daysSinceFirstUse).toBe(21); // 05-20 -> 06-10
  });

  it("uses the earliest open when it predates a (restored) later createdAt", () => {
    seedCreatedAt("2026-07-05T00:00:00.000Z"); // e.g. identity restored after the fact
    seedOpens("2026-06-25", "2026-07-06");
    const r = computeRetention(at("2026-07-06T10:00:00Z"));
    expect(r.firstUseDay).toBe("2026-06-25");
  });

  it("does NOT count an old account with a single open as retained (returns, not account age)", () => {
    // Existing user (identity created long ago) who installs this build and opens the app exactly once.
    seedCreatedAt("2026-01-01T00:00:00.000Z");
    seedOpens("2026-07-01");
    const r = computeRetention(at("2026-07-11T10:00:00Z"));
    expect(r.totalActiveDays).toBe(1);
    expect(r.spanDays).toBe(0); // one open -> zero return span, regardless of account age
    expect(r.retainedDay1).toBe(false);
    expect(r.retainedDay7).toBe(false);
    expect(r.retainedDay14).toBe(false);
    expect(r.retainedDay30).toBe(false);
    expect(r.daysSinceFirstUse).toBe(191); // account AGE is still anchored to createdAt (01-01 -> 07-11)
  });

  it("treats a single-day user as not day-1 retained", () => {
    seedOpens("2026-07-11");
    const r = computeRetention(at("2026-07-11T10:00:00Z"));
    expect(r.totalActiveDays).toBe(1);
    expect(r.spanDays).toBe(0);
    expect(r.currentGapDays).toBe(0);
    expect(r.longestGapDays).toBe(0);
    expect(r.retainedDay1).toBe(false);
  });

  it("counts trailing-window activity including today", () => {
    seedOpens("2026-07-05", "2026-07-10", "2026-07-11");
    const r = computeRetention(at("2026-07-11T10:00:00Z"));
    expect(r.activeDaysLast7).toBe(3); // 07-05 (6d ago), 07-10, 07-11 all within 7
    expect(r.currentGapDays).toBe(0);
  });
});
