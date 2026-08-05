# NilaMind UI/UX Redesign — Research-Backed "Less Is More"

> "Designing for mental health means designing for vulnerability. The user's emotional state IS the environment your product operates in." — Kat Homan, Smashing Magazine

## The Problem

NilaMind has **36+ screens**, **26+ overlay destinations**, and **4+ entry points to the same screens**. For a user in distress, this is cognitive poison. Research shows users in acute stress have reduced cognitive capacity — complex UI gives them a reason to close the app permanently.

**Current state:**
- 4 bottom tabs, but each tab overflows with content
- Today tab has 8+ widgets, nudges, phase switcher, hero actions
- Tools tab has 18+ tools behind search/filter/show-more
- Same screen reachable from 3-5 different places (Dashboard: 5 entry points)
- No shared component primitives — buttons/cards built ad-hoc in every screen
- 883-line DashboardScreen, 829-line EpisodeSupportScreen (monoliths)
- Confetti after check-ins (emotional mismatch during distress)

**Research benchmark:**
- Calm: ~8 main screens
- Headspace: ~6 main screens
- PTSD Coach: 4 tabs, simple sub-screens
- NilaMind: 36+ screens ❌

---

## Redesign Principles (Research-Backed)

| # | Principle | Evidence |
|---|-----------|----------|
| 1 | **One primary action per screen** | Reduces decision fatigue during distress |
| 2 | **Progressive disclosure** | Show only what's needed at each step |
| 3 | **Predictability is therapeutic** | Stable IA reduces relearning on return visits |
| 4 | **Design for the worst-day user** | "Would this feel safe during acute stress?" |
| 5 | **Forgiveness over pressure** | No shame-based streaks; compassionate retention |
| 6 | **Ambient awareness > active attention** | Status indicators that inform without demanding focus |
| 7 | **Calm transitions** | 400-600ms with pronounced easing (Headspace standard) |

---

## New Information Architecture

### Tab Structure (4 tabs — unchanged count, radically simplified)

```
┌─────────────────────────────────────────────┐
│  Home          Chat          Tools       You │
│  ─────        ─────        ─────       ──── │
│  Calm,        AI           Fewer,      Profile│
│  focused      companion    clearer     & data│
└─────────────────────────────────────────────┘
```

### 1. HOME TAB (replaces Today) — "What do I need right now?"

**Philosophy:** One screen. One primary action. Calm, not cluttered.

```
┌──────────────────────────────┐
│  Good evening, Sujith        │  ← Time-aware greeting (existing)
│                              │
│  ┌────────────────────────┐  │
│  │  How are you feeling?  │  │  ← MOOD CHECK-IN (primary action)
│  │  😊  😐  😔  😠  🤯   │  │     5 taps max, <10 seconds
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  🌙 Wind Down          │  │  ← SINGLE recommended action
│  │  Your evening routine  │  │     Time-aware, personalized
│  │  [Start →]             │  │     (replaces hero + intent + nudge cascade)
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  Talk to Nila →        │  │  ← Quick access to chat
│  └────────────────────────┘  │
│                              │
│  ════════ 💜 ════════       │  ← Crisis always visible
└──────────────────────────────┘
```

**What's REMOVED from Today:**
- IntentFlowBar phase switcher (Calm/Data/Protocol) — too confusing
- 8+ TodayWidgets — move to You→Dashboard
- Nudge cascade (6+ nudge types) — integrate into context, not visual clutter
- DailyContentCard — move to You→Learn
- GuidedPrograms button — move to Tools
- Confetti celebration — emotional mismatch

