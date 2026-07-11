/**
 * Guards for the exemplar corpus: it must stay in lockstep with seed.jsonl (the source of truth),
 * cover every taxonomy type, and clear the rubric's mechanical bars (no markdown, no sycophancy openers).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { NILA_EXEMPLARS } from "./nilaExemplars";

const seed = readFileSync(new URL("../../docs/nila-corpus/seed.jsonl", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as { id: string; tag: string; user: string; nila: string });

const TAXONOMY = [
  "explainer_question", "venting_dump", "low_effort", "good_news", "rumination", "self_attack",
  "just_tell_me", "numbness", "relationship_hurt", "late_night", "anger", "crisis_adjacent",
];

describe("NILA_EXEMPLARS corpus", () => {
  it("is in lockstep with seed.jsonl (regenerate with scripts/gen-exemplars.mjs if this fails)", () => {
    expect(NILA_EXEMPLARS.length).toBe(seed.length);
    expect(NILA_EXEMPLARS.map((e) => e.id)).toEqual(seed.map((s) => s.id));
    for (let i = 0; i < seed.length; i++) {
      expect(NILA_EXEMPLARS[i].user).toBe(seed[i].user);
      expect(NILA_EXEMPLARS[i].nila).toBe(seed[i].nila);
    }
  });

  it("covers every taxonomy type", () => {
    const tags = new Set(NILA_EXEMPLARS.map((e) => e.tag));
    for (const t of TAXONOMY) expect(tags.has(t), `missing tag: ${t}`).toBe(true);
  });

  it("every reply clears the mechanical bar: no markdown, no sycophancy preamble", () => {
    for (const e of NILA_EXEMPLARS) {
      expect(e.nila, `${e.id} has markdown`).not.toMatch(/\*\*|^\s*[-*]\s|^#{1,6}\s/m);
      expect(e.nila.toLowerCase(), `${e.id} opens with a preamble`).not.toMatch(
        /^(that's|thats) (a |an )?(great|fantastic|amazing|wonderful|good) question/,
      );
    }
  });

  it("stays short — every reply is a few sentences, not an essay", () => {
    for (const e of NILA_EXEMPLARS) {
      const sentences = e.nila.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
      expect(sentences, `${e.id} too long`).toBeLessThanOrEqual(4);
    }
  });
});
