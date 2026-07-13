import { describe, it, expect } from "vitest";
import { trajectoryContextBlock, inflectionContextBlock, antiSycophancyContextBlock, wellbeingContextBlock } from "./nilaContext";
import type { SleepSignal } from "./healthConnect";
import type { InflectionSignal } from "./nilaInflection";
import type { AssessmentEntry } from "./assessments";

// Audit finding (2026-07-06): the short-sleep manic-prodrome signal — the earliest warning a MANIC-FIRST app
// has — reached the user on ZERO surfaces, and the chat never saw it. This block feeds that signal into
// buildPersonalContext so Nila can gently reference it (sense→ask→confirm; never an alarm).
describe("trajectoryContextBlock — surfaces the short-sleep manic-prodrome signal to Nila", () => {
  it("returns '' when there is no signal or it isn't firing", () => {
    expect(trajectoryContextBlock(null)).toBe("");
    const notFiring: SleepSignal = { firing: false, nightsBelow: 0, baselineHours: 7.5, detail: "" };
    expect(trajectoryContextBlock(notFiring)).toBe("");
  });

  it("surfaces a firing short-sleep run as a gentle, manic-first heads-up (not an alarm)", () => {
    const firing: SleepSignal = { firing: true, nightsBelow: 3, baselineHours: 7.5, detail: "3 nights below ~7.5h" };
    const block = trajectoryContextBlock(firing);
    expect(block).toContain("3");                              // the count of short nights
    expect(block.toLowerCase()).toContain("sleep");
    expect(block.toLowerCase()).toContain("rest");             // prompt-to-ask about rest
    expect(block.toLowerCase()).toMatch(/wired|elevated|racing|speeding|too fast/); // manic-first link
  });
});

// Audit finding (2026-07-06): a detected trajectory SHIFT (nilaInflection) surfaced only as a UI opener bubble
// and never reached the model, so the reply that followed had no idea a deterioration was flagged. This block
// makes the shift part of Nila's awareness (held gently; gated on the user's inflection preference at the call
// site so it respects their explicit opt-in).
describe("inflectionContextBlock — feeds a detected trajectory shift into Nila's awareness", () => {
  const sig = (direction: "deterioration" | "improvement", detail: string): InflectionSignal => ({
    id: "x", kind: "mood_trend", direction, metric: "mood", detail, opener: "", basis: "", date: "2026-07-06", dataPoints: 8,
  });
  it("returns '' when there is no signal", () => {
    expect(inflectionContextBlock(null)).toBe("");
  });
  it("surfaces a deterioration shift gently (never lead-with-it / quote-as-fact)", () => {
    const b = inflectionContextBlock(sig("deterioration", "mood trending harder this week"));
    expect(b.toLowerCase()).toMatch(/shift|downward|trend|harder/);
    expect(b.toLowerCase()).toContain("gently");
  });
  it("surfaces an improvement shift warmly without making them perform being okay", () => {
    const b = inflectionContextBlock(sig("improvement", "mood easing over the past week"));
    expect(b.toLowerCase()).toMatch(/eas|lighter|better|improv|up/);
  });
});

describe("wellbeingContextBlock — longitudinal WHO-5 trend (Phase 17)", () => {
  const who5 = (date: string, total: number): AssessmentEntry => ({
    id: "w_" + date, date, timestamp: "10:00:00", instrument: "WHO-5", responses: [], total, severity: "Good wellbeing", safetyFlag: false,
  });
  it("returns '' when there is no WHO-5 history", () => {
    expect(wellbeingContextBlock([])).toBe("");
  });
  it("surfaces an improving trend as a gentle, wellness-framed pattern (never a diagnosis)", () => {
    const h = [who5("2026-01-01", 40), who5("2026-01-15", 70), who5("2026-02-01", 88)];
    const b = wellbeingContextBlock(h);
    expect(b).toContain("wellbeing");
    expect(b.toLowerCase()).toContain("improving");
    expect(b).not.toMatch(/diagnos|disorder|clinical/i);
  });
  it("notes when the fortnightly check is due", () => {
    const h = [who5("2026-01-01", 60), who5("2026-01-15", 65)];
    const b = wellbeingContextBlock(h); // today is well past 14 days
    expect(b.toLowerCase()).toContain("due");
  });
});

describe("antiSycophancyContextBlock — depressive distortions (2026-07-12)", () => {
  it("names harsh self-belief non-collusion, not just mania themes", () => {
    const block = antiSycophancyContextBlock();
    expect(block).toMatch(/failure|worthless/i);
    expect(block).toMatch(/everyone hates/i);
  });
});
