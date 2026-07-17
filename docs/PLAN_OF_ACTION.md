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

**Build queue: CLEARED** for the original 7 + 8–16. One new phase added 2026-07-13 (see below).

---

## Phase 17 — Longitudinal Wellbeing Tracking 🟢 (added 2026-07-13)

**Why:** The validated **WHO-5 Well-Being Index** already exists (`assessments.ts` → `AssessmentScreen`,
with trend + reliable-change + clinician-PDF wiring). But it is ad-hoc: there is **no cadence**, **no
dedicated long-view surface**, and **no Dashboard presence**. Bipolar is chronic — users + clinicians
benefit from the *long view*, not just daily swings. SmartBipolar (2026) found passive logging alone
does nothing; a *brief, structured, periodic* measure is the validated alternative (WHO-5 is the
field-standard wellbeing scale). We reuse the validated instrument — we never invent clinical items.

**Research basis:** WHO-5 (Topp et al., 2015) is the most-validated brief wellbeing index; a fortnightly
cadence matches the instrument's 2-week recall window; measurement-based care feedback improves outcomes
(Lambert et al., 2003, d≈0.24, up to 0.70 when deterioration is flagged early).

### What to build
| # | Item | Tag |
|---|------|-----|
| P17.1 | `wellbeingTrack.ts` — cadence (14-day) + longitudinal summary over WHO-5 history (reuses `assessments` + `reliableChange`) | 🟢 |
| P17.2 | `wellbeingTrack.test.ts` — TDD: due logic, cadence countdown, trajectory, summary | 🟢 |
| P17.3 | `WellbeingScreen.tsx` (You hub) — dedicated "Wellbeing over time" long-view + take button + cadence | 🟢 |
| P17.4 | `WellbeingTrendCard.tsx` — Dashboard card: latest score + trend + sparkline + next-due | 🟢 |
| P17.5 | Today due-card when `isWellbeingDue` (gentle, links to Screenings) | 🟢 |
| P17.6 | Feed a one-line wellbeing summary into `nilaContext` (🟡 — touches flagged file, review) | 🟡 |

**Wire to:** `youRows` (You hub) + `nav.ts`/`App.tsx` auxView `wellbeing`, `DashboardScreen`, `TodayScreen`, `nilaContext.ts`.
**Invariants:** on-device only; wellness never therapy ("pattern", not "diagnosis"); reuses validated WHO-5, no new clinical items.

**Definition of done:** TDD · `npm run guard` green · wired to a user surface · nilaContext diff flagged.

---

## Phase 18 — Episode-phase Marker 🟢 (built & wired 2026-07-13)

**Why:** NilaMind logs per-episode *distress* moments (`EpisodeRecord`: trigger, skills, intensity) but has
**no longitudinal bipolar-phase tracker** — the thing bipolar users most want to see: "I ran elevated
mid-March, then dipped in April." This is distinct from the distress log and from daily check-ins
(intensity is momentary; a phase is a stretch). It gives the user (and their clinician, via the PDF)
a readable course over time. Wellness framing throughout — a *pattern*, never a diagnosis.

**Research basis:** Course-specifiers (Raphael et al., 2014; Azorin et al., 2016) show mixed/rapid-cycling
course is the norm in BD and tracking phase flags it early; IPSRT/FTFamily emphasise the patient
owning their course narrative. Self-marked phase is the lowest-friction, highest-ownership form.

### What to build
| # | Item | Tag |
|---|------|-----|
| P18.1 | `episodeMarker.ts` — `EpisodeMarker {startDate,endDate,phase,note}` + add/read/currentPhase/summary | 🟢 |
| P18.2 | `episodeMarker.test.ts` — TDD: add/read round-trip, currentPhase containment, invalid-range guard, summary | 🟢 |
| P18.3 | `EpisodeMarkerScreen.tsx` (You hub) — add marker (phase chips + dates + note) + past list | 🟢 |
| P18.4 | `EpisodeMarkerCard.tsx` — Dashboard card: current phase if active | 🟢 |
| P18.5 | Feed a one-line current-phase summary into `nilaContext` (🟡 — flagged file) | 🟡 |
| P18.6 | Feed phase history into `clinicianReport.ts` (device-local PDF) | 🟢 |

**Wire to:** `youRows` + `nav.ts`/`App.tsx` auxView `episode_marker`, `DashboardScreen`, `nilaContext.ts`, `clinicianReport.ts`.
**Invariants:** on-device only; wellness never therapy ("phase", not "diagnosis"); user-owned tags, no auto-label.

