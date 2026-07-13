# Ash-Calibrated Corpus Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow Nila's exemplar-RAG corpus (`docs/nila-corpus/seed.jsonl`) from 42 to 100+ gold exchanges, using Ash (Slingshot AI's competitor MH app, already signed in on the connected device `ZD2232FCR5`) purely as a live UX/quality benchmark — never copying its wording — so retrieval actually finds a good match for more real phrasings, closing the P1→P2 gap already scoped in `docs/nila-corpus/CORPUS_DESIGN.md`.

**Architecture:** No new subsystems. This extends the existing exemplar-RAG pipeline: `docs/nila-corpus/seed.jsonl` (source of truth) → `scripts/gen-exemplars.mjs` (codegen, unchanged) → `src/services/nilaExemplars.ts` (generated) → `src/services/exemplarRetrieval.ts` (cosine retrieval, unchanged) → `src/services/localNila.ts` (injection, unchanged). Work is corpus content + one new validator module + expanded test coverage, not new retrieval logic.

**Tech Stack:** TypeScript, Vitest, Node (`scripts/gen-exemplars.mjs`), adb (device probing of Ash + on-device verification), existing on-device MiniLM embedder (`transformersEmbedder` in `src/main.tsx`).

## Global Constraints

- Every new gold reply must clear all 11 rubric rules in `docs/nila-corpus/CORPUS_DESIGN.md` (short, no sycophancy, no preamble, plain prose, §9-safe, etc.) — copied verbatim from that doc, not restated here.
- Never copy Ash's exact wording into a `nila` field — only its structural pattern (what it does first/next), same discipline as the existing "Competitive study — Ash" section.
- Never freelance crisis language in a gold reply — explicit self-harm/suicide stays the §9 gate's job (`crisis_adjacent` tag is the LOW/non-explicit case only, per existing boundary note).
- `opening_move` no more than ~25-30% of the full corpus; `ends_in_question` roughly 50/50; sentence length spread across 1-3 — checked across the WHOLE corpus after growth, not just new rows.
- `docs/nila-corpus/seed.jsonl` is the only hand-edited source; `src/services/nilaExemplars.ts` is always regenerated via `node scripts/gen-exemplars.mjs`, never hand-edited.
- Full suite (`npm test`) must be green before any commit.
- Do not touch the unrelated in-progress changes already sitting on branch `fix/auto-update-privacy` (`src/App.tsx`, fastlane images) — this work happens in an isolated worktree off `main` (`0d06c2b`).
- Confirm with the user before pushing/publishing (standing preference — commit locally, stop for review).

---

### Task 0: Isolated worktree

**Files:** none (workspace setup only)

- [ ] **Step 1: Create a worktree off main**

```bash
cd /Users/sujithsampath/nilamind
git worktree add .claude/worktrees/ash-corpus-expansion -b feat/ash-corpus-expansion main
cd .claude/worktrees/ash-corpus-expansion
npm install
```

- [ ] **Step 2: Verify baseline is green**

Run: `npm test`
Expected: all existing suites PASS (baseline before any changes).

All subsequent tasks operate inside `.claude/worktrees/ash-corpus-expansion`.

---

### Task 1: Corpus validator (schema + anti-collapse balance) — TDD

**Files:**
- Create: `src/services/nilaCorpusValidate.ts`
- Test: `src/services/nilaCorpusValidate.test.ts`

**Interfaces:**
- Produces: `validateCorpus(exemplars: NilaExemplar[]): CorpusValidationReport` where
  ```ts
  export interface CorpusValidationReport {
    errors: string[];   // hard failures: schema violations, duplicate ids/user text
    warnings: string[]; // soft: balance thresholds exceeded
  }
  ```
  `errors.length === 0` means the corpus is safe to ship; `warnings` surfaces anti-collapse drift for a human to rebalance.
- Consumes: `NilaExemplar` type from `./nilaExemplars` (already defined: `id`, `tag`, `user`, `nila`, optional `move`, `register`).

- [ ] **Step 1: Write the failing test**

