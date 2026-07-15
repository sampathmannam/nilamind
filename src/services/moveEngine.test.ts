import { describe, it, expect } from "vitest";
import { classifyMove, resolveMove, maybeEscalateToDeepen, type Move, type MoveResult } from "./moveEngine";

describe("moveEngine — classifyMove", () => {
  it("classifies self-attack as REPAIR", () => {
    expect(classifyMove("i'm such a failure, i hate myself")).toBe("REPAIR");
  });

  it("classifies overwhelm as REPAIR", () => {
    expect(classifyMove("i just feel so lost today morning")).toBe("REPAIR");
  });

  it("classifies long venting dump as HOLD", () => {
    expect(
      classifyMove(
        "and then my boss yelled at me. and also my car broke down. and on top of that my friend cancelled on me again. same thing over and over. keeps happening. never changes."
      )
    ).toBe("HOLD");
  });

  it("classifies vague/confused as CLARIFY", () => {
    expect(classifyMove("idk, something is just off")).toBe("CLARIFY");
  });

  it("classifies factual question as ANSWER", () => {
    expect(classifyMove("what is a mood episode?")).toBe("ANSWER");
  });

  it("classifies emotional disclosure as REFLECT_ASK (default)", () => {
    expect(classifyMove("my sister told everyone about my episode")).toBe("REFLECT_ASK");
  });

  it("classifies short question as ANSWER", () => {
    expect(classifyMove("how do I manage my sleep schedule?")).toBe("ANSWER");
  });

  it("classifies 'i just dont know' without question as CLARIFY", () => {
    expect(classifyMove("i dont know what's wrong with me")).toBe("CLARIFY");
  });

  it("classifies greeting as REFLECT_ASK (default)", () => {
    expect(classifyMove("hey nila")).toBe("REFLECT_ASK");
  });

  it("classifies 'i should just disappear' as REPAIR", () => {
    expect(classifyMove("i should just disappear")).toBe("REPAIR");
  });

  // F5 fix: "episode" as high-priority loaded word — must always be asked about
  it("classifies 'I had an episode' as CLARIFY (loaded word F5)", () => {
    expect(classifyMove("i had an episode today morning")).toBe("CLARIFY");
    expect(classifyMove("I don't know why I had the episode")).toBe("CLARIFY");
  });

  it("classifies help-seeking as REFLECT_ASK (positive coping, not crisis)", () => {
    expect(classifyMove("I consulted a psychiatrist in October")).toBe("REFLECT_ASK");
    expect(classifyMove("I started therapy last month")).toBe("REFLECT_ASK");
  });

  it("does NOT classify 'my sister told everyone about my episode' as CLARIFY", () => {
    // "my episode" in a third-person context — user is talking about sister, not self
    expect(classifyMove("my sister told everyone about my episode")).toBe("REFLECT_ASK");
  });
});

describe("moveEngine — resolveMove", () => {
  it("returns correct move + steer for HOLD", () => {
    const result = resolveMove(
      "and then this happened. and also that. same thing over and over. keeps happening. never changes."
    );
    expect(result.move).toBe("HOLD");
    expect(result.questionAllowed).toBe(false);
    expect(result.steer).toContain("HOLD mode");
    expect(result.exemplarMoves).toContain("hold");
  });

  it("returns correct move + steer for REPAIR", () => {
    const result = resolveMove("i'm a worthless burden");
    expect(result.move).toBe("REPAIR");
    expect(result.questionAllowed).toBe(true);
    expect(result.steer).toContain("REPAIR mode");
    expect(result.exemplarMoves).toContain("name-the-harshness");
  });

  it("returns correct move + steer for ANSWER", () => {
    const result = resolveMove("why do episodes happen?");
    expect(result.move).toBe("ANSWER");
    expect(result.questionAllowed).toBe(true);
    expect(result.steer).toContain("ANSWER mode");
    expect(result.exemplarMoves).toContain("one-fact+ask");
  });

  it("returns correct move + steer for CLARIFY", () => {
    const result = resolveMove("idk, just something");
    expect(result.move).toBe("CLARIFY");
    expect(result.questionAllowed).toBe(true);
    expect(result.steer).toContain("CLARIFY mode");
  });

  it("returns correct move + steer for REFLECT_ASK", () => {
    const result = resolveMove("my partner and i had a fight");
    expect(result.move).toBe("REFLECT_ASK");
    expect(result.questionAllowed).toBe(true);
    expect(result.steer).toContain("REFLECT_ASK mode");
  });
});

describe("moveEngine — maybeEscalateToDeepen", () => {
  it("escalates to DEEPEN when overlap is high", () => {
    const result = resolveMove("i keep thinking about the same thing");
    const escalated = maybeEscalateToDeepen(result, 0.8);
    expect(escalated.move).toBe("DEEPEN");
    expect(escalated.steer).toContain("DEEPEN mode");
  });

  it("does not escalate when overlap is low", () => {
    const result = resolveMove("i keep thinking about the same thing");
    const escalated = maybeEscalateToDeepen(result, 0.3);
    expect(escalated.move).toBe(result.move);
  });

  it("does not escalate non-REFLECT_ASK moves", () => {
    const result = resolveMove("i'm a worthless burden");
    const escalated = maybeEscalateToDeepen(result, 0.8);
    expect(escalated.move).toBe("REPAIR");
  });

  // DEEPEN wiring: resolveMove now computes topic overlap internally and calls
  // maybeEscalateToDeepen automatically — caller doesn't need to do it themselves.
  it("resolveMove internally escalates to DEEPEN (topic overlap computed automatically)", () => {
    const result = resolveMove("i keep thinking about the same thing", {
      recentNilaReplies: ["That sounds hard."],
      recentUserMessages: ["i keep thinking about the same thing", "i keep thinking about the same thing"],
    });
    expect(result.move).toBe("DEEPEN");
  });
});

describe("moveEngine — priority ordering", () => {
  it("REPAIR has priority over CLARIFY", () => {
    expect(classifyMove("i'm a failure and idk what to do")).toBe("REPAIR");
  });

  it("REPAIR has priority over ANSWER", () => {
    expect(classifyMove("i'm such a loser, why does this keep happening?")).toBe("REPAIR");
  });

  it("HOLD has priority over CLARIFY", () => {
    expect(
      classifyMove(
        "and then this happened. same thing over and over. keeps happening. never changes."
      )
    ).toBe("HOLD");
  });
});
