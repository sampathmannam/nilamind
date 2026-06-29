import { describe, it, expect } from "vitest";
import { rankSkills, bestSkill, resolveSkill, searchSkills, relevantSkillsBlock } from "./skillRetrieval";

describe("rankSkills", () => {
  it("ranks an obviously-relevant skill at the top", () => {
    const top = rankSkills("I keep having the same negative automatic thought")[0];
    expect(top?.skill.id).toBe("thought-record");
  });
  it("returns [] for empty, whitespace, or stopword-only queries", () => {
    expect(rankSkills("")).toEqual([]);
    expect(rankSkills("   ")).toEqual([]);
    expect(rankSkills("i am so to the")).toEqual([]);
  });
  it("respects limit and drops zero-score skills by default", () => {
    const r = rankSkills("thought", { limit: 3 });
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(3);
    expect(r.every((x) => x.score > 0)).toBe(true);
  });
  it("name/acronym hits outrank step-only hits", () => {
    // 'TIPP' is a skill name (weight 4); 'cold' appears only in a step (weight 1)
    const r = rankSkills("tipp cold");
    expect(r[0].skill.id).toBe("tipp");
  });
});

describe("bestSkill", () => {
  it("returns the skill for a clear name/near-name", () => {
    expect(bestSkill("Self-Compassion Break")?.id).toBe("self-compassion-break");
    expect(bestSkill("self compassion")?.id).toBe("self-compassion-break"); // near-miss the exact tier misses
  });
  it("returns null for empty / no-match input (fails safe)", () => {
    expect(bestSkill("")).toBeNull();
    expect(bestSkill("xyzzy nonsense gibberish")).toBeNull(); // no corpus overlap → null
  });
});

describe("resolveSkill (safer open_skill resolution)", () => {
  it("resolves an exact skill name (case-insensitive)", () => {
    expect(resolveSkill("TIPP")?.id).toBe("tipp");
    expect(resolveSkill("self-compassion break")?.id).toBe("self-compassion-break");
  });
  it("resolves a confident near-miss the exact tier misses", () => {
    expect(resolveSkill("self compassion")?.id).toBe("self-compassion-break");
  });
  it("returns null for empty / garbage / low-signal input (no wrong-open)", () => {
    expect(resolveSkill("")).toBeNull();
    expect(resolveSkill("   ")).toBeNull();
    expect(resolveSkill("xyzzy zzz")).toBeNull();
  });
});

describe("acronym-field pollution guard + floor safety (regression)", () => {
  it("does NOT confidently resolve a junk token from an acronym EXPANSION", () => {
    // GIVE's acronym field contains "(act)"; TIPP/PLEASE contain "exercise". These appear ONLY in the
    // descriptive acronym expansion (weight 1), so they must NOT score name-level — fail safe to null.
    expect(bestSkill("act")).toBeNull();
    expect(bestSkill("exercise")).toBeNull();
  });
  it("still matches a token that genuinely appears in a skill NAME (not pollution)", () => {
    // "breathing" is in the NAME "Box / Paced Breathing" — a legit name-level match, correctly kept.
    expect(bestSkill("breathing")?.id).toBe("box-breathing");
  });
  it("still resolves a real single-word skill NAME (floor boundary = 4)", () => {
    expect(bestSkill("STOP")?.id).toBe("stop");
    expect(bestSkill("tipp")?.id).toBe("tipp");
  });
  it("resolveSkill fails safe (null) on an ambiguous short word that used to guess a skill", () => {
    expect(resolveSkill("act")).toBeNull(); // old bidirectional includes() matched 'Opposite Action'; new = safe null
  });
});

describe("searchSkills (ranked library search, recall-preserving)", () => {
  it("orders matches by relevance (most-relevant first)", () => {
    expect(searchSkills("thought", null)[0]?.id).toBe("thought-record");
  });
  it("returns the full corpus for an empty query", () => {
    expect(searchSkills("", null).length).toBeGreaterThan(0);
  });
  it("honours the group filter", () => {
    const res = searchSkills("", "thoughts");
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((s) => s.group === "thoughts")).toBe(true);
  });
});

describe("relevantSkillsBlock (RAG grounding block)", () => {
  it("returns an evidence-cited block with the most relevant skill for a real query", () => {
    const b = relevantSkillsBlock("I keep having the same negative automatic thought");
    expect(b).toContain("MOST RELEVANT");
    expect(b).toContain("Thought Record");
    expect(b).toMatch(/\(Beck/); // first-author citation surfaced from `basis`
  });
  it("returns '' for empty / whitespace / no-match queries (callers stay byte-identical)", () => {
    expect(relevantSkillsBlock("")).toBe("");
    expect(relevantSkillsBlock("   ")).toBe("");
    expect(relevantSkillsBlock("xyzzy nonsense gibberish")).toBe("");
  });
  it("caps to the requested limit", () => {
    const lines = relevantSkillsBlock("anxious panic stress worry", 2).split("\n").filter((l) => l.startsWith("- "));
    expect(lines.length).toBeLessThanOrEqual(2);
  });
});