```ts
// src/services/nilaCorpusValidate.test.ts
import { describe, it, expect } from "vitest";
import { validateCorpus } from "./nilaCorpusValidate";
import type { NilaExemplar } from "./nilaExemplars";

function ex(over: Partial<NilaExemplar>): NilaExemplar {
  return { id: "id_1", tag: "venting_dump", user: "user turn", nila: "nila reply.", ...over };
}

describe("validateCorpus", () => {
  it("passes a clean, balanced corpus with no errors", () => {
    const corpus: NilaExemplar[] = [
      ex({ id: "a", tag: "venting_dump", user: "u1", nila: "r1. r2." }),
      ex({ id: "b", tag: "good_news", user: "u2", nila: "r3?" }),
    ];
    const report = validateCorpus(corpus);
    expect(report.errors).toEqual([]);
  });

  it("flags a duplicate id as an error", () => {
    const corpus: NilaExemplar[] = [ex({ id: "dup", user: "u1" }), ex({ id: "dup", user: "u2" })];
    const report = validateCorpus(corpus);
    expect(report.errors.some((e) => e.includes("duplicate id"))).toBe(true);
  });

  it("flags a duplicate user turn as an error", () => {
    const corpus: NilaExemplar[] = [
      ex({ id: "a", user: "same text" }),
      ex({ id: "b", user: "same text" }),
    ];
    const report = validateCorpus(corpus);
    expect(report.errors.some((e) => e.includes("duplicate user"))).toBe(true);
  });

  it("flags an empty user or nila field as an error", () => {
    const corpus: NilaExemplar[] = [ex({ id: "a", user: "" })];
    const report = validateCorpus(corpus);
    expect(report.errors.some((e) => e.includes("empty"))).toBe(true);
  });

  it("flags a nila reply over 3 sentences as an error", () => {
    const corpus: NilaExemplar[] = [ex({ id: "a", nila: "One. Two. Three. Four." })];
    const report = validateCorpus(corpus);
    expect(report.errors.some((e) => e.includes("sentence"))).toBe(true);
  });

  it("warns when a single tag exceeds 30% of the corpus", () => {
    const corpus: NilaExemplar[] = Array.from({ length: 10 }, (_, i) =>
      ex({ id: `id_${i}`, user: `u${i}`, tag: i < 4 ? "venting_dump" : `tag_${i}` }),
    );
    const report = validateCorpus(corpus);
    expect(report.warnings.some((w) => w.includes("venting_dump"))).toBe(true);
  });

  it("warns when ends_in_question is far from 50/50 (over 70% either way)", () => {
    const corpus: NilaExemplar[] = Array.from({ length: 10 }, (_, i) =>
      ex({ id: `id_${i}`, user: `u${i}`, tag: `tag_${i}`, nila: "Reply here?" }),
    );
    const report = validateCorpus(corpus);
    expect(report.warnings.some((w) => w.includes("ends_in_question"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/nilaCorpusValidate.test.ts`
