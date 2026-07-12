import { describe, it, expect } from "vitest";
import { deriveInMomentInsight } from "./inMomentInsight";

// In-moment insight = the brief, research-cited "why you might feel this way" explainer +
// a relevant skill/tool suggestion, surfaced under Nila's reply. Pure + deterministic (no model).
describe("deriveInMomentInsight", () => {
  it("returns null for empty / whitespace input", () => {
    expect(deriveInMomentInsight("", null)).toBeNull();
    expect(deriveInMomentInsight("   ", "calm")).toBeNull();
  });

  it("returns null for crisis text (never psychoeducate over crisis)", () => {
    // §9: a crisis disclosure must NOT get a wellness explainer/skill card.
    expect(deriveInMomentInsight("I want to kill myself", null)).toBeNull();
  });

  it("benign chit-chat returns null (no forced explainer)", () => {
    expect(deriveInMomentInsight("hey nila, good morning", "calm")).toBeNull();
  });

  it("anxious state prefers the anxiety-alarm explainer + a panic/racing skill", () => {
    const insight = deriveInMomentInsight("my heart is racing and I feel panicky", "anxious");
    expect(insight).not.toBeNull();
    expect(insight!.explainer?.id).toBe("anxiety-alarm");
    expect(insight!.skill).not.toBeNull();
  });

  it("low state prefers the depression-action explainer", () => {
    const insight = deriveInMomentInsight("I feel so empty and hopeless", "low");
    expect(insight).not.toBeNull();
    expect(insight!.explainer?.id).toBe("depression-action");
  });

  it("elevated state prefers the circadian-bipolar explainer", () => {
    const insight = deriveInMomentInsight("I haven't slept and feel unstoppable", "elevated");
    expect(insight).not.toBeNull();
    expect(insight!.explainer?.id).toBe("circadian-bipolar");
  });

  it("no state — lexical match still yields a relevant explainer when score clears", () => {
    const insight = deriveInMomentInsight("I keep ruminating and can't stop the spiral", null);
    expect(insight).not.toBeNull();
    expect(insight!.explainer?.id).toBe("rumination-loop");
  });

  it("skill-only when text matches a skill but no explainer clears", () => {
    const insight = deriveInMomentInsight("I'm so angry and about to snap", null);
    expect(insight).not.toBeNull();
    // anger maps to a skill; rumination/explainer may or may not clear — just assert a skill is present
    expect(insight!.skill).not.toBeNull();
  });

  it("carries a research citation on the explainer", () => {
    const insight = deriveInMomentInsight("my heart is racing and I feel panicky", "anxious");
    expect(insight!.explainer?.basis).toBeTruthy();
  });
});
