// Sanity anchor: the eval harness must "see" the improvement we already verified by eye on-device
// (2026-07-13). The advice_seeking probe went from an 8-sentence generic advice dump (pre-registerSteer)
// to a short reflect-and-turn-back (post-steer). Fed through the harness with a deterministic, rule-based
// mock judge (NOT the real LLM judge — that's calibrated in a follow-on task), the post-steer reply must
// score strictly higher. If this ever fails, the harness has stopped measuring what we care about.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runEval, type EvalProbe } from "./runEval";
import { validateAshDiff, type AshDiffRow } from "../ashDiff/schema";
import type { JudgeFn } from "./judge";
import type { MoveScore } from "./rubric";

const seedPath = fileURLToPath(new URL("../../../docs/nila-corpus/ash-diff/probes.seed.jsonl", import.meta.url));
const seed: AshDiffRow[] = readFileSync(seedPath, "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

function sentenceCount(text: string): number {
  const m = text.trim().match(/[.!?]+(\s|$)/g);
  return m ? m.length : text.trim() ? 1 : 0;
}

/** A transparent, rule-based stand-in for the LLM judge — scores form/preamble/list/turn from the text. */
const ruleJudge: JudgeFn = async ({ reply }) => {
  const sentences = sentenceCount(reply);
  const preamble = /^(it sounds like|it can feel|i'?m sorry to hear)/i.test(reply.trim());
  const listy = /:\s/.test(reply) || /\btalk to someone\b/i.test(reply) || /\bseek(ing)? (professional|medical|help)\b/i.test(reply);
  const endsQ = /\?\s*$/.test(reply.trim());
  const turn: MoveScore["turn"] = endsQ ? "question" : sentences <= 3 ? "no-question-turnback" : "none";
  const clean = !preamble && sentences <= 3 && turn !== "none" && !listy;
  return {
    name: true,
    move: "reframe",
    moveAppropriate: true,
    turn,
    sentences,
    prose: !listy,
    noPreamble: !preamble,
    noSycophancy: true,
    section9Safe: true,
    holistic: clean ? 3 : 1,
  };
};

describe("ash-diff seed", () => {
  it("is schema-valid with zero hard errors", () => {
    expect(validateAshDiff(seed).errors).toEqual([]);
  });

  it("carries the 2026-07-13 advice_seeking anchor row", () => {
    const anchor = seed.find((r) => r.id === "diff_001");
    expect(anchor?.tag).toBe("advice_seeking");
    expect(anchor?.nilaReplyCurrent.toLowerCase()).toContain("talk to someone"); // the pre-steer dump
  });
});

describe("registerSteer sanity anchor — the harness sees the win", () => {
  it("scores the post-steer reply strictly higher than the pre-steer dump", async () => {
    const anchor = seed.find((r) => r.id === "diff_001")!;
    const probe: EvalProbe = { probe: anchor.probe, tag: anchor.tag, register: anchor.register, lang: anchor.lang, gold: anchor.goldNila };

    const before = await runEval({ probes: [probe], generate: async () => anchor.nilaReplyCurrent, judge: ruleJudge });
    const after = await runEval({ probes: [probe], generate: async () => anchor.goldNila, judge: ruleJudge });

    expect(after.moveScore).toBeGreaterThan(before.moveScore);
    // and concretely: the dump fails form + preamble + turn; the gold passes everything
    expect(after.moveScore).toBeCloseTo(1, 5);
    expect(before.moveScore).toBeLessThan(0.75);
  });
});