**Built (2026-07-13):** `episodeMarker.ts` + tests (P18.1/2); `EpisodeMarkerScreen.tsx` + `EpisodeMarkerCard.tsx` (P18.3/4); `nilaContext.episodeMarkerContextBlock` feeds current phase (P18.5, 🟡 flagged file — review before merge); `clinicianReport.ts` renders a "Bipolar Phase Markers (self-logged)" section fed from `YourDataScreen.tsx` (P18.6); `sec_*`/`wellbeing_*`/`em_*` i18n + hi/ta/te; `youRows` row (Activity icon), `nav.ts` auxView `episode_marker`, `App.tsx` lazy route; `nilamind_episode_markers` added to `SENSITIVE_KEYS`. Guard green (2142 tests).

---

## Phase 19 — Family/Caregiver Mode 🟢 (built & wired 2026-07-13)

**Why:** The existing `CaregiverShareScreen` generates a one-time snapshot but has no stored contacts,
no per-category consent toggles (mood/phase/sleep/medication/wellbeing/checkins), no auto-alert
thresholds, and no ongoing caregiver relationship. Indian-family context makes caregivers key
stakeholders. This deepens the caregiver feature into a consent-gated, privacy-first *mode* —
still on-device, still user-controlled, never auto-sent.

**Research basis:** FTFamily/IPS-RT emphasis on family psychoeducation; Azorin et al. (2016)
caregiver-burden RCTs show informed family reduces relapse. Indian mental-health literacy gap
means a simple, translated snapshot reduces stigma and improves family support seeking
(Shidhaye et al., 2016).

### What to build
| # | Item | Tag |
|---|------|-----|
| P19.1 | `caregiverContacts.ts` — `CaregiverContact` type + add/remove/list, stored encrypted in `nilamind_caregiver_contacts` | 🟢 |
| P19.2 | `caregiverPreferences.ts` — per-contact share-category toggles (mood/phase/sleep/medication/wellbeing/checkins), auto-alert thresholds | 🟢 |
| P19.3 | Enhanced `buildCaregiverSnapshot` in `caregiverShare.ts` — add phase/wellbeing/sleep/checkin-frequency blocks, gated by prefs | 🟢 |
| P19.4 | `CaregiverSettingsScreen.tsx` (new auxView `caregiver_settings`) — contact list, category toggles, preview, auto-alert config | 🟢 |
| P19.5 | Update `CaregiverShareScreen.tsx` — contact selector, category summary before share, consent confirmation | 🟢 |
| P19.6 | `caregiverAlert.ts` — check auto-alert thresholds (e.g. 3+ high-distress days), generate alert-snapshot nudge for TodayScreen | 🟢 |
| P19.7 | i18n `cg_*` keys (contacts, preferences, categories, alerts, consent) — en/hi/ta/te | 🟢 |
| P19.8 | Nav/App/youRows/Dashboard/TodayScreen wiring — `caregiver_settings` auxView, caregiver nudge, dashboard card | 🟢 |
| P19.9 | `nilaContext.ts` feeding — caregiver-context block ("They share wellness snapshots with X") — 🟡 flagged file | 🟡 |

**Wire to:** nav, App, youRows, DashboardScreen, SettingsScreen, TodayScreen, nilaContext (🟡).
**Invariants:** on-device only; consent-gated (nothing shared without explicit user action); revocable;
no raw chat/thoughts/diary shared; wellness framing, never clinical.

**Built (2026-07-13):** `caregiverContacts.ts` + tests (P19.1); `caregiverPreferences.ts` + tests (P19.2); enhanced `buildCaregiverSnapshot` with phase/wellbeing/sleep/checkins blocks gated by prefs, tests updated (P19.3); `CaregiverSettingsScreen.tsx` with contact CRUD + category toggles + auto-alert config + preview → share flow (P19.4); `CaregiverShareScreen.tsx` i18n + prefs + selectedContactId passthrough (P19.5); `caregiverAlert.ts` with consecutive-day threshold checks + tests (P19.6); 25 `cg_*` i18n keys in en/hi/ta/te (P19.7); `caregiver_settings` auxView in nav.ts/App.tsx (lazy + renderAuxView case + selectedContactId → share sheet), `youRows` row changed from "caregiver" → "caregiver_settings", `youRows.test.ts` updated (P19.8); `nilaContext.caregiverContextBlock` feeds trusted-person note (P19.9, 🟡 — review before merge). `nilamind_caregiver_contacts` + `nilamind_caregiver_prefs` added to SENSITIVE_KEYS (32 entries now). Guard green (2167 tests).

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
- ~~India market polish (Phase 13)~~ — dropped by user
- ~~Family/caregiver mode~~ — done (Phase 19)
- [ ] Employer/insurer dashboard — if B2B pivot chosen
- ~~Longitudinal outcome tracking~~ — done (Phase 17)

