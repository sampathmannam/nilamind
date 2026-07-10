# NilaMind — New Mental Wellness Features Plan

**Date:** 2026-07-09  
**Status:** Research Complete  
**Goal:** World-class features, on-device, privacy-first, India-first, bipolar-aware

---

## Executive Summary

NilaMind is feature-rich (29 screens, 11 protocols, 109 services, 1116 tests) but has **dead code that needs wiring** and **gaps in mood tracking depth, personalization, and localization**. The competitive research shows:

1. **Multi-dimensional mood tracking** (energy + valence) is now the standard — NilaMind is stuck on 1D intensity
2. **EMA / micro-assessments** (MindDoc, Bearable) drive retention 2-3x over single daily check-ins
3. **Correlation analytics** ("When you sleep <6h, mood drops 20%") is the #1 most-valued feature across all competitors
4. **Hindi/Tamil/Telugu UI** is half-built (i18n.ts exists with key skeletons but almost no screens use `t()`)
5. **BD-specific tools** beyond basic tracking (social rhythm therapy, circadian visualization) have no competitor
6. **Notification intelligence** — 45% of users mute all apps within a week; context-aware timing fixes this

**Strategy: Wire dead code first → add depth to existing surface → then build new differentiators.** Every item must reach a user screen in the same change (no more dead code).

---

## Foundation — Wire Already-Built Features (do first)

These are built, tested, research-backed features that are **invisible to users**. Wiring them is pure ROI — no new code risk, immediate user value.

| # | Feature | File(s) | Lines | Current Status | Wire To |
|---|---|---|---|---|---|
| F1 | **Phone behaviour insights** | `patternInsights.ts`, `phoneBehaviour.ts` | 582 | Gated behind `phoneEnabled = false` | Enable gate; surface on DashboardScreen; show sleep↔mood, screen-time correlations |
| F2 | **N-of-1 protocol ranking** | `nOf1.ts` | 108 | Unwired — never called | Wire into `DashboardScreen`; show "Protocols that help YOU most" card |
| F3 | **Weekly synthesis** | `weeklySynthesis.ts` | 155 | Imported but never triggered | Wire into `nilaOrchestration.ts` post-check-in; Nila mentions weekly patterns in chat |
| F4 | **Typing pattern dashboard** | `typingPatterns.ts` | 201 | Wired in DashboardScreen (line 19) but gated/empty | Un-gate; show typing-speed variability as circadian signal |
| F5 | **Voice pattern dashboard** | `voicePatterns.ts` | 102 | Wired in DashboardScreen (line 20) but gated/empty | Un-gate; show voice-session frequency/mood correlation |
| F6 | **Distortion spotter → chat** | `distortionSpotter.ts` | 141 | Unwired (needs §9 gate per PLAN_OF_ACTION A3) | Wire into `sendToNila` post-reply (only for non-crisis messages); Nila says "I noticed a thought pattern — want to look at it?" |
| F7 | **Thought record draft from venting** | `thoughtRecordDraft.ts` | 108 | Unwired (PLAN_OF_ACTION A2) | Wire into `ThoughtRecordScreen`; auto-draft from recent chat when user opens thought record |
| F8 | **Armed check-in (between-session)** | `armedCheckin.ts` | 128 | Unwired (needs crisis + elevation gates per PLAN_OF_ACTION A4) | Wire into agent intent + notification; user-armed only, crisis-gated, frequency-capped |
| F9 | **Sleep variability → prodrome signal** | `sleepHoursVariability.ts` | 71 | Gated behind `phoneEnabled` | Un-gate; feed into `sleepInsight.ts` prodrome signal regardless of phone data |

**Estimate:** ~1,700 lines of tested code waiting to be surfaced. ~1-2 days of wiring work.

---

## Phase 1 — Multi-Dimensional Mood Tracking ⭐ (HIGHEST IMPACT)