Expected: FAIL — `Cannot find module './nilaCorpusValidate'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/nilaCorpusValidate.ts
// Schema + anti-collapse checks for docs/nila-corpus/seed.jsonl, run over the generated NILA_EXEMPLARS.
// errors = hard failures (fix before regenerating); warnings = balance drift (rebalance when the corpus grows).
import type { NilaExemplar } from "./nilaExemplars";

export interface CorpusValidationReport {
  errors: string[];
  warnings: string[];
}

function sentenceCount(text: string): number {
  const matches = text.trim().match(/[.!?]+(\s|$)/g);
  return matches ? matches.length : text.trim() ? 1 : 0;
}

export function validateCorpus(exemplars: NilaExemplar[]): CorpusValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seenIds = new Set<string>();
  const seenUsers = new Set<string>();
  const tagCounts = new Map<string, number>();
  const moveCounts = new Map<string, number>();
  let questionEnders = 0;

  for (const ex of exemplars) {
    if (!ex.user.trim() || !ex.nila.trim()) {
      errors.push(`${ex.id}: empty user or nila field`);
      continue;
    }
    if (seenIds.has(ex.id)) errors.push(`${ex.id}: duplicate id`);
    seenIds.add(ex.id);

    const userKey = ex.user.trim().toLowerCase();
    if (seenUsers.has(userKey)) errors.push(`${ex.id}: duplicate user turn "${ex.user}"`);
    seenUsers.add(userKey);

    const sentences = sentenceCount(ex.nila);
    if (sentences > 3) errors.push(`${ex.id}: nila reply has ${sentences} sentences (max 3)`);

    tagCounts.set(ex.tag, (tagCounts.get(ex.tag) ?? 0) + 1);
    if (ex.move) moveCounts.set(ex.move, (moveCounts.get(ex.move) ?? 0) + 1);
    if (/[?？]\s*$/.test(ex.nila.trim())) questionEnders++;
  }

  const total = exemplars.length || 1;
  for (const [tag, count] of tagCounts) {
    if (count / total > 0.3) {
      warnings.push(`tag "${tag}" is ${Math.round((count / total) * 100)}% of the corpus (cap ~30%)`);
    }
  }
  for (const [move, count] of moveCounts) {
    if (count / total > 0.3) {
      warnings.push(`opening_move "${move}" is ${Math.round((count / total) * 100)}% of the corpus (cap ~30%)`);
    }
  }
  const questionRatio = questionEnders / total;
  if (questionRatio > 0.7 || questionRatio < 0.3) {
    warnings.push(
      `ends_in_question ratio is ${Math.round(questionRatio * 100)}% (target ~50/50, healthy range 30-70%)`,
    );
  }

  return { errors, warnings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/nilaCorpusValidate.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Add a real-corpus regression test**

```ts
// append to src/services/nilaCorpusValidate.test.ts
import { NILA_EXEMPLARS } from "./nilaExemplars";

describe("the real corpus", () => {
  it("has zero hard errors", () => {
    const report = validateCorpus(NILA_EXEMPLARS);
    expect(report.errors).toEqual([]);
  });
});
```

Run: `npx vitest run src/services/nilaCorpusValidate.test.ts`
Expected: PASS (8 tests) — confirms the current 42-row corpus is already clean.

- [ ] **Step 6: Commit**

```bash
git add src/services/nilaCorpusValidate.ts src/services/nilaCorpusValidate.test.ts
git commit -m "test: add corpus schema + anti-collapse validator"
```

---

### Task 2: Probe Ash — existing 12 tags (check for thin/stale patterns)

**Files:**
- Modify: `docs/nila-corpus/CORPUS_DESIGN.md` (append dated addendum to the "Competitive study — Ash" section)

**Device:** `adb` targets the already-connected `ZD2232FCR5`; Ash's package is `xyz.slingshot.ashley.app` and is already signed in (verified — "Good afternoon, Sampath" home screen).

- [ ] **Step 1: Launch Ash and open a fresh chat**

```bash
adb shell monkey -p xyz.slingshot.ashley.app -c android.intent.category.LAUNCHER 1
```
Then use `adb shell input tap <x> <y>` on the "Chat" button (read coordinates from a screenshot first) to enter the conversation view.

- [ ] **Step 2: For each of the 12 existing tags, send one representative probe, screenshot the reply, note the pattern**

Tags to re-probe: `explainer_question`, `venting_dump`, `low_effort`, `good_news`, `rumination`, `self_attack`, `just_tell_me`, `numbness`, `relationship_hurt`, `late_night`, `anger`, `crisis_adjacent` (use only the low/non-explicit phrasing already in the corpus, e.g. "what's even the point" — never send explicit self-harm/suicide content to a third-party app).

For each: type via `adb shell input text "<message>"` (escape spaces as `%s` or wrap in the existing corpus phrasing), tap send, wait ~3-5s, `adb shell screencap -p /sdcard/probe_<tag>.png` then `adb pull` it into the scratchpad, read the image, jot a one-line pattern note (does it still match the "reflect → one middle move → binary question" DNA already documented, or has it drifted?).

- [ ] **Step 3: Append findings to CORPUS_DESIGN.md**

Add a new dated subsection under "Competitive study — Ash":

```markdown
### 2026-07-13 re-probe — existing 12 tags