## Phase 20 — Holistic Clinician Report — New Aggregations 🟢 (planned 2026-07-17)

**Why:** The clinician PDF (Phase 12 + 2026-07-16 research-redesign) already covers headline data. But ~10
existing on-device data sources never reach the PDF at all. Plan = (a) pull them all in via pure deterministic
aggregators, (b) add the patient's pre-visit note (the user-explicit gap: "I couldn't recollect … I don't want
to remember those and tell them again"), (c) per-category redaction profile + consent modal + PDF cover page
+ SHA-256 integrity footer. Full research + product design:
`docs/superpowers/plans/2026-07-17-clinician-report-holistic-research-and-design.md`.

**Research basis:** F1–F16 (recall-degradation, EMA-vs-interview disclosure bias, NIMH Life Chart,
automation bias, FDA 2022 CDS Guidance) inherited from the 2026-07-16 redesign. New citations: N1 IPSRT
2024, N2 sleep→next-day-intensity EMA (Littlewood 2016), N4 WHO-5 (Topp 2015), N5 measurement-based care
(Lambert 2003), N8 voice-prosody review, N10 India DPDP Act 2023, N11 HIPAA §164.524.

**Ship order (owner-signed 2026-07-17): 20.1–20.4 first, then 20.5–20.9 as Phase 21.**

| # | Item | Tag |
|---|------|-----|
| 20.1 | `clinicianAggregations.ts` — thought records, safety-plan state, social-contact log, pact state, what-didn't-help, BA / values history, exposure hierarchy (all deterministic readers of existing stores); extend `ClinicianReportInput` + render blocks | 🟢 |
| 20.2 | `redactionPrefs.ts` (Minimal/Full presets + per-category overrides — mirrors `caregiverPreferences.ts`); consent modal in `YourDataScreen.tsx`; extend `exportAudit` with redaction-profile snapshot | 🟢 |
| 20.3 | `visitNote.ts` (voice + text, optional safety-plan prompt, `nilamind_visit_note_<ISO>` last-4 rolling); gentle JITAI Dashboard card 'Notes for your next visit?' via `jitaiEngine` | 🟢 + 🟡 (jitai touch) |
| 20.4 | `clinicianCorrelation.ts` — pure deterministic sleep→next-day-intensity, medication-adherence-vs-intensity, trigger→context→intensity; no labels, paired with sample size | 🟢 |
| 20.5 | `clinicianRiskEvents.ts` — deterministic dated event-log builder. **No risk levels / scores / gauges / recommendations** (F11/F13/F14) | 🟡 (flagged pre-merge — guard test for "no level word appears" required) |
| 20.6 | Voice-elevation (B4) — read `voicePatterns.ts`. Only included if user has voice sessions (opt-in by structure) | 🟢 |
| 20.7 | WHO-5 wellbeing trajectory (P17 anchor) chart + text block — `MIN_TREND_POINTS` gate; Topp-2015 threshold line ≤13 | 🟢 |
| 20.8 | `clinicianCover.ts` — cover, executive-summary page, SHA-256 integrity footer, 4-quarter annual stitching. Cover-page identifier defaults to **BIP39-derived pseudonymous ID** | 🟢 |
| 20.9 | i18n (en/hi/ta/te) parity for every new `cr_*` key — same change as the feature | 🟢 / 🟡 (only if adaptiveTheme touched) |
| **20.1b** | Clinical evaluation gaps (psychiatrist/psychologist review 2026-07-17): | |
| G3 | Medication dose-change tracking — `DoseChange[]` field per medication, `recordDoseChange()`, aggregator + render block showing dated dose-change timeline | 🟢 |
| G4 | Side-effect duration/resolution — add `loggedAt` + `resolvedAt?` to `SideEffectEntry`, `resolveSideEffect()` function, aggregator showing active vs resolved + avg duration | 🟢 |
| G8 | Relapse plan → clinician report — `summarizeRelapsePlanForReport()` aggregator, render block showing phase structure + actions + last-updated | 🟢 |
| G9 | Relapse plan review cycle — `lastReviewedAt?` field on `RelapsePlan`, `isRelapsePlanStale()` (30-day), `markRelapsePlanReviewed()`, parity with safety plan review cycle | 🟢 |

