import { describe, it, expect } from "vitest";
import { validateCorpus } from "./nilaCorpusValidate";
import { NILA_EXEMPLARS } from "./nilaExemplars";
import type { NilaExemplar } from "./nilaExemplars";

function ex(over: Partial<NilaExemplar>): NilaExemplar {
  return { id: "id_1", tag: "venting_dump", user: "user turn", nila: "nila reply.", ...over };
}

describe("validateCorpus", () => {
  it("passes a clean, balanced corpus with no errors", () => {
    const corpus: NilaExemplar[] = [
      ex({ id: "a", tag: "venting_dump", user: "u1", nila: "r1. r2." }),
      ex({ id: "b", tag: "good_news", user: "u2", nila: "r3?" }),
    ];
    const report = validateCorpus(corpus);
    expect(report.errors).toEqual([]);
  });

  it("flags a duplicate id as an error", () => {
    const corpus: NilaExemplar[] = [ex({ id: "dup", user: "u1" }), ex({ id: "dup", user: "u2" })];
    const report = validateCorpus(corpus);
    expect(report.errors.some((e) => e.includes("duplicate id"))).toBe(true);
  });

  it("flags a duplicate user turn as an error", () => {
    const corpus: NilaExemplar[] = [
      ex({ id: "a", user: "same text" }),
      ex({ id: "b", user: "same text" }),
    ];
    const report = validateCorpus(corpus);
    expect(report.errors.some((e) => e.includes("duplicate user"))).toBe(true);
  });

  it("flags an empty user or nila field as an error", () => {
    const corpus: NilaExemplar[] = [ex({ id: "a", user: "" })];
    const report = validateCorpus(corpus);
    expect(report.errors.some((e) => e.includes("empty"))).toBe(true);
  });

  it("flags a nila reply over 3 sentences as an error", () => {
    const corpus: NilaExemplar[] = [ex({ id: "a", nila: "One. Two. Three. Four." })];
    const report = validateCorpus(corpus);
    expect(report.errors.some((e) => e.includes("sentence"))).toBe(true);
  });

  it("warns when a single tag exceeds 30% of the corpus", () => {
    const corpus: NilaExemplar[] = Array.from({ length: 10 }, (_, i) =>
      ex({ id: `id_${i}`, user: `u${i}`, tag: i < 4 ? "venting_dump" : `tag_${i}` }),
    );
    const report = validateCorpus(corpus);
    expect(report.warnings.some((w) => w.includes("venting_dump"))).toBe(true);
  });

  it("warns when ends_in_question is far from 50/50 (over 70% either way)", () => {
    const corpus: NilaExemplar[] = Array.from({ length: 10 }, (_, i) =>
      ex({ id: `id_${i}`, user: `u${i}`, tag: `tag_${i}`, nila: "Reply here?" }),
    );
    const report = validateCorpus(corpus);
    expect(report.warnings.some((w) => w.includes("ends_in_question"))).toBe(true);
  });
});

describe("the real corpus", () => {
  it("has zero hard errors", () => {
    const report = validateCorpus(NILA_EXEMPLARS);
    expect(report.errors).toEqual([]);
  });
});
