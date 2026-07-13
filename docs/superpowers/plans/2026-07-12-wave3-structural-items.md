# Wave 3 Structural Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the larger structural items deferred from Wave 2 (docs/superpowers/plans/2026-07-12-clinical-upgrades-wave2.md's "Wave 3" section), now scoped with concrete technical specs from `docs/superpowers/plans/2026-07-12-wave3-technical-specs.md` and three explicit product decisions confirmed by the app owner: (1) two-tier crisis surface — soften classifier-only hits, keep full takeover for keyword-floor hits; (2) migrate Values tools data into the VLQ-cited tool (`values.ts`, confirmed via code audit — NOT `valuesWork.ts` as originally assumed); (3) rebalance the Today hub to lead with structured tools over open chat.

**Architecture:** Phase 1 is a single safety-critical task (crisis-surface tiering + two smaller crisis-adjacent UX additions), done solo with maximum care, sequenced before everything else because it owns `ModeScreen.tsx`'s crisis branch. Phase 2 fans out 8 tasks across disjoint file sets once Phase 1 lands.

**Tech Stack:** TypeScript, React 19, Vitest, tsc, `npm run guard`.

## Global Constraints

- Same AGENTS.md danger-zone rules apply — `safety.ts`/`crisisClassifier.ts`/`nilaContext.ts`/`secureLocal.ts` diffs get flagged for human review by `npm run guard`; that's expected, don't suppress it.
- **Phase 1 must complete and commit before any Phase 2 task starts** — it owns `ModeScreen.tsx`'s crisis-handling branch, and Phase 2's Group F also touches `ModeScreen.tsx` (different area) — sequence, don't parallelize against Phase 1.
- Every citation must come from `docs/superpowers/plans/2026-07-12-wave3-technical-specs.md` or `docs/superpowers/plans/2026-07-12-clinical-research-synthesis.md` verbatim — never invent one.
- `YourDataScreen.tsx` has been under heavy concurrent-session WIP all day — Groups B and C both have a minor optional touch-point there; both are instructed to SKIP it if risky (small, non-critical omission) rather than risk a collision.
- TDD mandatory. Conventional commits ending `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Branch: create a new branch off current `main` (now at v1.9.8) — `feat/wave3-structural-items`. Never commit to main directly.
- Full gates before finishing: `npm test`, `npm run lint`, `npm run guard`.

---

## Phase 1 (SOLO, safety-critical): Two-tier crisis surface + crisis-adjacent UX additions

**Files:** `src/services/crisisClassifier.ts`, `src/services/nilaSend.ts`, `src/services/sendToNila.ts`, `src/components/ModeScreen.tsx`, new `src/components/SoftCrisisCard.tsx`, `src/components/CrisisOverlay.tsx`, `src/services/notifications.ts`, `src/components/SafetyPlanScreen.tsx`, `src/services/proactiveEngine.ts` (reuse, read-only reference).

**Interfaces:**
- Produces: `CrisisSignal { hit: boolean; source: "keyword"|"classifier"|null }`, `detectCrisisSignal(text): Promise<CrisisSignal>` (new, additive), `detectCrisis(text): Promise<boolean>` (UNCHANGED signature, now implemented via `detectCrisisSignal`).

### Task 1.1: Two-tier crisis signal (additive, zero breaking changes)

- [ ] **Step 1: Failing tests.** In `src/services/crisisClassifier.test.ts`:
```ts
describe("detectCrisisSignal — two-tier (2026-07-12 Wave 3)", () => {
  it("keyword-floor hit returns source:'keyword'", async () => {
    const s = await detectCrisisSignal("i want to kill myself");
    expect(s).toEqual({ hit: true, source: "keyword" });
  });
  it("classifier-only hit returns source:'classifier'", async () => {
    const s = await detectCrisisSignal("everyone would be better off without me");
    expect(s.hit).toBe(true);
    expect(s.source).toBe("classifier");
  });
  it("no hit returns hit:false, source:null", async () => {
    const s = await detectCrisisSignal("i had a good day today");
    expect(s).toEqual({ hit: false, source: null });
  });
  it("detectCrisis() is byte-for-byte unchanged (regression guard)", async () => {
    expect(await detectCrisis("i want to kill myself")).toBe(true);
    expect(await detectCrisis("i had a good day today")).toBe(false);
  });
});
```
- [ ] **Step 2: Run, confirm fail** (`detectCrisisSignal` doesn't exist yet).
- [ ] **Step 3: Implement** in `crisisClassifier.ts` exactly per the spec doc §4 (`CrisisSource`, `CrisisSignal`, `detectCrisisSignal`, `detectCrisis` reimplemented via it). Copy the code block verbatim from `docs/superpowers/plans/2026-07-12-wave3-technical-specs.md` lines 168-191.
- [ ] **Step 4: Run full `crisisClassifier.test.ts` + `safety.test.ts` + `sendToNila.test.ts` + `nilaSafetyInvariants.test.ts`** — all green, zero regressions.
- [ ] **Step 5: Commit.** `git add src/services/crisisClassifier.ts src/services/crisisClassifier.test.ts` — `feat(safety): additive two-tier crisis signal (detectCrisisSignal), detectCrisis unchanged`.

### Task 1.2: Thread source through sendToNila

- [ ] **Step 1: Failing test** in `sendToNila.test.ts`:
```ts
it("blocked result carries crisisSource for a classifier-only hit", async () => {
  registerLocalLlmBackend(fakeBackend("unused"));
  const r = await sendToNila([{ role: "user", content: "everyone would be better off without me" }], "companion");
  expect(r.blocked).toBe(true);
  expect(r.crisisSource).toBe("classifier");
});
it("blocked result carries crisisSource:'keyword' for a keyword-floor hit", async () => {
  registerLocalLlmBackend(fakeBackend("unused"));
  const r = await sendToNila([{ role: "user", content: "i want to kill myself" }], "companion");
  expect(r.blocked).toBe(true);
  expect(r.crisisSource).toBe("keyword");
});
```
- [ ] **Step 2-3: RED then implement** per spec doc §4 (`NilaSendResult.crisisSource`, `crisisSignalForSend` in `nilaSend.ts`, threading in `sendToNila.ts` — copy the code blocks from spec lines 199-222 verbatim, including the `?? "keyword"` fail-closed fallback).
- [ ] **Step 4: Run `nilaSend.test.ts` (create if absent) + `sendToNila.test.ts`** — green.
- [ ] **Step 5: Commit.** `git add src/services/nilaSend.ts src/services/sendToNila.ts src/services/nilaSend.test.ts src/services/sendToNila.test.ts` — `feat(safety): thread crisis-signal source through sendToNila (fail-closed on ambiguity)`.

### Task 1.3: Soft crisis card UI + ModeScreen wiring

- [ ] **Step 1: Create `src/components/SoftCrisisCard.tsx`** — copy the JSX from spec doc §4 lines 253-274 verbatim (props: `onEscalate: () => void`, `onDismiss: () => void`), using the existing `CrisisLines` component with `tone="amber"` and a `ShieldAlert` icon import from the icon library already used elsewhere in the file (check `lucide-react` import convention in `CrisisOverlay.tsx`).
- [ ] **Step 2: Failing component test** `SoftCrisisCard.test.tsx` (jsdom, RTL, mirror `CrisisOverlay.test.tsx` conventions): renders the warm copy, renders `CrisisLines`, escalate button calls `onEscalate`, dismiss button calls `onDismiss`.
- [ ] **Step 3: Run, fail, implement, run green.**
- [ ] **Step 4: Wire into `ModeScreen.tsx`** exactly per spec doc §4 lines 224-247:
  - Add `softCrisisCard` state.
  - Modify `openCrisis` to accept `(detected, source)` and branch on `source === "classifier"` → `setSoftCrisisCard(true)` instead of `onOpenCrisis?.()`. **All existing safety invariants (`hadCrisisRef.current = true`, `clearSessionChat()`, `setSkillOffer(null)`, `setProtocolCard(null)`, `suppressNudgesForCrisis()`) stay unconditional on `detected===true` — NOT gated by source.** Only the rendering surface changes.
  - `handleSendMessage`'s blocked branch: `openCrisis(true, result.crisisSource ?? "keyword")`.
  - Render `<SoftCrisisCard>` in the same slot as other inline cards (pact/safety-plan-review) when `softCrisisCard` is true, with `onEscalate={() => { setSoftCrisisCard(false); onOpenCrisis?.(); }}` and `onDismiss={() => setSoftCrisisCard(false)}`.
  - Leave the arm-request branch (line ~266, `openCrisis(true)` with no source) UNCHANGED — per the spec, it fails closed to full takeover automatically under the new signature since `source` defaults to `null` → falls through to `onOpenCrisis?.()`. Confirm this with a test, don't touch the call site.
- [ ] **Step 5: Failing tests** in a `ModeScreen.test.tsx` (create if absent, or extend if one exists — check first) covering: keyword-hit still opens full `CrisisOverlay`; classifier-only hit shows `SoftCrisisCard` instead; escalating from the soft card opens full `CrisisOverlay`; dismissing the soft card does NOT un-latch `hadCrisisRef` (send another message, confirm crisis-adjacent state — e.g. cleared skill offers — persists); arm-request path (if easily testable) still opens full takeover.
- [ ] **Step 6: Run, RED, implement, GREEN.** Run the FULL safety-adjacent suite one more time (`crisisClassifier.test.ts`, `safety.test.ts`, `sendToNila.test.ts`, `nilaSafetyInvariants.test.ts`, `ModeScreen.test.tsx`, `SoftCrisisCard.test.tsx`) — all green.
- [ ] **Step 7: Commit.** `git add src/components/SoftCrisisCard.tsx src/components/SoftCrisisCard.test.tsx src/components/ModeScreen.tsx src/components/ModeScreen.test.tsx` — `feat(safety): soft in-chat card for classifier-only crisis signals; keyword hits unchanged (full takeover)`.

### Task 1.4: Opt-in post-crisis check-in

- [ ] **Step 1: Read `src/services/notifications.ts`'s existing scheduling pattern and `src/services/proactiveEngine.ts`'s cooldown pattern** before writing code — reuse both, don't invent new plumbing.
- [ ] **Step 2: Failing tests** for a new `src/services/postCrisisCheckIn.ts`: `offerPostCrisisCheckIn(): void` schedules a LOCAL, content-free notification N hours later (suggest 3-6h, no citation for exact timing — label as an engineering default in the code comment) ONLY when explicitly opted in; `isPostCrisisCheckInOffered` / dismissal tracking via `secureLocal`. Test: opting in schedules exactly one local notification with generic copy ("Just checking in — how are you doing?"), never references "crisis" in the notification text itself (privacy — matches `notifications.ts`'s existing content-free lock-screen discipline), opting out schedules nothing.
- [ ] **Step 3: RED, implement, GREEN.**
- [ ] **Step 4: Wire the opt-in offer into `CrisisOverlay.tsx`'s dismiss action** ("I'm okay for now") — add a small, entirely optional, unchecked-by-default toggle or a follow-up one-tap prompt: "Want a gentle check-in from me in a few hours?" [Yes / No thanks]. Never silently schedule without this explicit tap.
- [ ] **Step 5: Failing test + implementation for the `CrisisOverlay.tsx` UI addition**, then full run green.
- [ ] **Step 6: Commit.** `git add src/services/postCrisisCheckIn.ts src/services/postCrisisCheckIn.test.ts src/components/CrisisOverlay.tsx src/components/CrisisOverlay.test.tsx` — `feat(safety): opt-in post-crisis check-in notification, content-free, never silent`.

### Task 1.5: Calm-moment safety-plan nudge

- [ ] **Step 1: Read `src/services/proactiveEngine.ts`'s `computeProactiveMoment()`/cooldown pattern.**
- [ ] **Step 2: Failing test** for a new trigger in `proactiveEngine.ts` (or a small sibling service) surfacing a gentle, calm-moment-only ("mostly calm" mood signal present, no recent crisis) nudge to fill in a blank safety-plan section — reuses the existing cooldown mechanism (suggest 7-day cooldown, matching `weekly_summary`'s precedent, not a new number).
- [ ] **Step 3: RED, implement, GREEN.**
- [ ] **Step 4: Wire the nudge surface** — likely a card on the Today hub or Dashboard pointing to `SafetyPlanScreen.tsx`, only shown if a mood signal indicates calm AND at least one safety-plan section is still empty.
- [ ] **Step 5: Full test run green.**
- [ ] **Step 6: Commit.** `git add src/services/proactiveEngine.ts src/services/proactiveEngine.test.ts <the surfacing component>` — `feat(safety): calm-moment nudge to author safety plan, never crisis-moment`.

### Phase 1 gate

- [ ] Full safety-adjacent suite green: `npx vitest run src/services/crisisClassifier.test.ts src/safety.test.ts src/services/sendToNila.test.ts src/services/nilaSend.test.ts src/services/nilaSafetyInvariants.test.ts src/components/ModeScreen.test.tsx src/components/SoftCrisisCard.test.tsx src/components/CrisisOverlay.test.tsx src/services/postCrisisCheckIn.test.ts src/services/proactiveEngine.test.ts`
- [ ] Full repo suite green, `npx tsc --noEmit` clean, `npm run guard` passes (safety-file flags expected, that's correct).
- [ ] **This is the gate before Phase 2 starts — do not proceed until Phase 1 is committed.**

---

## Phase 2 (parallel, 8 non-overlapping groups, dispatch only after Phase 1 commits)

### Group B: Values tools migration + security fix

**Files:** `src/services/values.ts`, `src/services/valuesWork.ts`, `src/components/ValuesWorkScreen.tsx`, `src/components/ValuesToActionScreen.tsx`, `src/App.tsx`, `src/components/toolsRows.ts`, `src/components/youRows.ts`, `src/services/secureLocal.ts`, optionally `src/components/YourDataScreen.tsx` (SKIP if risky — see global constraints).

- [ ] **Step 1: Security fix first (independent, ship even if migration is deferred).** Add `"nilamind_values_work"` to `SENSITIVE_KEYS` in `secureLocal.ts`. Failing test asserting the key is now encrypted at rest (mirror the existing test pattern for `"nilamind_values"`). RED → implement → GREEN.
- [ ] **Step 2: Migration function.** New `migrateValuesWorkToVlq()` in `values.ts` (or a new `valuesMigration.ts`) implementing the field-by-field mapping from spec doc §5 table (domain id remap: 6 exact, `spirituality→meaning`, `relationships→close` (best-effort single mapping, do not attempt to split), drop `self_care`/`autonomy`/`vw_*` custom domains with a **non-destructive** approach — do NOT delete `nilamind_values_work`, leave the source data intact and only ADD to `nilamind_values`/`nilamind_values_actions`, merging by domain id rather than overwriting `saveValues()`'s whole snapshot). Preserve the `"va_"` id prefix on migrated `CommittedAction` rows (required by `isStepId()` in `valuesToAction.ts:32-34`).
- [ ] **Step 3: Failing tests** covering: exact-match domains migrate correctly; relabeled domain (spirituality→meaning) migrates; unmappable domains (self_care, autonomy, custom vw_*) are collected into a returned "not migrated" list rather than silently dropped; existing `nilamind_values` data for a domain the user already rated is NOT clobbered (merge behavior, not overwrite); migrated actions carry the `va_` prefix and round-trip through `valuesToAction.ts`'s `isStepId()`.
- [ ] **Step 4: RED, implement, GREEN.**
- [ ] **Step 5: One-time migration trigger** — run once on app load if `nilamind_values_work` has data and a `nilamind_values_migrated` flag isn't set; show a one-time summary ("We combined your two values tools — N ratings carried over, M items need a quick look") linking to any unmigrated items.
- [ ] **Step 6: Retire `ValuesWorkScreen.tsx`/`valuesWork.ts` from navigation** — remove `App.tsx:41,104,137` and `toolsRows.ts:63` entries; **do not delete the files or the underlying data** (read-only fallback view is acceptable if simple, otherwise just remove the route and keep data intact for the migration to read).
- [ ] **Step 7: Add `ValuesToActionScreen.tsx` to a discoverable hub** — per spec doc §5, it's currently reachable only via quick-actions + chat-intent, not from either Tools or You hub despite `toolsRows.ts`'s stale comment claiming it's "under You → Resources." Add it to `youRows.ts`'s Resources group for real (fixing the stale-comment gap) or `toolsRows.ts` — pick one, both hubs should not list it redundantly.
- [ ] **Step 8: Full test run, tsc clean.**
- [ ] **Step 9: Commit.** `feat(act-exposure): migrate Values-tool data into the VLQ-cited tool, retire uncited duplicate, fix plaintext-storage security gap`.

### Group C: Real Sleep Regularity Index

**Files:** `src/services/healthConnect.ts`, `src/services/socialRhythm.ts` (read/reuse, minimal edits), `src/services/circadianFeedback.ts`, `src/components/DashboardScreen.tsx`, `src/components/SocialRhythmScreen.tsx`, optionally `src/components/YourDataScreen.tsx` (SKIP if risky).

- [ ] **Step 1: Stop discarding timestamps.** In `healthConnect.ts`'s `mapSleepSessions()` (lines 47-58 per spec), retain `startTime`/`endTime` alongside the existing `{date, hours}` shape (additive field, don't break existing consumers).
- [ ] **Step 2: Failing test** confirming `mapSleepSessions()` now returns timestamps when present.
- [ ] **Step 3: Build the per-day bed/wake reconstruction.** New function combining Health Connect timestamps (when available) with Social Rhythm's manually-logged `bed`/`wake` anchors as a fallback/second source, producing a `{date, bedTime, wakeTime}[]` series using the existing midnight-wraparound-safe time math already in `socialRhythm.ts` (reuse, don't reimplement).
- [ ] **Step 4: Implement the real Phillips SRI formula** in `circadianFeedback.ts` per spec doc §1 (5-10 min epoch bins is fine per the spec's own guidance — resolution only matters at the two boundary edges). Gate on ≥7 nights, gap-tolerant (sum only over available consecutive-day pairs, per Windred/`sleepreg` convention cited in spec).
- [ ] **Step 5: Keep duration-CV as a SEPARATE, clearly-labeled metric** ("sleep duration consistency") — do not fold it back into the SRI number (this exact conflation is the bug being fixed).
- [ ] **Step 6: Failing tests** for the real SRI calculation: perfectly regular bed/wake times over 7+ nights → SRI near 100; random bed/wake times → SRI near 0; <7 nights → returns null/insufficient-data state rather than a misleading number; a person with rock-steady DURATION but shifting TIMING scores LOW on SRI (this is the specific bug being fixed — must have a regression test proving old and new metrics diverge on this exact case).
- [ ] **Step 7: RED, implement, GREEN.**
- [ ] **Step 8: Update the 3-4 call sites** (`DashboardScreen.tsx:109`, `SocialRhythmScreen.tsx:55`, `nilaContext.ts:269`, optionally `YourDataScreen.tsx:492` if safe) to show the new SRI alongside the separate duration-consistency metric, with the risk-strata copy hedged per spec doc §1 Step 7 ("research on objectively-measured sleep regularity links scores in this range to roughly X% lower depression/anxiety risk" — NOT diagnostic-grade framing).
- [ ] **Step 9: Full test run, tsc clean.**
- [ ] **Step 10: Commit.** `feat(rhythm-sleep): real Sleep Regularity Index (Phillips 2017 formula) replacing the ad hoc duration-variability proxy`.

### Group D: Intolerance-of-Uncertainty protocol

**Files:** `src/services/protocols.ts`, its test file.

- [ ] **Step 1: Failing test** in `protocols.test.ts` asserting a `PROTOCOLS` entry with `id: "intolerance-of-uncertainty"` exists, has exactly 7 steps in the ids `iu-1`...`iu-7`, and `forConcerns` includes at least "uncertain" and "uncertainty".
- [ ] **Step 2: Implement** the 7-step protocol exactly per spec doc §2's content (copy each step's title/kind/prompt content, written in Nila's first-person invitation voice per the file's existing convention — model the prose on the neighboring `wp-*` worry-postponement entries). Use the CORRECTED citation (Daniels, Hasan & Schweizer 2025) in the `basis` string — do NOT cite Dugas et al. (2022), which is unrelated. Flag the `iu-5` STAR acronym's lower-confidence sourcing (press-release, not peer-reviewed text) with an inline code comment, but ship it — the underlying RNT-cessation content is solid regardless of the mnemonic's exact wording.
- [ ] **Step 3: Explicitly do NOT add this protocol to any recurring/cyclical cadence system** (Group H's cyclical-restart work) — per the spec's own warning, this protocol's evidence is single-pass; looping it would be unevidenced scope creep in the opposite direction from the BA/PST fix.
- [ ] **Step 4: Check `activeProtocolContext.test.ts`/`protocolProgress.test.ts`** for any hardcoded protocol-count assumptions that might need a new fixture (per spec doc §2's warning) — extend if needed, don't break existing assertions.
- [ ] **Step 5: RED, implement, GREEN.** Full `protocols.test.ts` + `protocolProgress.test.ts` + `activeProtocolContext.test.ts` green.
- [ ] **Step 6: Commit.** `feat(gad-worry): add Intolerance-of-Uncertainty single-session module (Daniels, Hasan & Schweizer 2025)`.

### Group E: Full interactive TIPP tool

**Files:** new `src/components/TIPPTool.tsx`, new `src/components/CountdownRing.tsx` (extracted primitive), new `src/services/pmrPacer.ts`, new `src/components/PMRTimer.tsx`, `src/components/GroundingLibraryScreen.tsx`, `src/services/skillsLibrary.ts`, `src/components/EpisodeSupportScreen.tsx`, `src/data.ts`.

- [ ] **Step 1: Extract `<CountdownRing>`** from `BreathingTimer.tsx`'s existing SVG ring shell (generalize props: `durationMs`, `label`, `color`) — pure refactor, run `BreathingTimer.test.tsx` before and after to confirm zero behavior change.
- [ ] **Step 2: Build `pmrPacer.ts`** — same `phases()`/state-cursor shape as `breathPacer.ts`, tense(~5s)/release(~10s) through the abbreviated muscle-group set from spec doc §3 (hands & forearms → biceps → shoulders & neck → face → abdomen → legs & feet). Failing tests mirroring `breathPacer.test.ts`'s conventions. RED → implement → GREEN.
- [ ] **Step 3: Build `PMRTimer.tsx`** — structural clone of `BreathingTimer.tsx` consuming `pmrPacer.ts`. Failing tests mirroring `BreathingTimer.test.tsx`. RED → implement → GREEN.
- [ ] **Step 4: Build the safety-gate entry layer** — a one-time checklist (persisted via `secureLocal`) for cardiac arrhythmia/pacemaker, uncontrolled hypertension, beta-blockers/HR meds, seizure disorder, ED with bradycardia history, pregnancy, cold sensitivity — checking any box removes the Temperature tab, defaults to I→P→P with inline copy ("cold water skipped for your safety — try one of these instead"). Failing tests: checklist persists; Temperature tab conditionally hidden; default flow order when hidden.
- [ ] **Step 5: Build `TIPPTool.tsx`** — 4-tab strip (T·I·P·P per spec doc §3), Temperature and Intense-exercise tabs using `<CountdownRing>` (30-60s / 60-90s respectively) with an intensity-recheck grid reusing `EpisodeSupportScreen.tsx`'s existing 1-10 pattern; Paced-breathing tab mounts existing `<BreathingTimer pattern="cyclicSighing" />` unmodified; PMR tab mounts `<PMRTimer>`. Include the honesty-gap copy from spec doc §3 (component-level evidence is strong, no dismantling-trial evidence isolates one TIPP subskill as a standalone crisis intervention — match the app's existing citation-honesty pattern).
- [ ] **Step 6: Wiring/consolidation** — point the `"tipp"` skillId (`skillsLibrary.ts`) and the `"Cold Reset (TIPP)"` card (`data.ts` → `GroundingLibraryScreen.tsx`) at the new `TIPPTool`; replace `EpisodeSupportScreen.tsx`'s `extreme_tipp_1/2/3` static-text branch with a mount of the same component (passing tracked intensity through), closing the gap where crisis-mode currently skips Paired Muscle Relaxation entirely. Completed sub-skills should log into the existing `skillsUsed`/diary plumbing (`"TIPP"` already a valid diary entry per spec — no new persistence work needed).
- [ ] **Step 7: Failing tests** for each wiring point (opening TIPP from Grounding Library, from Skills Library, from Episode Support's offline branch all mount the same component; diary logging fires on sub-skill completion).
- [ ] **Step 8: RED, implement, GREEN.** Full test run for all touched files.
- [ ] **Step 9: Commit.** `feat(grounding-peer): unified interactive TIPP tool (was 3 shallow half-implementations, PMR was entirely missing from crisis mode)`.

### Group F: JITAI decision log + receptivity gate + feedback-suggestion UI (sequence after Phase 1 — touches ModeScreen.tsx)

**Files:** new `src/services/jitaiDecisionLog.ts`, `src/services/jitaiEngine.ts`, `src/components/ModeScreen.tsx` (different area than Phase 1's crisis branch), `src/services/nilaContext.ts`, `src/services/nilaFeedback.ts` (already has `attachSuggestion`, just needs UI), new suggestion-prompt UI component.

- [ ] **Step 1: Build `jitaiDecisionLog.ts`** — copy the `JitaiDecisionLogEntry` shape and `logJitaiDecision()` wrapper from spec doc §6 verbatim (deliberately excludes raw nudge text/user text — privacy discipline). Reuse `appendToSecureArray` from `secureLocal.ts` (already used by `exportAudit.ts`/`nilaInflection.ts` — don't reinvent). Failing tests: entry shape, cap at 100, no sensitive content fields.
- [ ] **Step 2: RED, implement, GREEN.**
- [ ] **Step 3: Receptivity gate** — reuse `proactiveEngine.ts`'s exact cooldown pattern (`isProactiveDismissed`/`dismissProactive`-equivalent for JITAI triggers). Defaults per spec doc §6: 24h for `sleep_prodrome`/`mood_deterioration`/`high_distortion` (matches existing `proactiveEngine.ts` default + app's "one gentle nudge per day" principle), 3-day for `inactivity` (matches existing precedent exactly), **`elevation_risk` exempt from gating entirely** (safety-adjacent, fast-changing, override-only-forward per existing crisis-suppression precedent — do not throttle this one). Label all cooldown numbers as engineering defaults in code comments, not citations — the research found zero literature precedent for exact durations.
- [ ] **Step 4: Failing tests** for the gate: repeated identical trigger within cooldown → `fired: false, suppressedBy: "trigger_cooldown"`; `elevation_risk` never gated regardless of frequency; different trigger types have independent cooldowns.
- [ ] **Step 5: RED, implement, GREEN.**
- [ ] **Step 6: Wire logging calls** — `ModeScreen.tsx:167` (`surface: "in_app_card"`) and `nilaContext.ts:311` (`surface: "chat_context"`) per spec doc §6. Skip `stateEngine.ts:123` (internal aggregation only, per spec). De-duplicate the 5-min polling loop via the cooldown gate.
- [ ] **Step 7: Feedback-suggestion UI** — the 👎 button (`ModeScreen.tsx:671-681`) already calls `recordFeedback(m.content, "down")`; add a lightweight one-tap follow-up prompt ("What would've helped?") that calls the ALREADY-BUILT-BUT-UNWIRED `attachSuggestion(id, suggestion)` from `nilaFeedback.ts:57-65`. Optional/dismissable, never forced. Failing test: tapping 👎 shows the prompt; submitting calls `attachSuggestion` with the right feedback id; dismissing without submitting leaves the feedback entry unchanged.
- [ ] **Step 8: RED, implement, GREEN.** Full test run for all touched files, confirm no collision with Phase 1's `ModeScreen.tsx` crisis-branch changes (re-read the file fresh, current state, before editing).
- [ ] **Step 9: Commit.** `feat(ema-checkins): JITAI decision log + receptivity gate; feat(alliance-voice): complete the built-but-unwired feedback-suggestion flow`.

### Group G: Measurement — reliable-change bands + deterioration nudge + pilot summary

**Files:** `src/services/assessments.ts`, `src/components/AssessmentScreen.tsx`, `src/services/pilotStudy.ts`.

- [ ] **Step 1: `classifyChange()` pure function** in `assessments.ts` — reliable-change classification using PHQ-9 MCID≈5 (Löwe et al. 2004) and GAD-7 MCID≈4 (Toussaint et al. 2020), per Wave 2's already-verified synthesis citations (no new research needed — these are already in `docs/superpowers/plans/2026-07-12-clinical-research-synthesis.md`'s measurement section). WHO-5 handled "cautiously" per the synthesis — lower-confidence banding, hedge the copy.
- [ ] **Step 2: Failing tests** for `classifyChange()`: a >MCID improvement classifies as reliable improvement; a change within the MCID band classifies as "no reliable change" (not noise-as-signal); a >MCID worsening classifies as reliable deterioration.
- [ ] **Step 3: RED, implement, GREEN.**
- [ ] **Step 4: Non-alarming deterioration nudge** in `AssessmentScreen.tsx`'s result screen — fires ONLY on reliable worsening (per `classifyChange()`), hedged copy, never blocking, links toward reaching out/professional support without alarmism.
- [ ] **Step 5: Failing test + implementation, GREEN.**
- [ ] **Step 6: Pilot summary reliable-change flag** in `pilotStudy.ts`'s `computePilotSummary()` — replace the raw point-delta with a reliable-change-flagged comparison using the same `classifyChange()` function (reuse, don't duplicate logic).
- [ ] **Step 7: Failing test + implementation, GREEN.**
- [ ] **Step 8: Full test run, tsc clean.**
- [ ] **Step 9: Commit.** `feat(measurement): reliable-change/MCID bands for PHQ-9/GAD-7, non-alarming deterioration nudge, pilot summary reliable-change flag`.

### Group H: BA/PST cyclical restart

**Files:** `src/services/protocolProgress.ts`, its test file.

- [ ] **Step 1: Failing test** — completing a protocol (BA, worry-postponement, etc.) allows starting the SAME protocol again later (currently: check whether `startProtocol()` already permits this or whether completion leaves a blocking state — verify first via a read, don't assume). If already permitted, this task reduces to: add a lightweight "you've done this N times" completion-count surface (reusing the `nilamind_protocol_completions` log from Wave 1) rather than new restart logic.
- [ ] **Step 2: RED (if a real gap exists) or write a pure regression-confirming test (if restart already works) — either way, implement/confirm.**
- [ ] **Step 3: Surface completion count** somewhere reasonable (Dashboard "Programs done" stat already exists per Wave 1 — extend it to show a per-protocol breakdown or a "3rd time trying Behavioral Activation" framing when a user restarts).
- [ ] **Step 4: Full test run, tsc clean.**
- [ ] **Step 5: Commit.** `feat(ba-pst): make structured protocols restartable/cyclical, closing the one-pass-vs-multi-week-evidence gap cheaply`.

### Group I: Daily intention if-then + surface unification + Today-hub rebalance

**Files:** new `src/components/DailyIntentionCard.tsx`, `src/services/weeklyIntention.ts`, `src/components/DiaryCardScreen.tsx`, `src/services/modeEngine.ts`, `src/components/TodayScreen.tsx`, `src/services/chatSuggestions.ts` (already touched in Wave 2 — re-read current state).

- [ ] **Step 1: Read all three existing "intention" surfaces first** (weekly picker in `weeklyIntention.ts`, morning chat question in `modeEngine.ts:152-178`, diary free-text field in `DiaryCardScreen.tsx:241-257`) to confirm current shapes before unifying.
- [ ] **Step 2: Extend `weeklyIntention.ts`'s data model** to also carry a DAILY if-then intention (`{ if: string; then: string }` structure, per Gollwitzer & Sheeran implementation-intention format), replacing the free-text diary field and the chat-embedded question with references to this ONE canonical store.
- [ ] **Step 3: Failing tests** for the extended data model, and for `DailyIntentionCard.tsx` (new component on `TodayScreen.tsx`) rendering the if-then picker, persisting to the unified store.
- [ ] **Step 4: RED, implement, GREEN.** Remove/redirect the chat-embedded prompt in `modeEngine.ts` and the free-text field in `DiaryCardScreen.tsx` to point at the same unified store (don't leave three independent, contradictory intention surfaces — this was the exact gap flagged in the synthesis).
- [ ] **Step 5: Today-hub rebalance** (confirmed product decision) — in `TodayScreen.tsx`'s `getHeroAction`/tool-priority logic, change the default hero surface to lead with a structured tool (e.g., the daily intention card itself, or the highest-relevance protocol per onboarding goal from Wave 2's `personalizeToolOrder`) rather than "Talk to Nila" as the primary CTA. Open chat remains one tap away, never removed — just no longer the default lead.
- [ ] **Step 6: Failing test** confirming the new default hero ordering, plus a regression test that chat is still reachable in exactly one tap from the new default.
- [ ] **Step 7: RED, implement, GREEN.** Full test run, tsc clean.
- [ ] **Step 8: Commit.** `feat(engagement-onboarding): unified if-then daily intention (replaces 3 contradictory surfaces), Today-hub now leads with structured tools per confirmed product decision`.

---

## Explicitly deferred to Wave 4 (documented, not silently dropped)

- **Register-aware exemplar retrieval filter** — declined this pass in favor of completing the feedback-suggestion loop (Group F), which is cheaper (no new embedding pass, no added latency) and uses an already-built, already-encrypted, currently-unused signal. Revisit only if the completed feedback loop shows register-mismatch as a common complaint theme.
- **Interactive Check-the-Facts micro-flow** (rate→state→reframe→re-rate) — deferred to avoid a `skillsLibrary.ts` collision with Group E's TIPP wiring in this pass; good standalone next feature.
- **DBT diary-card feedback-loop visualization** (skill-use vs. distress correlation chart) — UI-heavy, deserves its own design pass.
- **Full multi-week PST scheduled-review step** beyond Group H's cyclical-restart — the cheaper interim step ships this wave; a full scheduled-review/reminder system is a larger follow-on.
- **Indic passive-death-wish phrase-family expansion** beyond Wave 1's hardening — explicitly flagged as needing native-speaker review before shipping; can research/draft candidates but should not ship silently without that review.
- **EMA deterioration-aware scheduling softening** (cross-cuts `ema.ts`/`nilaInflection.ts`) — needs careful interaction-design with existing inflection detection; good Wave 4 candidate now that Group F's JITAI receptivity-gate infrastructure exists to build on.

## Final gates (after all Phase 2 groups land)

- [ ] Full test suite green, `npx tsc --noEmit` clean, `npm run guard` passes.
- [ ] Adversarial safety re-check of Phase 1's crisis-surface changes specifically (same 3-lens pattern as Wave 1: over-trigger risk on the new soft-card path, under-coverage risk, interaction with existing rules) — this touches the crisis surface, deserves the same scrutiny Wave 1 got.
- [ ] Device verification on ZD2232FCR5: two-tier crisis surface (both a keyword-floor and a classifier-only probe), TIPP tool full flow, Values migration (if feasible to test with seeded data), Today-hub new default.
- [ ] Finish branch: same options menu as before (merge/PR/keep/discard).