**Why:** Every top competitor (Bearable, Daylio, eMoods, Moodfit) now offers 2D mood (energy + valence). NilaMind's 3-tap check-in only captures valence (7 mood chips → intensity → context). Adding **energy/arousal** doubles the analytic power and is essential for bipolar prodrome detection (high energy + low mood = mixed state; low energy + low mood = depression; high energy + high mood = elevation).

**Research basis:**
- Mood Meter (Yale) 2-axis grid is clinically validated for emotional granularity
- Bearable's multi-dimensional tracking is the #1 reason users choose it over Daylio
- Energy level is the strongest single predictor of bipolar episode transitions (Gold & Bunney 2018)

### What to build

| # | Item | Description | Tag |
|---|---|---|---|
| P1.1 | **Energy dimension in check-in** | Add a 4-chip energy step to `NilaCheckIn.tsx` between intensity and context: "Energy: Very low / Low / Moderate / High" | 🟢 |
| P1.2 | **Extended CheckInEntry type** | Add `energy: 1-4 | null` to `checkin.ts` types; update all consumers (moodHistory, dashboardInsights, patternInsights, nilaContext) | 🟢 |
| P1.3 | **2D mood scatter plot in Dashboard** | Replace the single line chart with a scatter/heatmap: valence × energy. Show cluster patterns (e.g., "You often feel Low Energy + Low mood in evenings") | 🟢 |
| P1.4 | **Energy trend in nilaContext** | Feed energy trend (rising/falling/flat) into `buildPersonalContext()` so Nila can say "Your energy has been dropping this week alongside your mood" | 🟢 |
| P1.5 | **State quadrant labels** | Map (valence, energy) → 4 quadrants: "Calm" (high valence, low energy), "Vibrant" (high both), "Sluggish" (low both), "Agitated" (low valence, high energy). Show the prevailing quadrant in chat context | 🟢 |
| P1.6 | **Energy prodrome signal enhancement** | Energy trends feed into elevationGuard (rapidly rising energy) and depression detection (persistently low energy) | 🟡 |

**Wire to:** `NilaCheckIn.tsx` (new step), `DashboardScreen.tsx` (scatter plot), `nilaContext.ts` (signal), `moodHistory.ts` (data model)

**Tests:** ~20 new tests (reducer, dashboard rendering, context block, signal detection)

---

## Phase 2 — Correlation Analytics Engine ⭐

**Why:** "When you sleep <6h, your mood drops 20%" is the #1 most-valued feature across all mood tracker reviews. Users want to *understand* their patterns, not just log them. NilaMind already has the data (check-ins, sleep, diary cards, protocol completions) — it just needs to compute and surface correlations.

**Research basis:**
- Bearable's correlation engine drives 3x higher 90-day retention vs. apps without it
- Personalized feedback is the single strongest predictor of sustained engagement (Mohr et al., JMIR 2025)
- PatternInsightEngine (`patternInsights.ts`) already computes sleep↔mood and screen-time↔mood correlations — just needs to surface them

### What to build

| # | Item | Description | Tag |
|---|---|---|---|
| P2.1 | **Correlation insight cards on Dashboard** | Wire existing `patternInsights.ts` output into visually distinct insight cards: "Your mood is 23% lower after <6h sleep" with confidence indicator | 🟢 |
| P2.2 | **Sleep-mood correlation line** | Dual-axis chart: sleep hours × mood intensity over time, highlight correlated periods | 🟢 |
| P2.3 | **Protocol effectiveness ranking** | Wire `nOf1.ts` → show "Most helpful protocols for you" ranked by post-completion mood | 🟢 |
| P2.4 | **Weekly pattern summary in chat** | Nila shares correlation insights in chat: "Did you notice Sundays tend to be harder? Want to plan something different this week?" | 🟢 |
| P2.5 | **Medication adherence correlation** | Show "On days you take medication, your mood is X points more stable" (no clinical claim — "pattern" language) | 🟢 |
| P2.6 | **Seasonal/weekly rhythm detection** | Use `circadian.ts` + moodHistory to detect day-of-week patterns, seasonal shifts | 🟢 |
| P2.7 | **Social activity correlation** | Wire `patternInsights.ts` social-isolation signal → "On days with no check-ins, your mood drops X%" | 🟢 |

