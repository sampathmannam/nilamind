import { describe, it, expect } from "vitest";
import { trajectoryContextBlock } from "./nilaContext";
import type { SleepSignal } from "./healthConnect";

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