**Wire to (no fragmentation):** `YourDataScreen.tsx` "Share with your psychiatrist" card expanded in place;
one JITAI Dashboard card in `DashboardScreen.tsx`; `exportAudit`; `secureLocal` keys
`nilamind_redaction_prefs`, `nilamind_visit_note_<ISO>`. No new `youRows.ts` row.

**Invariants preserved (no compromise):**
- Wellness never therapy — language lock, plan §3 + §5.2.
- §9 unchanged — no writes to `safety.ts` / `crisisClassifier*` / `elevationGuard` / `nilaSafetyGate` / `secureLocal`/`secureStore`.
- No LLM-written prose (`localLlm` / `nilaReflect` banned during report generation, plan §5.4).
- No risk *level / category / score / gauge / recommendation* — F11/F13/F14. Risk *events* only.
- No telemetry. Privacy hard rule.
- Patient pre-visit note → patient-written, never LLM-paraphrased.
- Cover-page identifier default = BIP39-derived pseudonymous ID; user may override to a typed first name.
- 18+ invariant preserved.

**Definition of done:** TDD per item (RED → GREEN → REFACTOR) · `npm run guard` green · wired to a user
surface · 🟡 diffs flagged pre-merge · no dead code (wire-what-you-build) · no deletion of
`temporalRiskAssessment.ts` / `crisisSafetyValidation.ts` (orphaned by 2026-07-16; deletion is the owner's
separate decision).

**Owner decisions (2026-07-17):** ship 20.1–20.4 first · presets + per-category overrides · voice-elevation
opt-in via structure · JITAI card in 20.3 · visit-note = voice+text+optional plan prompt · cover-ID
BIP39-derived · med-correlation default-in · no telemetry.

---

## All Phases Complete (2026-07-14)
- Phases 1–20: All shipped
- P4 Localization: Paused by user (~45 screens remain)
- UX Masterplan (10 phases): All complete
- Data Collection Fixes (5): All complete
- Retention Mechanics (5): All complete
- 9/10 Feature Plan (5): All complete
- Test count: 2551

---

**Final note:** The original 2026-07-06 audit found NilaMind "feature-complete and well-engineered." This extended build queue (Phases 8–16) addressed the three structural problems it identified: dead wiring (features not reaching users), fragmentation (duplicate entry points), and engagement mechanics. All three are now resolved.

---

## Known gaps (2026-07-12 device QA, ZD2232FCR5)

- **§9 Hinglish negation-first ideation** — `"mujhe nahi jeena"` bypassed the crisis gate entirely (keyword floor only had verb-first order; MiniLM scores romanized Hindi ~0.026 vs the 0.5796 threshold). Fixed on `fix/qa-2026-07-12-crisis-voice-analytics` (Task 1 of the QA-fixes-wave1 plan).
- **Latency needs re-measurement** — the QA phone's reply-latency readings may reflect a pre-swap APK (the Qwen2.5-1.5B speed swap landed 2026-07-11); re-run latency probes only after confirming the deployed build actually contains the Qwen model, not a stale Gemma-3-1B install.
- **Tamil/Telugu §9 adversarial suite — addressed (2026-07-12, this branch).** Tamil/Telugu negation-first (subject-prefixed) ideation is caught by substring inheritance from the already-validated roots in `NATIVE_SCRIPT_IDEATION` (`வாழ விரும்பவில்லை`, `சாக வேண்டும்`, `బతకాలని లేదు`, `చావాలని ఉంది`); an adversarial suite in `safety.test.ts` now locks this with paired benign controls ("I want to live" stays false). **🟡 Native-speaker review still advised** — this covers the validated-root surface only; broader ta/te idioms a fluent speaker would add are not present, and no device run is possible in CI.
- **Device QA run (Task 11) still PENDING** — `npm run android` + adb probes cannot execute in this environment (no Android SDK/device, no Gemma/Qwen binaries). All logic seams + the full node suite pass as the available proxy; the on-phone pass (crisis takeover rendering, voice, latency) requires hardware before merge.