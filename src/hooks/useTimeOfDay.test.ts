import { describe, it, expect } from "vitest";
import { contextualSummary, heroGradient } from "./useTimeOfDay";

describe("contextualSummary", () => {
  it("returns morning prompt when not checked in", () => {
    const result = contextualSummary("morning", false, null, 0);
    expect(result).toContain("new day");
  });

  it("returns evening prompt when not checked in", () => {
    const result = contextualSummary("evening", false, null, 0);
    expect(result).toContain("winding down");
  });

  it("returns gentle message for low recent average", () => {
    const result = contextualSummary("afternoon", true, 2, 0);
    expect(result).toContain("gentle");
  });

  it("returns steady message for moderate average", () => {
    const result = contextualSummary("afternoon", true, 5, 0);
    expect(result).toContain("mixed");
  });

  it("returns encouraging message for good average", () => {
    const result = contextualSummary("afternoon", true, 6, 0);
    expect(result).toContain("showing up");
  });

  it("returns supportive message for high distress", () => {
    const result = contextualSummary("afternoon", true, 8, 0);
    expect(result).toContain("gentle");
  });

  it("returns streak message when streak >= 7", () => {
    const result = contextualSummary("morning", true, null, 10);
    expect(result).toContain("10 days");
  });

  it("returns null when checked in with no recent data and no streak", () => {
    const result = contextualSummary("afternoon", true, null, 0);
    expect(result).toBeNull();
  });
});

describe("heroGradient", () => {
  it("returns a gradient class for each time of day", () => {
    expect(heroGradient("morning")).toContain("amber");
    expect(heroGradient("afternoon")).toContain("blue");
    expect(heroGradient("evening")).toContain("purple");
    expect(heroGradient("night")).toContain("indigo");
  });
});
