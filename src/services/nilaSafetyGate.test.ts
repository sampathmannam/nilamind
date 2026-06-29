import { describe, it, expect, vi, beforeAll } from "vitest";
import { applyOutputSafety } from "./nilaSafetyGate";
import { getUnsafeFallbackReply } from "../safety";

beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
});

describe("applyOutputSafety (invariant #3)", () => {
  it("replaces an unsafe reply to crisis-adjacent input with the fallback", () => {
    // userText is a crisis phrase; reply that surfaces NO crisis resource is unsafe (safety Rule 1)
    const out = applyOutputSafety("just push through it", "I want to die", true);
    expect(out).toBe(getUnsafeFallbackReply());
  });
  it("passes a safe AI reply through unchanged", () => {
    const safe = "That sounds really heavy. I'm here with you.";
    expect(applyOutputSafety(safe, "I'm exhausted and low", true)).toBe(safe);
  });
  it("skips the scan for scripted offline fallback (reachedAI=false)", () => {
    // A non-AI fallback string would FAIL checkResponse for crisis input, but must NOT be replaced.
    const offline = "I can't reach Nila right now — your grounding tools still work.";
    expect(applyOutputSafety(offline, "I want to die", false)).toBe(offline);
  });
  it("a reply that DOES surface a crisis resource for crisis input is kept", () => {
    const withResource = "Please reach out to a person right now — call 988. You are not alone.";
    expect(applyOutputSafety(withResource, "I want to die", true)).toBe(withResource);
  });
});

describe("applyOutputSafety — fail closed", () => {
  it("returns the unsafe fallback when checkResponse throws (never surfaces raw model text)", async () => {
    vi.resetModules();
    vi.doMock("../safety", async () => {
      const actual = await vi.importActual<typeof import("../safety")>("../safety");
      return { ...actual, checkResponse: () => { throw new Error("boom"); } };
    });
    const { applyOutputSafety: gate } = await import("./nilaSafetyGate");
    const { getUnsafeFallbackReply: fallback } = await import("../safety");
    const out = gate("RAW MODEL TEXT that must not surface", "I feel low", true);
    expect(out).not.toContain("RAW MODEL TEXT");
    expect(out).toBe(fallback());
    vi.doUnmock("../safety");
    vi.resetModules();
  });
});
