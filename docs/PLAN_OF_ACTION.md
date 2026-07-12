# NilaMind — Plan of Action (the build queue)

**This is the single source of truth for what to build next and how.** Read it with `AGENTS.md` (golden
rules + reward-hacking guardrails). Written 2026-07-06; updated 2026-07-12 (all 7 phases shipped).

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

### 🟡 Built, flagged for human review before merge
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

## Research basis (2026-07-12 — updated with product audit)

### Current app snapshot (113 services, 60+ components, 1477 tests)
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
| **Episode-adaptive UI** | Smashing Magazine 2026: "Designing for Distressed Users" — bright colors during distress are "jarring, even physically uncomfortable". ViviDiary: emotionally adaptive UI mutes palette, slows animations, softens AI tone. | Strong — NilaMind already has inflection detection, elevation guard, episode voice. Missing: adaptive UI layer. |
| **Anti-sycophancy hardening** | Unique in the market. No competitor blocks manic validation. Rule 6 is clinically important and commercially unique. | Core differentiator — make it stronger, measurable, and marketable. |
| **Forgiving engagement** | 95% Day-30 abandonment. Bear Room: 3-day forgiving streaks, no punishment. Skye: no streaks (constellation metaphor), capacity-adaptive tasks. Kinri: three routine modes for high/mid/low energy days. | NilaMind's streaks (computeCompassionateStreak) are not yet forgiving. High-impact fix. |
| **Voice-first input** | Vosk already bundled. Typing is high-friction during distress. ViviDiary: voice-first reduces cognitive load. | Easy win — Vosk is already there, just needs to be the primary pathway. |
| **Social rhythm as daily anchor** | IPSRT 2026 RCT: η²=0.37 improvement in social rhythm stability, η²=0.49 in social functioning. CRM app: 3.39× episode recurrence reduction. | `SocialRhythmScreen` exists but isn't in the daily flow. Research-validated, high-impact. |
| **Clinician-facing reports** | 38.9% of apps have clinician dashboards; only 28.6% are free. Psych appointments are 15 min — structured PDF summaries turn the app into a tool the psychiatrist wants you to use. | `exportReport.ts` exists. Needs bipolar-specific structure (sleep, mood, meds, circadian). |
| **India market polish** | 197M Indians with mental disorders, 83-92% treatment gap. "Wellness companion" framing beats "mental health tool." No-account onboarding, offline-first, Hindi/regional languages. | i18n exists, BIP39 identity exists. Needs: Hindi-first UI pass, Tele-MANAS always visible, family mode. |
| **UI warmth & accessibility** | Muted warm palette, dark mode first, large tap targets, reduced motion, one primary action per screen. | Current theme is functional but austere. Low-risk polish pass. |

---

## Build queue — sequenced for maximum impact

### Phase 8 🟢: Forgiving engagement & streak redesign
Replace punitive engagement mechanics with capacity-adaptive, forgiving patterns. The #1 retention killer in mental health apps is guilt from broken streaks. Research shows forgiving mechanics (3-day grace, constellation metaphor, capacity-adaptive tasks) dramatically improve sustained engagement without the emotional cost.

**What it includes:**
- Redesign `streaks.ts` / `computeCompassionateStreak` to use 3-day forgiving window (no reset on miss, no "you missed X days" messaging)
- Add capacity-adaptive task display in TodayScreen (fewer tasks on low-energy days, more on high-energy days, detected from mood/inflection signals)
- Replace streak number with a visual constellation/progress metaphor (Skye-inspired) in YouScreen
- Add "no pressure" language to streak/engagement copy throughout the app
- Tests: existing streak tests updated, new forgiving-streak tests
- Wired into: TodayScreen (task count adaptation), YouScreen (constellation display), streak context block (nilaContext)

### Phase 9 🟡: Episode-adaptive UI
Make the entire app's visual tone adapt to the user's detected state — calmer/simpler during mania, warmer/gentler during depression, full-featured when stable. This is NilaMind's most genuinely novel interaction model: no competitor does this. Uses existing inflection + elevation signals to drive CSS variable changes.

**What it includes:**
- `adaptiveTheme.ts` — pure function: detects state (stable / elevated / depressed / crisis) from inflection + elevation + mood signals, returns theme CSS variable overrides
- Theme adaptation layer: mute palette (desaturate, lower contrast) during elevation, warm amber tones during depression, standard in stable
- Reduce animation speed and complexity during elevation (motion sensitivity in mania)
- Simplify navigation (hide non-essential tabs) during elevation
- Episode-aware voice already exists — this extends the pattern to the full UI
- Tests: theme function TDD, state detection TDD
- Wired into: App.tsx theme provider, all screen CSS via CSS custom properties
- **🟡 Flagged**: UI response to mental state — must not alarm, must not be noticeable as "the app is changing for me", must not gate functionality

### Phase 10 🟢: Social rhythm as daily core anchor
Make the social rhythm check-in (SRM) a primary daily interaction — same level as mood tracking. IPSRT research shows η²=0.37 improvement in social rhythm stability. The CRM app (3.39× episode reduction) was circadian/social rhythm focused. This is the single highest-evidence intervention for bipolar that NilaMind is not yet centering.

**What it includes:**
- Promote social rhythm check-in to the daily flow (TodayScreen hero alongside mood)
- Add SRM anchor prompt to NilaCheckIn flow (after mood, ask "did you wake up around your usual time today?")
- Wire social rhythm score into `nilaContext` so Nila can gently reference regularity
- Add weekly social rhythm trend to DashboardScreen
- Tests: social rhythm integration TDD
- Wired into: TodayScreen, NilaCheckIn, nilaContext, DashboardScreen

