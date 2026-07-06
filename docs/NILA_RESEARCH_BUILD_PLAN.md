# NilaMind — Research-Validated Build Plan (2026-07-06)

> Every feature traces to evidence. Every implementation step is TDD-ready. No vibes.

---

## Feature 1: Emotion Granularity Coaching

### Research basis

| Citation | Finding |
|----------|---------|
| Barrett 2004, *Psychol Sci* | Emotion granularity predicts better regulation. Distinguishing "disappointed" from "sad" = better coping. |
| Lieberman 2007, *Psychol Sci* | Affect labeling (putting feelings into words) reduces amygdala activation. |
| Kashdan 2015, *J Pers Assess* | Emotion differentiation is a transdiagnostic resilience factor. |
| How We Feel app | 144-emotion wheel; progressive disclosure (coarse → specific). |

### What it does

When the user says "I feel bad" or selects "Low" in a check-in, Nila helps find the precise word — "is it more *disappointed*, *numb*, or *drained*?" — then stores it. Over time, builds emotional vocabulary and finer trend tracking.

### Files

```
new:  src/data/emotions.ts              — curated taxonomy (72 words, 6 families)
new:  src/services/emotionGranularity.ts — pure ranking engine + conversational prompt builder
new:  src/services/emotionGranularity.test.ts
mod:  src/components/NilaCheckIn.tsx     — add step 4 (granular pick)
mod:  src/services/nilaContext.ts        — include granular emotions in personal context
mod:  src/services/nilaCards.ts          — conversational granularity card for chat
```

### Implementation sequence

**Step 1** — `src/data/emotions.ts`: 6 emotion families × 12 words each = 72 fine-grained emotions. Each family has a base label mapped from PRIMARY_EMOTIONS, a word list, and an intensity range. Export `familyForBroad(label)` for deterministic routing.

**Step 2** — `src/services/emotionGranularity.ts`: `suggestGranularEmotions(broadLabel, context?)` returns top 3 granular words. Pure — uses keyword overlap on context, no model. `granularityPrompt(suggestions)` builds a conversational picker prompt. Tests: verify 3 suggestions per known label, empty on unknown, context boosts correct word.

**Step 3** — Wire into `NilaCheckIn.tsx`: After existing steps (mood → intensity → context), add step 4 showing 3 granular chip options. On tap, store `granularEmotion` in CheckInEntry before calling `appendCheckin`.

**Step 4** — Feed into `nilaContext.ts` `buildPersonalContext()`: read granular emotions from recent check-ins. Nila's context gets richer: "Their recent words included: frustrated, restless — not just 'Low'."

**Step 5** — Conversational variant: In `AiCoachScreen`, `cardsForReply` surfaces a granularity card when the user's message contains vague emotion language ("I feel bad", "just feeling off").

---

## Feature 2: Weekly "What I Noticed" Synthesis

### Research basis

| Citation | Finding |
|----------|---------|
| Lambert 2018, *Psychotherapy* | Progress feedback improves outcomes, especially for deteriorating patients. |
| Shimokawa 2010, *JCCP* | Weekly progress monitoring + feedback → d = 0.40 over TAU. |
| Fluckiger 2018 | Alliance deepens when a companion *notices change* over time. |

### What it does

Once a week, Nila synthesizes the last 7 days into a warm reflection: "You checked in 4 times, used grounding twice, and Thursday felt gentler. Your sleep improved too." Delivered as a Nila card.

### Files

```
new:  src/services/weeklySynthesis.ts      — deterministic extraction + model narration prompt
new:  src/services/weeklySynthesis.test.ts
mod:  src/services/nilaCards.ts            — add weeklySynthesisCard()
mod:  src/services/nilaOrchestration.ts    — surface after 7-day gap
```

### Implementation sequence

**Step 1** — `src/services/weeklySynthesis.ts`: `extractWeeklyFacts()` reads LAST 7 DAYS of structured data only (check-in counts, top emotions, avg intensity, skills used, streak, active protocol, sleep firing). NEVER reads free-text fields (privacy invariant). Returns a `WeeklyFacts` struct. `weeklySynthesisPrompt(facts)` builds a prompt for the model to narrate in Nila's voice.

**Step 2** — Tests: verify zero-state (no data = zeroes), recent-only filtering, free-text exclusion, prompt generation.

**Step 3** — `weeklySynthesisCard()` in `nilaCards.ts`: returns `NilaCard` kind `weekly_synthesis`. Tapping triggers `generateOnDevice(weeklySynthesisPrompt(facts))` → model narrates → output passes §9 gate → renders as Nila message.

**Step 4** — `nilaOrchestration.ts` `cardsForCheckin()`: adds the weekly card on first check-in after 7+ days since last synthesis. Stored timestamp in `nilamind_weekly_synthesis` key.