[one line per tag: confirms prior pattern / notes any drift, e.g. "explainer_question: unchanged — still one-sentence-explain-then-question"]
```

- [ ] **Step 4: Commit**

```bash
git add docs/nila-corpus/CORPUS_DESIGN.md
git commit -m "docs: re-probe Ash on the existing 12 corpus tags"
```

---

### Task 3: Probe Ash — 8 new candidate tags

**Files:**
- Modify: `docs/nila-corpus/CORPUS_DESIGN.md` (extend the taxonomy table + competitive-study section)

**New candidate tags** (situations the current 12-tag taxonomy doesn't cover):

| tag | example probe |
|---|---|
| `advice_seeking` | "should i quit my job or stick it out" |
| `practical_how_to` | "how do i calm down right now, like right this second" |
| `physical_symptoms` | "my chest feels tight and i can't catch my breath" |
| `grief_loss` | "my dog died last week and i can't stop crying" |
| `decision_paralysis` | "i can't decide between two things and it's driving me crazy" |
| `gratitude` | "hey, thank you for listening to me yesterday" |
| `boundary_testing` | "are you even real, do you actually care or is this just code" |
| `short_check_in` | "hey" |

- [ ] **Step 1: Probe each, same method as Task 2 Step 2** (type, screenshot, pull, read, note pattern — including whether Ash's response for that situation still fits "reflect → middle move → binary question" or does something distinct worth learning from, e.g. `boundary_testing` may reveal how Ash handles being asked about its own nature).

- [ ] **Step 2: Append a new taxonomy rows + findings section to CORPUS_DESIGN.md**

Extend the taxonomy table (same format as the existing 12-row table) with the 8 new tags and "the move that works" for Nila (informed by, but not copying, Ash's pattern — apply the same 11-point rubric). Add a dated competitive-study subsection with the probe notes.

- [ ] **Step 3: Commit**

```bash
git add docs/nila-corpus/CORPUS_DESIGN.md
git commit -m "docs: probe Ash on 8 new candidate situation tags, extend taxonomy"
```

---

### Task 4: Author new gold exemplars

**Files:**
- Modify: `docs/nila-corpus/seed.jsonl` (append only — never edit existing rows' `id`)

**Target:** ~4-6 new exemplars per tag across all 20 tags (12 existing + 8 new) ≈ 100-120 new rows, corpus total ≈ 145-160. Every row must pass the Task 1 validator (`errors` empty) and the CORPUS_DESIGN.md rubric (short, no sycophancy, no preamble, plain prose, honest, §9-safe, varied opening_move/ends_in_question/length).

- [ ] **Step 1: Draft rows for the 8 new tags first** (no existing exemplars to avoid duplicating), each as one JSONL line matching the existing schema:

```json
{"id":"seed_043","tag":"advice_seeking","move":"...","user":"...","nila":"...","ends_in_question":true,"len":2}
```

Use ids `seed_043` onward, sequential, no gaps.

- [ ] **Step 2: Draft additional rows for the 12 existing tags** to deepen phrasing coverage (aim for the ~4-6/tag target across the ORIGINAL 12, on top of what's already there).

- [ ] **Step 3: After every ~15-20 new rows, run the validator against the draft**

```bash
node scripts/gen-exemplars.mjs && npx vitest run src/services/nilaCorpusValidate.test.ts
```

Fix any `errors` immediately (duplicate id/user, empty field, >3 sentences). Note any `warnings` (tag/move over 30%, question ratio skew) — deliberately vary `opening_move` phrasing and question-vs-statement endings in the remaining rows to correct drift before finishing.

- [ ] **Step 4: Final balance pass**

Run the validator one more time over the complete set; `errors` must be empty and `warnings` should be empty or explicitly acceptable (if a warning remains, note in the commit message why, e.g. a genuinely small tag).

- [ ] **Step 5: Commit**

```bash
git add docs/nila-corpus/seed.jsonl
git commit -m "feat: expand corpus to 100+ Ash-calibrated gold exemplars across 20 tags"
```

---

### Task 5: Regenerate + extend retrieval test coverage for new tags

**Files:**
- Modify: `src/services/nilaExemplars.ts` (regenerated, do not hand-edit)
- Modify: `src/services/exemplarRetrieval.test.ts` (extend `clusteredEmbedder` with keyword clusters for the 8 new tags, add retrieval assertions — same pattern as the existing "new registers retrievable (2026-07-12 device-QA)" block)

**Interfaces:**
- Consumes: `NILA_EXEMPLARS` (regenerated in Task 5 Step 1), `retrieveExemplarsForQuery(query: string, k = 2): Promise<NilaExemplar[]>` (unchanged signature from `exemplarRetrieval.ts`).

- [ ] **Step 1: Regenerate**

```bash
node scripts/gen-exemplars.mjs
```

Expected output: `wrote <N> exemplars -> src/services/nilaExemplars.ts` where N matches the final `seed.jsonl` line count from Task 4.

- [ ] **Step 2: Write the failing test — add a new describe block**

```ts
// append to src/services/exemplarRetrieval.test.ts
describe("new tags retrievable (2026-07-13 Ash-calibrated expansion)", () => {
  it("advice-seeking query retrieves an advice_seeking exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("should i quit my job or stick it out", 2);
    expect(hits.some((h) => h.tag === "advice_seeking")).toBe(true);
  });
  it("physical symptoms query retrieves a physical_symptoms exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("my chest feels tight and i can't breathe", 2);
    expect(hits.some((h) => h.tag === "physical_symptoms")).toBe(true);
  });
  it("grief query retrieves a grief_loss exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("my dog died and i can't stop crying", 2);
    expect(hits.some((h) => h.tag === "grief_loss")).toBe(true);
  });
  it("boundary-testing query retrieves a boundary_testing exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("are you even real, do you actually care", 2);
    expect(hits.some((h) => h.tag === "boundary_testing")).toBe(true);
  });
});
```

Also add matching keyword clusters to `clusteredEmbedder` in the same file, following the existing `if (/pattern/.test(t)) vec[N] = 1;` style with a fresh unused vector index per new cluster (check the existing indices 0-6 and continue from 7).

- [ ] **Step 3: Run to verify it fails, then implement, then pass**

Run: `npx vitest run src/services/exemplarRetrieval.test.ts`
Expected first: FAIL (new tags not yet matched by clusteredEmbedder, or exemplars missing).
Fix by adding the keyword clusters; re-run until PASS.

- [ ] **Step 4: Run the full suite**

```bash
npm test
```

Expected: 100% pass, no regressions in unrelated suites.

- [ ] **Step 5: Commit**

```bash
git add src/services/nilaExemplars.ts src/services/exemplarRetrieval.test.ts
git commit -m "feat: regenerate exemplar corpus, extend retrieval tests for new tags"
```

---

### Task 6: On-device verification

**Device:** `ZD2232FCR5`, NilaMind app (build/deploy the worktree's current `src` via the project's existing `npm run android` flow if a debug build isn't already fresh — check `scripts/run-android.sh` for the exact deploy command before running).

- [ ] **Step 1: Build and install the debug build**

```bash
npm run build
npx cap sync android
bash scripts/run-android.sh
```

(Confirm exact steps against `scripts/run-android.sh` — do not guess flags; read the script first.)

- [ ] **Step 2: Send 5 sample messages spanning new + rebalanced tags into Nila**, one per situation type not previously verified on-device: pick `advice_seeking`, `physical_symptoms`, `grief_loss`, `boundary_testing`, and one re-balanced existing tag (e.g. a new `crisis_adjacent` phrasing). Use `adb shell input text` into the chat field, screenshot the reply once generation completes (~40-60s per the known on-device latency).

- [ ] **Step 3: Judge each reply against the rubric** (short, no sycophancy, no preamble, plain prose, matches the intended `move`) — note pass/fail per message.

- [ ] **Step 4: If any reply misses badly (wrong tag imitated, rubric violation), inspect whether it's a corpus gap (weak exemplar) or a retrieval miss (score not clearing 0.3) and fix in Task 4/5 before proceeding.**

- [ ] **Step 5: Record the verification results as a short addendum to CORPUS_DESIGN.md's build sequence** (mark P1/P2 progress, note corpus size, note any residual gaps for future sessions).

```bash
git add docs/nila-corpus/CORPUS_DESIGN.md
git commit -m "docs: record on-device verification of the expanded Ash-calibrated corpus"
```

---

### Task 7: Finish

- [ ] Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- [ ] **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch — verify full test suite green, present merge/PR/cleanup options, do not push without explicit user confirmation (standing preference).
