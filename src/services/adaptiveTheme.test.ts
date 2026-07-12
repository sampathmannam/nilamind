import { describe, it, expect } from "vitest";
import { computeAdaptiveMode, getAdaptiveCssClass, shouldReduceAnimations } from "./adaptiveTheme";

describe("computeAdaptiveMode", () => {
  it("returns default when userState is null", () => {
    expect(computeAdaptiveMode(null)).toBe("default");
  });

  it("returns default when userState is calm", () => {
    expect(computeAdaptiveMode("calm")).toBe("default");
  });

  it("returns elevated when userState is elevated", () => {
    expect(computeAdaptiveMode("elevated")).toBe("elevated");
  });

  it("returns elevated when userState is crisis", () => {
    expect(computeAdaptiveMode("crisis")).toBe("elevated");
  });

  it("returns low when userState is low", () => {
    expect(computeAdaptiveMode("low")).toBe("low");
  });

  it("returns low when userState is anxious", () => {
    expect(computeAdaptiveMode("anxious")).toBe("low");
  });
});

describe("getAdaptiveCssClass", () => {
  it('returns empty string for default', () => {
    expect(getAdaptiveCssClass("default")).toBe("");
  });

  it('returns theme-elevated for elevated mode', () => {
    expect(getAdaptiveCssClass("elevated")).toBe("theme-elevated");
  });

  it('returns theme-low for low mode', () => {
    expect(getAdaptiveCssClass("low")).toBe("theme-low");
  });
});

describe("shouldReduceAnimations", () => {
  it("returns true for elevated", () => {
    expect(shouldReduceAnimations("elevated")).toBe(true);
  });

  it("returns false for default", () => {
    expect(shouldReduceAnimations("default")).toBe(false);
  });

  it("returns false for low", () => {
    expect(shouldReduceAnimations("low")).toBe(false);
  });
});
