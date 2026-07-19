import { describe, it, expect, beforeEach } from "vitest";
import {
  scoreAffect,
  setAffectEmbedder,
  setAffectAccentEnabled,
  affectAccentActive,
  type AffectEmbedder,
} from "./affectHead";
import weights from "./affectHead.weights.json";

const VALENCE_COEF = weights.valenceCoef as number[];
const VALENCE_BIAS = weights.valenceBias as number;
const AROUSAL_COEF = weights.arousalCoef as number[];
const AROUSAL_BIAS = weights.arousalBias as number;
const DIM = VALENCE_COEF.length;

const constEmbedder = (vec: number[]): AffectEmbedder => async () => vec;
const zeros = () => new Array(DIM).fill(0);

beforeEach(() => {
  setAffectAccentEnabled(false);
  setAffectEmbedder(null);
});

describe("affectHead — additive, fail-closed valence/arousal scorer", () => {
  it("OFF by default: scoreAffect returns null even with an embedder present", async () => {
    expect(affectAccentActive()).toBe(false);
    setAffectEmbedder(constEmbedder(zeros()));
    expect(await scoreAffect("anything")).toBeNull();
  });

  it("scoreAffect returns null when enabled but no embedder", async () => {
    setAffectAccentEnabled(true);
    expect(await scoreAffect("anything")).toBeNull();
  });

  it("head math is correct against the shipped weights (zeros embedding -> tanh(bias))", async () => {
    setAffectAccentEnabled(true);
    setAffectEmbedder(constEmbedder(zeros()));
    const result = await scoreAffect("x");
    expect(result).not.toBeNull();
    expect(result!.valence).toBeCloseTo(Math.tanh(VALENCE_BIAS), 5);
    expect(result!.arousal).toBeCloseTo(Math.tanh(AROUSAL_BIAS), 5);
  });

  it("head math is correct for a non-trivial embedding", async () => {
    setAffectAccentEnabled(true);
    setAffectEmbedder(constEmbedder([...VALENCE_COEF]));
    const result = await scoreAffect("x");
    const zValence = VALENCE_BIAS + VALENCE_COEF.reduce((s, c) => s + c * c, 0);
    expect(result!.valence).toBeCloseTo(Math.tanh(zValence), 5);
  });

  it("fails closed on embedder throw", async () => {
    setAffectAccentEnabled(true);
    setAffectEmbedder(async () => { throw new Error("boom"); });
    expect(await scoreAffect("x")).toBeNull();
  });

  it("fails closed on wrong embedding dimension", async () => {
    setAffectAccentEnabled(true);
    setAffectEmbedder(constEmbedder([1, 2, 3]));
    expect(await scoreAffect("x")).toBeNull();
  });

  it("affectAccentActive requires both enabled and an embedder", () => {
    expect(affectAccentActive()).toBe(false);
    setAffectAccentEnabled(true);
    expect(affectAccentActive()).toBe(false);
    setAffectEmbedder(constEmbedder(zeros()));
    expect(affectAccentActive()).toBe(true);
  });
});
