import { describe, it, expect } from "vitest";
import { getCapacityLevel, capacityAdaptiveTaskLimit, type CapacityLevel } from "./capacitySignal";

describe("getCapacityLevel", () => {
  it("returns high when userState is calm", () => {
    expect(getCapacityLevel("calm")).toBe("high");
  });

  it("returns high when userState is null (no signal)", () => {
    expect(getCapacityLevel(null)).toBe("high");
  });

  it("returns medium when userState is anxious", () => {
    expect(getCapacityLevel("anxious")).toBe("medium");
  });

  it("returns low when userState is low", () => {
    expect(getCapacityLevel("low")).toBe("low");
  });

  it("returns low when userState is elevated", () => {
    expect(getCapacityLevel("elevated")).toBe("low");
  });

  it("returns low when userState is crisis", () => {
    expect(getCapacityLevel("crisis")).toBe("low");
  });
});

describe("capacityAdaptiveTaskLimit", () => {
  it("returns 2 for low capacity", () => {
    expect(capacityAdaptiveTaskLimit("low")).toBe(2);
  });

  it("returns 4 for medium capacity", () => {
    expect(capacityAdaptiveTaskLimit("medium")).toBe(4);
  });

  it("returns 7 for high capacity", () => {
    expect(capacityAdaptiveTaskLimit("high")).toBe(7);
  });
});
