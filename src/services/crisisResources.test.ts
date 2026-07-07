import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  }),
  DAY_MS: 86_400_000,
}));

import { getCrisisLines, allRegions, getRegionCode, setRegionCode, type RegionCode } from "./crisisResources";

describe("crisisResources", () => {
  beforeEach(() => { store.clear(); });

  it("always returns at least one crisis line", () => {
    const lines = getCrisisLines();
    expect(lines.length).toBeGreaterThan(0);
  });

  it("includes India-specific lines when region is IN", () => {
    setRegionCode("IN");
    expect(getRegionCode()).toBe("IN");
    const names = getCrisisLines().map((l) => l.name);
    expect(names).toContain("iCall");
    expect(names).toContain("Vandrevala Foundation");
    expect(names).toContain("KIRAN (Govt. of India)");
    expect(names).toContain("AASRA");
  });

  it("lists all supported regions", () => {
    const codes = allRegions().map((r) => r.code);
    expect(codes).toEqual(["IN", "US", "GB", "CA", "AU", "international"]);
  });
});
