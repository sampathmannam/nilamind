import { describe, it, expect } from "vitest";
import {
  scenarios,
  evaluateScenario,
  computeAxisScores,
  type Scenario,
  type ScenarioResult,
  type AxisScores,
} from "./scenarioEvaluation";

/* ─── scenarios ─── */

describe("scenarios", () => {
  it("has scenarios covering all 5 axes", () => {
    const axes = new Set(scenarios.map((s) => s.axis));
    expect(axes.has("protocol_fidelity")).toBe(true);
    expect(axes.has("hallucination_risk")).toBe(true);
    expect(axes.has("behavioral_consistency")).toBe(true);
    expect(axes.has("crisis_safety")).toBe(true);
    expect(axes.has("demographic_robustness")).toBe(true);
  });

  it("each scenario has required fields", () => {
    for (const s of scenarios) {
      expect(s.id).toBeTruthy();
      expect(s.axis).toBeTruthy();
      expect(s.userMessage).toBeTruthy();
      expect(s.expectedBehavior).toBeTruthy();
      expect(s.forbiddenPatterns.length).toBeGreaterThan(0);
      for (const p of s.forbiddenPatterns) {
        expect(typeof p === "string" || p instanceof RegExp).toBe(true);
      }
    }
  });

  it("has at least 3 scenarios per axis", () => {
    const counts: Record<string, number> = {};
    for (const s of scenarios) {
      counts[s.axis] = (counts[s.axis] || 0) + 1;
    }
    for (const [axis, count] of Object.entries(counts)) {
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  it("crisis safety scenarios include forbidden patterns for method disclosure", () => {
    const crisis = scenarios.filter((s) => s.axis === "crisis_safety");
    const hasMethodForbidden = crisis.some((s) =>
      s.forbiddenPatterns.some((p) => {
        const src = typeof p === "string" ? p : p.source;
        return /method|means|how to|step.*step/i.test(src);
      })
    );
    expect(hasMethodForbidden).toBe(true);
  });

  it("hallucination scenarios forbid clinical claims", () => {
    const halluc = scenarios.filter((s) => s.axis === "hallucination_risk");
    const hasClinicalForbidden = halluc.some((s) =>
      s.forbiddenPatterns.some((p) => {
        const src = typeof p === "string" ? p : p.source;
        return /diagnos|treat|cure|medication/i.test(src);
      })
    );
    expect(hasClinicalForbidden).toBe(true);
  });
});

/* ─── evaluateScenario ─── */

describe("evaluateScenario", () => {
  it("returns pass for reply with no forbidden patterns", () => {
    const scenario = scenarios.find((s) => s.axis === "crisis_safety")!;
    const result = evaluateScenario(scenario, "I hear you. You're not alone. Let's breathe together.");
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("returns fail when reply contains forbidden pattern", () => {
    const scenario = scenarios.find((s) => s.id === "cs_02")!;
    const result = evaluateScenario(scenario, "Here's how you could do it: take pills and...");
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("returns required keywords present when reply contains them", () => {
    const scenario: Scenario = {
      id: "test_1",
      axis: "crisis_safety",
      name: "Test scenario",
      userMessage: "test",
      requiredKeywords: ["breath", "together"],
      forbiddenPatterns: [],
      expectedBehavior: "should be supportive",
    };
    const result = evaluateScenario(scenario, "Let's breathe together. I'm here.");
    expect(result.requiredPresent).toContain("breath");
    expect(result.requiredPresent).toContain("together");
  });

  it("returns missing keywords when reply lacks them", () => {
    const scenario: Scenario = {
      id: "test_2",
      axis: "protocol_fidelity",
      name: "Test protocol",
      userMessage: "I need help with grounding",
      requiredKeywords: ["ground", "5 things"],
      forbiddenPatterns: [],
      expectedBehavior: "should use grounding technique",
    };
    const result = evaluateScenario(scenario, "I understand you're feeling anxious.");
    expect(result.missingRequired.length).toBe(2);
  });
});

/* ─── computeAxisScores ─── */

describe("computeAxisScores", () => {
  it("returns scores for all 5 axes", () => {
    const results: ScenarioResult[] = scenarios.map((s) => ({
      scenario: s,
      passed: true,
      violations: [],
      requiredPresent: [],
      missingRequired: [],
    }));
    const scores = computeAxisScores(results);
    expect(scores.protocol_fidelity).toBe(100);
    expect(scores.hallucination_risk).toBe(100);
    expect(scores.behavioral_consistency).toBe(100);
    expect(scores.crisis_safety).toBe(100);
    expect(scores.demographic_robustness).toBe(100);
  });

  it("reduces score when scenarios fail", () => {
    const results: ScenarioResult[] = scenarios.map((s) => ({
      scenario: s,
      passed: s.axis !== "crisis_safety",
      violations: s.axis === "crisis_safety" ? ["method disclosure"] : [],
      requiredPresent: [],
      missingRequired: [],
    }));
    const scores = computeAxisScores(results);
    expect(scores.crisis_safety).toBeLessThan(100);
    expect(scores.protocol_fidelity).toBe(100);
  });

  it("returns 0 for axis with no scenarios", () => {
    const scores = computeAxisScores([]);
    for (const score of Object.values(scores)) {
      expect(score).toBe(0);
    }
  });
});
