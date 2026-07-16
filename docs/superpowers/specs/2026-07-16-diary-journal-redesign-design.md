# Journal redesign — standalone timeline journal, DBT card relocated to Tools

Status: approved by user 2026-07-16, ready for implementation planning.

## Context

v1.18.4 shipped a first pass at "diary journaling" (mode chips, on-device daily prompt, opt-in
reminder) bolted directly onto the existing `DiaryCardScreen` (the DBT diary card: emotion
sliders, skills checklist, one entry per date). User feedback: wrong on all three counts —
visual design, feature set, and being squeezed into the DBT card rather than its own experience.
This spec replaces that approach. The `diaryReminderPrefs.ts` / `syncDiaryReminder` /
`journalPrompt.ts` services shipped in v1.18.4 are reused as-is; only the DiaryCardScreen
integration and UI are being redone.

## Goals

- A standalone **Journal**: its own screen, own data model, own storage — genuinely separate
  from the DBT diary card, not a few widgets added to it.
- Multiple entries per day, in a scrollable timeline feed.
- Keep the DBT diary card fully intact and useful — just relocated, not degraded.
- Reuse existing app infrastructure (mood data model, on-device prompt generation, reminder
  scheduling, §9 crisis gate) rather than inventing parallel systems.

## Non-goals

- No change to the DBT diary card's own data/logic — it moves screens, nothing else.
- No per-entry lock/encryption beyond the existing app-wide `secureLocal` encryption.
- No cloud sync/export beyond the app's existing `exportReport.ts` (Journal entries get included
  there in the same collect-and-export pass as any other structured personal data).

## Navigation change

- `TabView`/`TAB_TARGETS` in `src/services/nav.ts` are **unchanged** — the `"diary"` tab still
  exists, but the component App.tsx renders for it changes from `DiaryCardScreen` to the new
  `JournalScreen`.
- The DBT diary card gets a new `AuxView` id, `"dbt_diary_card"`, added to `KNOWN_AUX_VIEWS`,
  opened from a new tool card in `ModeScreen.tsx` (the Tools tab) — the same
  overlay-stack pattern already used for `"thought_record"` (`ThoughtRecordScreen`). `DiaryCardScreen.tsx` itself is **not modified** — it's rendered from a new call site, nothing in the
  component's internals changes.

## Data model

New type in `src/types.ts`:

```ts
export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD, for date-header grouping
  timestamp: string; // ISO, for feed ordering + time-of-day display
  mode: "free" | "gratitude";
  text: string;
  valence?: number; // -3..+3, reuses EmaEntry's scale — omitted if the user skipped the mood tap
  energy?: number; // 1-4, reuses EmaEntry's scale
  tags?: string[];
}
```

