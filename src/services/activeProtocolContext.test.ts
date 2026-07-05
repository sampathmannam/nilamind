import { describe, it, expect, afterEach } from "vitest";
import { activeProtocolContextBlock } from "./nilaContext";
import { buildNilaSystem } from "./nila";
import { startProtocol, advanceProtocol, abandonProtocol } from "./protocolProgress";

// Phase 1 — make the in-progress structured program part of Nila's CONTEXT, so a FREE-TEXT message DURING a
// program (not just a "Continue" card tap) gets a program-aware reply instead of a generic one. The grounding is
// deterministic + vetted (reads getActiveProgress) — no model, so it can never hallucinate the program's shape.
// Safety is untouched: §9 + the output gates still wrap every turn regardless of this context.
describe("activeProtocolContextBlock — Nila holds the in-progress program in mind", () => {
  afterEach(() => abandonProtocol()); // keep shared module state clean for other suites

  it("is empty when no program is active (never invents one)", () => {
    abandonProtocol();
    expect(activeProtocolContextBlock()).toBe("");
  });

  it("grounds Nila in the active program + current step, and says not to restart it", () => {
    startProtocol("worry-postponement");
    const b = activeProtocolContextBlock();
    expect(b).toContain("Worry Postponement");
    expect(b).toContain("step 1 of 5");
    expect(b.toLowerCase()).toContain("don't restart"); // must meet them where they are, not begin from scratch
  });

  it("tracks the step (number + focus) as the program advances", () => {
    startProtocol("worry-postponement");
    advanceProtocol(); // -> step 2 (wp-2)
    const b = activeProtocolContextBlock();
    expect(b).toContain("step 2 of 5");
    expect(b).toContain("Set a worry period"); // wp-2 title, so Nila knows what THIS step is about
  });

  it("returns to empty once the program is abandoned / complete", () => {
    startProtocol("self-compassion");
    abandonProtocol();
    expect(activeProtocolContextBlock()).toBe("");
  });
});

// The point of the block is only realised once it's in Nila's actual prompt — so a mid-program free-text turn
// is answered with the program in mind, not generically.
describe("buildNilaSystem — the active program reaches Nila's prompt", () => {
  afterEach(() => abandonProtocol());

  it("includes the program grounding when one is active", () => {
    startProtocol("behavioral-activation");
    const sys = buildNilaSystem("i tried but it was really hard today");
    expect(sys).toContain("A PROGRAM YOU'RE PARTWAY THROUGH TOGETHER");
    expect(sys).toContain("Behavioral Activation");
  });

  it("omits the program grounding when none is active", () => {
    abandonProtocol();
    const sys = buildNilaSystem("hello");
    expect(sys).not.toContain("A PROGRAM YOU'RE PARTWAY THROUGH TOGETHER");
  });
});
