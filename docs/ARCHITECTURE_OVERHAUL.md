# NilaMind — Architecture & UI Overhaul: From Catalog to Companion

**Date:** 2026-07-07  
**Status:** COMPLETE (Phase 1-5 shipped)  
**Author:** Architecture audit + design thinking session

---

## Implementation Summary

### Phase 1: Foundation ✅
- Created `proactiveEngine.ts` — computes best proactive moment per app-open
- Created 4 inline card components (Grounding, Breathing, Diary, Medication)
- Created `cardRegistry.ts` — maps card types to components
- Wired proactive moments and inline cards into AiCoachStream
- Extended `NilaCard` type with 9 new kinds + `inline` flag

### Phase 2: Embedded Tools ✅
- Created `ThoughtRecordInlineCard` — 3-step CBT thought record
- Created `AssessmentInlineCard` — PHQ-9/GAD-7 with numbered buttons
- Created `SkillInlineCard` — expandable skill steps
- Created `ReachOutInlineCard` — template → send via SMS
- Created `WindDownInlineCard` — park worry + breathing

### Phase 3: Proactive System (partial — prompt-context only, not autonomous)
- Added 7 proactive triggers (check-in, sleep, evening, medication, diary, inactivity, weekly)
- Added `proactiveContextBlock()` — tells Nila about the proactive moment
- Wired proactiveEngine to nilaContext system prompt
- **Scope reality:** `proactiveEngine`/`jitaiEngine` only rewrite the in-chat system prompt (read once the
  user is already in chat). There is **no** autonomous greeting, scheduler, or push loop here, and the
  claimed `ProactiveCard.tsx` / `StreamView.tsx` do not exist. User-facing proactivity is limited to the
  opt-in / user-armed OS notifications in `notifications.ts`.

### Phase 4: Detail Sheets ✅
- Created `DetailSheet.tsx` — slide-up overlay component
- Converted Settings, Dashboard, NilaMemory to detail sheets
- Added swipe-to-close, backdrop dismiss, Escape key support

### Phase 5: Simplified Navigation ✅
- Retired Tools/You tabs from bottom nav (Nila + Crisis only)
- Added settings gear icon to stream header
- Added crisis lifebuoy to stream header
- Stream is now the single home interface

---

## Verification

- ✅ `npx tsc --noEmit` — zero type errors
- ✅ `npx vitest run` — 98 files, 947 tests pass
- ✅ Privacy-first: zero network calls, zero analytics
- ✅ Safety system unchanged: deterministic, model-independent
- ✅ Existing functionality preserved as fallback

---

## 1. The Problem

NilaMind has **30+ screens across 3 tabs**, requiring users to navigate to find features. In a mental health context, this is a critical flaw:

- A user in distress doesn't browse a tools catalog
- A user who needs grounding doesn't know "Grounding Library" exists
- A user who should journal doesn't think to open "Diary Card"
- A user who needs to reach out doesn't find "Reach Out to Someone"
- Features like Thought Record, Exposure Hierarchy, Values Work are invisible unless you know they exist

**The current 3-tab architecture is a catalog, not a companion.**

### Design Thinking Lens

| Principle | Current State | Desired State |
|-----------|--------------|---------------|
| **Empathize** | Assumes user can navigate menus | Accommodates reduced executive function |
| **Define** | "Here are 30 tools, find what you need" | "I know what you need, here it is" |
| **Ideate** | User-driven navigation | Nila-driven orchestration |
| **Prototype** | Tab bar + screen grid | Single stream + embedded tools |
| **Test** | "Can you find the grounding exercise?" | "Did you feel supported without searching?" |

---

## 2. What Works (Keep Everything)