---

## Feature 3: Async "Between-Sessions" Brain

### Research basis

| Citation | Finding |
|----------|---------|
| Fluckiger 2018 | Working alliance = #1 predictor. Being *held in mind* matters. |
| Huppert 2001, *BMJ* | Therapists who review between sessions do better. |
| Wampold 2015, *World Psychiatry* | Common factors (alliance, empathy) = ~70% of therapy outcome variance. |

### What it does

At idle/overnight, Nila re-reads the day's conversation, check-ins, and diary — extracts what mattered, notices a pattern, updates memory, and has a tailored morning reflection ready. Makes Nila a *continuous presence*.

### Files

```
new:  src/services/asyncReflection.ts      — overnight reflection job
new:  src/services/asyncReflection.test.ts
mod:  src/services/nila.ts                 — seed nilaWelcome() with last reflection
mod:  src/services/nilaMemory.ts           — accept async-generated insights
mod:  src/services/nilaContext.ts          — include "what Nila noticed yesterday"
mod:  src/main.tsx                          — trigger on idle/overnight timer
```

### Implementation sequence

**Step 1** — `src/services/asyncReflection.ts`: `runAsyncReflection()` — gates on §9 pre-scan (crisis = skip entirely), loads session chat user turns, checks idempotency (once per day), calls model with structured prompt ("REFLECTION: <text> / INSIGHT: <text or none>"), parses output, stores to `nilamind_async_reflection` key. Skips when no user turns or model not ready.

**Step 2** — Trigger: `main.tsx` schedules via `setTimeout` targeting 2am-6am window. Also runs if app is idle for 5+ minutes. Uses `requestIdleCallback` where available.

**Step 3** — `nilaWelcome()` in `nila.ts`: reads `nilamind_async_reflection` — if fresh (today), returns the warm reflection text; otherwise returns the default greeting.

**Step 4** — Insight persistence: extracted insight → `addMemoryNote(insight, "overnight-reflection")` → enters compounding memory → feeds into `buildPersonalContext()`.

**Step 5** — Tests: verify crisis skip, idempotency, empty-turn skip, output parsing, insight storage. Mock model output for full pipeline test.

---

## Feature 4: Smart Context-Aware Check-ins

### Research basis

| Citation | Finding |
|----------|---------|
| von Lutzow 2025 | Adaptive interventions: g=0.15 vs active controls. Generic push = worse than nothing. |
| Nahum-Shani 2018 | JITAI framework: decision rules + tailoring variables. |
| Wen 2017, *JMIR* | >=80% EMA response with light, well-timed prompts. |

### What it does

User arms a check-in: "check on me tonight." Nila remembers *what* was talked about and asks a context-specific question at trigger time — "How did that conversation with your manager go?" instead of "How are you?"

### Files

```
new:  src/services/armedCheckin.ts         — arm + fire context-aware check-in
new:  src/services/armedCheckin.test.ts
mod:  src/services/notifications.ts        — integrate armed check-in scheduling
mod:  src/components/AiCoachScreen.tsx     — surface on notification tap
mod:  src/services/agent.ts               — handle "check on me tonight" intent
```

### Implementation sequence

**Step 1** — `src/services/armedCheckin.ts`: `armCheckin(userMessage)` parses time ("tonight" → 8pm, "morning" → 8am), captures context from last user message, stores encrypted. `getArmedCheckin()` returns active check-in or null. `armedCheckinBody()` builds dataless notification. `armedCheckinPrompt()` builds in-app prompt with remembered context.

**Step 2** — `notifications.ts`: `syncArmedCheckin()` schedules one-time notification at trigger time using existing `scheduleReminderAt`. Fires `markCheckinFired()` on success.

**Step 3** — `AiCoachScreen.tsx`: On mount, check `getArmedCheckin()` — if active and within window, inject `armedCheckinPrompt()` as Nila's opening message.

**Step 4** — `agent.ts` intent: match "check on me / ping me / remind me to check in" → `armCheckin()` → spoken confirmation with time.

---

## Feature 5: Vent → Auto-Drafted Thought Record

### Research basis

| Citation | Finding |
|----------|---------|
| Beck 2021, *Cognitive Therapy of Depression* | Thought records are the most-evidenced CBT technique. |
| McManus 2012, *Cog Ther Res* | Self-guided thought records are effective when structured. |
| Kazantzis 2018 | Homework compliance is the weak link — auto-drafting removes blank-page barrier. |

### What it does

User vents → Nila detects distress pattern → offers "Want to work through this as a thought record?" → drafts Situation / Automatic Thought / Emotion / Evidence For / Against from their words → user edits and saves.

### Files

