import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  }),
}));

import {
  hasCompletedOnboarding,
  completeOnboarding,
  getOnboardingRegion,
  setOnboardingRegion,
} from "./onboarding";
import { allRegions } from "./crisisResources";

const validRegionCodes = new Set(allRegions().map((r) => r.code));

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe("onboarding state", () => {
  it("reports not completed when no flag is set", () => {
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it("reports completed after completeOnboarding is called", () => {
    completeOnboarding();
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it("returns a valid default region when none was chosen", () => {
    expect(validRegionCodes.has(getOnboardingRegion())).toBe(true);
  });

  it("persists the chosen region", () => {
    setOnboardingRegion("IN");
    expect(getOnboardingRegion()).toBe("IN");
  });

  it("falls back to a valid region for invalid region codes", () => {
    setOnboardingRegion("XX" as any);
    expect(validRegionCodes.has(getOnboardingRegion())).toBe(true);
  });
});
