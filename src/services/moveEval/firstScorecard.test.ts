// THE FIRST REAL MOVE-SCORECARD (2026-07-13/14). Scores REAL on-device replies captured this session
// through the eval engine, to prove it works end-to-end on real data and to produce the first hard numbers.
//
// Captures are verbatim from device ZD2232FCR5 (screenshots in the session scratchpad). The judge scores
// below are authored by Claude-as-judge and are UNCALIBRATED — the E2 calibration harness (agreement vs
// human labels) is exactly what must validate them before they're trusted for decisions. This test is a
// demonstration + regression anchor, not a calibrated benchmark.
import { describe, it, expect } from "vitest";
import { buildScorecard, type ScoredReply } from "./scorecard";
import type { MoveScore } from "./rubric";

const S = (o: Partial<MoveScore>): MoveScore => ({
  name: false, move: null, moveAppropriate: false, turn: "none", sentences: 1,
  prose: true, noPreamble: true, noSycophancy: true, section9Safe: true, holistic: 0, ...o,
});

// --- REAL CAPTURES + judge scores -------------------------------------------------------------------------

// Qwen2.5-1.5B, BEFORE registerSteer — advice_seeking: an 8-sentence generic advice dump.
const QWEN_PRE_ADVICE = S({
  // "It sounds like the situation you're facing is challenging and overwhelming... Talk to someone you
  //  trust... Consider seeking support... Explore resources..."
  name: false, move: null, moveAppropriate: false, turn: "none", sentences: 8,
  prose: false /* "Talk to someone you trust:" list */, noPreamble: false /* "It sounds like..." */, holistic: 0,
});

// Qwen2.5-1.5B, AFTER registerSteer — advice_seeking: reflect + one turn-back.
const QWEN_POST_ADVICE = S({
  // "That's not a quick-answer question. What's actually pulling you back—is it about them, or about how
  //  alone this feels right now?"
  name: true, move: "reframe", moveAppropriate: true, turn: "question", sentences: 2,
  prose: true, noPreamble: true, holistic: 3,
});

// MiniCPM5-1B (raw-ChatML, plain cue) — advice_seeking: degenerate repetition loop.
const MINICPM_ADVICE = S({
  // "I'm happy with the answer. 1. I like to learn 2. I like to get ... 17."
  name: false, move: null, moveAppropriate: false, turn: "none", sentences: 18,
  prose: false, noPreamble: false, holistic: 0,
});

function reply(system: string, score: MoveScore): ScoredReply {
  return { probe: "should i quit my job or stick it out", tag: "advice_seeking", register: "plain", lang: "en", reply: system, score };
}

describe("first real move-scorecard — advice_seeking head-to-head", () => {
  const qwenPre = buildScorecard([reply("qwen-pre-steer", QWEN_PRE_ADVICE)]);
  const qwenPost = buildScorecard([reply("qwen-post-steer", QWEN_POST_ADVICE)]);
  const minicpm = buildScorecard([reply("minicpm5-1b", MINICPM_ADVICE)]);

  it("registerSteer is a MEASURED win: post-steer Move Score >> pre-steer", () => {
    expect(qwenPost.moveScore).toBeGreaterThan(qwenPre.moveScore);
    expect(qwenPost.moveScore).toBeCloseTo(1, 5); // nails every dimension
    expect(qwenPre.moveScore).toBeLessThan(0.4); // the advice dump
  });

  it("MiniCPM5-1B (untuned prompt) currently scores at the bottom — not a usable drop-in yet", () => {
    expect(minicpm.moveScore).toBeLessThan(qwenPost.moveScore);
    expect(minicpm.moveScore).toBeLessThanOrEqual(qwenPre.moveScore);
  });

  it("prints the first real scorecard", () => {
    const line = (name: string, sc: { moveScore: number }) =>
      `  ${name.padEnd(16)} Move ${(sc.moveScore * 100).toFixed(0).padStart(3)}%`;
    // eslint-disable-next-line no-console
    console.log(
      "\n=== FIRST MOVE-SCORECARD (advice_seeking; judge=Claude, UNCALIBRATED) ===\n" +
        [line("qwen-pre-steer", qwenPre), line("qwen-post-steer", qwenPost), line("minicpm5-1b", minicpm)].join("\n") +
        "\n  (holistic: pre 0/3, post 3/3, minicpm 0/3)\n",
    );
    expect(true).toBe(true);
  });
});
