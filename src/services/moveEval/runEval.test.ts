import { describe, it, expect, vi } from "vitest";
import { runEval, type EvalProbe } from "./runEval";
import type { JudgeFn } from "./judge";
import type { MoveScore } from "./rubric";

const PASS: MoveScore = {
  name: true, move: "reframe", moveAppropriate: true, turn: "question", sentences: 2,
  prose: true, noPreamble: true, noSycophancy: true, section9Safe: true, holistic: 3,
};

const probes: EvalProbe[] = [
  { probe: "should i quit", tag: "advice_seeking", register: "plain", lang: "en", gold: "g1" },
  { probe: "my dog died", tag: "grief_loss", register: "plain", lang: "en", gold: "g2" },
];

describe("runEval", () => {
  it("generates then judges each probe and assembles a scorecard", async () => {
    const generate = vi.fn(async (p: string) => `reply to ${p}. ok?`);
    const judge: JudgeFn = async () => PASS;
    const card = await runEval({ probes, generate, judge });
    expect(card.n).toBe(2);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(card.moveScore).toBeCloseTo(1, 5);
    expect(card.byTag.grief_loss).toBeGreaterThan(0);
  });

  it("passes the gold through to the judge (for the holistic score)", async () => {
    const generate = async (p: string) => `r:${p}`;
    const seenGold: string[] = [];
    const judge: JudgeFn = async ({ gold }) => {
      seenGold.push(gold);
      return PASS;
    };
    await runEval({ probes, generate, judge });
    expect(seenGold).toContain("g1");
    expect(seenGold).toContain("g2");
  });

  it("fails open per probe: a generator error drops that probe, not the run", async () => {
    const generate = async (p: string) => {
      if (p === "my dog died") throw new Error("model hang");
      return `r:${p}. ok?`;
    };
    const judge: JudgeFn = async () => PASS;
    const card = await runEval({ probes, generate, judge });
    expect(card.n).toBe(1); // the surviving probe only
  });

  it("returns an empty-safe card when every probe fails", async () => {
    const generate = async () => {
      throw new Error("all down");
    };
    const judge: JudgeFn = async () => PASS;
    const card = await runEval({ probes, generate, judge });
    expect(card.n).toBe(0);
    expect(card.moveScore).toBe(0);
  });
});
