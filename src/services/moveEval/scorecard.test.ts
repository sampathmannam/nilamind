import { describe, it, expect } from "vitest";
import { buildScorecard, type ScoredReply } from "./scorecard";
import type { MoveScore } from "./rubric";

function score(over: Partial<MoveScore> = {}): MoveScore {
  return {
    name: true,
    move: "reframe",
    moveAppropriate: true,
    turn: "question",
    sentences: 2,
    prose: true,
    noPreamble: true,
    noSycophancy: true,
    section9Safe: true,
    holistic: 3,
    ...over,
  };
}

function scored(over: Partial<ScoredReply> = {}): ScoredReply {
  return { probe: "p", tag: "advice_seeking", register: "plain", lang: "en", reply: "A reply. Yes?", score: score(), ...over };
}

describe("buildScorecard", () => {
  it("returns an empty-but-safe card for no input", () => {
    const card = buildScorecard([]);
    expect(card.n).toBe(0);
    expect(card.moveScore).toBe(0);
    expect(Number.isNaN(card.moveScore)).toBe(false);
  });

  it("computes per-dimension pass rates", () => {
    const card = buildScorecard([
      scored({ score: score({ name: true }) }),
      scored({ probe: "p2", score: score({ name: false }) }),
    ]);
    expect(card.byDimension.name).toBeCloseTo(0.5, 5);
    expect(card.byDimension.prose).toBeCloseTo(1, 5);
  });

  it("headline moveScore is the mean pass rate across all dimensions", () => {
    // one fully-passing reply → every dimension passes → 1.0
    expect(buildScorecard([scored()]).moveScore).toBeCloseTo(1, 5);
    // one reply failing exactly one of the 8 dimensions → 7/8
    expect(buildScorecard([scored({ score: score({ noSycophancy: false }) })]).moveScore).toBeCloseTo(7 / 8, 5);
  });

  it("slices by tag, register, and language", () => {
    const card = buildScorecard([
      scored({ tag: "grief_loss", register: "terse", lang: "hi", score: score({ name: true }) }),
      scored({ tag: "grief_loss", register: "terse", lang: "hi", probe: "p2", score: score({ name: false }) }),
      scored({ tag: "advice_seeking", register: "plain", lang: "en", probe: "p3", score: score() }),
    ]);
    // grief_loss slice: name passes 1/2 → its mean dimension score is below the en slice
    expect(card.byTag.grief_loss).toBeLessThan(card.byTag.advice_seeking);
    expect(card.byRegister.terse).toBeLessThan(card.byRegister.plain);
    expect(card.byLang.hi).toBeLessThan(card.byLang.en);
  });

  it("populates the anti-collapse report from the replies", () => {
    const card = buildScorecard([scored({ reply: "One. Two?" }), scored({ probe: "p2", reply: "Only one." })]);
    expect(card.antiCollapse.questionEndRatio).toBeCloseTo(0.5, 5);
    expect(card.antiCollapse.lengthHist["2"]).toBe(1);
  });
});
