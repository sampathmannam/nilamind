// Aggregate scored replies into a Scorecard: per-dimension + per-slice pass rates, anti-collapse metrics,
// and a single headline Move Score for at-a-glance regression tracking across model/RAG/steer changes.
import { MOVE_DIMENSIONS, dimensionPass, type MoveScore, type MoveDimension } from "./rubric";
import { antiCollapseReport, type AntiCollapseReport } from "./antiCollapse";

export interface ScoredReply {
  probe: string;
  tag: string;
  register: string;
  lang: string;
  reply: string;
  score: MoveScore;
}

export interface Scorecard {
  n: number;
  /** headline: mean pass rate across all dimensions and all replies, 0..1 */
  moveScore: number;
  byDimension: Record<MoveDimension, number>;
  byTag: Record<string, number>;
  byRegister: Record<string, number>;
  byLang: Record<string, number>;
  antiCollapse: AntiCollapseReport;
}

/** Mean dimension pass rate for a group of scored replies (the per-slice / headline number). */
function meanPassRate(rows: ScoredReply[]): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const r of rows) {
    for (const dim of MOVE_DIMENSIONS) sum += dimensionPass(r.score, dim) ? 1 : 0;
  }
  return sum / (rows.length * MOVE_DIMENSIONS.length);
}

function sliceBy(rows: ScoredReply[], key: (r: ScoredReply) => string): Record<string, number> {
  const groups = new Map<string, ScoredReply[]>();
  for (const r of rows) {
    const k = key(r);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  const out: Record<string, number> = {};
  for (const [k, group] of groups) out[k] = meanPassRate(group);
  return out;
}

export function buildScorecard(scored: ScoredReply[]): Scorecard {
  const byDimension = {} as Record<MoveDimension, number>;
  for (const dim of MOVE_DIMENSIONS) {
    byDimension[dim] = scored.length === 0 ? 0 : scored.filter((r) => dimensionPass(r.score, dim)).length / scored.length;
  }

  return {
    n: scored.length,
    moveScore: meanPassRate(scored),
    byDimension,
    byTag: sliceBy(scored, (r) => r.tag),
    byRegister: sliceBy(scored, (r) => r.register),
    byLang: sliceBy(scored, (r) => r.lang),
    antiCollapse: antiCollapseReport(scored.map((r) => r.reply)),
  };
}
