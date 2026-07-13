import { describe, it, expect } from "vitest";
import { MOVE_DIMENSIONS, dimensionPass, type MoveScore } from "./rubric";

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

describe("move rubric", () => {
  it("registry lists every scored dimension exactly once", () => {
    expect(new Set(MOVE_DIMENSIONS).size).toBe(MOVE_DIMENSIONS.length);
    // the dimensions the scorecard slices on
    expect(MOVE_DIMENSIONS).toEqual([
      "name",
      "moveAppropriate",
      "turn",
      "form",
      "prose",
      "noPreamble",
      "noSycophancy",
      "section9Safe",
    ]);
  });

  it("dimensionPass maps a clean score to all-pass", () => {
    for (const dim of MOVE_DIMENSIONS) {
      expect(dimensionPass(score(), dim), `dim ${dim}`).toBe(true);
    }
  });

  it("form fails when the reply runs over 3 sentences", () => {
    expect(dimensionPass(score({ sentences: 3 }), "form")).toBe(true);
    expect(dimensionPass(score({ sentences: 4 }), "form")).toBe(false);
  });

  it("turn fails only when there is no turn at all", () => {
    expect(dimensionPass(score({ turn: "no-question-turnback" }), "turn")).toBe(true);
    expect(dimensionPass(score({ turn: "none" }), "turn")).toBe(false);
  });

  it("moveAppropriate fails when the middle move is absent or judged unfitting", () => {
    expect(dimensionPass(score({ move: null, moveAppropriate: false }), "moveAppropriate")).toBe(false);
    expect(dimensionPass(score({ move: "normalize", moveAppropriate: false }), "moveAppropriate")).toBe(false);
  });
});
