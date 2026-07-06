import { describe, it, expect } from "vitest";
import { offlineFallbackReply } from "./nilaReflect";

// Audit finding (2026-07-06): when the on-device model isn't ready (native cold load can take minutes, OOM,
// or web), every reply was ONE static robotic sentence ("model isn't ready yet — it may still be loading…").
// A large fraction of FIRST messages hit that wall. This routes the not-ready reply through the existing
// LLM-free reflector so Nila still *listens*, then notes the tools are here. §9 still gates the output.
describe("offlineFallbackReply — warm reflection when the on-device model isn't ready", () => {
  it("reflects instead of the static robotic sentence, and still points to the tools", () => {
    const r = offlineFallbackReply("i feel anxious and alone tonight");
    expect(r).not.toContain("model isn't ready yet");
    expect(r.toLowerCase()).toMatch(/tools|grounding|safety|here/);
    expect(r.length).toBeGreaterThan(30);
  });
  it("produces a non-empty warm line even for empty input", () => {
    expect(offlineFallbackReply("").length).toBeGreaterThan(15);
  });
});