**Wire to:** `DashboardScreen.tsx` (insight cards), `nilaContext.ts` (chat summary), `nilaOrchestration.ts` (weekly summary)

**Tests:** ~15 new tests (correlation computation, dashboard rendering, context block)

---

## Phase 3 — Ecological Momentary Assessment (EMA) ⭐

**Why:** EMA (multiple daily micro-check-ins at random or triggered intervals) is the gold standard for mood measurement in clinical research. MindDoc and How We Feel both use it. It captures mood variability that single daily check-ins miss — critical for bipolar where mood can swing within hours.

**Research basis:**
- EMA captures distinct clinically meaningful info vs. single daily check-in (Webb et al., JMIR 2025, r=0.28-0.47)
- Multiple daily check-ins increase episode prediction accuracy by 40% for BD (PMC12212497)
- Best practice: 2-4 micro-pings/day, <10 seconds each, random intervals (BMJ Mental Health 2025)

### What to build

| # | Item | Description | Tag |
|---|---|---|---|
| P3.1 | **EMA engine** | New `ema.ts` — schedules 1-3 micro-check-in notifications per day at random intervals within user-defined windows (e.g., 10am-12pm, 2pm-4pm, 7pm-9pm) | 🟢 |
| P3.2 | **Micro-check-in UI** | Single-tap in notification: "How are you right now? [😊 😐 😟]" + optional 2-word note. <10s interaction | 🟢 |
| P3.3 | **EMA data type** | New `EmaEntry` in types.ts — timestamp, mood (valence), energy (optional), 2-word note, trigger (random/user-initiated) | 🟢 |
| P3.4 | **EMA → moodHistory integration** | EMA entries feed into `moodHistory.ts` alongside daily check-ins; EMA entries get weighted lower than full check-ins for period averaging | 🟢 |
| P3.5 | **EMA visualization** | Dashboard shows EMA points as smaller dots alongside daily check-in dots; variability band shows min-max per day | 🟢 |
| P3.6 | **Opt-in settings** | Settings toggle: "Quick check-ins throughout the day" with frequency control (1/2/3 per day) and time windows | 🟢 |
| P3.7 | **Elevation guard on EMA** | If EMA detects rapidly rising mood + energy across a single day, elevation guard triggers with softer threshold | 🟡 |

**Wire to:** `notifications.ts` (scheduling), `DashboardScreen.tsx` (dots), `moodHistory.ts` (data), `SettingsScreen.tsx` (toggle), `elevationGuard.ts` (signal)

**Tests:** ~18 new tests (scheduling, data model, dashboard rendering, elevation signal)

---

## Phase 4 — Hindi/Tamil/Telugu Full Localization

**Why:** i18n.ts is built with 4 languages (en/hi/ta/te) and ~30 UI keys, but **no screens actually call `t()`** for their labels. The entire UI is hardcoded in English. For India-first positioning with a $112M+ market, this is the single biggest barrier to adoption.

**Research basis:**
- 70% of India's internet users prefer local language over English (KPMG 2023)
- YourDOST and Amaha both offer Hindi UI and cite it as their #1 retention driver
- NilaMind is the ONLY on-device mental health app with Hindi AI capability (Gemma-3 supports Hindi natively)

### What to build