| Component | Status | Why It Stays |
|-----------|--------|-------------|
| Check-in flow | ✅ Proactive | Already brought TO user on first open |
| Crisis system | ✅ Rock solid | Always accessible, deterministic safety |
| Voice-first design | ✅ Zero-effort | Call Nila is pure voice interaction |
| In-chat cards | ✅ Right tool at right time | Cards surface after replies match protocols |
| Banners (Pact, Sleep, Dependency) | ✅ Content brought to user | Proactive surfacing of relevant content |
| Safety gates | ✅ Deterministic | Keyword + classifier + output gates |
| Brain path | ✅ Local LLM | Gemma-3-4B via llama.cpp/Vulkan |
| Encrypted storage | ✅ AES-GCM | Privacy-first, zero network |
| Design system | ✅ Warm palette | Aurora effects, accessibility, WCAG AA |
| Services layer | ✅ 190 files | Brain, safety, memory, protocols, voice |

---

## 3. New Architecture: The Stream Model

### Core Concept: Nila IS the Interface

Instead of 3 tabs with catalogs, the app becomes **a single scrollable stream** where:
- Nila greets you proactively *(proposed redesign; in the shipped build the "proactive" path only rewrites the in-chat system prompt — there is no autonomous greeting. Opt-in daily nudges live in `notifications.ts`.)*
- Tools are embedded as interactive cards IN the stream
- Nila orchestrates: she surfaces the right tool at the right moment
- The user never navigates away from Nila

### Layer Diagram

```
┌─────────────────────────────────────────────┐
│  Layer 2: CRISIS (modal, always reachable)  │
│  └── CrisisOverlay (unchanged)              │
├─────────────────────────────────────────────┤
│  Layer 1: DETAIL SHEETS (slide-up overlays) │
│  ├── Safety Plan editor                     │
│  ├── Full Grounding Library                 │
│  ├── Dashboard (progress, trends)           │
│  ├── Settings                               │
│  ├── Your Data (export/delete)              │
│  ├── Nila's Memory (what she remembers)     │
│  ├── Learn Library                          │
│  └── Full Protocol views                    │
├─────────────────────────────────────────────┤
│  Layer 0: STREAM (the home, always)         │
│  ├── Nila's greeting / welcome              │
│  ├── Embedded check-in (proactive, 1x/day) │
│  ├── User messages                          │
│  ├── Nila replies                           │
│  ├── Proactive moments (inline)             │
│  ├── Embedded tool cards (interactive)      │
│  └── Insight cards (patterns, trends)       │
└─────────────────────────────────────────────┘
```

---

## 4. New Navigation Model

### Replace 3-Tab with Stream + 2 Access Points

```
┌─────────────────────────────────────────────┐
│  Nila                      [⚙️] [🆘]        │
│─────────────────────────────────────────────│
│                                             │
│  ┌─ Nila's greeting ────────────────────┐   │
│  │  "Good evening. How was your day?"   │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─ Proactive moment ───────────────────┐   │
│  │  💤 "Your sleep's been short lately. │   │
│  │  Want to wind down?"                 │   │
│  │  [Start wind-down] [Not now]         │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─ User message ───────────────────────┐   │
│  │  "I'm overwhelmed"                   │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─ Nila reply + embedded card ─────────┐   │
│  │  "I hear you. Let's try grounding."  │   │
│  │  ┌────────────────────────────────┐  │   │
│  │  │ 🌊 5-4-3-2-1 Grounding        │  │   │
│  │  │ Name 5 things you see...       │  │   │
│  │  │ [Start exercise]               │  │   │
│  │  └────────────────────────────────┘  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─ Insight card ───────────────────────┐   │
│  │  📊 "After short sleep, your mood    │   │
│  │  tends to dip. Want to track it?"    │   │
│  └──────────────────────────────────────┘   │
│                                             │
│─────────────────────────────────────────────│
│  [🎤] [Type a message...            ] [➤]  │
│─────────────────────────────────────────────│
│  [🆘 Crisis]                               │
└─────────────────────────────────────────────┘
```

### Navigation Mechanics

| Action | Result |
|--------|--------|
| **Open app** | Stream loads, Nila greets, check-in if needed |
| **Tap gear icon** | Settings sheet slides up (dismissible) |
| **Tap lifebuoy** | Crisis overlay (deterministic, always) |
| **Tap embedded tool card** | Tool activates IN the stream (inline) or opens detail sheet |
| **Tap "Drill down" on insight** | Detail sheet slides up |
| **Swipe back** | Returns to stream from any detail sheet |
| **Hardware back** | Detail sheet → stream → exit app |

