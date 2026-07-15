# NilaMind UX Design Masterplan — From 7 to 10

> "The gap between what's built and what a user would actually feel is significant."

This document is the single source of truth for transforming NilaMind from a well-engineered prototype into a world-class consumer mental health app. Every item is grounded in direct study of Headspace, Calm, Finch, Daylio, Woebot, Bearable, and Wysa.

---

## Table of Contents

1. [Design System Foundation](#1-design-system-foundation)
2. [Onboarding & First-Run Experience](#2-onboarding--first-run-experience)
3. [Home Screen & Adaptive Context](#3-home-screen--adaptive-context)
4. [Micro-Interactions & Animation](#4-micro-interactions--animation)
5. [Loading, Empty & Error States](#5-loading-empty--error-states)
6. [Data Visualization & Insights](#6-data-visualization--insights)
7. [AI Companion Personality](#7-ai-companion-personality)
8. [Gamification & Retention](#8-gamification--retention)
9. [Notification Design](#9-notification-design)
10. [Accessibility & Delight](#10-accessibility--delight)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Design System Foundation

### 1.1 Color System — Warm, Not Clinical

**What Headspace/Calm do:**
- Headspace uses warm oranges, soft yellows, and muted teals — feels like a cozy room, not a hospital
- Calm uses deep navy, warm gold, and nature-inspired greens — feels like twilight, not a spreadsheet
- Both avoid pure white backgrounds — use warm off-whites (#FAF8F5) or dark warm grays

**What NilaMind has:**
- Tailwind `bg-page` with cold slate grays
- `text-slate-100` to `text-slate-500` — cold, clinical
- Accent colors are bright but disconnected (emerald, amber, blue, rose)

**What to build:**

| Token | Current | Target | Rationale |
|-------|---------|--------|-----------|
| `--bg-page` | `#0f172a` (slate-900) | `#1a1625` (warm indigo-black) | Warmer dark mode, like Calm's twilight |
| `--bg-surface` | `#1e293b` (slate-800) | `#241f30` (warm purple-gray) | Cards feel like soft shadows, not cold panels |
| `--text-primary` | `#f1f5f9` (slate-100) | `#f5f0eb` (warm off-white) | Less clinical, more human |
| `--text-secondary` | `#94a3b8` (slate-400) | `#b8a99a` (warm gray) | Muted but not cold |
| `--accent-warm` | `#f59e0b` (amber-500) | `#e8a87c` (soft terracotta) | Softer, less alarming |
| `--accent-calm` | `#10b981` (emerald-500) | `#7ec8a0` (sage green) | Nature-inspired, soothing |
| `--accent-focus` | `#3b82f6` (blue-500) | `#8ba4d4` (dusty blue) | Less electric, more contemplative |

**Implementation:**
- Define CSS custom properties in `src/styles/theme.css`
- Replace all hardcoded Tailwind color classes with theme tokens
- Create `@theme` directive in Tailwind config to map custom properties

### 1.2 Typography — Serif for Soul, Sans for Utility

**What Headspace/Calm do:**
- Headspace: custom serif for headings ("editorial" feel), clean sans for body
- Calm: elegant serif for titles, readable sans for descriptions
- Both use larger line-height (1.6–1.8) for body text — feels like reading a book, not a screen

**What NilaMind has:**
- `font-sans` everywhere (Inter/system sans-serif)
- `text-xs` (11px) for most content — too small for emotional text
- Tight line-height (1.4) — feels cramped

**What to build:**
- **Primary serif:** `@fontsource/lora` or `@fontsource/playfair-display` for headings and emotional content
- **Body sans:** `@fontsource/inter` at 14px minimum for body text
- **Line-height:** 1.7 for body, 1.3 for headings
- **Font pairing:** Lora (serif headings) + Inter (sans body) — warm and readable

### 1.3 Spacing & Breathing Room

**What Headspace/Calm do:**
- Generous padding (24–32px on cards)
- Large gaps between sections (24px minimum)
- Cards have soft rounded corners (16–24px)
- Content doesn't touch screen edges — always 16px margin

**What NilaMind has:**
- `p-4` (16px) padding on most cards
- `space-y-5` (20px) between sections
- `rounded-2xl` (16px) corners
- Good but could be more generous

**What to build:**
- Increase card padding to `p-6` (24px)
- Section gaps to `space-y-8` (32px)
- Add `max-w-md mx-auto` consistently to all screens (already done for some)
- Ensure minimum 44px touch targets (already done for buttons)

### 1.4 Illustration System

**What Headspace does:**
- Custom illustration characters (the Headspace "buddies")
- Playful, rounded, friendly line art
- Illustrations appear on empty states, loading screens, and key moments
- Consistent illustration style across the entire app

**What NilaMind has:**
- No illustrations — only Lucide icons
- Empty states show text only
- No visual personality

**What to build:**
- **Nila character:** A simple, warm, friendly illustrated character (not a cartoon mascot — think Headspace's abstract buddies). Can be SVG-based, rendered inline.
- **Empty state illustrations:** Custom SVGs for "no data yet", "first check-in", "no episodes logged", etc.
- **Mood illustrations:** Small, expressive illustrations for each mood state (elevated, depressed, mixed, stable) — replaces the text-only phase labels
- **Loading illustration:** An animated Nila character with a gentle breathing/pulsing animation

### 1.5 Icon System Upgrade

**What Finch/Daylio do:**
- Custom icons with personality (Finch's feathered icons, Daylio's emoji-style)
- Icons have subtle color fills, not just outlines
- Mood icons are expressive (happy face, sad face, etc.)

**What NilaMind has:**
- Lucide icons — clean but generic
- All icons are `text-slate-400` — muted, no personality
- No custom icons for moods, activities, or states

**What to build:**
- Keep Lucide for utility icons (settings, navigation)
- Create custom SVG icons for mood states (with color fills)
- Add emoji-style mood selectors for the check-in flow
- Use `lucide-react` with custom `color` prop per context (not all gray)

---

## 2. Onboarding & First-Run Experience

### 2.1 The Problem

**What NilaMind does now:**
- Shows a `SecureGate` (PIN/biometric setup) as the first screen
- Then dumps the user into the Today tab with no guidance
- No explanation of what NilaMind is, what it does, or how to use it
- The user sees "Good morning" and a check-in button — that's it

**What Headspace/Calm/Finch do:**
- 5–8 screen guided journey explaining the app's value
- Personalization questions ("What brings you here?")
- First micro-win within 60 seconds
- Warm, illustrated, animated transitions between screens

### 2.2 The Fix — 7-Screen Onboarding Flow

**Screen 1: Welcome**
- Nila character illustration with gentle breathing animation
- "NilaMind is your private wellness companion."
- "Everything stays on your phone. Nothing leaves this device."
- Large "Begin" button with haptic feedback

**Screen 2: Why We're Different**
- Three illustrated cards: "Private by design", "Bipolar-aware", "Evidence-based"
- Swipe through or tap to advance
- Subtle parallax animation on the illustrations

**Screen 3: Mood Baseline**
- "How are you feeling right now?"
- 5 emoji-style mood selectors (Very low → Very high)
- Tapping one animates it larger, shows a warm color
- This seeds the first data point — instant personalization

**Screen 4: What Matters to You**
- Pill-based multi-select: "Sleep", "Mood patterns", "Staying grounded", "My medications", "Talking to someone"
- Each pill has an icon and gentle animation on select
- This drives the home screen layout and suggested tools

**Screen 5: Notification Permission (Contextual)**
- "Nila can send gentle reminders — never more than 3 a day, and you can turn them off anytime."
- Illustration of a soft notification card
- "Enable gentle reminders" / "Not now" (both are equally styled — no dark patterns)

**Screen 6: Nila Says Hello**
- Simulated chat bubble: "Hi, I'm Nila. I'm here whenever you need me."
- "I'm not a therapist — I'm a companion. I'll help you track patterns, try skills, and notice what works."
- This sets expectations and builds relationship

**Screen 7: Ready**
- "You're all set. Here's your first day."
- Animated transition to the Today tab
- The Today tab now shows personalized content based on Screen 3 + 4 answers

### 2.3 Implementation

- Create `OnboardingScreen.tsx` with 7 steps
- Use `react-spring` or CSS transitions for step-to-step animation
- Store onboarding state in `secureLocal` (SENSITIVE_KEY: `nilamind_onboarding`)
- Gate the entire app behind `onboardingDone` (already exists in App.tsx as `hasCompletedOnboarding()`)
- Each screen's data feeds into `nilaContext` immediately

---

## 3. Home Screen & Adaptive Context

### 3.1 The Problem

**What NilaMind does now:**
- TodayScreen shows: greeting, mood card, tools grid, chat button
- Same layout regardless of time of day, mood state, or context
- No personalization beyond the greeting time
- Tools are in a flat grid — no prioritization

**What Headspace/Calm do:**
- Headspace: "What kind of headspace are you looking for?" with context-aware suggestions
- Calm: Daily Calm (today's meditation) prominently featured, then personalized recommendations
- Both surface "just for you" content based on time, history, and stated goals

### 3.2 The Fix — Adaptive Home Screen

**Morning (6am–12pm):**
- Hero: "Good morning, [name]" with sunrise gradient
- Priority: Check-in prompt (if not done), daily intention, morning tools
- "Today's focus" card based on yesterday's mood/what they selected in onboarding
- Subtle breathing animation on the greeting

**Afternoon (12pm–6pm):**
- Hero: "How's your day going?" with warm midday colors
- Priority: Quick mood log, grounding tools, social rhythm anchors
- "You haven't checked in yet" nudge (if applicable)
- Tools reordered: grounding/breathing first

**Evening (6pm–10pm):**
- Hero: "Winding down" with twilight gradient
- Priority: Reflection prompt, wind-down tools, sleep prep
- "Today in review" mini-card (mood trend, what helped)
- Tools reordered: wind-down, diary first

**Night (10pm–6am):**
- Hero: "Rest well" with deep night colors
- Priority: Wind-down steps, breathing, sleep sounds
- Reduced UI — fewer cards, calmer palette
- Crisis resources always accessible but not prominent

**Crisis State:**
- If `isSafetySuppressed()` or recent crisis detection:
- Hero: "You're not alone" with warm, grounding colors
- Priority: Crisis resources, grounding, breathing
- All other cards de-emphasized
- "Talk to someone" card prominently featured

### 3.3 Contextual Tool Ordering

Based on Screen 4 (onboarding) + real-time signals:
- If "Sleep" selected → wind-down tools bubble to top
- If "Mood patterns" selected → mood chart and insights prominent
- If "Staying grounded" → breathing/grounding tools first
- If recent high distress → crisis resources visible, grounding promoted
- If wellbeing due → wellbeing check-in card appears (already done)

### 3.4 Implementation

- Create `useTimeOfDay()` hook → returns "morning" | "afternoon" | "evening" | "night"
- Create `useUserContext()` hook → combines onboarding prefs + recent mood + crisis state
- Refactor `TodayScreen.tsx` to use these hooks for layout
- Create `HeroCard` component with time-aware gradients and illustrations
- Store onboarding prefs in `nilamind_onboarding_prefs` (SENSITIVE_KEY)

---

## 4. Micro-Interactions & Animation

### 4.1 The Problem

**What NilaMind does now:**
- `animate-slide-in` / `animate-slide-out` for sheet transitions (CSS only)
- `active:scale-[0.99]` on buttons — barely perceptible
- No haptic feedback
- No loading animations
- No celebration moments
- No breathing/pulsing animations

**What Finch/Headspace do:**
- Finch: character bounces when you complete a task, confetti on milestones
- Headspace: breathing circles that expand/contract, smooth page transitions
- Both use `react-spring` or Framer Motion for physics-based animations
- Haptic feedback on every meaningful interaction

### 4.2 The Fix — Animation System

**Phase 1: Core Transitions**
- Page transitions: slide-up with spring physics (not CSS `ease`)
- Card enter: fade-up with 200ms delay per card (staggered)
- Sheet open: slide-up from bottom with spring (already have slide-in, upgrade to spring)
- Tab switch: crossfade with subtle scale

**Phase 2: Interaction Feedback**
- Button tap: scale down to 0.95 with spring back (not 0.99)
- Toggle: smooth slide with color transition
- Card press: subtle elevation increase (shadow grows)
- Haptic feedback: light impact on button tap, medium on important actions

**Phase 3: Celebration Moments**
- Streak milestone: confetti burst + character animation
- Check-in complete: gentle pulse + "Done ✓" animation
- First episode logged: encouraging message with illustration
- Safety plan completed: warm glow animation

**Phase 4: Ambient Animation**
- Breathing circle: expand/contract on a 4-7-8 rhythm (available on home screen)
- Greeting text: subtle shimmer on first load
- Nila character: gentle idle animation (breathing, blinking)
- Background: subtle gradient shift based on time of day

### 4.3 Implementation

- Install `framer-motion` (or `@react-spring/native` for Capacitor)
- Create `src/components/AnimatedCard.tsx` — wrapper with enter/exit animations
- Create `src/components/BreathingCircle.tsx` — expand/contract on 4-7-8 rhythm
- Create `src/components/ConfettiBurst.tsx` — celebration particle effect
- Create `src/hooks/useHaptic.ts` — Capacitor Haptics plugin wrapper
- Add `Haptics.impact({ style: ImpactStyle.Light })` to all button taps
- Add `Haptics.impact({ style: ImpactStyle.Medium })` to check-in complete, milestone

---

## 5. Loading, Empty & Error States

### 5.1 The Problem

**What NilaMind does now:**
- Loading: `<ScreenFallback />` — plain text "Loading..."
- Empty states: `t("em_none")` — "No markers yet — add your first one." (text only)
- Error states: generic error messages
- No illustrations, no warmth, no guidance

**What Headspace/Finch do:**
- Loading: animated character with a "thinking" or "breathing" animation
- Empty: illustrated scene with encouraging text and a clear CTA
- Error: friendly message with retry button and illustration

### 5.2 The Fix

**Loading States:**
- Replace "Loading..." with animated Nila character
- Skeleton screens for cards (shimmer animation)
- Progressive loading: show cached content immediately, update when fresh data arrives

**Empty States (per screen):**
- **No check-ins yet:** Illustration of Nila waving + "Ready for your first check-in? It takes 30 seconds." + CTA button
- **No episodes logged:** Illustration of a calm landscape + "No episodes yet — that's a good sign." + "If you do log one, here's what we track..."
- **No mood data:** Illustration of a chart being drawn + "Your mood story starts with one check-in."
- **No caregiver contacts:** Illustration of two people + "Sharing with a trusted person can help. Add someone you trust." + CTA
- **No insights yet:** Illustration of a lightbulb + "Keep checking in — patterns emerge after a few days."

**Error States:**
- Friendly illustration + "Something went wrong — but your data is safe."
- Clear retry button
- "Your data is stored locally and hasn't been lost."

### 5.3 Implementation

- Create `src/components/EmptyState.tsx` — takes `illustration`, `title`, `body`, `cta`
- Create `src/components/SkeletonCard.tsx` — shimmer animation placeholder
- Create `src/components/LoadingNila.tsx` — animated Nila character
- Create `src/illustrations/` directory with SVG illustrations per empty state
- Update all screens to use `<EmptyState>` instead of plain text

---

## 6. Data Visualization & Insights

### 6.1 The Problem

**What NilaMind does now:**
- Mood history: plain list of entries
- Assessments: score displayed as number
- Episode markers: list with dates
- No charts, no trends, no visual patterns
- Insights are text-only in `nilaContext`

**What Daylio/Bearable do:**
- Daylio: "Year in Pixels" — every day is a colored dot, full year visible at once
- Daylio: Mood line chart with activity correlation
- Bearable: Multi-factor correlation charts (sleep vs mood, activity vs energy)
- Both: "Your best day was..." / "You tend to feel better when..."

### 6.2 The Fix

**Mood Visualization:**
- **Year in Pixels:** Grid of colored dots, one per day, colored by mood intensity
- **Mood Line Chart:** 30-day trend line with color gradient
- **Mood Heatmap:** Calendar view with color intensity = distress level
- **Weekly Summary:** "This week: 3 good days, 2 tough days, 2 mixed"

**Assessment Visualization:**
- **Score Trend Chart:** Line chart showing PHQ-9/GAD-7/WHO-5 over time
- **Reliable Change Indicator:** Visual marker showing if change is statistically meaningful
- **Severity Band Visualization:** Color bands (mild/moderate/severe) with current score plotted

**Episode Visualization:**
- **Phase Timeline:** Horizontal timeline showing elevated/depressed/mixed/stable periods
- **Phase Duration Chart:** Bar chart showing how long each phase lasted
- **Pattern Detection:** "You tend to have elevated periods after 3+ nights of short sleep"

**Insight Cards:**
- **"Nila noticed..."** — pattern cards with evidence
- **"What helped..."** — skills that correlated with improvement
- **"Watch out for..."** — early warning signs with confidence level
- Each card has a small chart/visualization + plain-language explanation

### 6.3 Implementation

- Install `recharts` or `victory-native` for charts
- Create `src/components/MoodHeatmap.tsx` — Year in Pixels grid
- Create `src/components/TrendChart.tsx` — reusable line chart with color bands
- Create `src/components/PhaseTimeline.tsx` — horizontal phase visualization
- Create `src/components/InsightCard.tsx` — pattern card with chart + text
- Create `src/services/insightEngine.ts` — pattern detection (replaces/supplements nilaContext text)

---

## 7. AI Companion Personality

### 7.1 The Problem

**What NilaMind does now:**
- Chat responses are generic and formulaic
- Anti-sycophancy rules make responses feel guarded
- No personality, no warmth, no humor
- Context injection (`nilaContext`) is ignored by the tiny model
- The "companion" feels like a form-filler

**What Woebot does:**
- Distinct personality: warm, slightly humorous, empathetic
- Uses CBT techniques naturally in conversation
- "I hear you" + reflection + skill suggestion
- Remembers context and references it later
- Sets boundaries gracefully ("I'm not a therapist, but I can help you think through this")

### 7.2 The Fix — Nila's Voice

**Personality Definition:**
- **Warm but not saccharine:** "That sounds really tough" not "Oh no, I'm so sorry!"
- **Curious but not interrogating:** "What was that like for you?" not "Tell me more about your feelings"
- **Grounded but not clinical:** "Your body might be telling you something" not "You're exhibiting somatic symptoms"
- **Honest but not harsh:** "I notice you've been down for a few days" not "You seem depressed"
- **Companion, not therapist:** "I'm here with you" not "Let's work through this together"

**Response Templates (for the small model):**
- Create `src/services/nilaVoice.ts` — response template library
- Templates are warm, personalized, and reference `nilaContext` data
- Templates follow the companion voice guidelines
- The model fills in the template, not generates from scratch

**Contextual Responses:**
- If mood trending down: "I've noticed things have been heavier lately. Want to try a grounding exercise?"
- If sleep is short: "Short sleep can make everything harder. Tonight might be a good night for the wind-down."
- If streak is building: "Day 5 — you're showing up for yourself. That matters."
- If crisis detected: "I'm here. You're not alone. Let's breathe together."

### 7.3 Implementation

- Create `src/services/nilaVoice.ts` — response templates + contextual selection
- Create `src/services/responseBuilder.ts` — combines nilaContext + nilaVoice + model output
- Update `localNila.ts` to use `responseBuilder` instead of raw model output
- Add personality tests (response warmth, companion voice, no sycophancy)

---

## 8. Gamification & Retention

### 8.1 The Problem

**What NilaMind does now:**
- Streaks exist but feel gamified without payoff
- No achievements, no milestones, no celebration
- No visual progress indicator
- No reason to come back beyond "you should check in"

**What Finch/Daylio do:**
- Finch: Virtual pet that grows as you complete tasks — emotional investment
- Daylio: Achievement badges, "Year in Pixels" completion, streak celebrations
- Both: Visual progress that makes you feel proud

### 8.2 The Fix — Meaningful Progress

**Streak Visualization:**
- Animated streak counter with fire/glow effect
- Streak milestones: 3 days → 7 → 14 → 30 → 100
- Each milestone has a celebration animation + encouraging message
- "Don't break the chain" visual (connected dots)

**Achievement System:**
- **First check-in:** "You started your story" badge
- **7-day streak:** "A week of showing up" badge
- **First episode logged:** "Courage to track" badge
- **Safety plan completed:** "Prepared, not scared" badge
- **Caregiver added:** "Trusted connection" badge
- **Wellbeing check completed:** "Self-aware" badge
- Each badge has an illustration and is shareable

**Progress Dashboard:**
- "Your journey" screen showing all achievements, streaks, and milestones
- Visual timeline of key moments (first check-in, longest streak, etc.)
- "You've been using NilaMind for X days" counter
- "Your data story: X check-ins, X episodes tracked, X tools used"

**Micro-Wins:**
- Every check-in shows a small encouraging message
- Every tool use shows "Nice — you're building a habit"
- Weekly summary: "This week you showed up 5 out of 7 days"

### 8.3 Implementation

- Create `src/services/achievements.ts` — achievement definitions + unlock logic
- Create `src/components/AchievementBadge.tsx` — illustrated badge component
- Create `src/components/StreakCounter.tsx` — animated streak with milestones
- Create `src/components/ProgressDashboard.tsx` — journey overview screen
- Add achievement unlock to check-in complete, tool use, milestone triggers

---

## 9. Notification Design

### 9.1 Current State (Phase 20 — Done)

- 5 Android channels with proper importance
- Action buttons (Snooze, Check in, Taken, Dismiss)
- Wind-down sync, EMA grouping
- Progressive cooldown wired

### 9.2 What's Still Missing

**Notification Copy:**
- Current: generic "Time to check in" / "NilaMind"
- Target: warm, contextual, personalized

**Smart Timing:**
- Current: fixed windows + random within windows
- Target: learn from engagement patterns (already have `optimalFireHour`)

**Notification Design:**
- Current: plain text
- Target: rich notifications with progress context

### 9.3 The Fix — Notification Copy Library

**Daily Nudge (contextual):**
- If mood trending down: "Hey — just checking in. How are you today?"
- If mood stable: "A quick check-in takes 30 seconds. You've got this."
- If streak active: "Day 5 — want to keep it going?"
- If after crisis: "No pressure — just know I'm here."

**EMA Check-in:**
- "How's your energy right now?" / "Quick check — how are you feeling?"
- "30 seconds to log how you're doing"

**Medication:**
- "Time for [med name] — you've got this ✓"
- "Gentle reminder: [med name] in 30 minutes"

**Wind-down:**
- "The day is done. Time to settle your body."
- "Your wind-down steps are ready when you are."

**Weekly Digest:**
- "Your week in review is ready — here's what Nila noticed."

### 9.4 Implementation

- Update `WARM_NUDGES` in `notifications.ts` with contextual variants
- Create `src/services/notificationCopy.ts` — contextual nudge selection
- Wire `optimalFireHour` into daily nudge scheduling (already computed, not used)
- Add streak count to notification body when active

---

## 10. Accessibility & Delight

### 10.1 Accessibility

**Current gaps:**
- No screen reader labels on many components
- Color contrast fails WCAG AA on some text
- No reduced-motion support (animations play regardless)
- Touch targets are 44px (good) but some are 36px

**Fixes:**
- Add `aria-label` to all interactive elements
- Ensure all text passes WCAG AA (4.5:1 contrast ratio)
- Respect `prefers-reduced-motion` — disable animations when set
- Audit all touch targets → minimum 44px

### 10.2 Delight Moments

**What Finch does:**
- Character does a happy dance when you complete a task
- Confetti on streak milestones
- Sound effects (optional) on achievements
- "Your pet missed you" when returning after absence

**NilaMind delight moments:**
- First check-in: gentle confetti + "You started your story"
- 7-day streak: celebration animation + badge unlock
- Returning after 3+ days: "Welcome back — I missed you" (warm, not guilt-tripping)
- Crisis survived: "You got through it. That takes strength." (with illustration)
- Safety plan completed: warm glow + "You're prepared"

### 10.3 Dark/Light Mode

**Current:** Dark mode only
**Target:** Both dark and light mode, with user toggle
- Light mode: warm cream backgrounds, dark text
- Dark mode: warm dark backgrounds (current, but warmer)
- System preference detection
- Smooth transition between modes

### 10.4 Implementation

- Add `aria-label` audit to all components
- Run `axe-core` accessibility audit
- Add `prefers-reduced-motion` check to animation components
- Create light mode color tokens
- Add theme toggle to settings
- Create delight animation components (confetti, glow, celebration)

---

## 11. Implementation Phases

### Phase UX-1: Design System Foundation (1–2 weeks)
- [ ] CSS custom properties for color system
- [ ] Typography: Lora + Inter font pairing
- [ ] Spacing audit + updates
- [ ] Theme tokens in Tailwind config
- [ ] Light mode tokens
- [ ] `tsc` + `vitest` green

### Phase UX-2: Onboarding Flow (1 week)
- [ ] 7-screen onboarding flow
- [ ] Animated transitions between screens
- [ ] Onboarding data → nilaContext integration
- [ ] Skip/dismiss handling
- [ ] Tests for onboarding state management

### Phase UX-3: Adaptive Home Screen (1 week)
- [ ] `useTimeOfDay()` hook
- [ ] `useUserContext()` hook
- [ ] Time-aware hero card with gradients
- [ ] Contextual tool ordering
- [ ] Crisis state layout
- [ ] Tests for all time-of-day variants

### Phase UX-4: Empty States & Loading (1 week)
- [ ] Illustration SVGs for all empty states
- [ ] `EmptyState` component
- [ ] `SkeletonCard` component
- [ ] `LoadingNila` animated component
- [ ] Update all screens with empty states
- [ ] Tests for empty state rendering

### Phase UX-5: Micro-Interactions (1–2 weeks)
- [ ] Install Framer Motion
- [ ] `AnimatedCard` wrapper component
- [ ] Button spring animations
- [ ] Sheet transition upgrade
- [ ] Haptic feedback on all interactions
- [ ] `BreathingCircle` component
- [ ] `ConfettiBurst` component
- [ ] `prefers-reduced-motion` support
- [ ] Tests for animation presence/absence

### Phase UX-6: Data Visualization (2 weeks)
- [ ] Install chart library (Recharts)
- [ ] `MoodHeatmap` (Year in Pixels)
- [ ] `TrendChart` (reusable line chart)
- [ ] `PhaseTimeline` (horizontal phase viz)
- [ ] `InsightCard` (pattern + chart + text)
- [ ] Update DashboardScreen with charts
- [ ] Update TodayScreen with mini-charts
- [ ] Tests for chart data transformations

### Phase UX-7: Nila's Voice (1 week)
- [ ] `nilaVoice.ts` response template library
- [ ] `responseBuilder.ts` combining context + templates
- [ ] Update localNila to use response builder
- [ ] Warmth/companion voice tests
- [ ] Anti-sycophancy integration tests

### Phase UX-8: Gamification (1 week)
- [ ] `achievements.ts` service
- [ ] `AchievementBadge` component
- [ ] `StreakCounter` with milestones
- [ ] `ProgressDashboard` screen
- [ ] Achievement unlock triggers
- [ ] Tests for achievement logic

### Phase UX-9: Notification Polish (3 days)
- [ ] `notificationCopy.ts` contextual nudge selection
- [ ] Wire `optimalFireHour` to daily nudge
- [ ] Update all notification body text
- [ ] Tests for contextual copy

### Phase UX-10: Accessibility & Delight (1 week)
- [ ] `aria-label` audit
- [ ] WCAG AA contrast audit
- [ ] `prefers-reduced-motion` everywhere
- [ ] Touch target audit
- [ ] Light mode theme
- [ ] Theme toggle in settings
- [ ] Delight animations
- [ ] Accessibility tests

---

## Metrics for Success

| Metric | Current | Target |
|--------|---------|--------|
| Time to first check-in | ∞ (no guidance) | < 90 seconds |
| Day-1 retention | Unknown | > 60% |
| Day-7 retention | Unknown | > 30% |
| Average session duration | Unknown | > 2 minutes |
| Empty state engagement | 0% | > 40% tap CTA |
| Notification tap rate | Unknown | > 15% |
| Onboarding completion | Unknown | > 80% |
| User satisfaction (qualitative) | "Functional" | "I love this app" |

---

## Design Principles (Reference)

1. **Warm, not clinical.** Every pixel should feel like a friend, not a hospital.
2. **Show, don't tell.** Charts > text. Animations > static. Feel > read.
3. **Earn attention, don't demand it.** Notifications are gentle, not urgent.
4. **Celebrate small wins.** Every check-in matters. Make it feel like it.
5. **Empty is an opportunity.** An empty state is a chance to guide, not a failure.
6. **Respect the moment.** Crisis state = different UI. Sleep time = different UI.
7. **Privacy is visible.** Show the user their data is safe. Make it tangible.
8. **Accessibility is not optional.** Every interaction works for everyone.
