// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { timeModeFromTimeOfDay, useUserContext, type UserContext } from "./useUserContext";
import type { TimeOfDay } from "./useTimeOfDay";

vi.mock("../services/modeEngine", () => ({
  getUserState: vi.fn(() => null),
}));
vi.mock("./useTimeOfDay", () => ({
  useTimeOfDay: vi.fn(() => ({
    timeOfDay: "afternoon" as TimeOfDay,
    subPeriod: "mid" as const,
    hour: 14,
    isNight: false,
    isMorning: false,
    isEvening: false,
  })),
  heroGradient: () => "",
  contextualSummary: () => null,
}));
import { getUserState } from "../services/modeEngine";
import { useTimeOfDay } from "./useTimeOfDay";

describe("timeModeFromTimeOfDay — coarse bucket for all time-of-day variants", () => {
  const cases: [TimeOfDay, ReturnType<typeof timeModeFromTimeOfDay>][] = [
    ["morning", "morning"],
    ["afternoon", "day"],
    ["evening", "evening"],
    ["night", "night"],
  ];
  it.each(cases)("maps %s -> %s", (input, expected) => {
    expect(timeModeFromTimeOfDay(input)).toBe(expected);
  });
});

describe("useUserContext — adaptive context composition", () => {
  it("exposes the live time-of-day and a null state when nothing is derived", () => {
    vi.mocked(getUserState).mockReturnValue(null);
    vi.mocked(useTimeOfDay).mockReturnValue({
      timeOfDay: "afternoon", subPeriod: "mid", hour: 14, isNight: false, isMorning: false, isEvening: false,
    });
    const { result } = renderHook(() => useUserContext() as UserContext);
    expect(result.current.timeMode).toBe("day");
    expect(result.current.state).toBeNull();
    expect(result.current.lowCapacity).toBe(false);
  });

  it("flags low-capacity states (anxious/low/elevated/crisis)", () => {
    vi.mocked(getUserState).mockReturnValue("anxious");
    vi.mocked(useTimeOfDay).mockReturnValue({
      timeOfDay: "evening", subPeriod: "early", hour: 18, isNight: false, isMorning: false, isEvening: true,
    });
    const { result } = renderHook(() => useUserContext() as UserContext);
    expect(result.current.state).toBe("anxious");
    expect(result.current.lowCapacity).toBe(true);
    expect(result.current.timeMode).toBe("evening");
  });

  it("treats calm as high-capacity", () => {
    vi.mocked(getUserState).mockReturnValue("calm");
    const { result } = renderHook(() => useUserContext() as UserContext);
    expect(result.current.lowCapacity).toBe(false);
  });
});
