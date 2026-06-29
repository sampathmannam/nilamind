import { describe, it, expect } from "vitest";
import { actionForCard } from "./nilaCardDispatch";
import type { NilaCard } from "./nilaOrchestration";

describe("actionForCard", () => {
  it("maps a grounding card", () => {
    expect(actionForCard({ kind: "grounding", label: "Grounding" })).toEqual({ type: "grounding" });
  });
  it("maps an episode card", () => {
    expect(actionForCard({ kind: "episode", label: "I'm in an episode" })).toEqual({ type: "episode" });
  });
  it("maps a skill card to its skillId", () => {
    expect(actionForCard({ kind: "skill", skillId: "tipp", label: "TIPP" })).toEqual({ type: "skill", skillId: "tipp" });
  });
  it("maps a PHQ-9 screening card", () => {
    expect(actionForCard({ kind: "screening", instrument: "PHQ-9", label: "PHQ-9" })).toEqual({ type: "screening", instrument: "PHQ-9" });
  });
  it("maps a GAD-7 screening card", () => {
    expect(actionForCard({ kind: "screening", instrument: "GAD-7", label: "GAD-7" })).toEqual({ type: "screening", instrument: "GAD-7" });
  });
  it("returns null for a skill card missing its skillId", () => {
    expect(actionForCard({ kind: "skill", label: "broken" } as NilaCard)).toBeNull();
  });
  it("returns null for a screening card missing its instrument", () => {
    expect(actionForCard({ kind: "screening", label: "broken" } as NilaCard)).toBeNull();
  });
});