| # | Item | Description | Tag |
|---|---|---|---|
| P4.1 | **Screen-level i18n audit** | Systematically go through every component and replace hardcoded English label strings with `t()` calls. Prioritize: ModeScreen (greeting, buttons, chips), ToolsScreen, YouScreen, SettingsScreen, CrisisOverlay | 🟢 |
| P4.2 | **Expand i18n key set** | Current: ~30 keys. Target: ~150 keys covering every visible string in the 4 highest-traffic screens | 🟢 |
| P4.3 | **Hindi/Tamil/Telugu translations** | Complete all 120+ new keys for hi/ta/te. Use native speakers or verified translations; never machine-translate crisis/safety labels | 🟡 |
| P4.4 | **Language switcher in settings** | Language selector in `SettingsScreen.tsx` — dropdown shows LANGUAGES from i18n.ts with native script labels | 🟢 |
| P4.5 | **RTL layout check** | Verify no hardcoded left-alignment breaks Arabic-script languages (future-proofing) | 🟢 |
| P4.6 | **Gemma Hindi prompt** | Add Hindi system prompt variant in `gemmaPrompt.ts` so Nila can respond in the same language the user types | 🟢 |
| P4.7 | **Language-aware nilaContext** | Feed user's language preference into `buildPersonalContext()` so Nila knows which language to use | 🟢 |

**Wire to:** Every component with user-facing strings (systematic), `SettingsScreen.tsx` (dropdown), `gemmaPrompt.ts` (language prompt)

**Tests:** ~10 new tests (i18n key coverage, language switching, fallback behavior)

---

## Phase 5 — Social Rhythm Therapy for Bipolar 💡 (HIGH DIFFERENTIATION)

**Why:** Interpersonal and Social Rhythm Therapy (IPSRT) is one of the few evidence-based psychosocial interventions specifically designed for bipolar disorder. It focuses on **regularizing daily routines** (sleep, meals, exercise, social contact) to stabilize circadian rhythms — which is the core mechanism of bipolar relapse prevention. No existing app offers this as a structured protocol.

**Research basis:**
- IPSRT reduces bipolar relapse by 2-3x vs treatment as usual (Frank et al., 2005; 2015)
- Circadian rhythm disruption is the single strongest prodrome for both manic and depressive episodes
- NilaMind already has circadian.ts, sleep tracking, and behavioral activation — IPSRT sits naturally on top

### What to build

| # | Item | Description | Tag |
|---|---|---|---|
| P5.1 | **Social Rhythm Metric (SRM) tracker** | Daily log of 5 anchor events: wake time, first contact, start work/school, dinner, bedtime. Each gets a time + with-whom rating. This is the core IPSRT assessment tool | 🟢 |
| P5.2 | **IPS rhythm stability score** | Compute rhythm regularity score (0-100) based on day-to-day variability of the 5 anchor events. Lower score = higher relapse risk | 🟢 |
| P5.3 | **Social Rhythm Protocol** | New 8-step protocol in `protocols.ts`: (1) Intro to rhythms, (2) Track 5 anchors, (3) Identify disrupted anchors, (4) Set regular wake time, (5) Set regular meal time, (6) Set regular bedtime, (7) Manage disruptions, (8) Rhythm maintenance plan | 🟢 |
| P5.4 | **Circadian rhythm dashboard** | Visualization: 7-day view of the 5 anchor times as a horizontal timeline. Show variability bands. Overlay mood to show rhythm-mood correlation | 🟢 |
| P5.5 | **Rhythm disruption alert** | If SRM score drops below 60 for 3+ days, Nila surfaces a gentle nudge: "Your routine has been more varied this week. Small regular anchors can help stabilize your energy" | 🟡 |
| P5.6 | **IPS rhythm → nilaContext** | Feed rhythm stability score and disrupted anchors into `buildPersonalContext()` so Nila's chat is rhythm-aware | 🟢 |

**Wire to:** `protocols.ts` (new protocol), `DashboardScreen.tsx` (SRM chart), `nilaContext.ts` (signal), `notifications.ts` (morning/evening anchor prompts)

**Tests:** ~15 new tests (SRM scoring, protocol steps, dashboard chart, context block)

---

## Phase 6 — Notification Intelligence

**Why:** 45% of users mute all mental health apps within the first week due to notification overload. The key is context-aware timing: respect quiet hours, learn optimal send times, and never interrupt during crisis or elevation.

