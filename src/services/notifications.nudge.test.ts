import { describe, it, expect } from "vitest";
import { chooseNudge, WARM_NUDGES } from "./notifications";

// Audit finding (2026-07-06): the daily nudge was a static day-rotation blind to every signal. This adapts it
// GENTLY — JITAI research says mistimed/irrelevant prompts backfire, and a notification must never state the
// data or alarm. So: sleep-prodrome first (manic-first), then a flagged downward trend, else the warm rotation.
describe("chooseNudge — gently adapts the daily nudge to current signals (soft, dataless)", () => {
  it("falls back to a warm generic nudge when nothing is firing", () => {
    expect(WARM_NUDGES).toContain(chooseNudge({ dayIndex: 2 }));
  });
  it("uses a rest-oriented nudge when short sleep is firing — and never states the data (no digits)", () => {
    const n = chooseNudge({ dayIndex: 0, sleepFiring: true });
    expect(n.toLowerCase()).toMatch(/rest|sleep|wind down/);
    expect(n).not.toMatch(/[0-9]/);
  });
  it("uses a warmer check-in when a deterioration shift is flagged", () => {
    const n = chooseNudge({ dayIndex: 0, inflection: "deterioration" });
    expect(n.toLowerCase()).toMatch(/thinking of you|checking in|here for you|land/);
  });
  it("prioritizes the sleep prodrome (manic-first) over an inflection shift", () => {
    const n = chooseNudge({ dayIndex: 1, sleepFiring: true, inflection: "deterioration" });
    expect(n.toLowerCase()).toMatch(/rest|sleep|wind down/);
  });
});
