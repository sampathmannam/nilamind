import { describe, it, expect } from "vitest";
import {
  PSYCHOED_TOPICS,
  EMERGENCY_CAVEAT,
  searchPsychoed,
  checkPsychoedQuery,
} from "./psychoed";

describe("PSYCHOED_TOPICS corpus", () => {
  it("has exactly 10 topics, each fully populated + cited", () => {
    expect(PSYCHOED_TOPICS).toHaveLength(10);
    const ids = new Set<string>();
    for (const t of PSYCHOED_TOPICS) {
      expect(t.id).toBeTruthy();
      expect(ids.has(t.id)).toBe(false); // ids unique
      ids.add(t.id);
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.summary.length).toBeGreaterThan(10);
      expect(t.body.length).toBeGreaterThan(20);
      expect(t.basis.length).toBeGreaterThan(5);
      expect(t.tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("physical-symptom topics (anxiety-body, panic) carry the emergency caveat; others don't", () => {
    const withCaveat = PSYCHOED_TOPICS.filter((t) => t.emergencyCaveat).map((t) => t.id).sort();
    expect(withCaveat).toEqual(["anxiety-alarm", "panic-passes"]);
    for (const t of PSYCHOED_TOPICS) {
      if (t.emergencyCaveat) expect(t.emergencyCaveat).toBe(EMERGENCY_CAVEAT);
    }
    expect(EMERGENCY_CAVEAT.toLowerCase()).toContain("emergency");
  });

  it("is invitation-framed — no second-person medical absolutes", () => {
    const banned = /\bcan't harm you\b|\byou are fine\b|\byour heart is fine\b|\bnothing is wrong with you\b/i;
    for (const t of PSYCHOED_TOPICS) {
      expect(banned.test(t.summary)).toBe(false);
      expect(banned.test(t.body)).toBe(false);
    }
  });
});

describe("searchPsychoed", () => {
  it("ranks the obvious topic first for colloquial queries", () => {
    expect(searchPsychoed("panic attack")[0].id).toBe("panic-passes");
    expect(searchPsychoed("can't stop replaying what happened")[0].id).toBe("rumination-loop");
    expect(searchPsychoed("can't sleep")[0].id).toBe("sleep-and-mood");
  });

  it("empty query returns all topics in corpus order", () => {
    const all = searchPsychoed("");
    expect(all).toHaveLength(10);
    expect(all.map((t) => t.id)).toEqual(PSYCHOED_TOPICS.map((t) => t.id));
    expect(searchPsychoed("   ").map((t) => t.id)).toEqual(PSYCHOED_TOPICS.map((t) => t.id));
  });

  it("returns only relevant topics for a specific query (drops zero-score)", () => {
    const res = searchPsychoed("avoiding things i'm scared of");
    expect(res.length).toBeGreaterThan(0);
    expect(res.length).toBeLessThan(10);
    expect(res.map((t) => t.id)).toContain("avoidance-grows-fear");
  });
});

describe("checkPsychoedQuery (search-box §9 gate)", () => {
  it("true for crisis content, false for ordinary query / empty", () => {
    expect(checkPsychoedQuery("I want to kill myself")).toBe(true);
    expect(checkPsychoedQuery("why do i overthink")).toBe(false);
    expect(checkPsychoedQuery("")).toBe(false);
  });
});
