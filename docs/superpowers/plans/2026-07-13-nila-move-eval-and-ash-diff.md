# Nila Move-Eval Harness + Ash-Diff Data Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the model-agnostic therapeutic-move eval harness + the Ash-diff dataset schema/validator, so Nila's reply quality becomes a measurable number instead of an eyeball.

**Architecture:** Pure-TypeScript services under `src/services/moveEval/`, mirroring existing patterns (`nilaCorpusValidate.ts`, `exemplarRetrieval.ts`). The judge and the reply-generator are injected as function interfaces (`JudgeFn`, `GenerateFn`) so the whole harness is unit-testable with mocks; real Claude-judge and real llama.cpp generation are thin runtime adapters behind those interfaces. Everything is model-agnostic — it scores replies, not models.

**Tech Stack:** TypeScript, Vitest (TDD), the existing repo tooling. No new runtime deps for the core.

## Global Constraints

- **§9 is model-independent and sacrosanct** — the eval SCORES a `§9-safe` dimension but never routes crisis itself; nothing here touches the crisis classifier/scripting.
- **Never ship raw teacher output** — `gold_nila` is authored/curated (`research-grounded-not-generic`).
- **Model-agnostic** — no module may hard-code Qwen or MiniCPM; the generator is injected.
- **Anti-collapse is first-class** — every aggregate reports length/question/move/repetition distribution.
- **Deterministic core** — no `Date.now()`/`Math.random()` in scored logic; pass timestamps/ids in.
- Follow existing file conventions; keep files focused and small.

## File Structure

- `src/services/moveEval/rubric.ts` — the scored move-rubric types + the dimension registry (single source of truth).
- `src/services/moveEval/judge.ts` — `JudgeFn` interface, judge-prompt builder, judge-response parser → `MoveScore`.
- `src/services/moveEval/antiCollapse.ts` — distribution metrics over a set of replies.
- `src/services/moveEval/scorecard.ts` — aggregate scored replies → `Scorecard` (per-dimension + per-slice pass rates, anti-collapse, headline Move Score).
- `src/services/moveEval/runEval.ts` — orchestration: probes + `GenerateFn` + `JudgeFn` → `Scorecard`. Thin; fully mockable.
- `src/services/ashDiff/schema.ts` — `AshDiffRow` type + `validateAshDiff()` (schema + anti-collapse over the dataset).
- `docs/nila-corpus/ash-diff/probes.seed.jsonl` — a small authored seed of example rows (fixtures + the known 2026-07-13 before/after anchor).
- Tests co-located as `*.test.ts` beside each module.

## Task Interfaces (shared types — every task relies on these)

```ts
// rubric.ts
export type MoveKind = "normalize" | "reframe" | "gently-challenge" | "sit-with";
export type TurnKind = "question" | "no-question-turnback" | "none";
export interface MoveScore {
  name: boolean;            // reflected the specific feeling
  move: MoveKind | null;    // the middle move used, or null if absent
  moveAppropriate: boolean; // move fits the message
  turn: TurnKind;
  sentences: number;
  prose: boolean;           // no markdown/bullets/numbered steps
  noPreamble: boolean;
  noSycophancy: boolean;
  section9Safe: boolean;
  holistic: 0 | 1 | 2 | 3;  // closeness to the intended/gold move
}
export const MOVE_DIMENSIONS = [
  "name", "moveAppropriate", "turn", "form", "prose", "noPreamble", "noSycophancy", "section9Safe",
] as const;
export type MoveDimension = typeof MOVE_DIMENSIONS[number];
```

```ts
// ashDiff/schema.ts
export interface AshDiffRow {
  id: string; tag: string; register: string; lang: string;
  probe: string; ashReply: string; nilaReplyCurrent: string;
  moveLabels: { name: 0|1; move: MoveKind; turn: TurnKind; sentences: number };
  delta: string; goldNila: string;
}
```