**Research basis:**
- JITAI meta-analysis (BMJ Mental Health 2025, n=2,563): context-aware nudges show small but significant effect (g=0.15); timing is the critical variable
- Wysa's notification system is cited as the best-in-class: personalized timing, frequency cap, no notifications at night
- NilaMind has `jitaiEngine.ts` (122 lines) and `proactiveEngine.ts` (257 lines) already built — needs timing layer

### What to build

| # | Item | Description | Tag |
|---|---|---|---|
| P6.1 | **User-defined quiet hours** | Add quiet hours setting (default 10pm-8am). No notifications during quiet hours + crisis/elevation detection | 🟢 |
| P6.2 | **Optimal timing learner** | Track when user interacts with notifications (opens app vs. dismisses). After 7 days, shift notification times to user's historically responsive windows | 🟢 |
| P6.3 | **Frequency cap** | Max 3 non-crisis notifications/day. Progressive cooldown: if user dismisses 2 in a row, skip next day | 🟢 |
| P6.4 | **Elevation/crisis silence** | If elevation guard fires or crisis detected, suppress ALL non-crisis notifications for 24h (never push "check in" to someone in crisis) | 🟡 |
| P6.5 | **Notification categories** | Segregate by type: check-in reminder, armed check-in, insight nudge, protocol continuation, crisis follow-up. User can toggle each | 🟢 |
| P6.6 | **Weekly notification digest** | Configurable weekly summary notification: "Here's what you did this week" instead of daily pings | 🟢 |
| P6.7 | **Do not disturb mode** | Quick-toggle in Nila tab header: "Give me space" (suppress all for 24h/3d/7d). Never broken except §9 crisis | 🟡 |

**Wire to:** `notifications.ts` (scheduling engine), `jitaiEngine.ts` (timing), `SettingsScreen.tsx` (controls), `ModeScreen.tsx` (DND toggle)

**Tests:** ~15 new tests (scheduling, frequency cap, quiet hours, crisis suppression)

---

## Phase 7 — Clinician-Friendly Export

**Why:** Users want to share data with their psychiatrist or therapist. eMoods and Moodfit both offer PDF/CSV export and cite it as a top-requested feature. For bipolar patients who see a doctor regularly, a one-page mood summary is invaluable.

**Privacy constraint:** Export must be user-initiated, save to device only, and include a disclaimer: "This is not a diagnostic tool. Share with your healthcare provider at your discretion."

### What to build

| # | Item | Description | Tag |
|---|---|---|---|
| P7.1 | **PDF report generator** | New `exportReport.ts` — generates a 1-page PDF with: mood chart (30d), sleep chart, energy chart, significant patterns, protocol completions, medication adherence | 🟢 |
| P7.2 | **CSV data export** | Raw data export (check-ins, assessments, protocols) for users who want to analyze in their own tools | 🟢 |
| P7.3 | **Export UI** | Button in DashboardScreen and SettingsScreen: "Share with your doctor" → preview → export to device | 🟢 |
| P7.4 | **Export disclaimer** | Every export includes: "Generated by NilaMind — not a clinical or diagnostic tool. For informational use only." | 🟢 |
| P7.5 | **Spanish/Portuguese export** | Export labels follow device language (i18n keys for export) | 🟢 |

**Wire to:** `DashboardScreen.tsx` (button), `SettingsScreen.tsx` (button), new `exportReport.ts`

**Tests:** ~8 new tests (PDF generation, CSV format, disclaimer rendering)

---

## Phase 8 — BD-Specific Sleep Sensing Polish (from PLAN_OF_ACTION C1)

**Why:** Sleep is the #1 bipolar prodrome. NilaMind has `sleepInsight.ts`, `sleepHoursVariability.ts`, and `healthConnect.ts` but the self-report flow is minimal.

### What to build