**What's ADDED:**
- Single recommended action (time-aware, like Headspace's session suggestion)
- Cleaner mood card as primary CTA
- "Talk to Nila" quick link

### 2. CHAT TAB (replaces Nila) — "Your companion"

**Philosophy:** Clean chat interface. Quick tools accessible but not overwhelming.

```
┌──────────────────────────────┐
│  Nila                        │
│                              │
│  ┌────────────────────────┐  │
│  │  Chat messages...      │  │  ← Conversation (existing)
│  └────────────────────────┘  │
│                              │
│  ┌─ Quick Calm ──────────┐  │  ← REPLACES QuickActions grid (6+ buttons)
│  │  🌬 Breathe  🧊 Ground│  │     2 most-used tools only
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  [Message Nila...]     │  │  ← Input
│  └────────────────────────┘  │
│                              │
│  ════════ 💜 ════════       │
└──────────────────────────────┘
```

**What's REMOVED from Chat:**
- QuickActions grid (6-9 buttons) — reduces to 2 most-used
- Protocol/steps card inline — show only when active
- Nudge rail — integrate into chat responses
- Capture sheet overlays — open as full screens instead

**What's KEPT:**
- Full conversation interface
- Voice input/output
- Protocol progression (when active)

### 3. TOOLS TAB — "Your toolkit"

**Philosophy:** Fewer tools visible. Categories clear. No "show more" toggles.

```
┌──────────────────────────────┐
│  Tools                       │
│                              │
│  Calm                        │
│  ┌────────────────────────┐  │
│  │  🌬 Breathing          │  │  ← Merged: Grounding + Breathing + TIPP
│  │  🧊 Grounding          │  │     All calm tools in one place
│  │  🌙 Wind Down          │  │
│  │  🔊 Ambient Sounds     │  │
│  └────────────────────────┘  │
│                              │
│  Track                       │
│  ┌────────────────────────┐  │
│  │  📝 Journal            │  │  ← Merged: Journal + DBT Diary Card
│  │  💊 Medication         │  │     One journal with modes
│  │  📊 Check-in           │  │
│  │  📅 Social Rhythm      │  │
│  └────────────────────────┘  │
│                              │
│  Skills                      │
│  ┌────────────────────────┐  │
│  │  🧠 Problem Solving    │  │  ← All skills visible (no show more)
│  │  🎯 Values             │  │
│  │  📋 Assessment         │  │
│  │  🛡 Safety Plan        │  │
│  │  🔗 Chain Analysis     │  │
│  │  🪜 Exposure           │  │
│  │  🚨 Relapse Plan       │  │
│  └────────────────────────┘  │
│                              │
│  ════════ 💜 ════════       │
└──────────────────────────────┘
```

**Key changes:**
- Remove search bar (tools are visible, not hidden)
- Remove filter chips (categories are the filter)
- Remove "show more" toggle (all tools visible, organized by category)
- Merge breathing-related tools (Grounding + Breathing + TIPP → one group)
- Merge journaling (Journal + DBT Diary Card → one tool with modes)
- Reduce from 18+ tools to ~14 clearly categorized tools

### 4. YOU TAB — "Your space"

**Philosophy:** Profile, settings, data — organized simply.

```
┌──────────────────────────────┐
│  You                         │
│                              │
│  ┌────────────────────────┐  │
│  │  🔥 5-day streak       │  │  ← Minimal gamification (forgiving)
│  │  ● ● ● ● ● ○ ○       │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  📊 Dashboard      →   │  │  ← Consolidated analytics
│  │  💡 Insights       →   │  │  ← Pattern insights
│  │  🧠 Nila Memory    →   │  │  ← What Nila remembers
│  │  📚 Learn          →   │  │  ← Reading library
│  │  👥 Caregiver      →   │  │  ← Share settings
│  │  ⚙️ Settings       →   │  │
│  │  📤 Your Data      →   │  │
│  └────────────────────────┘  │
│                              │
│  ════════ 💜 ════════       │
└──────────────────────────────┘
```

**What's REMOVED from You:**
- Contextual suggestion strip — too clever, not always relevant
- Early-user nudge — progressive disclosure handles this
- Progress/Achievements section — move into Dashboard
- Episode Markers — move into Dashboard or Safety Plan

**What's CONSOLIDATED:**
- Dashboard (analytics) + Progress + Achievements → one Dashboard screen
- Insights stays but simplified
- Settings stays but decluttered

---

## Component System (New Shared Primitives)

### Problem
Every screen builds buttons and cards from raw Tailwind. No shared primitives.

### Solution: 5 shared components

#### 1. `<Button>` — replaces all ad-hoc buttons
```tsx
<Button variant="primary" size="lg" onPress={...}>
  Start Breathing
</Button>

// Variants: primary, secondary, ghost, danger, success
// Sizes: sm, md, lg
// Built-in: loading state, disabled state, icon support
```

#### 2. `<Card>` — already exists, enforce usage
```tsx
<Card variant="glass" accent="crisis">
  <Card.Header>Safety Plan</Card.Header>
  <Card.Body>...</Card.Body>
</Card>

// Stop building cards from raw Tailwind everywhere
```

#### 3. `<Section>` — page sections with consistent spacing
```tsx
<Section title="Calm" icon={<Wind />}>
  <ToolRow icon={<Wind />} label="Breathing" onPress={...} />
  <ToolRow icon={<Snowflake />} label="Grounding" onPress={...} />
</Section>

// Consistent: title, spacing, grouping
```

#### 4. `<ToolRow>` — navigation items in Tools/You tabs
```tsx
<ToolRow
  icon={<Wind />}
  label="Breathing"
  subtitle="Paced breathing exercises"
  onPress={() => go('breathing')}
/>

// Consistent: icon + label + subtitle + chevron
```

#### 5. `<EmptyState>` — already exists, enforce usage
```tsx
<EmptyState variant="no-data" cta={{ label: "Start", onPress: ... }} />

// Stop building inline empty states
```

---

## Visual Consistency Rules

### Border Radius
- **All cards:** `rounded-2xl` (16px) — no exceptions
- **All buttons:** `rounded-xl` (12px) — no exceptions
- **All inputs:** `rounded-xl` (12px) — no exceptions
- **All chips/tags:** `rounded-lg` (8px) — no exceptions

### Colors
- **Migrate ALL raw ramp classes to role tokens:**
  - `text-rose-400` → `text-danger`
  - `text-emerald-500` → `text-success`
  - `text-amber-500` → `text-warn`
  - `bg-rose-500/30` → `bg-danger/30`
- **Fix theme-safety:** Remove all `text-slate-950` on colored backgrounds → use `text-ink` or role tokens

### Spacing
- **Page level:** `space-y-5` everywhere (currently mixed: 4/5/6)
- **Section gaps:** `space-y-4`
- **Item gaps:** `space-y-2` or `space-y-3`
- **Page padding:** `px-4` consistent

### Typography
- **Section headers:** `text-xs font-bold text-ink-muted uppercase tracking-wider`
- **Card titles:** `text-sm font-semibold text-ink`
- **Body:** `text-base text-ink-2 leading-relaxed`
- **No text smaller than 12px** (accessibility)

---

## Screen Consolidation Map

| Current Screen | Action | New Location |
|---------------|--------|--------------|
| TodayScreen | **Simplify** | Home tab (mood + single action + crisis) |
| ModeScreen (Chat) | **Simplify** | Chat tab (clean chat + 2 quick tools) |
| ToolsScreen | **Reorganize** | Tools tab (categories, no search/show-more) |
| YouScreen | **Simplify** | You tab (streak + 7 links) |
| DashboardScreen | **Merge** | You→Dashboard (consolidate Progress/Achievements) |
| InsightsScreen | **Keep** | You→Insights |
| SettingsScreen | **Keep** | You→Settings |
| SafetyPlanScreen | **Keep** | Tools→Safety Plan |
| EpisodeSupportScreen | **Keep** | Crisis overlay (simplified) |
| BreathingScreen | **Keep** | Tools→Breathing |
| GroundingLibraryScreen | **Merge into Breathing** | Tools→Breathing (tabs: exercises / breathing) |
| TIPPTool | **Merge into Breathing** | Tools→Breathing (tab: TIPP) |
| JournalScreen | **Merge** | Tools→Journal (with DBT mode toggle) |
| DiaryCardScreen | **Merge into Journal** | Tools→Journal (DBT mode) |
| ThoughtRecordScreen | **Keep** | Tools→Journal (CBT mode) or Chat overlay |
| ProblemSolvingScreen | **Keep** | Tools→Problem Solving |
| ValuesToActionScreen | **Keep** | Tools→Values |
| AssessmentScreen | **Keep** | Tools→Assessment |
| SocialRhythmScreen | **Keep** | Tools→Social Rhythm |
| ExposureHierarchyScreen | **Keep** | Tools→Exposure |
| RelapsePlanScreen | **Keep** | Tools→Relapse Plan |
| ChainAnalysisScreen | **Keep** | Tools→Chain Analysis |
| MedicationAdherenceScreen | **Keep** | Tools→Medication |
| EmaCheckInScreen | **Keep** | Tools→Check-in |
| WindDownScreen | **Keep** | Tools→Wind Down |
| SoundPlayer | **Keep** | Tools→Ambient Sounds |
| ReachOutScreen | **Keep** | Crisis overlay or Tools→Reach Out |
| LearnScreen | **Keep** | You→Learn |
| NilaMemoryScreen | **Keep** | You→Nila Memory |
| YourDataScreen | **Keep** | You→Your Data |
| CaregiverShareScreen | **Keep** | You→Caregiver |
| CaregiverSettingsScreen | **Keep** | You→Caregiver→Settings |
| AboutNilaScreen | **Keep** | You→About Nila |
| LegalScreen | **Keep** | You→Settings→Legal |
| ProgressDashboard | **Merge into Dashboard** | You→Dashboard |
| GuidedProgramsScreen | **Move** | Tools (top section: "Programs") |
| EpisodeMarkerScreen | **Move** | You→Dashboard (episode section) |
| CrisisOverlay | **Simplify** | Crisis button → simplified crisis sheet |

---

## Animation & Microinteraction Changes

| Current | New | Reason |
|---------|-----|--------|
| Confetti on check-in | Remove | Emotional mismatch during distress |
| 250ms transitions | 400-600ms with ease-in-out | Headspace standard, calmer feel |
| Auto-playing sounds | User-initiated only | Consent-first, no surprise audio |
| Rapid nudge cascade | Single contextual nudge | Reduce overwhelm |

---

## Implementation Phases

### Phase 1: Component Primitives (Foundation)
- Create `<Button>` shared component
- Enforce `<Card>` usage (migrate inline cards)
- Create `<Section>` and `<ToolRow>` components
- Fix all `text-slate-950` theme-safety bugs
- Migrate raw ramp classes to role tokens
- Standardize border-radius to rounded-2xl/rounded-xl

### Phase 2: Tab Simplification
- Simplify Home tab (mood + single action + crisis)
- Simplify Chat tab (clean chat + 2 quick tools)
- Reorganize Tools tab (categories, no search/show-more)
- Simplify You tab (streak + 7 links)

### Phase 3: Screen Consolidation
- Merge Grounding + Breathing + TIPP into one tool
- Merge Journal + DBT Diary Card into one tool
- Merge Dashboard + Progress + Achievements
- Remove redundant entry points
- Remove dead code (values_work alias, EmptyCard, etc.)

### Phase 4: Polish
- Calm transitions (400-600ms)
- Remove confetti
- Fix remaining accessibility issues
- Test on emulator for visual consistency

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total navigable destinations | ~40+ | ~20 |
| Screen components | 36 | ~25 |
| Entry points to Dashboard | 5 | 1 |
| Buttons per screen (avg) | 6-9 | 2-4 |
| Tools visible by default | ~10 (8 hidden) | ~14 (0 hidden) |
| Lines of code (largest screen) | 883 | <400 |
| Confetti events | 1 | 0 |

---

## Guiding Question

> "Does this trend lower the cost of using the app when the user can least afford it?"

If the answer is no — don't adopt it.
