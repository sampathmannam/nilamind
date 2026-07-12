# NilaMind — Plan of Action (the build queue)

**This is the single source of truth for what to build next and how.** Read it with `AGENTS.md` (golden
rules + reward-hacking guardrails). Written 2026-07-06; updated 2026-07-12 (all 7 phases shipped); **updated 2026-07-12 (Phases 8–16 complete, queue cleared).**

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

### Core safety & infra (shipped before Phase 1)
§9 hardened (Rule 6 manic-validation, racing-thoughts, directional Rule 2, Gen-Z/Hindi/Tamil, hypersexuality/
religious/pressured markers) · sleep + inflection fed into the chat (context wiring) · warm offline fallback ·
insight-aware nudge · unified episode voice · sleep-prodrome UI · real passthrough/lockout fix · varying
time/returning-aware opener · 18+ age-gate · de-frag (dead screens removed) · unified `searchLearn` logic ·
async overnight reflection (§9-gated) · weekly synthesis · emotion-granularity check-in · crisis button in nav.

### 🟢 Built and wired (previous queue)
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

### 🟡 Built, flagged for human review before merge — ALL REVIEWED & MERGED
| Item | Module | Diffs |
|------|--------|-------|
| A3 | distortionSpotter §9-gated in ThoughtRecordScreen | §9 gate: `safeSpotDistortions` returns `{ok:false}` on crisis → crisis overlay. `distortionSteer` adds "hold lightly, not a verdict" disclaimer. |
| A4 | armedCheckin wired with crisis+elevation+frequency+quiet gates | Crisis: `scanForCrisis`; elevation: `detectElevationRisk`; quiet: `QUIET_RE` regex (dnd/leave me alone); frequency: 24h cap. User arms via explicit phrase only. |
| B3 | safetyPlanFollowUp Stanley-Brown SPI+ loop | 48h first follow-up + 14-day periodic. Pure/deterministic, no push. Two UI cards in ModeScreen. |
| C1 | sleep sensing nudge (prodrome + JITAI cards) | `selfReportSleepSignal()` works today; Health Connect fallback automatic. Nudge-only (no sleep restriction). Amber prodrome + violet JITAI card in ModeScreen. |

### Seven-phase build queue (all shipped 2026-07-12)
| Phase | Feature | Files created |
|-------|---------|---------------|
| 1 🟢 | Usage analytics aggregator | `usageAnalytics.ts` + test, Dashboard card |
| 2 🟢 | DBT skills training (8-step) | `protocolDBT.ts` + test, registered in `protocols.ts` |
| 3 🟢 | ACT protocol (7-step) | `protocolACT.ts` + test, registered in `protocols.ts` |
| 4 🟡 | JITAI adaptive personalization | `jitaiEngine.ts` upgrade, wired to 3 callers |
| 5 🟡 | Circadian rhythm feedback loop | `circadianFeedback.ts` + test, Dashboard card, nilaContext |
| 6 🟢 | Assertion training (DEAR MAN/GIVE/FAST) | `protocolAssertion.ts` + test, registered in `protocols.ts` |
| 7 🟡 | Lethal means counseling coaching | `lethalMeansCoaching.ts` + test, wired in SafetyPlanScreen + nilaContext |

---

## Extended build queue — Phases 8–16 (all shipped 2026-07-12)

| Phase | Feature | Tag | Status |
|-------|---------|-----|--------|
| 8 | Forgiving engagement & streak redesign | 🟢 | ✅ Done |
| 9 | Episode-adaptive UI | 🟡 | ✅ Done |
| 10 | Social rhythm as daily core anchor | 🟢 | ✅ Done |
| 11 | Voice-first primary input pathway | 🟢 | ✅ Done |
| 12 | Clinician-facing report PDF | 🟡 | ✅ Done |
| 13 | India market polish pass | 🔴 | Skipped (explicit) |
| 14 | UI warmth & accessibility pass | 🟢 | ✅ Done |
| 15 | Anti-sycophancy measurement & hardening | 🟡 | ✅ Done |
| 16 | N-of-1 personalization surface | 🟢 | ✅ Done |

**Build queue: CLEARED.** No further phases defined.

---

## Research basis (2026-07-12 — updated with product audit)

### Current app snapshot (113 services, 60+ components, 1592 tests)
NilaMind is **feature-complete and well-engineered** per the 2026-07-06 audit. The core strengths:
- **On-device AI**: llama.cpp + Gemma-3-1B (Qwen2.5-1.5B default), MiniLM crisis classifier, Vosk STT
- **Deterministic safety**: keyword floor + MiniLM additive classifier + output gate Rules 1–6
- **5 structured protocols**: BA, DBT, ACT, Worry, Assertion
- **40+ skills**: crisis, mindfulness, emotion, relationships, thoughts, values, compassion
- **30+ screens**: mood tracking, sleep, social rhythm, medication, diary, safety plan, values, etc.
- **India-ready**: i18n (en/hi/ta/te), Tele-MANAS/Vandrevala/iCall crisis lines, BIP39 no-account identity
- **Encrypted persistence**: AES-GCM-256, IndexedDB, biometric gate
- **Anti-sycophancy**: Rule 6 blocks validation of manic grandiosity/impulsivity/paranoia

