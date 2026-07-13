import { describe, it, expect } from "vitest";
import { validateAshDiff, provenanceBreakdown, type AshDiffRow } from "./schema";

function row(over: Partial<AshDiffRow> = {}): AshDiffRow {
  return {
    id: "diff_1",
    tag: "advice_seeking",
    register: "plain",
    lang: "en",
    probe: "should i quit my job or stick it out",
    ashReply: "ash reply here.",
    nilaReplyCurrent: "generic advice dump.",
    moveLabels: { name: 1, move: "reframe", turn: "question", sentences: 2 },
    delta: "ash reflects then asks one binary; nila dumped advice",
    goldNila: "That's not a quick-answer question. What's really pulling you back?",
    ...over,
  };
}

describe("validateAshDiff", () => {
  it("passes a clean, balanced set with no errors", () => {
    const rows = [
      row({ id: "a", tag: "advice_seeking", goldNila: "One thought. And a question?" }),
      row({ id: "b", tag: "grief_loss", goldNila: "That's a real loss. I'm here." }),
    ];
    expect(validateAshDiff(rows).errors).toEqual([]);
  });

  it("flags duplicate id", () => {
    const rows = [row({ id: "dup", probe: "p1" }), row({ id: "dup", probe: "p2" })];
    expect(validateAshDiff(rows).errors.some((e) => e.includes("duplicate id"))).toBe(true);
  });

  it("flags empty probe or goldNila", () => {
    expect(validateAshDiff([row({ id: "a", probe: "" })]).errors.some((e) => e.includes("empty"))).toBe(true);
    expect(validateAshDiff([row({ id: "b", goldNila: "  " })]).errors.some((e) => e.includes("empty"))).toBe(true);
  });

  it("flags a goldNila over 3 sentences (Nila stays short)", () => {
    const rows = [row({ id: "a", goldNila: "One. Two. Three. Four." })];
    expect(validateAshDiff(rows).errors.some((e) => e.includes("sentence"))).toBe(true);
  });

  it("warns when one tag exceeds the 30% cap", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({ id: `id_${i}`, probe: `p${i}`, tag: i < 5 ? "advice_seeking" : `tag_${i}` }),
    );
    expect(validateAshDiff(rows).warnings.some((w) => w.includes("advice_seeking"))).toBe(true);
  });

  it("warns when one register dominates", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({ id: `id_${i}`, probe: `p${i}`, tag: `tag_${i}`, register: i < 6 ? "terse" : "plain" }),
    );
    expect(validateAshDiff(rows).warnings.some((w) => w.includes("terse"))).toBe(true);
  });

  it("warns when goldNila question-ending ratio is far from 50/50", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({ id: `id_${i}`, probe: `p${i}`, tag: `tag_${i}`, goldNila: "Ends in a question?" }),
    );
    expect(validateAshDiff(rows).warnings.some((w) => w.includes("question"))).toBe(true);
  });
});

describe("provenanceBreakdown", () => {
  it("counts device-captured vs illustrative, defaulting absent to illustrative", () => {
    const rows: AshDiffRow[] = [
      row({ id: "a", provenance: "device-captured" }),
      row({ id: "b", provenance: "illustrative" }),
      row({ id: "c" }), // absent → illustrative
    ];
    const b = provenanceBreakdown(rows);
    expect(b.deviceCaptured).toBe(1);
    expect(b.illustrative).toBe(2);
    expect(b.total).toBe(3);
  });
});