```ts
// judge.ts
export type JudgeFn = (input: { probe: string; reply: string; gold: string }) => Promise<MoveScore>;
// scorecard.ts
export interface ScoredReply { probe: string; tag: string; register: string; lang: string; reply: string; score: MoveScore; }
export interface Scorecard {
  n: number; moveScore: number; // headline 0..1
  byDimension: Record<MoveDimension, number>;
  byTag: Record<string, number>; byRegister: Record<string, number>; byLang: Record<string, number>;
  antiCollapse: ReturnType<typeof import("./antiCollapse").antiCollapseReport>;
}
// runEval.ts
export type GenerateFn = (probe: string) => Promise<string>;
```

---

### Task 1: Ash-diff dataset schema + validator

**Files:** Create `src/services/ashDiff/schema.ts`, Test `src/services/ashDiff/schema.test.ts`

**Interfaces:** Produces `AshDiffRow`, `validateAshDiff(rows): { errors: string[]; warnings: string[] }`.

- [ ] **Step 1: Failing test** — rows with duplicate id, empty probe/goldNila, and a `goldNila` over 3 sentences are errors; a tag/register over a cap and a question-ending-ratio far from 50/50 over `goldNila` are warnings. A clean small set has no errors.
- [ ] **Step 2: Run → fails** (`validateAshDiff` not defined).
- [ ] **Step 3: Implement** — mirror `nilaCorpusValidate.ts` (reuse its sentence-count logic; extract a shared `sentenceCount` helper if clean). Cap tag/register at 30%; question ratio healthy 30–70%.
- [ ] **Step 4: Run → passes.**
- [ ] **Step 5: Commit.**

### Task 2: Move-rubric types + registry guard

**Files:** Create `src/services/moveEval/rubric.ts`, Test `src/services/moveEval/rubric.test.ts`

- [ ] **Step 1: Failing test** — `MOVE_DIMENSIONS` covers every scored dimension; a helper `dimensionPass(score, dim)` maps a `MoveScore` to a boolean per dimension (e.g. `form` = sentences ≤ 3; `turn` = not `"none"`). Assert `dimensionPass` handles all dimensions and that `form` fails at 4 sentences.
- [ ] **Step 2: Run → fails.**
- [ ] **Step 3: Implement** the types + `dimensionPass`.
- [ ] **Step 4: Run → passes.**
- [ ] **Step 5: Commit.**

### Task 3: Judge prompt builder + response parser

**Files:** Create `src/services/moveEval/judge.ts`, Test `src/services/moveEval/judge.test.ts`

**Interfaces:** `buildJudgePrompt({probe, reply, gold}): string`, `parseJudgeResponse(json: string): MoveScore`, `makeJudge(call): JudgeFn` where `call(prompt): Promise<string>` is the injected LLM transport.

- [ ] **Step 1: Failing test** — `buildJudgePrompt` includes the probe, reply, gold, and every rubric dimension + a blind instruction (never reveal which model). `parseJudgeResponse` turns a well-formed judge JSON into a valid `MoveScore`, and throws on malformed JSON. `makeJudge` with a stubbed `call` returning fixed JSON yields the parsed `MoveScore`.
- [ ] **Step 2: Run → fails.**
- [ ] **Step 3: Implement.** Real Claude transport is NOT built here (runtime adapter, Task 7-note); the interface is what's tested.
- [ ] **Step 4: Run → passes.**
- [ ] **Step 5: Commit.**

### Task 4: Anti-collapse metrics

**Files:** Create `src/services/moveEval/antiCollapse.ts`, Test `src/services/moveEval/antiCollapse.test.ts`

**Interfaces:** `antiCollapseReport(replies: string[]): { lengthHist: Record<string,number>; questionEndRatio: number; repetitionRate: number; }`

- [ ] **Step 1: Failing test** — a set of identical replies reports `repetitionRate` ~1 and a degenerate `lengthHist`; a varied set reports a spread and a mid `questionEndRatio`. Empty input returns zeros, not NaN.
- [ ] **Step 2: Run → fails.**
- [ ] **Step 3: Implement** — length histogram by sentence-count bucket (1/2/3/4+); question-end ratio; repetition = mean pairwise trigram-overlap (cheap, deterministic).
- [ ] **Step 4: Run → passes.**
- [ ] **Step 5: Commit.**

