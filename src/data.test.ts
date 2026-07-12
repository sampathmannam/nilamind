import { describe, it, expect } from "vitest";
import { GROUNDING_EXERCISES } from "./data";

describe("GROUNDING_EXERCISES — 5-4-3-2-1 citation honesty", () => {
  it("does not attribute the 5-4-3-2-1 technique to a fabricated/unverified Segal et al. 2002 citation", () => {
    const entry = GROUNDING_EXERCISES.find((e) => e.title === "5-4-3-2-1 Senses");
    expect(entry).toBeTruthy();
    expect(entry!.steps).not.toMatch(/Segal/);
    // Honestly framed as a widely-used practice, not a claimed evidence-backed protocol.
    expect(entry!.steps.toLowerCase()).toMatch(/widely[- ]used/);
  });
});
