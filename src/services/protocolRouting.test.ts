import { describe, it, expect } from "vitest";
import { routeToProtocol } from "./protocols";

describe("sleep-pair routing precedence (stepped care, pinned deliberately)", () => {
  it("a generic sleep complaint routes to the brief on-ramp (sleep-wind-down), not the full program", () => {
    // "can't sleep" is a shared cue between both protocols — this MUST resolve to the shorter,
    // lower-friction protocol first. Inverting this is a deliberate product decision, not a
    // one-line fix — see docs/superpowers/specs/2026-07-19-guided-programs-redesign-design.md §5.
    const result = routeToProtocol("I can't sleep");
    expect(result?.id).toBe("sleep-wind-down");
  });

  it("cognitive-arousal sleep language routes directly to the fuller CBT-I program", () => {
    // "afraid to sleep" is an exclusive cbti-sleep cue (not shared with sleep-wind-down) — this
    // routing must be preserved, not collapsed into the wind-down protocol. (Note: "sleep anxiety"
    // is NOT a safe example here — "anxiety" alone is also a worry-postponement cue, and
    // worry-postponement precedes cbti-sleep in array order, so that phrase actually routes to
    // worry-postponement. Verified by direct execution before writing this test — don't swap the
    // input back to "sleep anxiety" without re-checking.)
    const result = routeToProtocol("I'm afraid to sleep");
    expect(result?.id).toBe("cbti-sleep");
  });
});
