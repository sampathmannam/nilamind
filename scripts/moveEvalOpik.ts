// DEV-ONLY bridge: pushes move-eval scorecards into a self-hosted Opik instance (LLM eval/observability
// platform, https://github.com/comet-ml/opik) so eval runs are a comparable, persistent dashboard instead of
// a one-off console.log. This file lives under scripts/, not src/ — it is never imported by the app entry
// (index.html -> src/main.tsx), so it cannot end up in the Capacitor/Android bundle. Point it at a LOCAL,
// self-hosted Opik (OPIK_URL_OVERRIDE=http://localhost:5173/api, no OPIK_API_KEY needed — self-host mode
// requires no key) — never at Comet's cloud. That keeps this consistent with NilaMind's runtime invariant
// (no server, no telemetry, zero-egress): this tool runs on the developer's laptop, scores test probes, and
// never touches user data. See docs/superpowers/specs/2026-07-13-nila-move-eval-and-ash-diff-design.md and
// src/services/moveEval/judgeTransport.ts (same dev-only posture, same reasoning).
import { Opik, evaluate, BaseMetric, type EvaluationScoreResult } from "opik";
import { z } from "zod";
import { MOVE_DIMENSIONS, dimensionPass, type MoveScore } from "../src/services/moveEval/rubric";
import type { EvalProbe } from "../src/services/moveEval/runEval";

export interface MoveEvalRun {
  /** experiment name shown in the Opik UI — typically the model/variant under test, e.g. "qwen-post-steer" */
  systemName: string;
  probe: EvalProbe;
  reply: string;
  score: MoveScore;
}

const moveMetricInput = z.object({
  reply: z.string(),
  score: z.custom<MoveScore>(),
});

/** Replays an already-computed MoveScore as per-dimension 0/1 scores + a normalized holistic score. Reuses
 *  dimensionPass() — the same pass/fail logic buildScorecard() uses — so the Opik numbers and a local
 *  runEval() scorecard can never silently drift apart. */
class MoveScoreMetric extends BaseMetric<typeof moveMetricInput> {
  public readonly validationSchema = moveMetricInput;

  constructor() {
    super("move_score", true);
  }

  score(input: unknown): EvaluationScoreResult[] {
    const { score } = this.validationSchema.parse(input);
    const results: EvaluationScoreResult[] = MOVE_DIMENSIONS.map((dim) => ({
      name: dim,
      value: dimensionPass(score, dim) ? 1 : 0,
    }));
    results.push({ name: "holistic", value: score.holistic / 3 });
    return results;
  }
}

/** Push one system's scored replies into Opik as a dataset ("move-eval probes") + one experiment per system,
 *  so multiple systems scored against the same probes become directly comparable in the Opik UI. */
export async function pushMoveEvalRuns(runs: MoveEvalRun[], opik: Opik = new Opik()): Promise<void> {
  const bySystem = new Map<string, MoveEvalRun[]>();
  for (const run of runs) {
    (bySystem.get(run.systemName) ?? bySystem.set(run.systemName, []).get(run.systemName)!).push(run);
  }

  const dataset = await opik.getOrCreateDataset("nila-move-eval");
  const byProbe = new Map<string, MoveEvalRun>();
  for (const run of runs) byProbe.set(run.probe.probe, run);
  await dataset.insert(
    [...byProbe.values()].map((run) => ({
      probe: run.probe.probe,
      tag: run.probe.tag,
      register: run.probe.register,
      lang: run.probe.lang,
      gold: run.probe.gold,
    })),
  );

  for (const [systemName, systemRuns] of bySystem) {
    const replyByProbe = new Map(systemRuns.map((r) => [r.probe.probe, r]));
    await evaluate({
      dataset,
      experimentName: systemName,
      tags: [...new Set(systemRuns.map((r) => r.probe.tag))],
      task: (item) => {
        const run = replyByProbe.get(item.probe as string);
        if (!run) throw new Error(`no recorded reply for probe "${item.probe}" under system "${systemName}"`);
        return { reply: run.reply, score: run.score };
      },
      scoringMetrics: [new MoveScoreMetric()],
    });
  }

  await opik.flush();
}