### Phase 11 🟢: Voice-first primary input pathway
Make speech-to-text the primary input method — especially for the Nila chat, check-in, and diary. Vosk STT is already bundled. Currently it's an optional toggle. Making it the default (with easy fallback to typing) dramatically lowers friction for users in distress who can't type or find typing overwhelming.

**What it includes:**
- Make voice input the default in ModeScreen (chat bar shows mic first, keyboard second)
- Add voice input to NilaCheckIn (mood + context via speech)
- Add voice input to DiaryCardScreen (quick entry via speech)
- Ensure Vosk is pre-loaded on app start (warm model) so there's no delay
- Add "tap to speak, tap again to stop" interaction pattern
- Tests: voice integration TDD, Vosk warm-load TDD
- Wired into: ModeScreen, NilaCheckIn, DiaryCardScreen

### Phase 12 🟡: Clinician-facing report PDF
Structure the weekly/monthly export into a format a psychiatrist can read in 15 minutes. Include: PHQ-9/GAD-7 trajectories, sleep regularity score, social rhythm anchors, medication adherence, mood episode frequency, protocol completions. This turns the app from a private tool into something the user's psychiatrist actively wants them to use.

**What it includes:**
- Extend `weeklyReport.ts` to include structured clinician sections (PHQ-9/GAD-7 trend, sleep/circadian, medication, episode log)
- Add month-range option to export (currently weekly only)
- Add "Share with your psychiatrist" button in YourDataScreen with a clear privacy note
- PDF format: clean, print-friendly, one-page summary with attachment for detailed data
- Tests: report generation TDD
- Wired into: YourDataScreen, DashboardScreen export menu
- **🟡 Flagged**: data accuracy in clinical reports — any error in exported data could mislead a clinician

### Phase 13 🟢: India market polish pass
Make the India-first positioning concrete: Hindi-first UI, Tele-MANAS (14416) always visible, no-account onboarding optimized, family mode toggle, stigma-conscious language throughout.

**What it includes:**
- Hindi-first UI review: all screens checked for Hindi rendering, RTL support, localized numbers/dates
- Tele-MANAS (14416) as the primary crisis line in India region (always visible in nav, not just crisis overlay)
- No-account flow: ensure `IdentityOnboarding` / BIP39 is truly zero-friction (skip if user wants, recoverable phrase optional)
- Family mode toggle in Settings: allows a caregiver to view limited snapshot (mood stats, safety plan, crisis resources — never chat or diary content)
- Stigma-conscious copy audit: replace "mental health" with "wellness" in all user-facing text, use "hard moments" / "tough feelings" / "overwhelm" instead of clinical labels
- Tests: i18n rendering TDD, family mode permission TDD
- Wired into: SettingsScreen, IdentityOnboarding, crisis overlay, caregiver share, copy across all screens

### Phase 14 🟢: UI warmth & accessibility pass
A deliberate design polish pass. The app is functional but austere. Research shows muted warm palettes, dark mode default, large tap targets, reduced motion, and one primary action per screen significantly improve engagement for distressed users.

**What it includes:**
- Audit current Tailwind palette: add warm neutrals (amber/warm grey accents), reduce clinical blue dominance
- Ensure dark mode is the default and consistent across all screens
- Audit tap targets: all interactive elements ≥44px (WCAG minimum, better at 48px)
- Reduced motion: already has `useReducedMotion` — audit all animations to respect it
- One primary action per screen: audit every screen for cognitive load, move secondary actions to menus/accordions
- Voice input as accessibility feature: already in Phase 11 — ensure it's discoverable
- Tests: visual regression if applicable, accessibility TDD (tap targets, contrast)
- Wired into: global styles, every screen component

### Phase 15 🟡: Anti-sycophancy measurement & hardening
NilaMind's anti-sycophancy Rule 6 (manic grandiosity/impulsivity/paranoia validation blocking) is a genuinely unique differentiator — no competitor has it. This phase makes it stronger, measurable, and marketable.

**What it includes:**
- Add anti-sycophancy metrics: count Rule 6 firings (logged locally, privacy-preserving), measure false positive/negative rates against a test corpus
- Expand Rule 6 test coverage: add edge cases (religious grandiosity, financial impulsivity, hypersexuality, pressured speech variants in Hindi/Tamil/Telugu)
- Add anti-sycophancy context block to nilaContext: tells Nila "you are an anti-sycophantic companion — do not validate unrealistic plans, grandiosity, or paranoia"
- Add user-facing explanation in AboutNilaScreen: "Nila won't always agree with you — that's by design"
- Tests: Rule 6 expansion TDD, metrics TDD
- Wired into: safety.ts Rule 6, nilaContext, AboutNilaScreen
- **🟡 Flagged**: touches safety.ts Rule 6 — mandatory human review

### Phase 16 🟢: N-of-1 personalization surface
Surface the existing N-of-1 engine (which behaviours most correlate with mood for this individual) as a user-facing insight. The engine already exists in `nOf1.ts` — it computes personalized correlations (e.g., "when you sleep <6h, your mood is 1.5 points lower"). It's currently invisible to the user.

**What it includes:**
- Surface top-3 personal correlations in InsightsScreen with gentle framing ("This is a pattern we've noticed in your data — it might not always be true, but it's worth being aware of")
- Add N-of-1 card to DashboardScreen: "What affects your mood most"
- Wire N-of-1 signal into nilaContext: "For this person specifically, X seems to correlate with lower mood"
- Tests: N-of-1 integration TDD
- Wired into: InsightsScreen, DashboardScreen, nilaContext

---

## Definition of done (every phase)
Tested (TDD) · `npm run guard` green · **WIRED to a user surface** · safety diffs flagged for review · no dead code.
