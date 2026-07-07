import { describe, it, expect } from "vitest";
import { trajectoryContextBlock, inflectionContextBlock } from "./nilaContext";
import type { SleepSignal } from "./healthConnect";
import type { InflectionSignal } from "./nilaInflection";

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
