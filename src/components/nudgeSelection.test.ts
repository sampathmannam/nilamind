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

describe("selectVisibleNudges — MAX_NUDGES cap by array priority order", () => {
  it("caps at MAX_NUDGES (=2) ambient nudges", () => {
    expect(MAX_NUDGES).toBe(2);
    const { visibleNudgeIds } = selectVisibleNudges({
      ...NONE,
      safetyPlanReview: true, // safetyPlan
      sleepProdrome: true,
      jitaiShouldNudge: true,
      pact: true,
      welcome: true,
    });
    expect(visibleNudgeIds.size).toBe(2);
  });
  it("keeps the two HIGHEST-priority nudges (safetyPlan > sleep > jitai > pact > welcome)", () => {
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
    expect(visibleNudgeIds.has("jitai")).toBe(false);
    expect(visibleNudgeIds.has("pact")).toBe(false);
    expect(visibleNudgeIds.has("welcome")).toBe(false);
  });
  it("drops higher-priority slots that aren't showing, promoting lower ones", () => {
    // No safetyPlan, no sleep → jitai + pact take the two slots, welcome drops.
    const { visibleNudgeIds } = selectVisibleNudges({
      ...NONE,
      jitaiShouldNudge: true,
      pact: true,
      welcome: true,
    });
    expect([...visibleNudgeIds].sort()).toEqual(["jitai", "pact"]);
  });
  it("shows fewer than the cap when fewer are due", () => {
    const { visibleNudgeIds } = selectVisibleNudges({ ...NONE, sleepProdrome: true });
    expect([...visibleNudgeIds]).toEqual(["sleep"]);
  });
});
