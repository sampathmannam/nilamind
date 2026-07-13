// End-to-end orchestration: for each probe, generate a Nila reply IN DEPLOYMENT SHAPE, judge it blind,
// and assemble a Scorecard. Generation and judging are injected (GenerateFn / JudgeFn), so this is fully
// unit-testable with mocks; the real adapters (laptop-proxy llama.cpp, on-device adb, Claude judge) plug in
// behind those interfaces. Fail-open per probe — one dead generation never sinks the whole run.
import type { JudgeFn } from "./judge";
import { buildScorecard, type ScoredReply, type Scorecard } from "./scorecard";

export interface EvalProbe {
  probe: string;
  tag: string;
  register: string;
  lang: string;
  /** the authored gold reply, passed to the judge for the holistic closeness score */
  gold: string;
}

/** Produce a reply for a probe using the deployment prompt pipeline (proxy or device adapter). */
export type GenerateFn = (probe: string) => Promise<string>;

export interface RunEvalArgs {
  probes: EvalProbe[];
  generate: GenerateFn;
  judge: JudgeFn;
  /** optional sink for per-probe skips (default: console.warn) */
  onSkip?: (probe: EvalProbe, err: unknown) => void;
}

export async function runEval({ probes, generate, judge, onSkip }: RunEvalArgs): Promise<Scorecard> {
  const scored: ScoredReply[] = [];
  for (const p of probes) {
    try {
      const reply = await generate(p.probe);
      const score = await judge({ probe: p.probe, reply, gold: p.gold });
      scored.push({ probe: p.probe, tag: p.tag, register: p.register, lang: p.lang, reply, score });
    } catch (err) {
      (onSkip ?? ((pr, e) => console.warn(`eval skip: ${pr.probe}`, e)))(p, err);
    }
  }
  return buildScorecard(scored);
}
