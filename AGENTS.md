# NilaMind — Agent Build Guide

Read this before changing anything. It's for any coding agent (OpenCode, Claude Code, Cursor, …).

## What this is
A **privacy-first, ON-DEVICE mental-health WELLNESS companion.** Ionic/React/Capacitor app with a
fine-tuned **Gemma-3-4B** brain running locally via a llama.cpp seam. India-first, **manic-first** (bipolar-aware).
Core promise: **nothing leaves your phone.**

## Golden rules — DO NOT VIOLATE
1. **Wellness, never therapy.** Never ship copy or claims using "therapy / therapist / treat / diagnose / cure"
   (legal: Illinois WOPR Act, Nevada AB 406, FDA general-wellness line). Say "not therapy, not a crisis service."
2. **§9 crisis safety is DETERMINISTIC and model-independent.** `safety.ts` (`scanForCrisis`, `checkResponse`
   Rules 1–6) + `crisisClassifier.ts` (on-device MiniLM). Never route crisis *judgment* through the LLM
   (a 4B is ~15% worse at suicide-risk). Fail closed. Every reply passes the output gate.
3. **Nothing leaves the device.** No third-party network calls, analytics, ad SDKs/pixels, or external fonts
   (fonts are self-hosted via `@fontsource`). A privacy claim must be literally true on every code path.
4. **Personalization = memory-into-context**, model stays fixed. No on-device weight adaptation (RAM-impossible).
5. **Structure beats free chat.** Wrap evidence-based protocols; a free-form LLM is where harm (sycophancy,
   delusion/mania validation, method disclosure) enters. Anti-sycophancy is a hard gate, not a hope.

## Build / test / verify
- **Tests (keep green):** `npx vitest run` — ~**693 tests**. One file: `npx vitest run src/services/X.test.ts`.
- **Typecheck (must be exit 0):** `npx tsc --noEmit`
- **Build:** `npm run build` (vite)
- **TDD is mandatory.** RED (write a failing test, *watch it fail for the right reason*) → GREEN (minimal code) →
  REFACTOR. No production code without a failing test first. Match the codebase style: pure, deterministic,
  research-cited functions; every safety keyword list has PAIRED benign-control tests (precision matters — a
  false crisis fire on a calm chat is itself harmful).
- **Device-only:** Gemma inference, sensors (Health Connect), and Vosk voice can't run in node/web. Anything
  touching them must be **device-verified on the phone** (adb) — tests cover the logic seams only.

## Guardrails against reward-hacking (READ — this is a safety-critical app)
The #1 documented failure of coding agents is gaming the test gate. On this app a faked-green §9 test = a real
safety hole. So, non-negotiable:
- **NEVER weaken, hardcode-around, skip (`.skip`/`.only`), or DELETE a test to make the suite pass.** If a test
  fails, fix the code — or, if the test itself is genuinely wrong, explain why and change it in a *separate,
  clearly-labelled* step for human review. A green suite achieved by editing tests is a failure, not a pass.
- **A green suite is necessary, not sufficient.** ~1 in 5 "resolved" patches are semantically wrong. For any
  change touching `safety.ts`, `crisisClassifier*`, `elevationGuard`, `nilaSafetyGate`, `secureLocal`,
  `secureStore`, or `nilaContext`, state your reasoning and **flag the diff for human review before commit.**
- **`tsc --noEmit` is a hard gate** — never claim done with type errors (the Capacitor native bridge is where
  hallucinated APIs bite).
- **Don't invent APIs or plugins.** If a binding isn't in the repo, find it or ask — don't guess a native call.

## Architecture map
- **Safety:** `safety.ts` (keyword floor + `checkResponse` output gate Rules 1–6), `crisisClassifier.ts` (MiniLM),
  `elevationGuard.ts` (mania *input* detection), `dependencyGuard.ts`, `safetyPlan.ts`.
- **Brain path:** `agent.ts` (regex intents) → `sendToNila` → `localNila` → **`nilaContext.ts`
  (`buildPersonalContext` = the ONLY state fed to the model)** → `localLlm.ts` seam → `llamaCppLlmAdapter`.
- **Insight engines (research-cited, on-device):** `patternInsights.ts`, `nilaInflection.ts`, `sleepInsight.ts`,
  `moodHistory.ts`, `nilaInsights.ts` (compounding memory).
- **Protocols:** `protocols.ts`, `behaviouralActivation.ts`, `protocolProgress.ts`, `values.ts`.
- **Persistence:** `secureLocal.ts` (encrypted; IndexedDB + in-memory cache; passthrough fallback), `secureStore.ts`.
- **IA:** 3 tabs (Nila / Tools / You) in `App.tsx`; `nav.ts` router; `toolsRows.ts` / `youRows.ts` hubs.

## Strategy thesis (2026-07-06 audit)
A 4-agent audit found NilaMind is **feature-complete and well-engineered**; the real problems are **dead wiring**
(analytics never reached the chat) and **fragmentation** (duplicate entry points), **NOT the model**. So:
**do NOT add a cloud/Tier-2 model layer** until the wiring + fragmentation are fixed and re-evaluated — it reverses
the deliberate on-device decision and costs money, and the audit shows it wouldn't fix the felt quality gap.

## Current work — branch `feat/vision-p0-reality-guard`
Shipped (TDD, 699 green, tsc clean):
- anti-sycophancy **Rule 6** (manic grandiosity/impulsivity/paranoia validation)
- `elevationGuard` **racing-thoughts**
- **sleep + inflection signals fed into `nilaContext`** (#1a/#1b)
- warm **offline/cold-start fallback** via `nilaReflect` (#3)
- **sleep prodrome signal** surfaced in Nila tab (#4)
- **passthrough hydration** before declaring failure (#5)
- **insight-aware daily nudge** (#6)
- **safety-plan timeout cleanup + atomic append primitive** for shared arrays (#7)
- unified **episode voice** with companion persona + personal context (#2)
- partial **de-fragmentation**: AgentConsoleScreen removed from product, orphaned CheckInScreen removed (#8)

## Remaining prioritized fixes
- **#8 (continued)** Finish de-fragmentation: 3 reading libraries → 1, BA/self-compassion → in-chat protocol
  path. _[device-verify]_

## Commit style
Conventional commits; end messages with `Co-Authored-By:` your agent line. Gate every commit on `vitest` +
`tsc --noEmit` green. Branch off `main`; do not push without the owner's OK.
