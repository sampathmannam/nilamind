import { describe, it, expect } from "vitest";
import { selectVisibleNudges, MAX_NUDGES, type NudgeVisibilityInput } from "./nudgeSelection";

const NONE: NudgeVisibilityInput = {
  safetyPlanFollowUp: false,
  safetyPlanReview: false,
  calmSafetyNudgeShow: false,
  sleepProdrome: false,
  jitaiShouldNudge: false,
  pact: false,
  welcome: false,
};

describe("selectVisibleNudges — safety-plan clinical priority", () => {
  it("null when no safety-plan ask is due", () => {
    expect(selectVisibleNudges(NONE).safetyPlanCard).toBeNull();
  });
  it("follow-up wins over review and calm", () => {
    expect(
      selectVisibleNudges({ ...NONE, safetyPlanFollowUp: true, safetyPlanReview: true, calmSafetyNudgeShow: true })
        .safetyPlanCard,
    ).toBe("followup");
  });
  it("review wins over calm when no follow-up", () => {
    expect(
      selectVisibleNudges({ ...NONE, safetyPlanReview: true, calmSafetyNudgeShow: true }).safetyPlanCard,
    ).toBe("review");
  });
  it("calm shows only when neither follow-up nor review", () => {
    expect(selectVisibleNudges({ ...NONE, calmSafetyNudgeShow: true }).safetyPlanCard).toBe("calm");
  });
});

describe("selectVisibleNudges — returns ALL visible nudges (UI cap moved to NudgeRail)", () => {
  it("returns all 5 when all are due (no cap in selector)", () => {
    expect(MAX_NUDGES).toBe(3);
    const { visibleNudgeIds, totalNudges } = selectVisibleNudges({
      ...NONE,
      safetyPlanReview: true,
      sleepProdrome: true,
      jitaiShouldNudge: true,
      pact: true,
      welcome: true,
    });
    expect(visibleNudgeIds.size).toBe(5);
    expect(totalNudges).toBe(5);
  });
  it("keeps all visible items by priority order", () => {
    const { visibleNudgeIds } = selectVisibleNudges({
      ...NONE,
      safetyPlanReview: true,
      sleepProdrome: true,
      jitaiShouldNudge: true,
      pact: true,
      welcome: true,
    });
    expect(visibleNudgeIds.has("safetyPlan")).toBe(true);
    expect(visibleNudgeIds.has("sleep")).toBe(true);
    expect(visibleNudgeIds.has("jitai")).toBe(true);
    expect(visibleNudgeIds.has("pact")).toBe(true);
    expect(visibleNudgeIds.has("welcome")).toBe(true);
  });
  it("reports totalNudges correctly when some are hidden", () => {
    const { totalNudges } = selectVisibleNudges({
      ...NONE,
      jitaiShouldNudge: true,
      pact: true,
    });
    expect(totalNudges).toBe(2);
  });
  it("shows only the due ones", () => {
    const { visibleNudgeIds } = selectVisibleNudges({ ...NONE, sleepProdrome: true });
    expect([...visibleNudgeIds]).toEqual(["sleep"]);
  });
});
