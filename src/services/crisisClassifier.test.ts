import { describe, it, expect, beforeEach } from "vitest";
import {
  detectCrisis,
  detectCrisisSignal,
  scoreCrisis,
  setCrisisEmbedder,
  setCrisisClassifierEnabled,
  crisisClassifierActive,
  CRISIS_THRESHOLD,
  CRISIS_HIGH_CONFIDENCE_THRESHOLD,
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

  // NEGATIVE GUARD wiring (2026-07-12 device-QA — CRITICAL false full-screen takeover): "whats/what's the
  // point of going on a diet if i/I dont/don't stick to it" must NOT be upgraded even at score≈1. This is the
  // guard for the reported bug: the deterministic keyword floor already treats this as benign
  // (hasExistentialHopelessness's referent escape hatch, safety.ts), but the on-device MiniLM classifier
  // independently scores it at 0.83-0.87 against the REAL model (crisisClassifier.realmodel.test.ts) — this
  // test proves the guard's WIRING with a deterministic mock (the real-model end-to-end regression lives in
  // crisisClassifier.realmodel.test.ts). Apostrophe-insensitive: the bug reproduced with and without them.
  it("ON: isBenignExistentialReferent suppresses a high-scoring 'going on a diet' MISS (with and without apostrophes)", async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(constEmbedder([...COEF])); // score ≈ 1 ≥ threshold
    expect(await detectCrisis("whats the point of going on a diet if i dont stick to it")).toBe(false);
    expect(await detectCrisis("what's the point of going on a diet if I don't stick to it")).toBe(false);
    expect(await detectCrisis("whats the point of going on vacation if my flight keeps getting delayed anyway")).toBe(false);
    expect(await detectCrisis("theres no point in any of this meeting lets reschedule")).toBe(false);
    expect(await detectCrisis("there's no point in any of this meeting, let's reschedule")).toBe(false);
    expect(await detectCrisis("i just want it all to stop this rain is ruining my trip")).toBe(false);
    // a phrase with NO referent/nuisance escape (genuine unescaped family member) is NOT suppressed by this
    // guard — though in practice it already hits via the keyword floor before the classifier is ever consulted.
    expect(await detectCrisis("whats the point of going on")).toBe(true);
    // a genuine euphemism with no existential-family phrasing at all is untouched by this guard.
    expect(await detectCrisis(EUPHEMISM)).toBe(true);
  });
});

// A TEXT-AWARE mock embedder (unlike constEmbedder, which ignores the input entirely): scores high only for
// text containing the euphemism substring below, and near-zero for everything else. Needed because the two-tier
// tests below exercise BOTH a classifier-only hit AND a genuine no-hit in the same describe block — a constant
// embedder can't distinguish them.
//
// MERGE NOTE (2026-07-12, main #34 reconciliation): was keyed on "better off without me" (matching
// "everyone would be better off without me"), but main independently narrowed INDIRECT_METAPHORS (safety.ts)
// so that exact substring now ALSO trips the keyword floor — a strictly stronger catch, not a regression, but
// it means that phrase no longer reaches the classifier at all, so it can't exercise this describe block's
// classifier-only tiering logic. Rekeyed to "burden much longer" (from "I won't be a burden much longer",
// confirmed classifier-only — see crisisClassifier.realmodel.test.ts's THE PROOF CASE).
const textAwareEmbedder: Embedder = async (text: string) =>
  text.includes("burden much longer") ? [...COEF] : zeros();

