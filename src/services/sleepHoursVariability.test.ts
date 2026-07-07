/**
 * Sleep regularity signal (C1 — circadian polish).
 *
 * Detects high sleep-hours variability as a proxy for circadian disruption.
 * A bipolar-first app needs this: irregular sleep timing is a prodrome signal
 * even when total hours appear adequate. Soft-signal nudge only — never an alarm.
 */
import { describe, it, expect } from "vitest";
import { sleepHoursVariability, variabilityContextBlock } from "./sleepHoursVariability";
import type { SleepNight } from "./healthConnect";

function night(date: string, hours: number): SleepNight {
  return { date, hours };
}

/** 14 nights of stable 7.5h sleep. */
const stableNights: SleepNight[] = Array.from({ length: 14 }, (_, i) =>
  night(`2026-07-${String(i + 1).padStart(2, "0")}`, 7.5),
);

/** 14 nights with erratic sleep hours. */
const erraticNights: SleepNight[] = [
  night("2026-07-01", 5), night("2026-07-02", 9), night("2026-07-03", 4),
  night("2026-07-04", 8), night("2026-07-05", 6), night("2026-07-06", 10),
  night("2026-07-07", 7), night("2026-07-08", 3), night("2026-07-09", 9),
  night("2026-07-10", 5), night("2026-07-11", 8), night("2026-07-12", 4),
  night("2026-07-13", 9), night("2026-07-14", 6),
];

describe("sleepHoursVariability", () => {
  it("returns null with fewer than 7 nights (cold-start)", () => {
    const few = stableNights.slice(0, 5);
    expect(sleepHoursVariability(few)).toBeNull();
  });

  it("returns firing=false (not null) with exactly 7 nights of stable data", () => {
    const sig = sleepHoursVariability(stableNights.slice(0, 7));
    expect(sig).not.toBeNull();
    expect(sig!.firing).toBe(false);
  });

  it("returns firing=false for stable sleep (low std dev)", () => {
    const sig = sleepHoursVariability(stableNights);
    expect(sig).not.toBeNull();
    expect(sig!.firing).toBe(false);
  });

  it("returns firing=true for erratic sleep (high std dev)", () => {
    const sig = sleepHoursVariability(erraticNights);
    expect(sig).not.toBeNull();
    expect(sig!.firing).toBe(true);
  });

  it("reports stdDev, mean, and detail when firing", () => {
    const sig = sleepHoursVariability(erraticNights)!;
    expect(sig.stdDev).toBeGreaterThan(1.5); // significantly variable
    expect(sig.mean).toBeGreaterThan(0);
    expect(sig.detail.length).toBeGreaterThan(0);
  });

  it("returns firing=false for one off-night in otherwise stable pattern", () => {
    const oneOff = [...stableNights.slice(0, 13), night("2026-07-14", 4)];
    const sig = sleepHoursVariability(oneOff);
    expect(sig).not.toBeNull();
    expect(sig!.firing).toBe(false); // one off-night shouldn't fire
  });
});

describe("variabilityContextBlock", () => {
  const firingSig = { firing: true, stdDev: 2.3, mean: 6.8, detail: "variability 2.3h" };
  const nonFiringSig = { firing: false, stdDev: 0.5, mean: 7.5, detail: "stable" };

  it("returns empty string when signal is not firing", () => {
    expect(variabilityContextBlock(nonFiringSig)).toBe("");
  });

  it("returns empty string for null signal", () => {
    expect(variabilityContextBlock(null)).toBe("");
  });

  it("returns a gentle context block when firing", () => {
    const block = variabilityContextBlock(firingSig);
    expect(block.length).toBeGreaterThan(0);
    // Never alarming
    expect(block.toLowerCase()).not.toMatch(/must\b|should\b|need to\b|warning\b|danger\b|alarm\b/);
    // Mentions sleep
    expect(block).toMatch(/sleep/i);
  });

  it("never recommends sleep restriction", () => {
    const block = variabilityContextBlock(firingSig);
    expect(block.toLowerCase()).not.toMatch(/restrict|sleep less|cut.*sleep|reduce.*sleep|limit.*sleep/);
  });
});
