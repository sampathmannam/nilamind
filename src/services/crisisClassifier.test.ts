import { describe, it, expect, beforeEach } from "vitest";
import {
  detectCrisis,
  scoreCrisis,
  setCrisisEmbedder,
  setCrisisClassifierEnabled,
  crisisClassifierActive,
  CRISIS_THRESHOLD,
  type Embedder,
} from "./crisisClassifier";
import weights from "./crisisClassifier.weights.json";

const COEF = weights.coef as number[];
const BIAS = weights.bias as number;
const DIM = COEF.length;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

// deterministic mock embedders (the real one is Transformers.js MiniLM, device-verified separately)
const constEmbedder = (vec: number[]): Embedder => async () => vec;
const zeros = () => new Array(DIM).fill(0);

const KEYWORD_CRISIS = "I want to kill myself"; // trips the deterministic scanner
const EUPHEMISM = "the world would be lighter without me in it"; // keyword scanner MISSES this

beforeEach(() => {
  // isolate every test: classifier off, no embedder (the shipped default until device-verify)
  setCrisisClassifierEnabled(false);
  setCrisisEmbedder(null);
});

describe("crisisClassifier — additive, fail-closed §9 gate", () => {
  it("OFF by default: detectCrisis == keyword scanner", async () => {
    expect(crisisClassifierActive()).toBe(false);
    expect(await detectCrisis(KEYWORD_CRISIS)).toBe(true); // keyword floor
    expect(await detectCrisis(EUPHEMISM)).toBe(false); // classifier off → keyword misses it
  });

  it("scoreCrisis returns null when no embedder (never throws)", async () => {
    expect(await scoreCrisis(EUPHEMISM)).toBeNull();
  });

  it("LR head math is correct against the shipped weights", async () => {
    setCrisisClassifierEnabled(true);
    // zeros → z = bias → sigmoid(bias)
    setCrisisEmbedder(constEmbedder(zeros()));
    expect(await scoreCrisis("x")).toBeCloseTo(sigmoid(BIAS), 5);
    // +coef → z = bias + ||coef||² (large positive) → ~1
    setCrisisEmbedder(constEmbedder([...COEF]));
    const zPos = BIAS + COEF.reduce((s, c) => s + c * c, 0);
    expect(await scoreCrisis("x")).toBeCloseTo(sigmoid(zPos), 5);
    // -coef → large negative → ~0
    setCrisisEmbedder(constEmbedder(COEF.map((c) => -c)));
    const zNeg = BIAS - COEF.reduce((s, c) => s + c * c, 0);
    expect(await scoreCrisis("x")).toBeCloseTo(sigmoid(zNeg), 5);
  });

  it("ON: a high-scoring embedding upgrades a keyword MISS to crisis", async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(constEmbedder([...COEF])); // score ≈ 1 ≥ threshold
    expect(crisisClassifierActive()).toBe(true);
    expect(await detectCrisis(EUPHEMISM)).toBe(true);
  });

  it("ON: a low-scoring embedding leaves a keyword miss as not-crisis", async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(constEmbedder(zeros())); // score = sigmoid(bias) ≈ 0.03 < threshold
    expect(sigmoid(BIAS)).toBeLessThan(CRISIS_THRESHOLD);
    expect(await detectCrisis(EUPHEMISM)).toBe(false);
  });

  it("ADDITIVE invariant: the classifier never suppresses a keyword hit", async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(constEmbedder(COEF.map((c) => -c))); // score ≈ 0
    expect(await detectCrisis(KEYWORD_CRISIS)).toBe(true); // keyword still wins
  });

  it("FAIL-CLOSED: a throwing embedder degrades to keyword-only, never rejects", async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(async () => {
      throw new Error("model not loaded");
    });
    await expect(detectCrisis(EUPHEMISM)).resolves.toBe(false); // no throw → keyword result
    await expect(detectCrisis(KEYWORD_CRISIS)).resolves.toBe(true); // keyword floor intact
    expect(await scoreCrisis(EUPHEMISM)).toBeNull();
  });

  it("FAIL-CLOSED: a wrong-dimension embedding is ignored (null, keyword-only)", async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(constEmbedder([1, 2, 3])); // wrong dim
    expect(await scoreCrisis(EUPHEMISM)).toBeNull();
    expect(await detectCrisis(EUPHEMISM)).toBe(false);
  });

  it("enabled flag gates the classifier even with an embedder present", async () => {
    setCrisisEmbedder(constEmbedder([...COEF])); // would score high
    setCrisisClassifierEnabled(false);
    expect(crisisClassifierActive()).toBe(false);
    expect(await detectCrisis(EUPHEMISM)).toBe(false); // off → keyword-only
  });

  it("the shipped threshold is a sane probability", () => {
    expect(CRISIS_THRESHOLD).toBeGreaterThan(0);
    expect(CRISIS_THRESHOLD).toBeLessThan(1);
  });

  // NEGATIVE GUARD wiring — ordinary bad-day/fatigue distress must NOT be upgraded even when the embedding
  // scores ≈1 (the reported device false positive). Deterministic proof of the guard's placement in
  // detectCrisis; the real-model end-to-end lives in crisisClassifier.realmodel.test.ts.
  it("ON: isBenignExhaustion suppresses a high-scoring bad-day/fatigue MISS", async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(constEmbedder([...COEF])); // score ≈ 1 ≥ threshold
    expect(await detectCrisis("i had a really rough day and i just feel exhausted")).toBe(false);
    expect(await detectCrisis("i'm so exhausted")).toBe(false);
    // life-weariness / despair phrasing DEFERS to the classifier — the guard must NOT suppress it.
    expect(await detectCrisis("i'm exhausted by life and ready for it to be over")).toBe(true);
    expect(await detectCrisis("rough day and i feel like giving up")).toBe(true);
    // and a genuine euphemism with no fatigue frame is untouched by the guard.
    expect(await detectCrisis(EUPHEMISM)).toBe(true);
  });

  // NEGATIVE GUARD wiring — self-soothing dismissal ("i'm okay for now") must NOT be upgraded even at score≈1,
  // so an affirmative dismissal after a §9 surface clears instead of re-tripping (latch investigation).
  it("ON: isBenignOkayReassurance suppresses a high-scoring 'i'm okay' MISS", async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(constEmbedder([...COEF])); // score ≈ 1 ≥ threshold
    expect(await detectCrisis("i'm okay for now")).toBe(false);
    expect(await detectCrisis("i think i'm okay now")).toBe(false);
    // crisis-minimization / lethal phrasing DEFERS to the classifier — the guard must NOT suppress it.
    expect(await detectCrisis("i'm okay, don't worry about me")).toBe(true);
    expect(await detectCrisis("i'm okay now that i've decided to end it")).toBe(true);
    expect(await detectCrisis(EUPHEMISM)).toBe(true);
  });
});
