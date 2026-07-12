# NilaMind — Plan of Action (the build queue)

**This is the single source of truth for what to build next and how.** Read it with `AGENTS.md` (golden
rules + reward-hacking guardrails). Written 2026-07-06; updated 2026-07-12.

**Autonomy legend:**
- 🟢 **Autonomous** — build it, `npm run guard` green, commit. No sign-off needed.
- 🟡 **Build, then FLAG for human review before merge** — safety-critical; ship the diff for the owner to eyeball.
- 🔴 **Do NOT build** — a human/strategic/business decision, or explicitly dropped. Skip it.

---

## Vision (North Star)
The private, phone-resident, **protocol-first mental-health *wellness* agent** that answers the **stigma** and
**privacy** objections at once — for the ~56% who get no treatment. **Nothing leaves the phone.** The deliberate
anti-Ash (cloud, trains-on-you, overclaims "therapy").

**Design law:** *structure is the active ingredient; the free-form LLM is where harm enters.* The on-device 4B is
a **detector, rails-runner, and warm layer — never a free-talking therapist.** §9 crisis safety is deterministic
and model-independent.

---

## How to build (non-negotiable rules)
1. **TDD.** RED (failing test, watched fail) → GREEN (minimal) → REFACTOR. No production code without a failing test first.
2. **`npm run guard` green before EVERY commit** (tsc + vitest + reward-hacking scan). **Never disable, skip, or delete a test to go green** — that's the #1 documented agent failure and it's a firing offense on a safety app.
3. **WIRE WHAT YOU BUILD.** No dead code. Every new engine must reach a screen or the agent **in the same change**. NilaMind's core problem was "great machinery that never reaches the user" — do not recreate it. A green suite that isn't wired to a user surface is **not done**.
4. **Flag the danger zone.** Any diff touching `safety.ts`, `crisisClassifier*`, `elevationGuard`, `nilaSafetyGate`, `secureLocal`, `secureStore`, `nilaContext`, or any proactive-outreach path → state your reasoning and mark it 🟡 for human review.
5. **Invariants:** nothing leaves the device; wellness, never therapy (no "therapist/treat/diagnose"); 18+ only; never gate the conversation or the crisis path.

---

## Already shipped (do NOT redo — build on it)
§9 hardened (Rule 6 manic-validation, racing-thoughts, directional Rule 2, Gen-Z/Hindi/Tamil, hypersexuality/
religious/pressured markers) · sleep + inflection fed into the chat (context wiring) · warm offline fallback ·
insight-aware nudge · unified episode voice · sleep-prodrome UI · real passthrough/lockout fix · varying
time/returning-aware opener · 18+ age-gate · de-frag (dead screens removed) · unified `searchLearn` logic ·
async overnight reflection (§9-gated) · weekly synthesis · emotion-granularity check-in · crisis button in nav.

### 🟢 Built and wired (previous queue — complete)
| Item | Module | Status |
|------|--------|--------|
| A1 | Learn screen (unified reading library) | ✅ Done |
| A2 | thoughtRecordDraft → ThoughtRecordScreen | ✅ Done |
| A5 | Phone-behaviour insights surfaced | ✅ Done |
| A6 | BA / self-compassion → shared in-chat protocol | ✅ Done |
| B1 | Behavioral Activation loop hardened | ✅ Done |
| B2 | State Engine (digest brain) consolidated | ✅ Done |
| B4 | Embedding-RAG psychoeducation | ✅ Done |
| C2 | Bundle-size cleanup | ✅ Done |

### 🟡 Built, flagged for human review before merge
| Item | Module | Diffs |
|------|--------|-------|
| A3 | distortionSpotter §9-gated in ThoughtRecordScreen | §9 gate: `safeSpotDistortions` returns `{ok:false}` on crisis → crisis overlay. `distortionSteer` adds "hold lightly, not a verdict" disclaimer. |
| A4 | armedCheckin wired with crisis+elevation+frequency+quiet gates | Crisis: `scanForCrisis`; elevation: `detectElevationRisk`; quiet: `QUIET_RE` regex (dnd/leave me alone); frequency: 24h cap. User arms via explicit phrase only. |
| B3 | safetyPlanFollowUp Stanley-Brown SPI+ loop | 48h first follow-up + 14-day periodic. Pure/deterministic, no push. Two UI cards in ModeScreen. |
| C1 | sleep sensing nudge (prodrome + JITAI cards) | `selfReportSleepSignal()` works today; Health Connect fallback automatic. Nudge-only (no sleep restriction). Amber prodrome + violet JITAI card in ModeScreen. |

---

## Research basis (2026-07-12)

### Literature scan for next feature candidates

| Candidate | Evidence | Fit |
|-----------|----------|-----|
| **CBT-I (insomnia protocol)** | d=1.46-1.94 insomnia, d=0.66-0.78 depression — strongest effect of any digital MH intervention | ⚠️ Sleep **restriction** excluded (mania trigger). Only the circadian/stimulus-control subset is safe. Already partially covered by `sleep-wind-down` + `sleep-rhythm` protocols. |
| **Personalized treatment selection (POT)** | RESiLIENT trial N=4,469: +35% over average-best via ML-personalized protocol matching | Partial fit. Routing exists (`routeToProtocol`) but is lexical, not ML. |
| **JITAI with reinforcement learning** | StayWell trial: RL-powered message selection improved mild depression outcomes | Narrow fit. `assessJitai` exists but is rule-based. |
| **Circadian rhythm stabilization** | CRM app RCT: 3.39× recurrence reduction for MDD/BD — strongest bipolar-specific evidence | Strong fit. `sleepHoursVariability.ts` + `socialRhythm.ts` exist. No feedback loop. |
| **DBT skills training pathway** | eDBT RCT: IRR=0.69 binge eating reduction; DBT Coach feasibility for self-harm | Strong fit. Some DBT elements exist but no structured training pathway. |
| **ACT protocol** | Growing chatbot evidence; perinatal ACT RCTs underway | Moderate fit. Values work exists but no full ACT pathway. |
| **Assertion training** | RESiLIENT: top-recommended skill for mild depression | New — not present at all. |
| **Lethal means counseling** | Stanley-Brown step 6; emphasized in 2025 systematic review | Partial — structural step in safety plan but no coaching flow. |

