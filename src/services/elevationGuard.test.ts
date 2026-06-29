import { describe, it, expect } from "vitest";
import { detectElevationRisk, elevationGuardNote, elevationOutputNote } from "./elevationGuard";

describe("detectElevationRisk — high-precision mania-risk detection", () => {
  it("none for ordinary, distressed, or empty text", () => {
    for (const t of ["i feel really low today", "work was stressful", "i had a good day", ""]) {
      expect(detectElevationRisk(t).level).toBe("none");
    }
  });

  it("HIGH for stopping psychiatric meds (the most dangerous marker)", () => {
    for (const t of ["I'm going to stop taking my meds", "i flushed my pills", "i don't need my meds anymore"]) {
      expect(detectElevationRisk(t).level).toBe("high");
    }
  });

  it("elevated for sleep-dismissal / impulsive spending / grandiosity", () => {
    expect(detectElevationRisk("honestly I don't need sleep anymore").level).toBe("elevated");
    expect(detectElevationRisk("went on a spending spree today").level).toBe("elevated");
    expect(detectElevationRisk("I've figured it all out, I'm unstoppable").level).toBe("elevated");
  });

  it("does NOT fire on insomnia — 'haven't slept' ≠ 'don't need sleep'", () => {
    expect(detectElevationRisk("i haven't slept well in days, i'm exhausted").level).toBe("none");
  });
});

describe("guard notes", () => {
  it("system steer only when elevated/high", () => {
    expect(elevationGuardNote("none")).toBe("");
    expect(elevationGuardNote("elevated")).toContain("POSSIBLE ELEVATION");
    expect(elevationGuardNote("high")).toContain("POSSIBLE ELEVATION");
  });
  it("scripted meds-output line only for high", () => {
    expect(elevationOutputNote("none")).toBe("");
    expect(elevationOutputNote("elevated")).toBe("");
    expect(elevationOutputNote("high")).toContain("your doctor");
  });
});
