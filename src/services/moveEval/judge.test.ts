import { describe, it, expect } from "vitest";
import { buildJudgePrompt, parseJudgeResponse, makeJudge } from "./judge";

const wellFormed = JSON.stringify({
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
});

describe("buildJudgePrompt", () => {
  const p = buildJudgePrompt({
    probe: "should i quit my job",
    reply: "That's not a quick-answer question. What's pulling you back?",
    gold: "That's a big one. What's the fear underneath it?",
  });

  it("includes the probe, the reply under test, and the gold", () => {
    expect(p).toContain("should i quit my job");
    expect(p).toContain("What's pulling you back?");
    expect(p).toContain("What's the fear underneath it?");
  });

  it("names every scored rubric dimension so the judge returns them all", () => {
    for (const key of ["name", "move", "moveAppropriate", "turn", "sentences", "prose", "noPreamble", "noSycophancy", "section9Safe", "holistic"]) {
      expect(p, `mentions ${key}`).toContain(key);
    }
  });

  it("instructs the judge to score blind (never reveal which model wrote it)", () => {
    expect(p.toLowerCase()).toMatch(/blind|do not.*which model|without knowing/);
  });
});

describe("parseJudgeResponse", () => {
  it("parses well-formed judge JSON into a MoveScore", () => {
    const s = parseJudgeResponse(wellFormed);
    expect(s.name).toBe(true);
    expect(s.move).toBe("reframe");
    expect(s.holistic).toBe(3);
  });

  it("tolerates JSON wrapped in prose/code fences", () => {
    const wrapped = "Here is my assessment:\n```json\n" + wellFormed + "\n```\nDone.";
    expect(parseJudgeResponse(wrapped).turn).toBe("question");
  });

  it("throws on malformed / non-JSON responses", () => {
    expect(() => parseJudgeResponse("not json at all")).toThrow();
  });

  it("coerces move 'none'/absent to null", () => {
    const s = parseJudgeResponse(JSON.stringify({ ...JSON.parse(wellFormed), move: "none" }));
    expect(s.move).toBeNull();
  });
});

describe("makeJudge", () => {
  it("routes prompt through the injected transport and parses the result", async () => {
    let sawPrompt = "";
    const judge = makeJudge(async (prompt: string) => {
      sawPrompt = prompt;
      return wellFormed;
    });
    const score = await judge({ probe: "p", reply: "r", gold: "g" });
    expect(sawPrompt).toContain("p");
    expect(score.holistic).toBe(3);
  });
});
