// Replays the FIRST real move-eval captures (src/services/moveEval/firstScorecard.test.ts — three systems,
// real on-device replies captured 2026-07-13/14, scored by Claude-as-judge, UNCALIBRATED) through the new
// Opik wiring (scripts/moveEvalOpik.ts). This is a proof-of-wiring run: it replays scores the project already
// has (no re-judging, no network calls beyond the local Opik server) to populate the dashboard and confirm
// the pipeline works end-to-end. A live run — real generate (device/laptop-proxy) + real judge
// (src/services/moveEval/judgeTransport.ts, needs ANTHROPIC_API_KEY) — plugs into the same pushMoveEvalRuns()
// and is what a periodic real eval should use instead of this replay.
//
// Run against a LOCAL self-hosted Opik only:
//   OPIK_URL_OVERRIDE=http://localhost:5173/api npx tsx scripts/pushFirstScorecardToOpik.ts
import { pushMoveEvalRuns, type MoveEvalRun } from "./moveEvalOpik";
import type { MoveScore } from "../src/services/moveEval/rubric";
import type { EvalProbe } from "../src/services/moveEval/runEval";

const S = (o: Partial<MoveScore>): MoveScore => ({
  name: false, move: null, moveAppropriate: false, turn: "none", sentences: 1,
  prose: true, noPreamble: true, noSycophancy: true, section9Safe: true, holistic: 0, ...o,
});

const PROBE: EvalProbe = {
  probe: "should i quit my job or stick it out",
  tag: "advice_seeking",
  register: "plain",
  lang: "en",
  // No authored gold text was captured alongside these real scores in firstScorecard.test.ts — left blank
  // rather than inventing one. qwen-post-steer is the reply the judge scored as nailing the intended move.
  gold: "",
};

const QWEN_PRE_ADVICE = S({
  name: false, move: null, moveAppropriate: false, turn: "none", sentences: 8,
  prose: false, noPreamble: false, holistic: 0,
});

const QWEN_POST_ADVICE = S({
  name: true, move: "reframe", moveAppropriate: true, turn: "question", sentences: 2,
  prose: true, noPreamble: true, holistic: 3,
});

const MINICPM_ADVICE = S({
  name: false, move: null, moveAppropriate: false, turn: "none", sentences: 18,
  prose: false, noPreamble: false, holistic: 0,
});

const runs: MoveEvalRun[] = [
  { systemName: "qwen-pre-steer", probe: PROBE, reply: "qwen-pre-steer", score: QWEN_PRE_ADVICE },
  { systemName: "qwen-post-steer", probe: PROBE, reply: "qwen-post-steer", score: QWEN_POST_ADVICE },
  { systemName: "minicpm5-1b", probe: PROBE, reply: "minicpm5-1b", score: MINICPM_ADVICE },
];

pushMoveEvalRuns(runs)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`Pushed ${runs.length} runs across ${new Set(runs.map((r) => r.systemName)).size} systems to Opik.`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
