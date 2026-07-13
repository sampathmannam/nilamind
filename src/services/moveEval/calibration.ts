// Judge-validity calibration — the riskiest-assumption guard. Before we trust any scorecard, the LLM judge
// must agree with human judgement on the move rubric. Feed a small set of {human, judge} label pairs and this
// reports per-dimension + holistic agreement, and whether the judge clears a trust threshold. If it doesn't,
// fix the judge prompt (or model) before believing a single downstream number.
import { MOVE_DIMENSIONS, dimensionPass, type MoveScore, type MoveDimension } from "./rubric";

export interface LabelPair {
  human: MoveScore;
  judge: MoveScore;
}

export interface CalibrationReport {
  n: number;
  /** mean per-dimension agreement across all dimensions and pairs, 0..1 */
  overall: number;
  byDimension: Record<MoveDimension, number>;
  /** fraction where judge holistic exactly equals human holistic */
  holisticExact: number;
  /** fraction where |judge - human| holistic <= 1 (the realistic bar for a 0-3 scale) */
  holisticWithin1: number;
  /** does `overall` clear the given trust threshold? */
  meetsThreshold: (t: number) => boolean;
}

export function calibrationReport(pairs: LabelPair[]): CalibrationReport {
  const byDimension = {} as Record<MoveDimension, number>;
  for (const dim of MOVE_DIMENSIONS) {
    byDimension[dim] =
      pairs.length === 0
        ? 0
        : pairs.filter((p) => dimensionPass(p.human, dim) === dimensionPass(p.judge, dim)).length / pairs.length;
  }

  const overall =
    pairs.length === 0 ? 0 : MOVE_DIMENSIONS.reduce((s, d) => s + byDimension[d], 0) / MOVE_DIMENSIONS.length;

  const holisticExact =
    pairs.length === 0 ? 0 : pairs.filter((p) => p.human.holistic === p.judge.holistic).length / pairs.length;
  const holisticWithin1 =
    pairs.length === 0 ? 0 : pairs.filter((p) => Math.abs(p.human.holistic - p.judge.holistic) <= 1).length / pairs.length;

  return {
    n: pairs.length,
    overall,
    byDimension,
    holisticExact,
    holisticWithin1,
    meetsThreshold: (t: number) => overall >= t,
  };
}
