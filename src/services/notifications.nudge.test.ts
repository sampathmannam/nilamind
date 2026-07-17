import { describe, it, expect } from "vitest";
import { chooseNudge, WARM_NUDGES, ELEVATION_NUDGES, DISENGAGEMENT_NUDGES } from "./notifications";

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

  it("welcomes back gently after a lapse — zero guilt", () => {
    const n = chooseNudge({ dayIndex: 2, lapsed: true });
    expect(n.toLowerCase()).toMatch(/welcome back|pick up|here|no pressure/);
    expect(n.toLowerCase()).not.toMatch(/streak|broken|lost/);
  });

  it("celebrates a streak milestone without comparison or pressure", () => {
    const n = chooseNudge({ dayIndex: 2, streak: 7, milestone: 7 });
    expect(n.toLowerCase()).toMatch(/7|seven/);
    expect(n.toLowerCase()).toMatch(/showing up|matters|celebrate|well done/);
    expect(n.toLowerCase()).not.toMatch(/keep it up|don't break/);
  });

  it("encourages continuing an active streak warmly", () => {
    const n = chooseNudge({ dayIndex: 2, streak: 4, activeToday: true });
    expect(n.toLowerCase()).toMatch(/streak|days|showing up|counts/);
  });
});

describe("chooseNudge — elevation branch reachability (W1, 2026-07-17 QA)", () => {
  it("surfaces the elevation nudge when elevationSignal is set", () => {
    const n = chooseNudge({ dayIndex: 0, elevationSignal: true });
    expect(ELEVATION_NUDGES).toContain(n);
  });
  it("ranks sleep-prodrome and deterioration ABOVE elevation", () => {
    expect(ELEVATION_NUDGES).not.toContain(chooseNudge({ dayIndex: 0, sleepFiring: true, elevationSignal: true }));
    expect(ELEVATION_NUDGES).not.toContain(chooseNudge({ dayIndex: 0, inflection: "deterioration", elevationSignal: true }));
  });
  it("ranks elevation ABOVE lapse/streak/medication", () => {
    const n = chooseNudge({ dayIndex: 0, elevationSignal: true, lapsed: true, streak: 9, activeToday: true, medicationMissed: true });
    expect(ELEVATION_NUDGES).toContain(n);
  });
});
