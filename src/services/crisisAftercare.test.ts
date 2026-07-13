/**
 * crisisAftercare.test.ts — RED before GREEN
 *
 * Validates the Stanley & Brown (2012) follow-up module with timestamps and
 * the 48-hour aftercare window.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordCrisisEvent,
  hasPendingAftercare,
  markAftercareDone,
  clearAftercareState,
  aftercareSummary,
  AFTERCARE_STEPS,
} from "./crisisAftercare";

/* secureLocal is backed by a simple global store in test env — we mock it. */
vi.mock("./secureLocal", () => {
  let store: Record<string, string> = {};
  return {
    secureLocal: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
    },
  };
});

describe("crisisAftercare", () => {
  beforeEach(() => {
    clearAftercareState();
    vi.useRealTimers();
  });

  /* ── Core state ─────────────────────────────────────── */

  it("returns false when no crisis has been recorded", () => {
    expect(hasPendingAftercare()).toBe(false);
  });

  it("detects pending aftercare after a crisis event", () => {
    recordCrisisEvent();
    expect(hasPendingAftercare()).toBe(true);
  });

  it("returns false when aftercare has been marked done", () => {
    recordCrisisEvent();
    markAftercareDone();
    expect(hasPendingAftercare()).toBe(false);
  });

  it("returns false when the 48-hour window has expired", () => {
    vi.useFakeTimers();
    recordCrisisEvent();
    // advance past 49 hours
    vi.advanceTimersByTime(49 * 3_600_000);
    expect(hasPendingAftercare()).toBe(false);
  });

  it("returns true at 47 hours (still within window)", () => {
    vi.useFakeTimers();
    recordCrisisEvent();
    vi.advanceTimersByTime(47 * 3_600_000);
    expect(hasPendingAftercare()).toBe(true);
  });

  it("is edge-case safe at exactly 48 hours (borderline)", () => {
    vi.useFakeTimers();
    recordCrisisEvent();
    vi.advanceTimersByTime(48 * 3_600_000);
    // 48h exactly — too close, count as expired (elapsed >= window)
    expect(hasPendingAftercare(48)).toBe(false);
  });

  /* ── Window override ─────────────────────────────────── */

  it("respects a custom window argument", () => {
    vi.useFakeTimers();
    recordCrisisEvent();
    vi.advanceTimersByTime(2 * 3_600_000); // 2h elapsed
    expect(hasPendingAftercare(72)).toBe(true);
    expect(hasPendingAftercare(1)).toBe(false);
  });

  /* ── Multiple events ─────────────────────────────────── */

  it("a new crisis resets the pending aftercare clock", () => {
    vi.useFakeTimers();
    recordCrisisEvent();
    vi.advanceTimersByTime(30 * 3_600_000); // 30h
    expect(hasPendingAftercare()).toBe(true);
    // new crisis resets the timer
    recordCrisisEvent();
    expect(hasPendingAftercare()).toBe(true);
    vi.advanceTimersByTime(30 * 3_600_000);
    expect(hasPendingAftercare()).toBe(true); // only 30h from new, not 60h from first
  });

  it("after a crisis, marking + new crisis re-opens the window", () => {
    recordCrisisEvent();
    markAftercareDone();
    expect(hasPendingAftercare()).toBe(false);
    // new crisis
    recordCrisisEvent();
    expect(hasPendingAftercare()).toBe(true);
  });

  /* ── Summary ─────────────────────────────────────────── */

  it("aftercareSummary returns null when no state exists", () => {
    expect(aftercareSummary()).toBeNull();
  });

  it("aftercareSummary reports completed status", () => {
    recordCrisisEvent();
    markAftercareDone();
    expect(aftercareSummary()).toBe("Aftercare completed");
  });

  it("aftercareSummary reports remaining hours when pending", () => {
    vi.useFakeTimers();
    recordCrisisEvent();
    vi.advanceTimersByTime(10 * 3_600_000); // 10h elapsed → 38h remaining
    expect(aftercareSummary()).toBe("Aftercare window: 38h remaining");
  });

  /* ── Protocol steps ──────────────────────────────────── */

  it("has all 4 aftercare steps defined", () => {
    expect(AFTERCARE_STEPS).toHaveLength(4);
    const ids = AFTERCARE_STEPS.map((s) => s.id);
    expect(ids).toEqual(["ac-1", "ac-2", "ac-3", "ac-4"]);
  });

  it("each step has a title and non-empty prompt", () => {
    for (const step of AFTERCARE_STEPS) {
      expect(step.title).toBeTruthy();
      expect(step.prompt.length).toBeGreaterThan(10);
    }
  });

  /* ── Idempotency ─────────────────────────────────────── */

  it("markAftercareDone is safe to call with no recorded event", () => {
    expect(() => markAftercareDone()).not.toThrow();
  });

  it("clearAftercareState is idempotent", () => {
    expect(() => clearAftercareState()).not.toThrow();
    expect(() => clearAftercareState()).not.toThrow();
    expect(hasPendingAftercare()).toBe(false);
  });

  /* ── Temporal sanity ─────────────────────────────────── */

  it("a crisis in the future (clock skew) does not show as pending", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T12:00:00Z"));
    recordCrisisEvent();
    // "travel back" before the crisis
    vi.setSystemTime(new Date("2026-07-09T12:00:00Z"));
    expect(hasPendingAftercare()).toBe(false);
  });
});
