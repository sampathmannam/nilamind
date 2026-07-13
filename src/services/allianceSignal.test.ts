/**
 * allianceSignal.test.ts — RED before GREEN
 *
 * Tests the passive therapeutic alliance proxy with deterministic behavioral
 * inputs (pure functions) and a mocked secureLocal for gatherInputs.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  computeBond,
  computeGoals,
  computeTasks,
  computeComposite,
  computeSnapshot,
  computeTrend,
  gatherInputs,
  refreshAlliance,
  loadAlliance,
  clearAllianceHistory,
} from "./allianceSignal";

const mockStore: Record<string, string> = {};

vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (key: string) => mockStore[key] ?? null,
    setItem: (key: string, val: string) => { mockStore[key] = val; },
    removeItem: (key: string) => { delete mockStore[key]; },
  },
}));

describe("allianceSignal", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  afterEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  /* ── Bond ────────────────────────────────────────────── */

  it("computeBond: minimum engagement returns ~0", () => {
    const s = computeBond({
      activeDays28: 0, checkins28: 0, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 0, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(s).toBeLessThan(5);
  });

  it("computeBond: perfect engagement returns 100", () => {
    const s = computeBond({
      activeDays28: 28, checkins28: 28, feedbackRatio28: 1,
      hasSafetyPlan: 1, protocolCompletions: 10, hasValues: 1,
      baDone28: 14, appOpenDays28: 28, thoughtRecordCount: 10, hasPact: 1,
    });
    expect(s).toBe(100);
  });

  it("computeBond: moderate engagement yields mid-range score", () => {
    const s = computeBond({
      activeDays28: 14, checkins28: 10, feedbackRatio28: 0.7,
      hasSafetyPlan: 1, protocolCompletions: 2, hasValues: 0,
      baDone28: 4, appOpenDays28: 14, thoughtRecordCount: 3, hasPact: 0,
    });
    expect(s).toBeGreaterThan(30);
    expect(s).toBeLessThan(80);
  });

  it("computeBond: handles NaN feedback ratio as 0", () => {
    const withFeedback = computeBond({
      activeDays28: 14, checkins28: 7, feedbackRatio28: 0.5,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    const withoutFeedback = computeBond({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(withFeedback).toBeGreaterThan(withoutFeedback);
  });

  /* ── Goals ───────────────────────────────────────────── */

  it("computeGoals: zero engagement returns 0", () => {
    const s = computeGoals({
      activeDays28: 0, checkins28: 0, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 0, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(s).toBe(0);
  });

  it("computeGoals: protocol completions contribute to score", () => {
    const noProtocols = computeGoals({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 1,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    const withProtocols = computeGoals({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 5, hasValues: 1,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(withProtocols).toBeGreaterThan(noProtocols);
  });

  it("computeGoals: values snapshot contributes", () => {
    const without = computeGoals({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 2, hasValues: 0,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    const withVal = computeGoals({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 2, hasValues: 1,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(withVal).toBeGreaterThanOrEqual(without + 20);
  });

  /* ── Tasks ───────────────────────────────────────────── */

  it("computeTasks: thought records contribute to score", () => {
    const none = computeTasks({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    const some = computeTasks({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 5, hasPact: 0,
    });
    expect(some).toBeGreaterThan(none);
  });

  it("computeTasks: BA activities contribute", () => {
    const none = computeTasks({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    const some = computeTasks({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 7, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(some).toBeGreaterThan(none);
  });

  /* ── Composite ───────────────────────────────────────── */

  it("computeComposite averages the three dimensions, maxing at 100", () => {
    const high = computeComposite({
      activeDays28: 28, checkins28: 28, feedbackRatio28: 1,
      hasSafetyPlan: 1, protocolCompletions: 10, hasValues: 1,
      baDone28: 14, appOpenDays28: 28, thoughtRecordCount: 10, hasPact: 1,
    });
    expect(high).toBe(100);

    const low = computeComposite({
      activeDays28: 2, checkins28: 1, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 2, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(low).toBeLessThan(20);
  });

  /* ── Snapshot ────────────────────────────────────────── */

  it("computeSnapshot returns a full AllianceSnapshot with all sub-scores", () => {
    const sn = computeSnapshot({
      activeDays28: 14, checkins28: 7, feedbackRatio28: 0.5,
      hasSafetyPlan: 1, protocolCompletions: 2, hasValues: 1,
      baDone28: 3, appOpenDays28: 14, thoughtRecordCount: 4, hasPact: 1,
    });
    expect(sn.composite).toBeGreaterThanOrEqual(0);
    expect(sn.composite).toBeLessThanOrEqual(100);
    expect(sn.bond).toBeGreaterThan(0);
    expect(sn.goals).toBeGreaterThan(0);
    expect(sn.tasks).toBeGreaterThan(0);
    expect(sn.computedAt).toBeTruthy();
  });

  /* ── Trend ───────────────────────────────────────────── */

  it("computeTrend returns insufficient_data with only one snapshot", () => {
    const sn = computeSnapshot({
      activeDays28: 14, checkins28: 7, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 14, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(computeTrend(sn, [sn])).toBe("insufficient_data");
  });

  it("computeTrend detects improvement (delta >= +5)", () => {
    const oldSn = computeSnapshot({
      activeDays28: 4, checkins28: 2, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 4, thoughtRecordCount: 0, hasPact: 0,
    });
    const oldWithPast = { ...oldSn, computedAt: new Date(Date.now() - 35 * 86_400_000).toISOString() };
    const newSn = computeSnapshot({
      activeDays28: 20, checkins28: 14, feedbackRatio28: 0.8,
      hasSafetyPlan: 1, protocolCompletions: 3, hasValues: 1,
      baDone28: 8, appOpenDays28: 20, thoughtRecordCount: 5, hasPact: 0,
    });
    expect(computeTrend(newSn, [oldWithPast, newSn])).toBe("improving");
  });

  it("computeTrend detects decline (delta <= -5)", () => {
    const oldSn = computeSnapshot({
      activeDays28: 20, checkins28: 14, feedbackRatio28: 0.8,
      hasSafetyPlan: 1, protocolCompletions: 3, hasValues: 1,
      baDone28: 8, appOpenDays28: 20, thoughtRecordCount: 5, hasPact: 0,
    });
    const oldWithPast = { ...oldSn, computedAt: new Date(Date.now() - 35 * 86_400_000).toISOString() };
    const newSn = computeSnapshot({
      activeDays28: 4, checkins28: 2, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 4, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(computeTrend(newSn, [oldWithPast, newSn])).toBe("declining");
  });

  it("computeTrend returns stable when delta is between -5 and +5", () => {
    const oldSn = computeSnapshot({
      activeDays28: 14, checkins28: 7, feedbackRatio28: 0.5,
      hasSafetyPlan: 0, protocolCompletions: 1, hasValues: 0,
      baDone28: 2, appOpenDays28: 14, thoughtRecordCount: 1, hasPact: 0,
    });
    const oldWithPast = { ...oldSn, computedAt: new Date(Date.now() - 35 * 86_400_000).toISOString() };
    const newSn = computeSnapshot({
      activeDays28: 15, checkins28: 8, feedbackRatio28: 0.5,
      hasSafetyPlan: 0, protocolCompletions: 1, hasValues: 0,
      baDone28: 3, appOpenDays28: 15, thoughtRecordCount: 1, hasPact: 0,
    });
    expect(computeTrend(newSn, [oldWithPast, newSn])).toBe("stable");
  });

  /* ── Edge cases ──────────────────────────────────────── */

  it("handles extremely high inputs without exceeding 100", () => {
    const s = computeComposite({
      activeDays28: 999, checkins28: 999, feedbackRatio28: 2,
      hasSafetyPlan: 1, protocolCompletions: 999, hasValues: 1,
      baDone28: 999, appOpenDays28: 999, thoughtRecordCount: 999, hasPact: 1,
    });
    expect(s).toBe(100);
  });

  it("handles zero inputs = composite of 0", () => {
    const s = computeSnapshot({
      activeDays28: 0, checkins28: 0, feedbackRatio28: NaN,
      hasSafetyPlan: 0, protocolCompletions: 0, hasValues: 0,
      baDone28: 0, appOpenDays28: 0, thoughtRecordCount: 0, hasPact: 0,
    });
    expect(s.composite).toBe(0);
  });

  /* ── gatherInputs ─────────────────────────────────────── */

  it("gatherInputs returns zeroes when no data stored", () => {
    const inputs = gatherInputs();
    expect(inputs.activeDays28).toBe(0);
    expect(inputs.checkins28).toBe(0);
    expect(inputs.feedbackRatio28).toBeNaN();
    expect(inputs.hasSafetyPlan).toBe(0);
    expect(inputs.protocolCompletions).toBe(0);
    expect(inputs.thoughtRecordCount).toBe(0);
    expect(inputs.hasPact).toBe(0);
  });

  it("gatherInputs reads stored data correctly", () => {
    const thirtyDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString().split("T")[0];
    mockStore["nilamind_app_opens"] = JSON.stringify({ days: [thirtyDaysAgo] });
    mockStore["nilamind_safetyplan"] = JSON.stringify({ steps: [] });
    mockStore["nilamind_protocol_completions"] = JSON.stringify([{ protocolId: "p1" }]);
    mockStore["nilamind_pact"] = JSON.stringify({ letter: "hi" });

    const inputs = gatherInputs();
    expect(inputs.hasSafetyPlan).toBe(1);
    expect(inputs.protocolCompletions).toBe(1);
    expect(inputs.hasPact).toBe(1);
  });

  it("gatherInputs tolerates corrupt JSON gracefully", () => {
    mockStore["nilamind_app_opens"] = "not-json";
    const inputs = gatherInputs();
    expect(inputs.activeDays28).toBe(0);
    expect(inputs.protocolCompletions).toBe(0);
  });

  /* ── refreshAlliance / loadAlliance ───────────────────── */
  it("refreshAlliance stores and returns a new snapshot", () => {
    const state = refreshAlliance();
    expect(state.current).not.toBeNull();
    expect(state.current!.composite).toBeGreaterThanOrEqual(0);
    expect(state.current!.composite).toBeLessThanOrEqual(100);

    const loaded = loadAlliance();
    expect(loaded.current!.composite).toBe(state.current!.composite);
  });

  it("loadAlliance returns null/insufficient when no data stored", () => {
    clearAllianceHistory();
    const state = loadAlliance();
    expect(state.current).toBeNull();
    expect(state.trend).toBe("insufficient_data");
  });
});
