# Safety Layer Redesign — Design Spec

Date: 2026-07-15
Branch: `feat/safety-layer-redesign` (isolated worktree; NOT to be merged to main without explicit user sign-off — parallel work is in progress on other branches)

## Problem statement

Two concrete complaints from the user:

1. **First run gives the user nothing to prepare with.** The 8-slide `OnboardingGate` never asks about a coping/safety plan. The full Stanley-Brown `SafetyPlanScreen` exists but is buried inside the Nila chat tab, reachable only via `handleOpenSafetyPlan()`. Nobody is nudged to fill it before they need it.
2. **A crisis moment gets a wall, not help.** When §9 fires full-tier, `CrisisOverlay` takes over and renders all six Stanley-Brown sections unconditionally — for a user with no plan, that's six "this is blank — that's okay" placeholders plus a helpline list. No de-escalation content, nothing to read, nothing personalized.

Additionally, `crisisResources.ts` lists **KIRAN (1800-599-0019)** as a live India helpline. It was merged into Tele-MANAS in February 2024 and phased out (verified: BioSpectrum India, Drug Today reporting). This is a factual defect in the same file this redesign touches.

## Research basis (full briefs held in conversation; key citations below)

- **Stanley & Brown SPI evidence:** Stanley et al. 2018 (*JAMA Psychiatry* 75(9):894–900) — SPI + follow-up call → 45% fewer suicidal behaviors, 2x treatment engagement. Nuij et al. 2021 (*Br J Psychiatry* 219(2):419–426) meta-analysis — RR=0.57 on behavior, no significant ideation effect (don't oversell). Gamarra et al. 2015 (*Crisis* 36(6):433–443) — plan **quality**, not completeness, predicts outcomes. Rainbow et al. 2024 (*Psychiatry Res*; *Br J Clin Psychol*) — most real-world users complete plans alone; personalized content predicts coping gains; app-use time does not.
- **Crisis-moment UX:** Pichowicz, Kotas & Piotrowski 2025 (*Sci Rep*) — 17.24% of tested MH apps/chatbots literally block crisis messages; this is named a critical failure. Tang et al. 2026 (arXiv:2602.01694) and Zheng et al. 2025 (arXiv:2506.00195) — hard refusal is the worst-rated response pattern; partial engagement + explanation beats blocking. Dazzi et al. 2014 (*Psychol Med*) — asking directly about suicide does not increase ideation. Jaroszewski, Morris & Nock 2019 (*JCCP*, Koko RCT) — addressing the *specific barrier* to contacting a crisis line (not just listing the line) is the one experimentally-verified pattern that increases crisis-service uptake in acute distress.
- **De-escalation content:** Simon et al. 2001 and Deisenhammer et al. 2009 — the acute decision-to-act window is usually minutes to under an hour; this fact is itself therapeutic content ("the wave passes"). Now Matters Now (Whiteside et al. 2019, *JMIR* 21(5):e13183) — a self-administered skills page is associated with in-the-moment reduction in suicidal-thought intensity, including in the highest-severity subgroup. Bryan et al. 2017 (*J Affect Disord* 212:64–72) — brief Crisis Response Plan card format. Safe-messaging constraints (reportingonsuicide.org/SAVE, WHO 2023, #chatsafe) — never name methods, never use prevalence framing, validate before instructing, ≤~grade 5–6 reading level in acute copy.

Full citation lists and design-requirement tables are preserved in the conversation transcript; this spec applies the "MUST" items directly.

## In scope

### A. Onboarding: one new slide, not a new screen

Insert a slide into `OnboardingGate`'s existing slide sequence, between `personalize` and `region`:

- **id:** `safety_net`
- **Title:** "Let's set up your safety net" (framed as preparation, not diagnosis)
- **Three short optional prompts**, one field each (not the full 6-step SPI form — avoids onboarding fatigue for a feature most users won't touch daily):
  1. Warning sign — maps to `SafetyPlan.warningSigns`
  2. One thing you can do alone to cope — maps to `SafetyPlan.internalCoping`
  3. One person you could reach out to (name only, no phone number required) — maps to `SafetyPlan.trustedPeople`
- Skip behaves exactly as today (`finish()` still works with nothing filled).
- On `finish()`, if **any** of the three fields is non-empty, write them into the real `nilamind_safetyplan` secureLocal record (same store `SafetyPlanScreen`/`CrisisOverlay` already read via `parseSafetyPlan`) and stamp `lastUpdatedAt = Date.now()`. This is the only new plumbing needed for the existing 48h/14-day `safetyPlanFollowUp.ts` review nudges to start firing for these users — no new follow-up logic required.
- If the user later opens the full `SafetyPlanScreen`, their onboarding answers are already there, pre-filled, editable.

### B. New nudge: invite completion (the gap that doesn't exist today)

`safetyPlanFollowUp.ts` already nudges to *review* an existing plan (48h / 14-day). It has no nudge to *create* one. Add:

- `hasMeaningfulSafetyPlanContent(plan): boolean` — true if any field has non-boilerplate content (>10 chars, not just whitespace). This is the Gamarra "quality over completeness" gate — an empty plan and a plan with one real sentence are treated differently.
- `shouldNudgeToCreateSafetyPlan(plan): boolean` — true when onboarding is done, the plan has no meaningful content, and the nudge hasn't been dismissed too recently (reuse the existing dismiss-cooldown pattern already used by other Today-tab cards, e.g. `RatingPromptCard`).
- A small dismissible Today-tab card (visually consistent with existing cards — not a new visual language) that opens `SafetyPlanScreen` on tap. Disappears for good once `hasMeaningfulSafetyPlanContent` is true.

### C. Crisis screen: declutter + supportive content

`CrisisOverlay` changes:

1. **Declutter:** only render a plan section if it has real content (reuse `hasMeaningfulSafetyPlanContent`-style per-field check). An empty plan renders zero placeholder boxes — instead, one line: an invitation to build the plan once this passes (not now — SPI creation belongs in a calm moment, per Frontiers 2024 meta-synthesis on "tunnel vision" during acute distress).
2. **One primary action:** Tele-MANAS 14416 tap-to-call is visually primary; AASRA / Vandrevala / iCall (with hours shown) collapse under "More ways to reach someone."
3. **New de-escalation content ("Ride out the next few minutes")** — a new component implementing the researched structure, added as a section of the overlay (not a separate navigation target, so it can't be "lost"):
   - Validation line (no instruction yet)
   - The temporal fact, plainly stated, without overclaiming a specific duration
   - One body-first action, linking to the *existing* `BreathingScreen`/`TIPPTool` rather than duplicating their logic
   - A 0–10 urge-intensity self-rating with a prompt to check again in ~10 minutes (simple local state, no new timer infra beyond what `CountdownRing`-style components already provide)
   - One short, method-free coping vignette (curated, static, reviewed copy — never model-generated)
   - A generic means-safety line ("distance between you and anything that could hurt you helps") — no methods named
4. `getCrisisReply()` (the deterministic chat-substitution text) gets validation-first phrasing per the brief's template; stays deterministic/curated — the research is explicit that crisis copy must never be LLM output, so this does not change.
5. Exit copy no longer requires declaring "I feel steadier now" to leave — reframed so returning to the conversation doesn't demand a recovery claim first.

### D. Data fix
Remove KIRAN from `REGIONS.IN.lines` in `crisisResources.ts`; note the merge in the inline comment for future maintainers.

## Explicitly out of scope
No hope-box/media features, no SMS caring-contacts infrastructure changes (existing opt-in `postCrisisCheckIn` stays as-is), no LLM-generated crisis replies, no change to §9 detection thresholds in `safety.ts` (`scanForCrisis`, keyword lists, classifier tiers). This is presentation + content + one onboarding slide + one data fix — not a detection-logic change.

## Testing
TDD per unit, following existing test conventions in this codebase (co-located `*.test.ts(x)` files, vitest):
- `onboarding.test.ts` / `OnboardingGate` behavior: new slide renders, skip still works, autosave writes real `SafetyPlan` fields + `lastUpdatedAt` only when non-empty.
- `safetyPlanFollowUp.test.ts`: new `hasMeaningfulSafetyPlanContent` / `shouldNudgeToCreateSafetyPlan` pure functions.
- New Today-tab nudge card: renders when due, dismiss cooldown, disappears once plan has real content.
- `CrisisOverlay.test.ts`: blank sections hidden, filled sections shown, new de-escalation content renders and links to existing grounding/breathing navigation.
- `crisisResources.test.ts`: KIRAN absent, Tele-MANAS present and first.

Full `tsc --noEmit` + `vitest run` must stay green (currently 235 files / 2590 tests passing on this branch). Nothing merges to main; branch stays pushed for the user's review only.
