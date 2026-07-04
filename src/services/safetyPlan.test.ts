import { describe, it, expect } from "vitest";
import { parseSafetyPlan } from "./safetyPlan";
import { INITIAL_SAFETY_PLAN } from "../data";

// The safety plan is read at the CRISIS moment (SafetyPlanScreen + CrisisOverlay). The old load did a raw
// JSON.parse with no validation, so a corrupt/non-object blob threw or produced a malformed plan → the user's
// plan silently presented as empty exactly when it matters. parseSafetyPlan never throws and recovers what it can.

describe("parseSafetyPlan (defensive crisis-time load)", () => {
  it("null/empty → the initial plan", () => {
    expect(parseSafetyPlan(null)).toEqual(INITIAL_SAFETY_PLAN);
    expect(parseSafetyPlan("")).toEqual(INITIAL_SAFETY_PLAN);
  });

  it("corrupt/truncated JSON → initial, never throws", () => {
    expect(() => parseSafetyPlan('{"warningSigns": "abc')).not.toThrow();
    expect(parseSafetyPlan('{"warningSigns": "abc')).toEqual(INITIAL_SAFETY_PLAN);
  });

  it("non-object JSON (array / number / null) → initial (no malformed plan)", () => {
    expect(parseSafetyPlan("[1,2,3]")).toEqual(INITIAL_SAFETY_PLAN);
    expect(parseSafetyPlan("42")).toEqual(INITIAL_SAFETY_PLAN);
    expect(parseSafetyPlan("null")).toEqual(INITIAL_SAFETY_PLAN);
  });

  it("preserves the user's real content and defaults missing fields (no all-or-nothing loss)", () => {
    const stored = JSON.stringify({ warningSigns: "when I stop eating", trustedPeople: "mum, Sam", junk: 99 });
    const p = parseSafetyPlan(stored);
    expect(p.warningSigns).toBe("when I stop eating"); // real field kept
    expect(p.trustedPeople).toBe("mum, Sam"); // real field kept
    expect(p.internalCoping).toBe(""); // missing field → default, not undefined
    // every field is a string (no undefined leaks into the crisis UI)
    for (const k of Object.keys(INITIAL_SAFETY_PLAN) as (keyof typeof INITIAL_SAFETY_PLAN)[]) {
      expect(typeof p[k]).toBe("string");
    }
  });

  it("ignores non-string field values (a number where text is expected)", () => {
    const p = parseSafetyPlan(JSON.stringify({ warningSigns: 123, internalCoping: "breathe" }));
    expect(p.warningSigns).toBe(""); // non-string rejected → default
    expect(p.internalCoping).toBe("breathe");
  });
});
