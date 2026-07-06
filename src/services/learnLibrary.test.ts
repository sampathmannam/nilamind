import { describe, it, expect } from "vitest";
import { searchLearn } from "./learnLibrary";

// Audit fix #8 (de-fragmentation): Skills / Understand / Why were 3 separate screens + 3 search boxes — the
// clearest grab-bag in the app. This is the logic core of one "Learn" library: a single §9-gated search
// across all three sources, normalized to one shape with a `source` facet. (The single screen is device-verify.)
describe("searchLearn — one §9-gated search across Skills + Understand + Why", () => {
  it("empty query returns items from all three sources (browse mode)", () => {
    const sources = new Set(searchLearn("").map((r) => r.source));
    expect(sources.has("skill")).toBe(true);
    expect(sources.has("understand")).toBe(true);
    expect(sources.has("why")).toBe(true);
  });
  it("a topical query returns matching results tagged by source", () => {
    const r = searchLearn("behavioural activation");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.source === "why" && /activation/i.test(x.title))).toBe(true);
  });
  it("every result carries id, title, snippet, source", () => {
    for (const x of searchLearn("")) {
      expect(x.id).toBeTruthy();
      expect(x.title).toBeTruthy();
      expect(typeof x.snippet).toBe("string");
      expect(["skill", "understand", "why"]).toContain(x.source);
    }
  });
  it("§9-gates: a crisis query returns NO library content (UI surfaces help instead)", () => {
    expect(searchLearn("i want to kill myself")).toEqual([]);
  });
});