describe("detectCrisisSignal — two-tier (2026-07-12 Wave 3)", () => {
  beforeEach(() => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(textAwareEmbedder);
  });

  it("keyword-floor hit returns source:'keyword', tier:'full'", async () => {
    const s = await detectCrisisSignal("i want to kill myself");
    expect(s).toEqual({ hit: true, source: "keyword", tier: "full" });
  });
  // 2026-07-12 Bug 1 FIX (adversarial-review regression, NOT a weakening — see AGENTS.md guardrails / commit
  // message): the pre-fix version of this test asserted only source:'classifier', which under the OLD buggy
  // ModeScreen branch (`source === "classifier"` → soft card) implied a SOFT surface for this exact phrase.
  // That was the confirmed bug: "I won't be a burden much longer" is a genuine, high-confidence indirect
  // suicidal-ideation disclosure (real-model score 0.7533, see crisisClassifier.realmodel.test.ts) — it must
  // resolve tier:'full' (full-takeover CrisisOverlay), not tier:'soft'. source stays "classifier" (still true
  // — the keyword floor still misses this phrase); tier is the corrected field. (Phrase changed from
  // "everyone would be better off without me" during the main #34 merge — see textAwareEmbedder's comment
  // above for why.)
  it("classifier-only hit on a genuine high-confidence disclosure returns source:'classifier', tier:'full'", async () => {
    const s = await detectCrisisSignal("I won't be a burden much longer");
    expect(s.hit).toBe(true);
    expect(s.source).toBe("classifier");
    expect(s.tier).toBe("full");
  });
  it("no hit returns hit:false, source:null, tier:null", async () => {
    const s = await detectCrisisSignal("i had a good day today");
    expect(s).toEqual({ hit: false, source: null, tier: null });
  });
  it("detectCrisis() is byte-for-byte unchanged (regression guard)", async () => {
    expect(await detectCrisis("i want to kill myself")).toBe(true);
    expect(await detectCrisis("i had a good day today")).toBe(false);
  });
});

describe("detectCrisisSignal — tier is SCORE-based within classifier hits (2026-07-12 Bug 1 fix)", () => {
  // Builds a constant embedding along the shipped COEF direction that makes scoreCrisis() return EXACTLY
  // `targetProb` against the real shipped weights — same z = bias + alpha*||coef||² algebra as the "LR head
  // math is correct against the shipped weights" test above, solved for alpha. Deterministic, no real model.
  const embedderForScore = (targetProb: number): Embedder => {
    const z = Math.log(targetProb / (1 - targetProb));
    const sumSq = COEF.reduce((s, c) => s + c * c, 0);
    const alpha = (z - BIAS) / sumSq;
    return async () => COEF.map((c) => c * alpha);
  };

  beforeEach(() => {
    setCrisisClassifierEnabled(true);
  });

  it("a keyword-floor hit is tier:'full' regardless of the classifier score (source-independent tiering)", async () => {
    // Rigged to score in what WOULD be the soft band if this were classifier-only — proves tiering for a
    // keyword hit never even consults the classifier score.
    setCrisisEmbedder(embedderForScore((CRISIS_THRESHOLD + CRISIS_HIGH_CONFIDENCE_THRESHOLD) / 2));
    const s = await detectCrisisSignal(KEYWORD_CRISIS);
    expect(s).toEqual({ hit: true, source: "keyword", tier: "full" });
  });

  it("a classifier score at/above CRISIS_HIGH_CONFIDENCE_THRESHOLD is tier:'full'", async () => {
    setCrisisEmbedder(embedderForScore(Math.min(CRISIS_HIGH_CONFIDENCE_THRESHOLD + 0.05, 0.99)));
    const s = await detectCrisisSignal(EUPHEMISM);
    expect(s).toEqual({ hit: true, source: "classifier", tier: "full" });
  });

  it("a classifier score in the soft band (>= CRISIS_THRESHOLD, < CRISIS_HIGH_CONFIDENCE_THRESHOLD) is tier:'soft'", async () => {
    setCrisisEmbedder(embedderForScore((CRISIS_THRESHOLD + CRISIS_HIGH_CONFIDENCE_THRESHOLD) / 2));
    const s = await detectCrisisSignal(EUPHEMISM);
    expect(s).toEqual({ hit: true, source: "classifier", tier: "soft" });
  });

  it("a classifier score below CRISIS_THRESHOLD is not a hit at all: tier:null", async () => {
    setCrisisEmbedder(embedderForScore(Math.max(CRISIS_THRESHOLD - 0.1, 0.01)));
    const s = await detectCrisisSignal(EUPHEMISM);
    expect(s).toEqual({ hit: false, source: null, tier: null });
  });
});