```
new:  src/services/thoughtRecordDraft.ts     — model-prompted structuring + parseDraft()
new:  src/services/thoughtRecordDraft.test.ts
new:  src/components/ThoughtRecordEditCard.tsx — inline editing UI
mod:  src/services/nilaCards.ts              — thoughtRecordDraftCard()
```

### Implementation sequence

**Step 1** — `src/services/thoughtRecordDraft.ts`: `draftThoughtRecord(ventText)` sends structured prompt to on-device model → parses output into `ThoughtRecordDraft` struct via `parseDraft()` (field-by-field regex extraction with graceful fallback). §9 output gate runs on model reply. `saveThoughtRecord(record)` appends to `nilamind_thought_records` via `appendToSecureArray`.

**Step 2** — Tests: verify field extraction from valid model output, graceful handling of partial/malformed output, §9 gate on model reply.

**Step 3** — `ThoughtRecordEditCard.tsx`: inline editable form showing all 5 fields. User can edit any field before saving. Tap "Save" → `saveThoughtRecord()` → confirmation.

**Step 4** — `thoughtRecordDraftCard(userText)` in `nilaCards.ts`: returns a card when message is >=40 chars + contains emotional distress language. Tapping triggers `draftThoughtRecord()` → shows edit card.

---

## Feature 6: CBT Distortion Spotting

### Research basis

| Citation | Finding |
|----------|---------|
| Beck 1979, *Cognitive Therapy of Depression* | 10 cognitive distortions are the core CBT target. |
| Burns 1999, *Feeling Good* | Naming the distortion is the first step in cognitive restructuring. |
| Persons 1993, *Cog Ther Pract* | Distortion spotting + thought recording = most replicated CBT intervention. |

### What it does

When the user says "I messed up one thing, I ruin everything" → Nila gently identifies "that sounds like *all-or-nothing thinking* — want to check the facts together?" Deterministic pattern detection with model narration.

### Files

```
new:  src/services/distortionSpotter.ts      — deterministic pattern matcher (10 types)
new:  src/services/distortionSpotter.test.ts — tests with paired benign controls
mod:  src/services/nilaCards.ts              — distortion card when spots fire
mod:  src/components/AiCoachScreen.tsx       — inject distortion steer into system prompt
```

### Implementation sequence

**Step 1** — `src/services/distortionSpotter.ts`: 10 distortion types (all-or-nothing, catastrophizing, mind-reading, overgeneralization, personalization, emotional reasoning, should-statements, labeling, mental filter, disqualifying-positive). Each has regex patterns + a Nila-friendly gentle question. `spotDistortions(text)` returns matches. `distortionSteer(matches)` builds a system-prompt addendum: "GENTLE NOTICE — you spotted [X] pattern. Gently ask..."

**Step 2** — Tests: detect all 10 types from known phrases. PAIRED BENIGN CONTROLS for each: verify factual statements, compliments, or literal descriptions do NOT fire. The `should_statement` pattern fires on positive "should" too (acceptable — steer is gentle, user can ignore). Test `distortionSteer` output format.

**Step 3** — Wire into `AiCoachScreen.tsx`: Before each model call, run `spotDistortions(lastUserMsg)`. If matches found, inject `distortionSteer(matches)` into the system prompt. Model responds with the distortion-aware steer. Deterministic detection → model only narrates.

**Step 4** — `distortionCard(matches)` in `nilaCards.ts`: optionally surfaces a card listing detected distortions with a "Work through this" option that opens the thought record flow (#5).

---

## Build Order (Evidence-Sequenced)

```
1. Emotion granularity        ← smallest, highest bang/buck (~4 new files, 2 mods)
2. Weekly synthesis           ← builds on existing dashboard + inflection (~3 new files, 2 mods)
3. Async between-sessions     ← the flagship, leverages slow model (~3 new files, 4 mods)
4. Smart check-ins            ← depends on #3 for context (~2 new files, 3 mods)
5. Thought record drafts      ← depends on structure scaffolding (~3 new files, 1 mod)
6. Distortion spotting        ← independent detection + narrates through model (~2 new files, 2 mods)
```

## Test Strategy

Every feature follows the existing TDD standard:
- **RED**: Write failing test for the pure function / deterministic logic first
- **GREEN**: Minimal implementation
- **REFACTOR**: Clean up
- **INTEGRATION**: Wire into UI, device-verify on phone
- **§9 GATE**: Any model output path must verify `applyOutputSafety` is called
- **BENIGN CONTROLS**: Every safety keyword/pattern list gets paired benign phrases that must NOT trigger

## Non-Negotiables (from the vision doc)

- Model proposes; deterministic systems dispose. Safety and facts never leave the rails.
- Data reads structured fields only — never free-text in background jobs (privacy invariant).
- Model output passes §9 output gate on every path.
- User-armed pull, never autonomous push. All check-ins are opt-in.
- Research-grounded. Every therapeutic claim traces to a citation.