New service `src/services/journal.ts` (parallel to `relapsePlan.ts`'s load/save shape):

```ts
export function loadJournalEntries(): JournalEntry[]        // newest-first
export function saveJournalEntry(entry: JournalEntry): void  // append (or replace by id, for edits)
export function deleteJournalEntry(id: string): void
```

Storage: one JSON array under a new `secureLocal` key `"nilamind_journal"`, added to
`SENSITIVE_KEYS` in `secureLocal.ts` (encrypted, same as `"nilamind_diary"`). This is a
**different key from `"nilamind_diary"`** — the DBT card's existing date-keyed record is
untouched; Journal entries are wholly separate data.

Mood: rather than a new taxonomy, `valence`/`energy` reuse the exact fields/scale
`EmaEntry` already uses (`types.ts`), and a save also appends a lightweight point to
`moodHistory.ts` (the same store EMA check-ins already feed) tagged with source `"journal"`, so
Journal mood data shows up in the app's existing mood-trend views instead of living in a silo.
This mirrors the "reuse, don't reinvent" decision made during brainstorming.

## Components

### `JournalScreen.tsx` (new, renders on the "diary" tab)

- **Composer** (always visible, top of screen): mode chips (Free write / Gratitude — reusing the
  exact chip pattern already built in v1.18.4, just moved here), the daily reflective prompt
  banner (`getDailyPrompt` from `journalPrompt.ts`, unchanged), a valence/energy quick-tap widget
  (new, thin wrapper reusing `EmaEntry`'s visual language from `EmaCheckIn.tsx` if reusable
  components exist there, else a small bespoke widget matching its scale), a textarea, and a Save
  button. On save: §9-scan the text (`detectCrisis`, same fail-closed pattern as
  `DiaryCardScreen`/`analyzeQuickNote`) BEFORE writing to storage. A crisis hit renders
  `<CrisisCard>` in place of the composer and the entry is **not** saved — the user's draft stays
  in the (unsaved) textarea so they don't lose their words, but nothing is written to
  `nilamind_journal` until they either edit past the crisis trigger or dismiss and save non-crisis
  text. This matches `DiaryCardScreen`'s existing rule that a crisis hit blocks the on-device
  model call; here it additionally blocks the storage write, since a standalone journal has no
  separate "quick note" field to fall back on.
- **Feed** (below composer): entries from `loadJournalEntries()`, grouped by `date` under
  "TODAY"/"YESTERDAY"/`<formatted date>` headers, each row = time + mood glyph (derived from
  valence) + first-line snippet (compact list layout, per brainstorm decision). Tap a row to
  expand inline (show full text + tags + delete action) — no navigation to a separate screen.
- **Settings affordance**: the existing reminder toggle+time control (already built —
  `getDiaryReminderPrefs`/`setDiaryReminderPrefs`/`syncDiaryReminder`/`clearDiaryReminder` from
  v1.18.4) moves here as a small row, likely collapsed behind a settings icon rather than always
  visible inline (open question for implementation — default to always-visible-but-compact,
  matching the shipped v1.18.4 treatment, unless it visually competes with the composer).

### `ModeScreen.tsx` (Tools tab) — new tool card

- Add a tool card ("Diary Card" or similar label) that opens `"dbt_diary_card"` via the same aux
  overlay mechanism `openThoughtRecord`/`"thought_record"` already uses. `DiaryCardScreen` renders
  unmodified inside that overlay.

## Error handling

- Same invariants as the rest of the app: `JSON.parse` failures on `nilamind_journal` never log
  the raw error (could echo decrypted content); corrupt/missing storage degrades to an empty
  feed, never a crash.
- `getDailyPrompt`/on-device generation failure already degrades to the static prompt bank
  (existing, unchanged).
- A save while the on-device crisis classifier is mid-load reuses `detectCrisis`'s existing
  fail-closed behavior (keyword floor still applies even before the semantic classifier is ready).

## Testing

- `journal.ts` — unit tests for load/save/delete, date-grouping ordering, malformed-storage
  recovery (mirrors `relapsePlan.test.ts` conventions).
- `JournalScreen.test.tsx` — composer save flow (incl. crisis-gated save), feed rendering/grouping,
  mood-tap wiring into `moodHistory.ts`, reminder control (reusing existing
  `diaryReminderPrefs`/`notifications` mocks from the v1.18.4 test suite).
- `ModeScreen.test.tsx` (or wherever its tests live) — new tool card opens the `dbt_diary_card` aux
  view and renders `DiaryCardScreen` unmodified.
- `nav.test.ts` — `"dbt_diary_card"` resolves as a known aux view.
- Full existing suite must stay green — this must not regress `DiaryCardScreen`'s own tests,
  since that component is being relocated, not rewritten.

## Open questions (left for implementation-time judgment, not blocking)

- Exact placement/collapse behavior of the reminder control within `JournalScreen`.
- Whether the mood valence/energy widget is extracted as a shared component (reused by both
  `EmaCheckIn.tsx` and `JournalScreen.tsx`) or duplicated minimally — prefer extraction if
  `EmaCheckIn.tsx`'s widget is already isolated enough to reuse cheaply, else keep scope tight and
  duplicate a small piece rather than risk destabilizing EMA.
