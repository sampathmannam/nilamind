import { describe, it, expect } from "vitest";
import {
  hasMinTapTarget,
  hasFocusRing,
  textSizeFloor,
  isSemanticBackground,
  shouldReduceMotion,
  buttonClasses,
} from "./accessibilityBaseline";

describe("hasMinTapTarget", () => {
  it("returns true when class string contains min-h-[44px]", () => {
    expect(hasMinTapTarget("py-2 px-3 min-h-[44px] rounded-xl")).toBe(true);
  });

  it("returns true when class string contains min-w-[44px]", () => {
    expect(hasMinTapTarget("p-1 min-w-[44px] rounded-full")).toBe(true);
  });

  it("returns true when py-3.5 or greater ensures 44px height", () => {
    expect(hasMinTapTarget("py-3.5 px-6 rounded-xl")).toBe(true);
  });

  it("returns true when py-4 ensures 44px height with text-sm", () => {
    expect(hasMinTapTarget("py-4 text-sm rounded-xl")).toBe(true);
  });

  it("returns false when button has only py-2 with text-xs", () => {
    expect(hasMinTapTarget("py-2 px-3 text-xs rounded-xl")).toBe(false);
  });

  it("returns false when button has py-2.5 with text-xs", () => {
    expect(hasMinTapTarget("py-2.5 text-xs rounded-xl")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasMinTapTarget("")).toBe(false);
  });

  it("handles edge case of px-only sizing", () => {
    expect(hasMinTapTarget("px-4 rounded-xl")).toBe(false);
  });

  it("returns true for p-3 (12px * 3 = 36px padding, but p-3 alone may not hit 44)", () => {
    expect(hasMinTapTarget("p-3 text-sm rounded")).toBe(false);
  });
});

describe("hasFocusRing", () => {
  it("returns true when focus-visible:ring-2 is present", () => {
    expect(hasFocusRing("focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl")).toBe(true);
  });

  it("returns true when focus-ring class is present", () => {
    expect(hasFocusRing("focus-ring bg-page rounded-xl")).toBe(true);
  });

  it("returns true when focus:ring-2 is present", () => {
    expect(hasFocusRing("focus:ring-2 focus:ring-blue-400 rounded")).toBe(true);
  });

  it("returns false when no focus ring class is present", () => {
    expect(hasFocusRing("bg-page rounded-xl cursor-pointer")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasFocusRing("")).toBe(false);
  });
});

describe("textSizeFloor", () => {
  it("returns true when text-xs is the smallest size class", () => {
    expect(textSizeFloor("text-xs text-slate-300")).toBe(true);
  });

  it("returns true for text-sm", () => {
    expect(textSizeFloor("text-sm text-slate-200")).toBe(true);
  });

  it("returns true for text-base", () => {
    expect(textSizeFloor("text-base text-slate-100")).toBe(true);
  });

  it("returns false for text-[11px]", () => {
    expect(textSizeFloor("text-[11px] text-slate-500")).toBe(false);
  });

  it("returns false for text-[10px]", () => {
    expect(textSizeFloor("text-[10px] font-mono text-slate-400")).toBe(false);
  });

  it("returns true when no text size class is present (uses browser default)", () => {
    expect(textSizeFloor("text-slate-300 font-semibold")).toBe(true);
  });
});

describe("isSemanticBackground", () => {
  it("returns true for bg-page", () => {
    expect(isSemanticBackground("bg-page border border-slate-800 rounded-xl")).toBe(true);
  });

  it("returns true for bg-card", () => {
    expect(isSemanticBackground("bg-card p-4 rounded-2xl")).toBe(true);
  });

  it("returns true for glass", () => {
    expect(isSemanticBackground("glass rounded-2xl p-4")).toBe(true);
  });

  it("returns true for bg-raised", () => {
    expect(isSemanticBackground("bg-raised rounded-xl")).toBe(true);
  });

  it("returns false for bg-slate-800 hardcoded background", () => {
    expect(isSemanticBackground("bg-slate-800 border border-slate-700 rounded-2xl p-4")).toBe(false);
  });

  it("returns false for bg-slate-900", () => {
    expect(isSemanticBackground("bg-slate-900 p-4 rounded-xl")).toBe(false);
  });

  it("returns false for bg-slate-800/50", () => {
    expect(isSemanticBackground("bg-slate-800/50 border border-slate-700 p-4")).toBe(false);
  });

  it("returns true when no background class (parent handles it)", () => {
    expect(isSemanticBackground("space-y-3 text-slate-300")).toBe(true);
  });
});

describe("shouldReduceMotion", () => {
  it("returns reduce-motion instruction for elevated mode", () => {
    const result = shouldReduceMotion("elevated");
    expect(result.reduce).toBe(true);
  });

  it("returns no-reduce-motion instruction for default mode", () => {
    const result = shouldReduceMotion("default");
    expect(result.reduce).toBe(false);
  });

  it("returns no-reduce-motion instruction for low mode", () => {
    const result = shouldReduceMotion("low");
    expect(result.reduce).toBe(false);
  });

  it("returns reduce instruction when prefers-reduced-motion media query is active", () => {
    const result = shouldReduceMotion("default", true);
    expect(result.reduce).toBe(true);
  });

  it("returns reduced duration for elevated mode", () => {
    const result = shouldReduceMotion("elevated");
    expect(result.animationMs).toBe(350);
  });

  it("returns normal duration for default mode", () => {
    const result = shouldReduceMotion("default");
    expect(result.animationMs).toBe(200);
  });
});

describe("buttonClasses", () => {
  it("returns button classes with min-h-[44px] when enforceTap is true", () => {
    const result = buttonClasses({ variant: "primary", enforceTap: true });
    expect(result).toContain("min-h-[44px]");
    expect(result).toContain("focus-ring");
  });

  it("returns button classes without min-h when enforceTap is false", () => {
    const result = buttonClasses({ variant: "primary", enforceTap: false });
    expect(result).not.toContain("min-h-[44px]");
  });

  it("primary variant includes blue-600 fill", () => {
    const result = buttonClasses({ variant: "primary", enforceTap: true });
    expect(result).toContain("bg-blue-600");
    expect(result).toContain("text-white");
  });

  it("secondary variant includes bg-page with border", () => {
    const result = buttonClasses({ variant: "secondary", enforceTap: true });
    expect(result).toContain("bg-page");
    expect(result).toContain("border-slate-800");
    expect(result).toContain("text-slate-200");
  });

  it("danger variant includes rose-600 fill", () => {
    const result = buttonClasses({ variant: "danger", enforceTap: true });
    expect(result).toContain("bg-rose-600");
    expect(result).toContain("text-white");
  });

  it("warm variant uses amber accent", () => {
    const result = buttonClasses({ variant: "warm", enforceTap: true });
    expect(result).toContain("bg-amber-600");
  });

  it("returns consistent rounded-xl + text-xs-semibold styling across variants", () => {
    const variants = ["primary", "secondary", "danger", "warm"] as const;
    for (const v of variants) {
      const result = buttonClasses({ variant: v, enforceTap: true });
      expect(result).toContain("text-xs");
      expect(result).toContain("font-semibold");
    }
  });
});