### Task 5: Scorecard aggregator

**Files:** Create `src/services/moveEval/scorecard.ts`, Test `src/services/moveEval/scorecard.test.ts`

**Interfaces:** `buildScorecard(scored: ScoredReply[]): Scorecard`.

- [ ] **Step 1: Failing test** — given a handful of `ScoredReply`s, `byDimension` pass rates are correct, `byTag`/`byRegister`/`byLang` slice correctly, `moveScore` is the mean dimension pass rate (headline), and `antiCollapse` is populated. Empty input → `n: 0`, no NaN.
- [ ] **Step 2: Run → fails.**
- [ ] **Step 3: Implement** using `dimensionPass` (Task 2) + `antiCollapseReport` (Task 4).
- [ ] **Step 4: Run → passes.**
- [ ] **Step 5: Commit.**

### Task 6: End-to-end orchestration (mockable)

**Files:** Create `src/services/moveEval/runEval.ts`, Test `src/services/moveEval/runEval.test.ts`

**Interfaces:** `runEval({ probes, generate, judge }): Promise<Scorecard>` where `probes: Array<{probe,tag,register,lang,gold}>`.

- [ ] **Step 1: Failing test** — with a mock `generate` (echoes a canned reply per probe) and a mock `judge` (returns a fixed `MoveScore`), `runEval` produces a `Scorecard` with the right `n` and slices. A generator that throws for one probe drops that probe to a logged skip, not a crash.
- [ ] **Step 2: Run → fails.**
- [ ] **Step 3: Implement** — sequential generate→judge per probe, fail-open per probe, assemble via `buildScorecard`.
- [ ] **Step 4: Run → passes.**
- [ ] **Step 5: Commit.**

### Task 7: Seed fixtures + the registerSteer sanity anchor

**Files:** Create `docs/nila-corpus/ash-diff/probes.seed.jsonl`, Test `src/services/moveEval/sanityAnchor.test.ts`

- [ ] **Step 1:** Author ~8 `AshDiffRow` seed rows spanning tags/registers/langs, each schema-valid, including the **advice_seeking** row with the real 2026-07-13 before (`nilaReplyCurrent` = the 8-sentence advice dump) and the authored `goldNila` (the reflect-and-turn-back).
- [ ] **Step 2: Failing test** — load the seed, `validateAshDiff` reports zero errors; then feed the known before-reply and after-reply through `runEval` with a *rule-based mock judge* (scores form/turn/no-preamble deterministically from text) and assert the after-reply's `moveScore` > the before-reply's. (The harness must "see" the win we verified by eye.)
- [ ] **Step 3: Run → fails, then implement/fix seed until green.**
- [ ] **Step 4: Commit.**

---

## Follow-on tasks — need device / human / judge API (NOT auto-executed; staged)

These are documented so the plan is complete, but they require resources outside an autonomous run. Each is its own mini-effort.

- **Task 8 — Ash data collection (device):** adb-probe Ash across the tag×register×lang matrix (~200 rows), transcribe `ashReply` + capture `nilaReplyCurrent`. Needs: phone free, connectivity, foreground-activity guard, stop-on-call. Fills `probes.jsonl`.
- **Task 9 — gold_nila authoring/curation (human, D4):** I draft `goldNila` per row from the rubric; user curates. Never raw teacher output.
- **Task 10 — judge calibration (human + API, the riskiest assumption):** hand-label 30 replies, run the real Claude judge via the transport adapter, measure agreement; only trust scorecards once agreement clears the bar.
- **Task 11 — real transports:** thin adapters — Claude judge `call(prompt)`, and `GenerateFn` for laptop-proxy (llama.cpp on the GGUF) + device (adb). Behind the interfaces from Tasks 3/6.
- **Task 12 — MiniCPM spike (parallel, device):** bring-up + latency + 5 companion prompts + Hinglish/Tamil, scored via the harness.

## Completion

After Tasks 1–7 (the autonomous software core) are green, run the full suite, then use superpowers:finishing-a-development-branch. Do NOT push without explicit user confirmation. The follow-on Tasks 8–12 are scheduled with the user when device/API/human resources are available.