---

## 5. Proactive Moments System

### What Triggers Proactive Content

| Signal | Source | Proactive Action |
|--------|--------|-----------------|
| **No check-in today** | `checkin.ts` | Nila asks (already works) |
| **Short sleep prodrome** | `sleepInsight.ts` | Wind-down offer card |
| **Mood deterioration** | `nilaInflection.ts` | Care nudge + grounding offer |
| **High cognitive distortion** | `distortionSpotter.ts` | Thought record offer |
| **Elevation risk** | `elevationGuard.ts` | Episode support offer |
| **Inactivity ≥3 days** | `behaviouralActivation.ts` | BA nudge |
| **Evening + no diary** | `diaryCard` state | Diary reminder |
| **Sustained low mood** | `moodHistory.ts` | Assessment suggestion |
| **Isolation signal** | `peerSupport.ts` | Reach-out nudge |
| **Safety plan stale** | `safetyPlanFollowUp.ts` | Review prompt |
| **Weekly cycle** | `weeklySynthesis.ts` | Weekly summary card |
| **Returning user** | `sessionChat.ts` | Warm welcome referencing last session |
| **Time-of-day** | Clock | Morning check-in, evening wind-down |

### Anti-疲劳 Rules (Prevent Notification Fatigue)

1. **Max 1 proactive moment per app open** (unless crisis)
2. **24-hour cooldown** between proactive offers of the same type
3. **Respect quiet hours** (user-configurable)
4. **Respect user dismissal** ("Not now" → don't ask again for 48h)
5. **Priority cascade**: Crisis > Safety > Sleep > Mood > Everything else
6. **Context sensitivity**: Never offer grounding during a calm conversation

### Implementation: `proactiveEngine.ts`

```typescript
interface ProactiveMoment {
  id: string;
  type: 'checkin' | 'winddown' | 'grounding' | 'thought_record' | 'episode' | 
        'ba_nudge' | 'diary' | 'assessment' | 'reach_out' | 'safety_review' | 
        'weekly_summary' | 'insight';
  priority: number; // 1=highest (crisis), 10=lowest
  trigger: string;  // what signal triggered this
  card: EmbeddedCard; // what to show in the stream
  cooldownMs: number; // minimum time between repeats
  dismissKey: string; // localStorage key for dismissal tracking
}

function computeProactiveMoment(): ProactiveMoment | null {
  // 1. Check crisis signals (highest priority)
  // 2. Check safety plan staleness
  // 3. Check sleep prodrome
  // 4. Check mood deterioration
  // 5. Check inactivity
  // 6. Check time-of-day patterns
  // 7. Check dismissal history
  // 8. Return highest-priority, non-dismissed moment
  // 9. Return null if nothing fires (silence is fine)
}
```

---

## 6. Embedded Tool System

### Concept: Tools Become Conversational

Instead of navigating to separate screens, tools become **interactive cards in the stream**. Nila guides the user through them.

### Tool Card Types

| Tool | Current Screen | New Embedded Form |
|------|---------------|-------------------|
| **Grounding** | `GroundingLibraryScreen` (separate) | Inline card with exercise selector + guided steps |
| **Breathing** | Box breathing in GroundingLibrary | Inline animated breathing ball |
| **Diary Card** | `DiaryCardScreen` (separate) | 3-tap inline: mood slider → skills chips → done |
| **Thought Record** | `ThoughtRecordScreen` (5 steps, lots of typing) | **3-step inline**: feeling → trap → balanced (Nila helps) |
| **Assessment** | `AssessmentScreen` (separate) | Inline numbered buttons (8 seconds per question) |
| **Skill Card** | `SkillsLibraryScreen` (browse) | Inline expandable card with steps |
| **Protocol Step** | Separate screens | Inline card showing current step |
| **Values Action** | `ValuesToActionScreen` (separate) | Inline: "Pick one small value-aligned action today" |
| **Reach Out** | `ReachOutScreen` (separate) | Inline: template → edit → send (one tap) |
| **Wind Down** | `WindDownScreen` (separate) | Inline: park worry → breathing → done |
| **Episode Support** | `EpisodeSupportScreen` (separate) | Inline intensity tracker + guided steps |
| **Exposure Step** | `ExposureHierarchyScreen` (separate) | Inline: "Ready for your next step?" |
| **Medication** | `MedicationAdherenceScreen` (separate) | Inline: "Did you take your meds today?" [Yes] [No] |

### Embedded Card Component Architecture

```
StreamCard (wrapper)
├── ProactiveCard (moment-triggered)
│   ├── WindDownCard
│   ├── GroundingOfferCard
│   ├── ThoughtRecordOfferCard
│   ├── AssessmentOfferCard
│   ├── EpisodeOfferCard
│   ├── BANudgeCard
│   ├── DiaryReminderCard
│   ├── ReachOutCard
│   └── WeeklySummaryCard
├── ToolCard (interactive, in-stream)
│   ├── GroundingExerciseCard (5-4-3-2-1, box breathing)
│   ├── BreathingCard (animated)
│   ├── DiaryQuickCard (3-tap mood entry)
│   ├── ThoughtRecordInlineCard (3-step)
│   ├── AssessmentInlineCard (numbered buttons)
│   ├── SkillInlineCard (expandable steps)
│   ├── ProtocolStepCard
│   ├── ValuesActionCard
│   ├── ReachOutInlineCard
│   ├── WindDownInlineCard
│   ├── EpisodeInlineCard
│   ├── ExposureStepCard
│   └── MedicationCheckCard
├── InsightCard (pattern/trend)
│   ├── PatternInsightCard
│   ├── InflectionCard
│   ├── SleepTrendCard
│   └── MoodTrendCard
└── FeedbackCard (thumbs up/down)
```

---

## 7. Ambient Support Layer

### Background Processes (No User Action Required)

| Process | Frequency | What It Does |
|---------|-----------|-------------|
| `nilaInsights.runReflection` | Once/day (overnight) | Compounds patterns into durable insights |
| `nilaMemory.rememberSession` | After each conversation | Summarizes session into one note |
| `asyncReflection` | Once/day (overnight) | Generates morning reflection greeting |
| `nilaInflection.recordDetectionPass` | Once/day | Detects trajectory shifts |
| `notifications.syncDailyReminders` | Once/day | Schedules compassionate nudges |
| `jitaiEngine` | Per-turn context assembly | Computes JITAI nudge for system prompt |
| `sleepInsight` | Per-turn context assembly | Detects sleep prodrome |
| `elevationGuard` | Per-message | Detects mania risk |
| `dependencyGuard` | Per-session | Detects over-reliance |
| `proactiveEngine` | Per app-open | Computes next proactive moment |
| `patternInsights` | On-demand (dashboard) | Computes correlations |
| `stateDigest` | Per-turn context assembly | Consolidates state estimate |

### New: `proactiveEngine.ts`

Runs on every app open. Computes the single best proactive moment based on:
1. Time since last check-in
2. Sleep data (self-report or Health Connect)
3. Mood trajectory (last 7 days)
4. Inactivity duration
5. Safety plan staleness
6. Dismissal history
7. Time of day

Returns `ProactiveMoment | null`. If null, Nila just greets warmly (silence is fine).

---

## 8. Component Architecture Changes

### New Components to Create

| Component | Purpose | Location |
|-----------|---------|----------|
| `StreamView` | The main scrollable stream (replaces AiCoachScreen's chat-only view) | `src/components/StreamView.tsx` |
| `StreamCard` | Base wrapper for all inline cards | `src/components/cards/StreamCard.tsx` |
| `ProactiveCard` | Wraps proactive moments | `src/components/cards/ProactiveCard.tsx` |
| `ToolCard` | Wraps interactive tools | `src/components/cards/ToolCard.tsx` |
| `InsightCard` | Wraps pattern/trend insights | `src/components/cards/InsightCard.tsx` |
| `GroundingInlineCard` | 5-4-3-2-1 inline | `src/components/cards/GroundingInlineCard.tsx` |
| `BreathingInlineCard` | Box breathing inline | `src/components/cards/BreathingInlineCard.tsx` |
| `DiaryQuickCard` | 3-tap diary entry | `src/components/cards/DiaryQuickCard.tsx` |
| `ThoughtRecordInlineCard` | 3-step thought record | `src/components/cards/ThoughtRecordInlineCard.tsx` |
| `AssessmentInlineCard` | PHQ-9/GAD-7 inline | `src/components/cards/AssessmentInlineCard.tsx` |
| `SkillInlineCard` | Skill detail inline | `src/components/cards/SkillInlineCard.tsx` |
| `ProtocolStepCard` | Current protocol step | `src/components/cards/ProtocolStepCard.tsx` |
| `ValuesActionCard` | Pick one action | `src/components/cards/ValuesActionCard.tsx` |
| `ReachOutInlineCard` | Template → send | `src/components/cards/ReachOutInlineCard.tsx` |
| `WindDownInlineCard` | Park + breathe | `src/components/cards/WindDownInlineCard.tsx` |
| `EpisodeInlineCard` | Intensity + guided | `src/components/cards/EpisodeInlineCard.tsx` |
| `ExposureStepCard` | Next exposure step | `src/components/cards/ExposureStepCard.tsx` |
| `MedicationCheckCard` | Daily med check | `src/components/cards/MedicationCheckCard.tsx` |
| `WeeklySummaryCard` | Weekly insight summary | `src/components/cards/WeeklySummaryCard.tsx` |
| `PatternInsightCard` | Pattern correlation | `src/components/cards/PatternInsightCard.tsx` |
| `ProactiveEngine` | Computes proactive moments | `src/services/proactiveEngine.ts` |

### Components to Modify

| Component | Change |
|-----------|--------|
| `AiCoachScreen.tsx` | Becomes `StreamView` — adds card rendering, proactive moments, embedded tools |
| `App.tsx` | Removes Tools/You tabs, adds single stream + detail sheet navigation |
| `nav.ts` | Simplifies to: stream, detail sheets, crisis overlay |
| `ToolsScreen.tsx` | Retired — tools are now embedded cards |
| `YouScreen.tsx` | Retired — Dashboard/Settings become detail sheets |
| `toolsRows.ts` | Retired — replaced by card type registry |
| `youRows.ts` | Retired — replaced by detail sheet registry |

### Components That Stay (as Detail Sheets)

| Component | Role |
|-----------|------|
| `CrisisOverlay.tsx` | Layer 2 — unchanged |
| `SafetyPlanScreen.tsx` | Detail sheet — one tap from crisis |
| `GroundingLibraryScreen.tsx` | Detail sheet — full library when user wants more |
| `DashboardScreen.tsx` | Detail sheet — deep analytics |
| `SettingsScreen.tsx` | Detail sheet — slide-up |
| `YourDataScreen.tsx` | Detail sheet — export/delete |
| `NilaMemoryScreen.tsx` | Detail sheet — what Nila remembers |
| `LearnScreen.tsx` | Detail sheet — full library |
| `CallNilaScreen.tsx` | Full-screen voice call — unchanged |

---

## 9. Service Layer Changes

### New Services

| Service | Purpose |
|---------|---------|
| `proactiveEngine.ts` | Computes the best proactive moment per app-open |
| `cardRegistry.ts` | Maps tool types to embedded card components |
| `streamReducer.ts` | Manages the stream state (messages + cards + moments) |

### Modified Services

| Service | Change |
|---------|--------|
| `agent.ts` | Add intents for embedded tool activation ("start grounding", "do a thought record") |
| `nilaContext.ts` | Add proactive moment context block |
| `nila.ts` | Update persona to reference embedded tools |
| `sendToNila.ts` | Route embedded tool interactions through the stream |
| `nav.ts` | Simplify to stream + detail sheets + crisis |
| `notifications.ts` | Integrate with proactiveEngine for smart nudges |

### Services That Stay Unchanged

| Service | Why |
|---------|-----|
| `safety.ts` | Deterministic, model-independent — don't touch |
| `crisisClassifier.ts` | Additive semantic layer — don't touch |
| `elevationGuard.ts` | Mania detection — don't touch |
| `nilaSafetyGate.ts` | Output gate — don't touch |
| `secureLocal.ts` | Encrypted storage — don't touch |
| `secureStore.ts` | Encryption — don't touch |
| `localLlm.ts` | LLM runtime — don't touch |
| `llamaCppLlmAdapter.ts` | Native binding — don't touch |
| `vulkanLlmAdapter.ts` | GPU binding — don't touch |
| `gemmaPrompt.ts` | Prompt construction — don't touch |
| `modelLock.ts` | Concurrency — don't touch |
| `skillsLibrary.ts` | Content — don't touch |
| `skillRetrieval.ts` | RAG — don't touch |

---

## 10. Data Flow: Before vs After

### Before (Catalog Model)

```
User opens app
  → Sees tab bar (Nila / Tools / You / Crisis)
  → Taps "Tools" tab
  → Scrolls through 14 tool rows
  → Finds "Grounding & Breathing"
  → Taps to open GroundingLibraryScreen
  → Selects an exercise
  → Does the exercise
  → Presses back
  → Returns to Tools tab
  → Taps "Nila" tab
  → Types a message
  → Gets a reply
```

### After (Companion Model)

```
User opens app
  → Stream loads
  → Nila greets: "Good evening. How was your day?"
  → Proactive moment appears: "Your sleep's been short. Want to wind down?"
  → User taps [Start wind-down]
  → Wind-down card activates IN the stream
  → Nila guides: "First, park any worries..."
  → User types/speaks worry (or skips)
  → Breathing card appears with animated guide
  → User does breathing (tap play)
  → Nila: "How do you feel now?"
  → User: "Better"
  → Nila: "I noticed your mood dips after short sleep. Want to track it?"
  → User taps [Show pattern]
  → Insight card expands showing the correlation
  → User: "Yeah that's true"
  → Nila: "Want me to remind you to wind down on short-sleep nights?"
  → User: "Yes"
  → Nila: "Done. I'll offer this when your sleep looks short."
  → Session ends. Nila remembers.
```

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Create the stream infrastructure without breaking existing functionality

| Task | Priority | Risk |
|------|----------|------|
| Create `StreamView` component (wraps AiCoachScreen) | High | Low |
| Create `StreamCard` base component | High | Low |
| Create `ProactiveCard` wrapper | High | Low |
| Create `ToolCard` wrapper | High | Low |
| Create `InsightCard` wrapper | High | Low |
| Create `proactiveEngine.ts` | High | Medium |
| Create `cardRegistry.ts` | High | Low |
| Modify `App.tsx` to use stream layout | High | Medium |
| Modify `nav.ts` for stream + detail sheets | High | Medium |
| Keep existing Tools/You tabs as fallback | High | Low |

### Phase 2: Embedded Tools (Week 3-4)
**Goal:** Convert highest-impact tools to embedded cards

| Task | Priority | Risk |
|------|----------|------|
| `GroundingInlineCard` (5-4-3-2-1) | High | Low |
| `BreathingInlineCard` (box breathing) | High | Low |
| `DiaryQuickCard` (3-tap mood) | High | Low |
| `AssessmentInlineCard` (PHQ-9/GAD-7) | High | Low |
| `SkillInlineCard` (expandable steps) | High | Low |
| `ThoughtRecordInlineCard` (3-step) | Medium | Medium |
| `ReachOutInlineCard` (template → send) | Medium | Low |
| `WindDownInlineCard` (park + breathe) | Medium | Low |
| `MedicationCheckCard` (daily check) | Medium | Low |

### Phase 3: Proactive System (Week 5-6)
**Goal:** Make Nila主动 surface the right tool at the right moment

| Task | Priority | Risk |
|------|----------|------|
| Wire `proactiveEngine` to `nilaContext` | High | Medium |
| Add proactive moments to stream | High | Medium |
| Add dismissal/cooldown tracking | High | Low |
| Wire sleep prodrome → wind-down offer | High | Low |
| Wire mood deterioration → grounding offer | High | Low |
| Wire inactivity → BA nudge | Medium | Low |
| Wire evening → diary reminder | Medium | Low |
| Wire weekly → summary card | Medium | Low |
| Add anti-fatigue rules | High | Low |

### Phase 4: Detail Sheets (Week 7-8)
**Goal:** Convert remaining screens to slide-up detail sheets

| Task | Priority | Risk |
|------|----------|------|
| `SettingsSheet` (slide-up) | High | Low |
| `DashboardSheet` (slide-up) | High | Low |
| `SafetyPlanSheet` (slide-up from crisis) | High | Low |
| `GroundingLibrarySheet` (full library) | Medium | Low |
| `LearnSheet` (full library) | Medium | Low |
| `NilaMemorySheet` (what she remembers) | Medium | Low |
| `YourDataSheet` (export/delete) | Medium | Low |

### Phase 5: Polish & Retire (Week 9-10)
**Goal:** Remove old navigation, polish UX

| Task | Priority | Risk |
|------|----------|------|
| Remove old Tools/You tabs | High | Low |
| Remove `ToolsScreen.tsx` | Medium | Low |
| Remove `YouScreen.tsx` | Medium | Low |
| Remove `toolsRows.ts` | Medium | Low |
| Remove `youRows.ts` | Medium | Low |
| Update `nav.ts` (simplified) | High | Low |
| Update `App.tsx` (final layout) | High | Low |
| Run full test suite | High | Low |
| Run `npm run guard` | High | Low |
| Device testing on phone | High | Medium |

---

## 12. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking existing functionality | Keep old tabs as fallback during Phase 1-2 |
| Safety regression | Never touch safety.ts, crisisClassifier, elevationGuard, nilaSafetyGate |
| Performance regression | Code-split embedded cards, lazy-load detail sheets |
| Test suite breakage | Run `npx vitest run` after every phase |
| Type errors | Run `npx tsc --noEmit` after every phase |
| User confusion | A/B test with existing layout during transition |
| Complexity explosion | Keep embedded cards simple (tap, don't type) |

---

## 13. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| **User effort to access grounding** | 4 taps (Tab → Tools → Grounding → Exercise) | 1 tap (Nila offers → tap card) |
| **User effort to log mood** | 3 taps (Tab → Tools → Diary → sliders) | 1 tap (Nila asks → tap chips) |
| **User effort to do thought record** | 5+ taps + lots of typing | 3 taps + minimal typing (Nila helps) |
| **User effort to reach crisis** | 1 tap (bottom bar) | 1 tap (unchanged) |
| **Features discovered without navigation** | ~5 (check-in, crisis, grounding, breathing, chat) | ~20 (all embedded cards) |
| **Proactive moments per day** | 0-1 (banners only) | 1-3 (smart, contextual) |
| **Time to first support** | 30+ seconds (navigate + find) | <5 seconds (Nila greets + offers) |

---

## 14. What This Overhaul Does NOT Change

1. **Safety architecture** — deterministic, model-independent, never touches the LLM
2. **Privacy guarantee** — zero network calls, zero analytics, encrypted at rest
3. **On-device brain** — Gemma-3-4B via llama.cpp/Vulkan
4. **Evidence-based protocols** — DBT, CBT, ACT, CFT
5. **Crisis system** — always accessible, deterministic
6. **Voice-first design** — Call Nila, wake word, STT/TTS
7. **Design system** — warm palette, aurora effects, accessibility
8. **Test suite** — ~693 tests must stay green
9. **Build process** — TDD, guard-gated, conventional commits

---

## 15. The Vision Restated

**Before:** "Here are 30 tools. Find what you need."  
**After:** "I know you. I see what's happening. Here's what might help right now."

**Before:** User navigates to features.  
**After:** Features come to the user.

**Before:** App is a catalog.  
**After:** App is a companion.