### Key negative finding
SmartBipolar trial (2026, N=201, JAMA Psychiatry-level): **zero effect** of smartphone monitoring + feedback for progressed bipolar disorder. Structured, protocol-driven intervention beats passive monitoring. NilaMind's protocol-first approach is validated by this negative result.

### Competitive landscape
- **Wysa** (CBT+DBT+ACT chatbot, FDA Breakthrough Device, strongest public consumer option)
- **Woebot** (CBT-focussed, most published research, now enterprise-only — no public app since June 2025)
- **Headspace Ebb** (meditation + AI companion, less clinical depth)
- **Flourish** (CBT+ACT, 2 RCTs, gamified)
- NilaMind's differentiators: **manic-first**, **privacy-first (nothing leaves device)**, **on-device LLM**, **deterministic §9 safety**, **bipolar-aware protocols**

### A/B data available on-device
NilaMind stores 30+ encrypted keys in `secureLocal`. Never transmitted. Analyzable today:
- App opens → D1/D7/D14/D30 retention curves
- Mood check-ins → frequency, emotion distribution, sleep/social correlations
- Assessments → PHQ-9/GAD-7/WHO-5 longitudinal scores
- Feature adoption → which protocols and tools used
- Chat feedback → thumbs up/down rate
- Social rhythm → daily anchor regularity
- Phone behaviour → screen time, app categories (Android)
- Voice patterns → speaking rate proxy for mood
- EMA compliance → micro-check-in frequency
- Inflection events → mood trajectory changes

---

## Build queue — sequenced properly

### Phase 1 🟢: On-device usage analytics aggregator
Build a local analytics layer that computes usage patterns from existing secureLocal data and surfaces them in-app. Zero safety risk. Enables every subsequent phase.

**What it includes:**
- `usageAnalytics.ts` — pure functions reading from all secureLocal keys to compute:
  - Retention stats (active days/7, active days/30, current/longest streak, D1/D7 retention)
  - Engagement depth (check-in frequency, EMA compliance, protocol completions)
  - Mood trajectory (average intensity, sleep correlation, inflection count)
  - Feature adoption (which protocols started, which tools used)
- `AnalyticsScreen.tsx` — tab/screen showing these metrics in a dashboard
- `InsightsDashboard` card in `DashboardScreen.tsx` — top-level summary
- TDD: new test file `usageAnalytics.test.ts`

### Phase 2 🟢: Structured DBT skills training pathway
Build a multi-week DBT skills training program (mindfulness → distress tolerance → emotion regulation → interpersonal effectiveness), modeled on the eDBT app structure.

**What it includes:**
- `protocolDBT.ts` — structured DBT skills training with modules, skills, and diary card
- DBT protocol entry in `protocols.ts` (safe for all populations)
- UI pathway in ModeScreen for skill practice + diary card logging
- Tests: `protocolDBT.test.ts`

### Phase 3 🟢: ACT protocol expansion
Add full ACT pathway (acceptance, defusion, values-based committed action) building on existing `values.ts` work.

**What it includes:**
- `protocolACT.ts` — structured ACT protocol
- ACT protocol entry in `protocols.ts`
- Expansion of values work into committed action planning + tracking
- Tests: `protocolACT.test.ts`

### Phase 4 🟡: JITAI with adaptive personalization
Upgrade `assessJitai` from rule-based to personalized via usage analytics data + reinforcement learning signal.

**What it includes:**
- Upgrade `jitaiEngine.ts` to consume `usageAnalytics` output
- Personalized nudge timing and content selection
- Protocol recommendation surface (suggesting DBT when emotion dysregulation detected, etc.)
- **🟡 Flagged**: proactive outreach path — safety review required

### Phase 5 🟡: Circadian rhythm stabilization feedback loop
Build a circadian feedback system (inspired by CRM app) that shows the user their sleep regularity trend and offers structured rhythm-stabilization guidance.

**What it includes:**
- Circadian regularity score computed from sleep data + social rhythm
- Visual feedback in sleep-rhythm protocol
- Structured rhythm-stabilization guidance (no sleep restriction)
- **🟡 Flagged**: sleep-related proactive nudging — safety review required

### Phase 6 🟢: Assertion training protocol
Add assertion training protocol (evidence from RESiLIENT trial).

**What it includes:**
- `protocolAssertion.ts` — structured AT protocol
- AT protocol entry in `protocols.ts`
- Tests: `protocolAssertion.test.ts`

### Phase 7 🟡: Lethal means counseling coaching flow
Add a gentle, collaborative lethal means safety coaching flow within the safety plan module.

**What it includes:**
- Structured coaching conversation in `SafetyPlanScreen`
- Means safety education + collaborative strategy
- **🟡 Flagged**: touches safety plan — mandatory human review

---

## Definition of done (every phase)
Tested (TDD) · `npm run guard` green · **WIRED to a user surface** · safety diffs flagged for review · no dead code.
