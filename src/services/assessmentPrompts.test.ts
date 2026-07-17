import { describe, it, expect, vi } from "vitest";

// emaElevationSignal returns the string enum "none" | "elevated" | "high" — "none" is truthy,
// so a bare `if (elevation)` check made the "energy has been rising" ASRM card show for EVERY
// user, including fresh installs with zero data (2026-07-17 tester pass, reproduced in browser).
vi.mock("./ema", () => ({ emaElevationSignal: vi.fn(() => "none") }));
vi.mock("./assessments", () => ({
  loadAssessments: () => [],
  latestFor: () => null,
  daysSince: () => null,
}));
vi.mock("./nilaInflection", () => ({ topFireableSignal: () => null }));
vi.mock("./sleepInsight", () => ({ selfReportSleepSignal: () => null }));

import { checkAssessmentPrompts } from "./assessmentPrompts";
import { emaElevationSignal } from "./ema";

describe("checkAssessmentPrompts elevation gating", () => {
  it("does NOT suggest an ASRM when the elevation signal is 'none'", () => {
    vi.mocked(emaElevationSignal).mockReturnValue("none");
    const prompts = checkAssessmentPrompts();
    expect(prompts.find((p) => p.instrument === "ASRM")).toBeUndefined();
  });

  it("suggests an ASRM when the elevation signal is 'elevated'", () => {
    vi.mocked(emaElevationSignal).mockReturnValue("elevated");
    const prompts = checkAssessmentPrompts();
    expect(prompts.find((p) => p.instrument === "ASRM")).toBeDefined();
  });
});
