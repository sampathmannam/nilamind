# Clinical Research Upgrades Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the highest-value, lowest-risk subset of the 70-item clinical evidence synthesis (`docs/superpowers/plans/2026-07-12-clinical-research-synthesis.md`) — every pure citation/basis-string correction (cheap, directly fixes the recurring "wrong effect size" pattern flagged as the #1 cross-cutting finding) plus every clearly self-contained [S]-effort feature upgrade. Larger [M]/[M-L] structural items (new components, protocol redesigns needing multi-week cadence infrastructure, tool consolidations) are deferred to Wave 3 (see bottom) — they deserve their own design pass, not a rushed bundle.

**Architecture:** Same TDD discipline as Wave 1. Tasks are grouped by **non-overlapping file sets**, not by research domain, because several domains (ba-pst, gad-worry, dbt-skills) all want to edit `protocols.ts`. Grouping by file prevents concurrent-edit collisions when tasks run in parallel.

**Tech Stack:** TypeScript, React 19, Vitest (`npm test`), tsc (`npm run lint`), `npm run guard`.

## Global Constraints

- Same AGENTS.md danger-zone rules as Wave 1 apply (safety.ts, crisisClassifier*, nilaContext.ts).
- Only stage/commit the exact files each task modifies — never `git add -A`. Watch for the other concurrent session's files (currently `YourDataScreen.tsx`, `clinicianReport.ts`, `temporalRiskAssessment.ts` — re-check `git status` at execution time, the set may have changed).
- Never invent a citation or number. Every copy/comment change must match the verified synthesis doc exactly — if a task needs a number not in that doc, leave a `TODO(cite)` comment instead of guessing.
- No feature in this wave may claim clinical efficacy beyond what's cited. Prefer "may help," "some people find," over "reduces," "treats," "proven."
- TDD mandatory. Conventional commits ending `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Do not start until Wave 1's hardening pass (safety.ts, distortionSpotter.ts) has committed** — Task A below touches `safety.ts`/`lethalMeansCoaching.ts`/`crisisResources.ts` and would collide with in-flight edits.

---

## Task A: Crisis-safety copy + resource fixes (safety-adjacent, sequence AFTER the hardening pass)

**Files:** `src/services/crisisResources.ts`, `src/services/lethalMeansCoaching.ts`, `TRANSPARENCY.md` (or wherever outcome-claim copy lives — grep for "reduces suicidal" first).

- [ ] Add Tele-MANAS (14416 / 1-800-891-4416) as the first India crisis line in `crisisResources.ts` REGIONS.IN, ahead of iCall (24/7 vs iCall's Mon–Sat 8am–10pm). Keep KIRAN — do not silently drop it; add a comment noting line status should be spot-checked periodically.
- [ ] Add a "Pesticides & household poisons" means-safety category to `getMeansSafetyCategories()` in `lethalMeansCoaching.ts`, following the existing category shape (collaborative prompt + trusted-person/lockbox/temporary-removal strategies), citing Gunnell et al. (2017) *Lancet Global Health* / Bonvoisin et al. (2020) *BMC Public Health* in the code comment.
- [ ] Add the "time and distance" canonical framing sentence to means-safety copy near `lethalMeansCoaching.ts:139`, citing Betz et al. (2020) *JMIR*.
- [ ] Grep the whole repo for outcome-overclaim phrases ("reduces suicidal thoughts", "prevents suicide", "treats depression/anxiety") in user-facing copy and TRANSPARENCY.md; rewrite any hit to behaviour-scoped, citation-matched language per the synthesis (SPI reduces suicidal *behaviour*, RR 0.57, no significant ideation effect — Nuij et al. 2021; direct digital interventions show a modest ideation effect, g≈-0.23 — Torok et al. 2020).
- [ ] Tests: extend `crisisResources.test.ts` for the new Tele-MANAS line and category presence in `lethalMeansCoaching.test.ts` (create if absent, mirroring existing service-test conventions).
- [ ] `npx vitest run src/services/crisisResources.test.ts src/services/lethalMeansCoaching.test.ts` green, `npx tsc --noEmit` clean on touched files.
- [ ] Commit: `feat(crisis-safety): Tele-MANAS first-line, pesticide means-safety category, calibrated outcome copy (clinical research wave 2)`.

## Task B: Basis-string / citation corrections across protocols.ts (the #1 cross-cutting fix)

**Files:** `src/services/protocols.ts`, `docs/NILA_AGENT_RESEARCH_BASIS.md`, `src/services/circadianFeedback.ts` (comment only).

This is the single highest-integrity-value task — fixes the recurring "big guided-package effect size attached to a small isolated technique" error found independently in 3 domains, plus one fabricated citation.

- [ ] `protocols.ts:41-43` (BA basis string): replace unverifiable "SMD ≈ −0.51" with verified numbers — internet BA g≈-0.49 post-treatment (apps ≈-0.39), unguided not significant, no effect at 6-month follow-up, per Alber et al. (2023); Jia et al. (2025) *JMIR*.
- [ ] `protocols.ts:66-68` (worry-postponement basis string): replace "d≈-0.9" (which is for full guided iCBT packages) with the isolated-technique figure, d≈0.19-0.31, per Richards, Richardson, Timulak & McElvaney (2015) *Internet Interventions*; Dippel, Brosschot & Verkuil (2024) *Int'l J of Cognitive Therapy*.
- [ ] `circadianFeedback.ts:1-8` comment: fix the nonexistent "Gottlieb et al. 2025, 3.39x" citation to the real trial (NCT05400785), reporting a ~3.4x recurrence-reduction figure, per Yeom, Jeong, Moon et al. (2026) *American Journal of Psychiatry*.
- [ ] Grep `docs/NILA_AGENT_RESEARCH_BASIS.md` for any other basis string referencing an effect size — cross-check each against the synthesis doc; flag (don't silently "fix") any not covered by this wave's research for a follow-up pass.
- [ ] No test changes needed (comment/string-only) unless a test asserts the literal old string — check via `grep -rn "SMD" src --include=*.test.ts` etc. before editing.
- [ ] `npx tsc --noEmit` clean.
- [ ] Commit: `docs(evidence): fix misattributed basis-string effect sizes (BA, worry-postponement, circadian) — clinical research wave 2`.

## Task C: BA/PST protocol upgrades (protocols.ts continued + behaviouralActivation.ts/problemSolving.ts)

**Files:** `src/services/protocols.ts` (ba-*/pst-* entries — coordinate with Task B, same file, do sequentially after B or in the same task), `src/services/behaviouralActivation.ts`, `src/services/problemSolving.ts`, `src/services/protocolBA.ts`, `src/components/ValuesToActionScreen.tsx`, `src/services/protocolProgress.ts`, `src/services/usageAnalytics.ts`.

- [ ] Add if-then implementation-intention prompt + one barrier-plan field to BA scheduling (`protocols.ts` ba-4) and PST action plans (`problemSolving.ts` `setActionPlan`), citing Gollwitzer & Sheeran (2006) *Adv Exp Soc Psychol* (d=0.65 general, d+=0.99 mental-health samples).
- [ ] Close the BA mood loop: capture `moodBefore` (currently dead/unused per the audit) and add mood-after alongside mastery/pleasure ratings in `protocolBA.ts` `pickBAActivity`/`rate_activity`, citing Jacobson, Martell & Dimidjian (2001).
- [ ] Add one avoidance (TRAP→TRAC) step between activation and activity-picking in `protocols.ts` (ba entries), citing Jacobson, Martell & Dimidjian (2001).
- [ ] Make BA persist completions instead of self-erasing (reuse the `nilamind_protocol_completions` log Wave 1 Task 5 already added in `protocolProgress.ts`/`usageAnalytics.ts` — this item is now mostly already done; verify and close any remaining gap).
- [ ] PST fidelity: add positive-problem-orientation psychoed copy and brainstorm-quantity scaffolding to `ProblemSolvingScreen.tsx`, citing Bell & D'Zurilla (2009) *Clin Psychol Rev*.
- [ ] Tests: extend `protocols.test.ts`/`behaviouralActivation.test.ts`/`problemSolving.test.ts`/`protocolBA.test.ts` per existing conventions for each new field/step.
- [ ] `npx vitest run` (files above) green, `npx tsc --noEmit` clean.
- [ ] Commit: `feat(ba-pst): implementation intentions, mood-loop closure, TRAP-TRAC step, PST fidelity (clinical research wave 2)`.

## Task D: GAD/worry protocol upgrades (protocols.ts continued — sequence after Task C, same file)

**Files:** `src/services/protocols.ts` (wp-* entries), `src/services/skillsLibrary.ts` (`EMOTION_TO_SKILL`), `src/services/nila.ts` (explainer fallback, ~line 97-130).

- [ ] Add a triage step between wp-1/wp-2 distinguishing real/solvable worry (route to PST) from hypothetical worry (→ postponement), citing Borkovec, Wilkinson, Folensbee & Lerman (1983).
- [ ] Reframe the postponement instruction (wp-3) as a metacognitive behavioral-experiment testing "I can't control this worry," citing Krzikalla et al. (2024) *Clinical Psychology in Europe* (d=0.82).
- [ ] Route chronic-worry language away from TIPP toward worry-specific tools in `skillsLibrary.ts` `EMOTION_TO_SKILL` — TIPP is a crisis-intensity (8-10/10) DBT skill, an intensity mismatch for ordinary GAD-style worry.
- [ ] Anchor the "why am I anxious" explainer fallback in `nila.ts` to the existing `anxiety-alarm` psychoed card content (via `psychoed.ts` `searchPsychoed`) instead of free model generation, citing Donker, Griffiths, Cuijpers & Christensen (2009) *BMC Medicine*. If wiring the psychoed lookup is non-trivial, fall back to hardcoding a single Barlow false-alarm-model sentence in the explainer fallback per the synthesis's own fallback option.
- [ ] Tests: extend `protocols.test.ts`, `skillsLibrary.test.ts`/`skillSuggest.test.ts`, `nilaVoice.test.ts`.
- [ ] `npx vitest run` green, `npx tsc --noEmit` clean.
- [ ] Commit: `feat(gad-worry): triage step, metacognitive reframe, TIPP-intensity routing, evidence-anchored explainer (clinical research wave 2)`.

## Task E: DBT skill upgrades (skillsLibrary.ts, skillSuggest.ts, protocols.ts anger entries)

**Files:** `src/services/skillsLibrary.ts`, `src/services/skillSuggest.ts`, `src/services/protocols.ts` (ag-* entries — coordinate with Tasks B/C/D on protocols.ts, do this LAST among the protocols.ts-touching tasks, or merge into one combined protocols.ts task if agents keep colliding).

- [ ] Fix `suggestSkill` to map per-signal instead of always picking `skills[0]` of a group, in `skillSuggest.ts:14-37,47-48`, citing Neacsiu, Rizvi & Linehan (2010).
- [ ] Add anti-rumination instruction + a reappraisal micro-step to Cooling Anger's step-away (`protocols.ts` ag-3), citing Pop, Nechita, Miu & Szentágotai-Tătar (2025) *Scientific Reports* (r=0.42) and Szasz, Szentagotai & Hofmann (2011).
- [ ] Add honest-expectation framing to Wise Mind/mindfulness entries in `skillsLibrary.ts:82-85` ("helps a little, with repetition" — never symptom-treatment language), citing Schumer, Lindsay & Creswell (2018) (g=0.21, g=0.04 after bias adjustment).
- [ ] Tests: extend `skillSuggest.test.ts`, `protocols.test.ts`, `skillsLibrary.test.ts`.
- [ ] `npx vitest run` green, `npx tsc --noEmit` clean.
- [ ] Commit: `feat(dbt-skills): fix skill-signal routing, anger reappraisal step, honest mindfulness framing (clinical research wave 2)`.

## Task F: Alliance/voice upgrades (nila.ts, distortionSpotter.ts, nilaContext.ts — sequence AFTER hardening pass, same files)

**Files:** `src/services/nila.ts`, `src/services/distortionSpotter.ts`, `src/safety.ts` (`checkResponse` near :541), `src/services/nilaExemplars.ts`/`docs/nila-corpus/seed.jsonl`.

- [ ] Sequence the distortion steer to validate-first, one-question-max in `distortionSpotter.ts:124-128` (`distortionSteer`), citing Shenk & Fruzzetti (2011) and Braun, Strunk, Sasso & Cooper (2015).
- [ ] Add a consecutive-question cap near `nila.ts:102-116` — if Nila's last 2 replies both ended with "?", steer toward reflection-only, citing Magill et al. (2018) *J Consulting and Clinical Psychology*.
- [ ] Add a distortion-echo rule to `checkResponse` (near `safety.ts:541`) rejecting stealth-agreement replies ("you're right — they never listen to you") when the user's message hit `spotDistortions`, citing Au Yeung, Dalmasso, Foschini, Dobson & Kraljevic (2025) arXiv preprint.
- [ ] Add expectation-setting micro-copy to `composeWelcome` (`nila.ts:165`), citing Lucas, Gratch, King & Morency (2014); Darcy et al. (2021) (bond forms within ~5 days — do not claim "sustained over 8 weeks," that figure was found unsupported).
- [ ] Add ~12 validate-then-challenge exemplars (one per distortion in `distortionSpotter.ts`'s `DISTORTIONS` list) to `docs/nila-corpus/seed.jsonl`, tagged `register`/`move` metadata; regenerate `nilaExemplars.ts` via `node scripts/gen-exemplars.mjs`, citing Braun et al. (2015); Shenk & Fruzzetti (2011).
- [ ] Guardrail: do NOT hard-code a 2:1 reflections:questions ratio anywhere, do NOT add "MI-based" marketing copy — the ratio isn't outcome-linked (Magill et al. 2018) and MI-style framing showed no advantage (He, Basar, Wiers, Antheunis & Krahmer 2022). Add a code comment at the consecutive-question-cap site noting this explicitly so a future contributor doesn't "fix" it into a ratio.
- [ ] Tests: extend `nilaVoice.test.ts`, `distortionSpotter.test.ts`, `safety.test.ts`, `nilaExemplars.test.ts`/`exemplarRetrieval.test.ts`.
- [ ] `npx vitest run` (all touched files) green, `npx tsc --noEmit` clean.
- [ ] Commit: `feat(alliance-voice): validate-first sequencing, question cap, stealth-agreement gate, welcome expectation-setting, +12 exemplars (clinical research wave 2)`.

## Task G: Measurement/EMA copy + guardrail fixes (assessments.ts, AssessmentScreen.tsx, ema.ts, emaPrefs.ts, DashboardScreen.tsx)

**Files:** `src/services/assessments.ts`, `src/components/AssessmentScreen.tsx`, `src/services/ema.ts`, `src/services/emaPrefs.ts`, `src/components/DashboardScreen.tsx`, `src/services/dashboardInsights.ts`.

- [ ] Soften the assessment-cadence claim from asserted fact to structural reasoning in `AssessmentScreen.tsx` menu copy (~157-160) — PHQ-9/GAD-7's 2-week recall window structurally limits value of frequent retesting; add a soft (non-blocking) same-window guard.
- [ ] Document (comment only) why PHQ-9 item-9 any-endorsement routing is correct as-is near `assessments.ts:60` `safetyItemIndex`, citing Louzon, Bossarte, McCarthy & Katz (2016) *Psychiatric Services* — stratified HRs 1.75/2.15/2.85, and noting 71.6% of suicides occurred among "not at all" responders (real but low-sensitivity signal).
- [ ] Fix `getEmaEnabled()`'s default in `emaPrefs.ts:8-17,23` so behavior matches its own "opted in by default" comment (currently defaults to off) — OR fix the comment to match the code, whichever is the actual intended behavior (check git blame/history for original intent before flipping a default silently).
- [ ] Demote the raw numeric streak counter's visual prominence in `DashboardScreen.tsx:395-400` — lead with `computeCompassionateStreak().message` instead of the Flame+number stat, citing Six, Byrne, Tibbett & Pericot-Valverde (2021).
- [ ] Gate the "worst weekday" callout in `dashboardInsights.ts:57-67` on a minimum sample size, soften absolute-label language, citing Polhemus et al. (2022).
- [ ] Tests: extend `assessments.test.ts`, `emaPrefs.test.ts`, `dashboardInsights.test.ts`, add a `DashboardScreen.test.tsx` case for the streak-demotion if a render test already exists (don't create a heavy new RTL suite just for this).
- [ ] `npx vitest run` green, `npx tsc --noEmit` clean.
- [ ] Commit: `feat(measurement-ema): calibrated cadence copy, item-9 rationale doc, streak de-emphasis, worst-weekday guard (clinical research wave 2)`.

## Task H: Rhythm/sleep + grounding/breathing upgrades (independent files, safe to fully parallelize with G)

**Files:** `src/services/circadianFeedback.ts` (comment already fixed in Task B — coordinate/sequence after B), `src/components/SocialRhythmScreen.tsx`, `src/services/windDown.ts`, `src/services/breathPacer.ts`, `src/components/BreathingTimer.tsx`, `src/data.ts` (5-4-3-2-1 citation).

- [ ] Surface the wake-time-lever insight directly on `SocialRhythmScreen.tsx` after saving, reusing `circadianFeedback.ts`, citing Frank et al. (2005); Monk, Frank, Potts & Kupfer (2002).
- [ ] Add a permanent no-sleep-restriction guard + comment near `windDown.ts` `SLEEP_TIPS`, citing Harvey, Soehner, Kaplan et al. (2015); Dell'Aquila & Soti (2022).
- [ ] Add a cyclic-sighing breathing pattern to `breathPacer.ts` `PATTERNS` and prioritize it in the acute-episode path, citing Balban, Neri, Kogon et al. (2023) *Cell Reports Medicine*.
- [ ] Relabel/reposition the existing "5-5" pattern in `breathPacer.ts:19`/`BreathingTimer.tsx` picker as evidence-cited resonance-frequency breathing, citing Goessl, Curtiss & Hofmann (2017); Lehrer & Gevirtz (2014).
- [ ] Add a soft ~5-minute session target + completion cue to `BreathingTimer.tsx`, citing You, Laborde, Zammit, Iskra & Borges et al. (2021) (corrected citation per verification pass — NOT the Laborde et al. 2022 biofeedback paper).
- [ ] Fix or honestly soften the 5-4-3-2-1 grounding citation in `data.ts:107` — no verifiable RCT/Segal et al. 2002 support was located; rewrite as "a widely-used grounding practice" without a fabricated evidence claim.
- [ ] Tests: extend `breathPacer.test.ts`, `windDown.test.ts`, add a guard test asserting no-sleep-restriction language stays out of `SLEEP_TIPS`.
- [ ] `npx vitest run` green, `npx tsc --noEmit` clean.
- [ ] Commit: `feat(rhythm-sleep,grounding): cyclic sighing, resonance breathing relabel, wake-time insight, honest 5-4-3-2-1 citation (clinical research wave 2)`.

## Task I: ACT/exposure dead-code wiring + citation line (independent files, safe to fully parallelize)

**Files:** `src/components/ExposureHierarchyScreen.tsx`, `src/services/exposureHierarchy.ts`, `src/components/ValuesWorkScreen.tsx`.

- [ ] Wire the already-built-but-unused `inhibitoryLearningPrompts()` into the exposure completion flow in `ExposureHierarchyScreen.tsx:118-129` as guided reflection prompts (this is dead code today — confirm via grep before assuming, per the synthesis), citing Craske, Treanor, Conway, Zbozinek & Vervliet (2014).
- [ ] Add a visible research-citation line to `ValuesWorkScreen.tsx`, citing Ferrari, Hunt, Harrysunker, Abbott, Beath & Einstein (2019); Neff (2003).
- [ ] Tests: extend `ExposureHierarchyScreen.test.tsx`/`exposureHierarchy.test.ts` if they exist; if not, verify `inhibitoryLearningPrompts()` already has unit coverage and just add an integration assertion that it's called on completion.
- [ ] `npx vitest run` green, `npx tsc --noEmit` clean.
- [ ] Commit: `feat(act-exposure): wire inhibitory-learning prompts into completion flow, add ValuesWork citation (clinical research wave 2)`.

## Task J: Engagement/onboarding S-effort items (independent files, safe to fully parallelize)

**Files:** `src/components/TodayScreen.tsx`, `src/services/chatSuggestions.ts`, `src/components/OnboardingGate.tsx`.

- [ ] Actually use the onboarding goal selection (`nilamind_user_goal`, currently write-only per the audit) to personalize Today's tool ordering and chat-suggestion chips in `TodayScreen.tsx`/`chatSuggestions.ts`, citing Borghouts, Eikey, Mark et al. (2021).
- [ ] Add a brief expectancy/rationale sentence to `OnboardingGate.tsx:42-46`'s "how Nila helps" slide, citing Devilly & Borkovec (2000); Abd-Alrazaq et al. (2020); Sohn, Ha, Park et al. (2026) — do NOT claim an adherence-correlation figure, the synthesis found that unsupported and removed it.
- [ ] Guardrail (no-op, confirm only): verify `retentionMetrics.ts:8-9` still has no gamified retention/streak surface added anywhere — this is a "preserve the existing deliberate choice" item, not a code change; if a check is cheap to add (e.g. a comment or a lint rule), add it, otherwise just confirm in the task report.
- [ ] Tests: extend `chatSuggestions.test.ts` if it exists; add a light integration check that onboarding goal affects tool ordering.
- [ ] `npx vitest run` green, `npx tsc --noEmit` clean.
- [ ] Commit: `feat(engagement-onboarding): use onboarding goal for personalization, expectancy-setting copy (clinical research wave 2)`.

---

## Execution order

Tasks B→C→D→E all touch `protocols.ts` sequentially (each depends on the previous one's edits landing) — run these four as ONE sequential chain, not parallel agents, OR combine into a single agent's scope if collision risk is a concern. Task A must wait for the Wave-1 hardening pass. Task F must also wait for the Wave-1 hardening pass (same distortionSpotter.ts/safety.ts files). Tasks G, H, I, J touch fully disjoint files from everything else and from each other — safe to run in parallel with each other and with the B-C-D-E chain once A/F's prerequisite (hardening pass) has landed.

## Wave 3 — deferred (larger [M]/[M-L] structural items, NOT in this wave)

These need their own design/brainstorming pass — new components, new data models, or multi-week cadence infrastructure — rather than being rushed into a bundle:

- Soft-vs-hard crisis surface differentiation by detection layer (crisis-safety) — changes `detectCrisis()`'s return shape and the crisis-UI branching; safety-critical, needs careful design.
- User-armed post-crisis check-in / caring-contacts follow-up (crisis-safety) — new local-notification scheduling surface.
- Principled Indic passive-death-wish word-order families beyond what Wave 1's hardening pass covers (crisis-safety) — explicitly flagged as needing native-speaker review, not a code-only task.
- Guided safety-plan walkthrough + "fill this in later" hook (crisis-safety).
- Register-aware exemplar retrieval filter (alliance-voice) — needs an intensity-estimation function, a new scoring dimension.
- On-device 4-item alliance pulse check / new You-tab surface (alliance-voice).
- BA cyclical multi-week redesign, PST scheduled review step (ba-pst) — beyond persisting completions (done in Task C), a full multi-week cadence system.
- DBT: interactive Check-the-Facts micro-flow (rate→state→reframe→re-rate), diary-card feedback-loop visualization, 2-4 week DBT practice cadence with between-session assignments (dbt-skills) — each is a new interaction flow.
- Intolerance-of-Uncertainty single-session module (gad-worry) — an entirely new protocol entry, "the single most directly transferable finding" per the synthesis, deserves its own plan.
- Reliable-change/MCID bands + deterioration nudge for PHQ-9/GAD-7/WHO-5 (measurement) — new `classifyChange()` function + UI, non-trivial correctness bar for a safety-adjacent feature.
- Pilot pre/post summary reliable-change flag (measurement) — depends on the above.
- JITAI decision-point evaluation log + receptivity gate (ema-checkins) — new logging/eval infrastructure.
- Soften EMA scheduling on deterioration-trend detection (ema-checkins) — cross-cuts `ema.ts`/`nilaInflection.ts`, needs careful interaction design with existing inflection detection.
- Replace ad hoc sleep `combinedScore` with the real Phillips (2017) Sleep Regularity Index (rhythm-sleep) — a real algorithm change with new risk-threshold calibration.
- Full interactive always-accessible TIPP tool (grounding-peer) — new component, currently text-only.
- Cognitive-reframing micro-step in Peer Support (grounding-peer) — new interaction step, hedged copy needs careful wording review.
- Exposure Hierarchy trauma/medical pre-flight screen + elevation-guard consultation before exposure/values commitments (act-exposure) — safety-adjacent gating logic, needs the same care as Wave 1's §9 hardening.
- Values tools consolidation (act-exposure) — two independently-built implementations with different data stores; a real migration, not a small edit.
- Daily intention → structured if-then picker + unify three intention surfaces (engagement-onboarding) — new component + data-model unification across 3 existing surfaces.
- Rebalance Today-hub default surfacing toward structured tools over open chat (engagement-onboarding) — a product-level default-behavior change, worth flagging to the human owner before shipping rather than deciding unilaterally.

Each of these should become its own dated plan doc when picked up, following the same writing-plans discipline as this one.