### What the competition looks like (2026 landscape)
- **Market**: ~$9.4B in 2026, but D2C apps bleed 95% by Day 30. Winners sell to employers.
- **Wysa** (FDA Breakthrough): CBT+DBT+ACT, 10+ Indian languages, NHS partner. Closest competitor.
- **Woebot**: Shut down June 2025 (FDA regulatory limbo for LLMs couldn't keep up).
- **Headspace Ebb**: Meditation + AI companion, less clinical depth.
- **No bipolar-specific AI companion exists** in the market.
- **No on-device, privacy-first protocol engine** exists (closest is ash-therapy, open source, 3B model, no bipolar focus).
- **No anti-sycophancy gate exists** in any competitor.

### Key negative findings
- **SmartBipolar trial (2026, N=201)**: **zero effect** of smartphone monitoring + feedback for BD. Passive logging doesn't work — structured protocol intervention does.
- **Woebot shutdown**: LLM-powered wellness chatbots face regulatory uncertainty. Stay in wellness territory, keep safety deterministic.
- **95% Day-30 abandonment**: engagement mechanics in mental health apps are broken. Punitive streaks, performative gamification, emotional mismatch.

### What the research says about what to build next

| Opportunity | Evidence | NilaMind Fit |
|-------------|----------|-------------|
| **Episode-adaptive UI** | Smashing Magazine 2026: "Designing for Distressed Users" — bright colors during distress are "jarring, even physically uncomfortable". ViviDiary: emotionally adaptive UI mutes palette, slows animations, softens AI tone. | ✅ **Done (Phase 9)** — `adaptiveTheme.ts`, CSS variable overrides, App.tsx provider |
| **Anti-sycophancy hardening** | Unique in the market. No competitor blocks manic validation. Rule 6 is clinically important and commercially unique. | ✅ **Done (Phase 15)** — 27 new MANIC_VALIDATION entries, metrics, context block, AboutNilaScreen |
| **Forgiving engagement** | 95% Day-30 abandonment. Bear Room: 3-day forgiving streaks, no punishment. Skye: no streaks (constellation metaphor), capacity-adaptive tasks. Kinri: three routine modes for high/mid/low energy days. | ✅ **Done (Phase 8)** — 3-day window, constellation metaphor, capacity-adaptive tasks |
| **Voice-first input** | Vosk already bundled. Typing is high-friction during distress. ViviDiary: voice-first reduces cognitive load. | ✅ **Done (Phase 11)** — mic-first chat bar, NilaCheckIn + DiaryCardScreen voice |
| **Social rhythm as daily anchor** | IPSRT 2026 RCT: η²=0.37 improvement in social rhythm stability, η²=0.49 in social functioning. CRM app: 3.39× episode recurrence reduction. | ✅ **Done (Phase 10)** — TodayScreen hero, NilaCheckIn anchor, Dashboard trend |
| **Clinician-facing reports** | 38.9% of apps have clinician dashboards; only 28.6% are free. Psych appointments are 15 min — structured PDF summaries turn the app into a tool the psychiatrist wants you to use. | ✅ **Done (Phase 12)** — `clinicianReport.ts`, YourDataScreen "Share with psychiatrist" |
| **India market polish** | 197M Indians with mental disorders, 83-92% treatment gap. "Wellness companion" framing beats "mental health tool." No-account onboarding, offline-first, Hindi/regional languages. | 🔴 **Skipped** — explicit decision to defer |
| **UI warmth & accessibility** | Muted warm palette, dark mode first, large tap targets, reduced motion, one primary action per screen. | ✅ **Done (Phase 14)** — `accessibilityBaseline.ts`, 44px tap targets, focus-ring, text-size floor |

---

## Definition of done (every phase)
Tested (TDD) · `npm run guard` green · **WIRED to a user surface** · safety diffs flagged for review · no dead code.

---

## Next steps (strategic — not in build queue)
When new priorities emerge, they should be added here with autonomy tags and research basis:
- [ ] India market polish (Phase 13) — if market signal warrants
- [ ] Family/caregiver mode — if user research shows demand
- [ ] Employer/insurer dashboard — if B2B pivot chosen
- [ ] Longitudinal outcome tracking — if IRB/clinical partnership secured

---

**Final note:** The original 2026-07-06 audit found NilaMind "feature-complete and well-engineered." This extended build queue (Phases 8–16) addressed the three structural problems it identified: dead wiring (features not reaching users), fragmentation (duplicate entry points), and engagement mechanics. All three are now resolved.

---

## Known gaps (2026-07-12 device QA, ZD2232FCR5)

- **§9 Hinglish negation-first ideation** — `"mujhe nahi jeena"` bypassed the crisis gate entirely (keyword floor only had verb-first order; MiniLM scores romanized Hindi ~0.026 vs the 0.5796 threshold). Fixed on `fix/qa-2026-07-12-crisis-voice-analytics` (Task 1 of the QA-fixes-wave1 plan).
- **Latency needs re-measurement** — the QA phone's reply-latency readings may reflect a pre-swap APK (the Qwen2.5-1.5B speed swap landed 2026-07-11); re-run latency probes only after confirming the deployed build actually contains the Qwen model, not a stale Gemma-3-1B install.
- **Tamil/Telugu §9 adversarial suite is still open** — this wave only hardened Hindi/Devanagari romanized + native-script negation-first coverage. Tamil/Telugu equivalents are untested and deferred to Wave 2.