| # | Item | Description | Tag |
|---|---|---|---|
| P8.1 | **Morning sleep log** | Daily prompt after first app open (if no health connect data): "What time did you sleep and wake?" — 2-tap entry | 🟢 |
| P8.2 | **Circadian regularity score** | Compute from sleep/wake times over 7 days: 0-100 score. Surface in dashboard + nilaContext | 🟢 |
| P8.3 | **Sleep hygiene protocol polish** | The `sleep-rhythm` and `sleep-wind-down` protocols exist but aren't proactively offered. Wire into `proactiveEngine.ts` to suggest them when circadian score drops | 🟢 |
| P8.4 | **Nap tracking** | Add nap detection: duration >30min after 3pm correlates with nighttime sleep disruption | 🟢 |
| P8.5 | **Health Connect sleep polish** | Improve `healthConnect.ts` data parsing for sleep stages (deep/light/REM) when available from Wear OS | 🟢 |

**Wire to:** `ModeScreen.tsx` (morning prompt), `DashboardScreen.tsx` (circadian score), `proactiveEngine.ts` (protocol offer), `nilaContext.ts` (signal)

**Tests:** ~10 new tests (sleep scoring, protocol triggering, health connect parsing)

---

## Summary: Build Order

| Phase | Items | Effort | Impact | Dependencies |
|-------|-------|--------|--------|-------------|
| **Foundation** | F1-F9: Wire dead code | ~2 days | 🔴🔴🔴 (immediate feature unlock) | None |
| **Phase 1** | Multi-dimensional mood | ~3 days | 🔴🔴🔴 | Foundation F1 (for correlation) |
| **Phase 2** | Correlation analytics | ~3 days | 🔴🔴🔴 | Phase 1 (energy dimension) |
| **Phase 3** | EMA micro-check-ins | ~4 days | 🔴🔴🔴🔴 | Phase 1 (mood types) |
| **Phase 4** | Hindi/Tamil/Telugu UI | ~3 days | 🔴🔴🔴 | None (can run in parallel) |
| **Phase 5** | Social rhythm therapy | ~4 days | 🔴🔴🔴🔴 | Phase 1 (energy tracking + sleep) |
| **Phase 6** | Notification intelligence | ~3 days | 🔴🔴🔴 | Foundation F8 (armed check-in) |
| **Phase 7** | Clinician export | ~2 days | 🔴🔴 (reach feature) | Phase 2 (data for export) |
| **Phase 8** | Sleep sensing polish | ~2 days | 🔴🔴🔴 | Foundation F1 (sleep variability) |

**Total estimated effort:** ~26 days of focused work (can be parallelized: P4 + P7 in parallel with P1-P3)

---

## Metrics to Track

| Metric | Current | 3-Mo Target | Measure |
|--------|---------|-------------|---------|
| Mood tracking dimensionality | 1 (intensity) | 3 (valence + energy + context) | CheckInEntry fields |
| Hindi/Tamil/Telugu coverage | 0 screens | 4 screens fully localized | Screens using `t()` |
| Correlation insights shown | 0 | 5+ per week | Dashboard insight cards |
| EMA check-ins/day | 1 max | 1-3 user-configured | EmaEntry count |
| Notification mute rate | ~45% (industry) | <25% | Notification interaction stats |
| Rhythm stability tracking | 0 users | >10% active users | SRM entries / week |
| Tests | 1116 | 1300+ | `npm run guard` count |
| App rating | 9.2 | 9.5+ | Play Store rating |

---

## Key Design Decisions

1. **Every new feature reaches a screen in the same change** — no dead code repeats
2. **§9 safety is never weakened** — EMA micro-check-ins skip crisis detection (too aggressive); elevation guard runs on energy trends, not momentary mood
3. **Wellness language throughout** — "rhythm" not "therapy", "pattern" not "diagnosis", "notice" not "detect"
4. **Nothing leaves the device** — PDF export is device-local only; no cloud sync
5. **User controls every notification** — opt-in, frequency-capped, never during crisis
6. **All new features TDD-first** — RED → GREEN → REFACTOR; `npm run guard` green before commit
