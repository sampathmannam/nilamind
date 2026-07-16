# Journal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1.18.4 diary-additions-bolted-onto-DiaryCardScreen with a standalone, multi-entry `JournalScreen` (compact timeline feed, always-open composer), relocate the existing DBT diary card to its own entry point, and wire it into the existing Tools hub / nav system with zero regressions.

**Architecture:** New `JournalEntry` type + `journal.ts` service (load/save/delete, encrypted via `secureLocal`) feeding a new `JournalScreen.tsx` (composer at top, compact-list feed below). `DiaryCardScreen.tsx` is untouched — it just gets a new nav entry point (`"dbt_diary_card"` aux view) instead of sharing `"diary"` with the new screen. Mood capture reuses the existing `saveEmaEntry`/`EmaEntry` store (not a new taxonomy) so Journal mood data flows into the app's existing mood-trend views for free.

**Tech Stack:** React + TypeScript, Vitest (+ `@testing-library/react`, jsdom for component tests), existing `secureLocal` encrypted storage, existing `detectCrisis`/`CrisisCard` §9 gate, existing `journalPrompt.ts`/`diaryReminderPrefs.ts`/`notifications.ts` (all shipped in v1.18.4, reused unchanged).

## Global Constraints

- Never log a caught parse error's raw object for any key holding user free text — decrypted content could leak to logcat (existing repo-wide rule; see `DiaryCardScreen.tsx`'s load handler for the pattern to copy).
- Every free-text field a user can write into a diary/journal entry must be §9-scanned (`detectCrisis`) before it is persisted or sent to the on-device model. A crisis hit renders `<CrisisCard>` and blocks the save.
- New sensitive storage keys MUST be added to `SENSITIVE_KEYS` in `src/services/secureLocal.ts` or they are stored unencrypted.
- Follow existing file conventions exactly: services are plain functions over `secureLocal`/`storageUtils`, component tests use `// @vitest-environment jsdom` + `@testing-library/react`, service tests default to the `node` environment.
- Do not modify `DiaryCardScreen.tsx`'s internals — it is being relocated to a new nav entry point, not rewritten.
- Keep this "clutter free": no per-entry lock, no export-report integration, no new mood taxonomy — reuse `EmaEntry`'s valence/energy fields via `saveEmaEntry` exactly as they exist today.

---

### Task 1: `JournalEntry` type

**Files:**
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `JournalEntry` interface, consumed by Task 2 (`journal.ts`) and Task 5 (`JournalScreen.tsx`).

- [ ] **Step 1: Add the type**

Append to `src/types.ts`:

```ts
export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD, for date-header grouping
  timestamp: string; // ISO, for feed ordering + time-of-day display
  mode: "free" | "gratitude";
  text: string;
  valence?: number; // -3..+3, same scale as EmaEntry — omitted if the user skipped the mood tap
  energy?: number; // 1-4, same scale as EmaEntry
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: no errors (this is a pure additive type, nothing consumes it yet).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(journal): add JournalEntry type"
```

---

### Task 2: `journal.ts` service (load/save/delete)

**Files:**
- Create: `src/services/journal.ts`
- Create: `src/services/journal.test.ts`
- Modify: `src/services/secureLocal.ts:30-35` (add `"nilamind_journal"` to `SENSITIVE_KEYS`)

**Interfaces:**
- Consumes: `secureLocal.getItem`/`setItem` (`src/services/secureLocal.ts`), `JournalEntry` (Task 1).
- Produces: `loadJournalEntries(): JournalEntry[]` (newest-first), `saveJournalEntry(entry: JournalEntry): void` (prepends new / replaces by matching `id`), `deleteJournalEntry(id: string): void`, `groupByDate(entries: JournalEntry[]): { date: string; entries: JournalEntry[] }[]` (newest-date-first, preserves each date's own entry order) — consumed by Task 5 (`JournalScreen.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `src/services/journal.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { loadJournalEntries, saveJournalEntry, deleteJournalEntry, groupByDate } from "./journal";
import type { JournalEntry } from "../types";

beforeEach(() => store.clear());

const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: over.id ?? "id_1",
  date: over.date ?? "2026-07-16",
  timestamp: over.timestamp ?? "2026-07-16T20:00:00.000Z",
  mode: over.mode ?? "free",
  text: over.text ?? "hello",
  ...over,
});

describe("journal service", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(loadJournalEntries()).toEqual([]);
  });

  it("saves and loads an entry", () => {
    saveJournalEntry(entry());
    expect(loadJournalEntries()).toEqual([entry()]);
  });

  it("prepends new entries so load returns newest-first", () => {
    saveJournalEntry(entry({ id: "id_1", timestamp: "2026-07-16T08:00:00.000Z" }));
    saveJournalEntry(entry({ id: "id_2", timestamp: "2026-07-16T20:00:00.000Z" }));
    expect(loadJournalEntries().map((e) => e.id)).toEqual(["id_2", "id_1"]);
  });

  it("saving an entry with an existing id replaces it in place rather than duplicating", () => {
    saveJournalEntry(entry({ id: "id_1", text: "first draft" }));
    saveJournalEntry(entry({ id: "id_1", text: "edited" }));
    const all = loadJournalEntries();
    expect(all.length).toBe(1);
    expect(all[0].text).toBe("edited");
  });

  it("deletes an entry by id", () => {
    saveJournalEntry(entry({ id: "id_1" }));
    saveJournalEntry(entry({ id: "id_2" }));
    deleteJournalEntry("id_1");
    expect(loadJournalEntries().map((e) => e.id)).toEqual(["id_2"]);
  });

  it("recovers to an empty array on corrupted storage rather than throwing", () => {
    store.set("nilamind_journal", "{not valid json");
    expect(loadJournalEntries()).toEqual([]);
  });

  it("groupByDate groups newest-date-first, preserving each date's own order", () => {
    const groups = groupByDate([
      entry({ id: "a", date: "2026-07-16", timestamp: "2026-07-16T20:00:00.000Z" }),
      entry({ id: "b", date: "2026-07-16", timestamp: "2026-07-16T09:00:00.000Z" }),
      entry({ id: "c", date: "2026-07-15", timestamp: "2026-07-15T10:00:00.000Z" }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-07-16", "2026-07-15"]);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/journal.test.ts`
Expected: FAIL — `Cannot find module './journal'`

- [ ] **Step 3: Add the sensitive key**

In `src/services/secureLocal.ts`, find the `SENSITIVE_KEYS` array (around line 30-35, contains `"nilamind_diary"`) and add `"nilamind_journal"` alongside it, e.g.:

```ts
export const SENSITIVE_KEYS = [
  // ...existing entries...
  "nilamind_diary",
  "nilamind_journal",
  // ...
];
```

(Match the exact array formatting already in the file — just add the one new string.)

- [ ] **Step 4: Write the implementation**

Create `src/services/journal.ts`:

```ts
import { secureLocal } from "./secureLocal";
import type { JournalEntry } from "../types";

const KEY = "nilamind_journal";

/** All entries, newest-first by timestamp. Never throws — corrupted storage degrades to []. */
export function loadJournalEntries(): JournalEntry[] {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as JournalEntry[]).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  } catch {
    // Static message only — never log the raw error: it can echo a snippet of decrypted
    // journal content to logcat (same rule DiaryCardScreen's load handler follows).
    console.error("Failed to parse stored journal entries");
    return [];
  }
}

/** Save (or replace, matching by id) a single entry. */
export function saveJournalEntry(entry: JournalEntry): void {
  const all = loadJournalEntries().filter((e) => e.id !== entry.id);
  all.push(entry);
  secureLocal.setItem(KEY, JSON.stringify(all));
}

export function deleteJournalEntry(id: string): void {
  const all = loadJournalEntries().filter((e) => e.id !== id);
  secureLocal.setItem(KEY, JSON.stringify(all));
}

/** Newest-date-first groups for the feed, each date's own entries kept newest-first. */
export function groupByDate(entries: JournalEntry[]): { date: string; entries: JournalEntry[] }[] {
  const byDate = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, es]) => ({ date, entries: [...es].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)) }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/services/journal.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add src/services/journal.ts src/services/journal.test.ts src/services/secureLocal.ts
git commit -m "feat(journal): add journal.ts load/save/delete/group service"
```

---

### Task 3: `"dbt_diary_card"` nav aux view

**Files:**
- Modify: `src/services/nav.ts` (add to `AuxView` union and `KNOWN_AUX_VIEWS`)
- Modify: `src/services/nav.test.ts`

**Interfaces:**
- Produces: `"dbt_diary_card"` as a valid `AuxView`, consumed by Task 6 (`App.tsx`) and Task 7 (`toolsRows.ts`).

- [ ] **Step 1: Write the failing test**

Add to `src/services/nav.test.ts` (find the existing `describe`/`it` blocks that assert known aux views resolve — add alongside them):

```ts
it("resolves dbt_diary_card as a known aux view (the relocated DBT diary card)", () => {
  expect(resolveNavTarget("dbt_diary_card")).toEqual({ kind: "aux", view: "dbt_diary_card" });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/services/nav.test.ts`
Expected: FAIL — resolves as `{ kind: "unknown", target: "dbt_diary_card" }`

- [ ] **Step 3: Implement**

In `src/services/nav.ts`:
- Add `"dbt_diary_card"` to the `AuxView` union type (anywhere in the list, e.g. right after `"diary"`).
- Add `"dbt_diary_card"` to the `KNOWN_AUX_VIEWS` array (right after `"diary"`).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/services/nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/nav.ts src/services/nav.test.ts
git commit -m "feat(journal): add dbt_diary_card nav aux view for the relocated DBT card"
```

---

### Task 4: `JournalScreen.tsx` component

**Files:**
- Create: `src/components/JournalScreen.tsx`
- Create: `src/components/JournalScreen.test.tsx`

**Interfaces:**
- Consumes: `loadJournalEntries`/`saveJournalEntry`/`deleteJournalEntry`/`groupByDate` (Task 2), `detectCrisis` (`src/services/crisisClassifier.ts`), `CrisisCard` (`src/components/CrisisCard.tsx`), `getDailyPrompt`/`JournalMode` (`src/services/journalPrompt.ts`, shipped v1.18.4, unchanged), `getDiaryReminderPrefs`/`setDiaryReminderPrefs` (`src/services/diaryReminderPrefs.ts`, unchanged), `syncDiaryReminder`/`clearDiaryReminder` (`src/services/notifications.ts`, unchanged), `saveEmaEntry`/`emaDateKey` (`src/services/ema.ts`), `generateTinyId` (`src/services/idGen.ts`), `hapticMedium` (`src/hooks/useHaptics.ts`).
- Produces: default export `JournalScreen` — a screen component with no required props, consumed by Task 6 (`App.tsx`'s `renderAuxView`).

- [ ] **Step 1: Write the failing tests**

Create `src/components/JournalScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));
vi.mock("../hooks/useHaptics", () => ({ hapticMedium: vi.fn() }));
vi.mock("../services/journalPrompt", () => ({
  getDailyPrompt: vi.fn(async (mode: string) => `PROMPT:${mode}`),
}));
const reminderStore = new Map<string, string>();
vi.mock("../services/diaryReminderPrefs", () => ({
  getDiaryReminderPrefs: () => {
    const raw = reminderStore.get("prefs");
    return raw ? JSON.parse(raw) : { enabled: false, time: "20:00" };
  },
  setDiaryReminderPrefs: (p: Record<string, unknown>) => {
    const raw = reminderStore.get("prefs");
    const cur = raw ? JSON.parse(raw) : { enabled: false, time: "20:00" };
    reminderStore.set("prefs", JSON.stringify({ ...cur, ...p }));
  },
}));
vi.mock("../services/notifications", () => ({
  syncDiaryReminder: vi.fn(async () => ({ scheduled: true })),
  clearDiaryReminder: vi.fn(async () => {}),
}));
let crisisResult = false;
vi.mock("../services/crisisClassifier", () => ({
  detectCrisis: vi.fn(async () => crisisResult),
}));
const saveEmaEntry = vi.fn();
vi.mock("../services/ema", () => ({
  saveEmaEntry: (e: unknown) => saveEmaEntry(e),
  emaDateKey: () => "2026-07-16",
}));

import JournalScreen from "./JournalScreen";

afterEach(cleanup);
beforeEach(() => { store.clear(); reminderStore.clear(); crisisResult = false; saveEmaEntry.mockClear(); });

describe("JournalScreen", () => {
  it("renders an empty feed with no entries", () => {
    render(<JournalScreen />);
    expect(screen.getByLabelText("Journal entry text")).toBeTruthy();
    expect(screen.queryByText(/TODAY/)).toBeNull();
  });

  it("saving a free-write entry adds it to the feed under TODAY", async () => {
    render(<JournalScreen />);
    fireEvent.change(screen.getByLabelText("Journal entry text"), { target: { value: "felt good today" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(await screen.findByText(/felt good today/)).toBeTruthy();
    expect(screen.getByText("TODAY")).toBeTruthy();
  });

  it("clears the composer after a successful save", async () => {
    render(<JournalScreen />);
    const textarea = screen.getByLabelText("Journal entry text") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "an entry" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    await screen.findByText(/an entry/);
    expect(textarea.value).toBe("");
  });

  it("does not save an empty entry", () => {
    render(<JournalScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(screen.queryByText("TODAY")).toBeNull();
  });

  it("switching to Gratitude mode changes the placeholder", async () => {
    render(<JournalScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Gratitude" }));
    await screen.findByText(/PROMPT:gratitude/);
    expect(screen.getByLabelText("Journal entry text").getAttribute("placeholder")).toMatch(/coffee/i);
  });

  it("a crisis-flagged entry is NOT saved and shows the crisis card instead", async () => {
    crisisResult = true;
    render(<JournalScreen />);
    fireEvent.change(screen.getByLabelText("Journal entry text"), { target: { value: "distressing text" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(await screen.findByText(/matters more than this note/i)).toBeTruthy();
    expect(screen.queryByText(/distressing text/)).toBeNull();
  });

  it("tapping a mood option calls saveEmaEntry with the chosen valence", async () => {
    render(<JournalScreen />);
    fireEvent.change(screen.getByLabelText("Journal entry text"), { target: { value: "good day" } });
    fireEvent.click(screen.getByLabelText("Mood: Good"));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    await screen.findByText(/good day/);
    expect(saveEmaEntry).toHaveBeenCalledWith(expect.objectContaining({ valence: 1, trigger: "user_initiated" }));
  });

  it("deleting an entry removes it from the feed", async () => {
    render(<JournalScreen />);
    fireEvent.change(screen.getByLabelText("Journal entry text"), { target: { value: "to be deleted" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    await screen.findByText(/to be deleted/);
    fireEvent.click(screen.getByText(/to be deleted/)); // expand row
    fireEvent.click(screen.getByRole("button", { name: "Delete entry" }));
    expect(screen.queryByText(/to be deleted/)).toBeNull();
  });

  it("renders the reminder toggle, off by default", () => {
    render(<JournalScreen />);
    expect(screen.getByLabelText("Toggle journal reminder").getAttribute("aria-checked")).toBe("false");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/JournalScreen.test.tsx`
Expected: FAIL — `Cannot find module './JournalScreen'`

- [ ] **Step 3: Implement**

Create `src/components/JournalScreen.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { Sparkles, X, Trash2, BellRing } from "lucide-react";
import { JournalEntry } from "../types";
import { loadJournalEntries, saveJournalEntry, deleteJournalEntry, groupByDate } from "../services/journal";
import { getDailyPrompt, JournalMode } from "../services/journalPrompt";
import { getDiaryReminderPrefs, setDiaryReminderPrefs } from "../services/diaryReminderPrefs";
import { syncDiaryReminder, clearDiaryReminder } from "../services/notifications";
import { detectCrisis } from "../services/crisisClassifier";
import { saveEmaEntry, emaDateKey } from "../services/ema";
import { generateTinyId } from "../services/idGen";
import { hapticMedium } from "../hooks/useHaptics";
import CrisisCard from "./CrisisCard";

const MODE_PLACEHOLDER: Record<JournalMode, string> = {
  free: "What's on your mind...",
  gratitude: "e.g., 1) The coffee actually tasted good today. 2) A stranger held the door.",
};

const MOOD_OPTIONS: { valence: number; label: string; glyph: string }[] = [
  { valence: -3, label: "Very bad", glyph: "😞" },
  { valence: -1, label: "Bad", glyph: "😕" },
  { valence: 0, label: "Neutral", glyph: "😐" },
  { valence: 1, label: "Good", glyph: "🙂" },
  { valence: 3, label: "Very good", glyph: "😄" },
];

function formatDateHeader(date: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (date === today) return "TODAY";
  if (date === yesterday) return "YESTERDAY";
  return date;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function moodGlyph(valence?: number): string {
  if (valence === undefined) return "";
  const closest = MOOD_OPTIONS.reduce((a, b) => (Math.abs(b.valence - valence) < Math.abs(a.valence - valence) ? b : a));
  return closest.glyph;
}

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [mode, setMode] = useState<JournalMode>("free");
  const [text, setText] = useState("");
  const [valence, setValence] = useState<number | undefined>(undefined);
  const [dailyPrompt, setDailyPrompt] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reminderPrefs, setReminderPrefsState] = useState(getDiaryReminderPrefs());

  useEffect(() => {
    setEntries(loadJournalEntries());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPromptDismissed(false);
    getDailyPrompt(mode).then((p) => { if (!cancelled) setDailyPrompt(p); });
    return () => { cancelled = true; };
  }, [mode]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setCrisis(false);
    if (await detectCrisis(trimmed)) {
      setCrisis(true);
      return;
    }
    const now = new Date();
    const entry: JournalEntry = {
      id: generateTinyId(),
      date: now.toISOString().split("T")[0],
      timestamp: now.toISOString(),
      mode,
      text: trimmed,
      valence,
    };
    saveJournalEntry(entry);
    if (valence !== undefined) {
      saveEmaEntry({ id: generateTinyId(), date: emaDateKey(now), timestamp: now.toISOString(), valence, trigger: "user_initiated" });
    }
    setEntries(loadJournalEntries());
    setText("");
    setValence(undefined);
    hapticMedium();
  };

  const handleDelete = (id: string) => {
    deleteJournalEntry(id);
    setEntries(loadJournalEntries());
    setExpandedId(null);
  };

  const handleReminderToggle = async (enabled: boolean) => {
    setDiaryReminderPrefs({ enabled });
    setReminderPrefsState(getDiaryReminderPrefs());
    if (enabled) await syncDiaryReminder();
    else await clearDiaryReminder();
  };

  const handleReminderTimeChange = async (time: string) => {
    setDiaryReminderPrefs({ time });
    setReminderPrefsState(getDiaryReminderPrefs());
    if (getDiaryReminderPrefs().enabled) await syncDiaryReminder();
  };

  const groups = groupByDate(entries);

  return (
    <div className="space-y-4 max-w-md mx-auto" id="journal-screen">
      {/* Composer — always visible, at the top of the feed. */}
      <div className="glass p-4 rounded-2xl space-y-3">
        <div className="flex gap-2" role="group" aria-label="Journal mode">
          {(["free", "gratitude"] as JournalMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-all ${
                mode === m ? "bg-blue-900/40 border-blue-700/50 text-blue-300" : "border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
              }`}
              aria-pressed={mode === m}
            >
              {m === "free" ? "Free write" : "Gratitude"}
            </button>
          ))}
        </div>

        {dailyPrompt && !promptDismissed && (
          <div className="flex items-start gap-2 bg-page border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span className="flex-1">Try writing about: {dailyPrompt}</span>
            <button onClick={() => setPromptDismissed(true)} aria-label="Dismiss prompt" className="text-slate-600 hover:text-slate-400 cursor-pointer shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={MODE_PLACEHOLDER[mode]}
          aria-label="Journal entry text"
          className="w-full bg-page border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 min-h-[80px] resize-y"
        />

        <div className="flex gap-1.5" role="group" aria-label="Mood">
          {MOOD_OPTIONS.map((o) => (
            <button
              key={o.valence}
              onClick={() => setValence(o.valence)}
              aria-label={`Mood: ${o.label}`}
              aria-pressed={valence === o.valence}
              className={`flex-1 py-1.5 rounded-lg text-lg cursor-pointer border transition-all ${
                valence === o.valence ? "bg-blue-900/40 border-blue-700/50" : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {o.glyph}
            </button>
          ))}
        </div>

        {crisis && <CrisisCard id="journal-crisis" heading="What you wrote matters more than this note right now" />}

        <button
          onClick={handleSave}
          disabled={!text.trim()}
          className="w-full font-semibold py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Save entry
        </button>

        <div className="flex items-center justify-between gap-2 bg-page border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BellRing className="w-3.5 h-3.5" />
            <span>Remind me to journal</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={reminderPrefs.time}
              disabled={!reminderPrefs.enabled}
              onChange={(e) => handleReminderTimeChange(e.target.value)}
              aria-label="Journal reminder time"
              className="bg-transparent text-xs text-slate-300 border border-slate-800 rounded-lg px-2 py-1 focus:outline-none disabled:opacity-40"
            />
            <button
              role="switch"
              aria-checked={reminderPrefs.enabled}
              aria-label="Toggle journal reminder"
              onClick={() => handleReminderToggle(!reminderPrefs.enabled)}
              className={`w-10 h-5.5 rounded-full relative transition-all cursor-pointer ${reminderPrefs.enabled ? "bg-blue-600" : "bg-slate-800"}`}
            >
              <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${reminderPrefs.enabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Feed — compact timeline list, grouped by date. */}
      {groups.map((g) => (
        <div key={g.date}>
          <div className="text-[11px] font-semibold text-slate-500 mb-1 mt-3">{formatDateHeader(g.date)}</div>
          {g.entries.map((e) => (
            <div key={e.id} className="border-b border-slate-800/60">
              <button
                onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                className="w-full flex items-baseline gap-2 py-2 text-left cursor-pointer"
              >
                <span className="text-[11px] text-slate-500 w-14 shrink-0">{formatTime(e.timestamp)}</span>
                <span className="text-xs text-slate-300 flex-1 truncate">
                  {moodGlyph(e.valence)} {e.text}
                </span>
              </button>
              {expandedId === e.id && (
                <div className="pb-3 pl-16 pr-2 space-y-2">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{e.text}</p>
                  <button
                    onClick={() => handleDelete(e.id)}
                    aria-label="Delete entry"
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete entry
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify tests pass**

Run: `npx vitest run src/components/JournalScreen.test.tsx`
Expected: PASS (9 tests). If the "reminder toggle" or "gratitude mode" tests are flaky on timing, use `await screen.findByText(...)` (already used above) rather than a bare synchronous assertion — the daily-prompt effect is async.

- [ ] **Step 5: Commit**

```bash
git add src/components/JournalScreen.tsx src/components/JournalScreen.test.tsx
git commit -m "feat(journal): add standalone JournalScreen (timeline feed + always-open composer)"
```

---

### Task 5: Wire into `App.tsx` (replace `"diary"` aux target, add `"dbt_diary_card"`)

**Files:**
- Modify: `src/App.tsx` (lazy import, `AUX_LABELS`, `renderAuxView`)

**Interfaces:**
- Consumes: `JournalScreen` (Task 4), `"dbt_diary_card"` `AuxView` (Task 3).

- [ ] **Step 1: Add the lazy import**

Near the existing `const DiaryCardScreen = lazy(() => import("./components/DiaryCardScreen"));` line, add:

```ts
const JournalScreen = lazy(() => import("./components/JournalScreen"));
```

- [ ] **Step 2: Update `AUX_LABELS`**

Change:
```ts
diary: "Diary card",
```
to:
```ts
diary: "Journal",
dbt_diary_card: "DBT diary card",
```

- [ ] **Step 3: Update `renderAuxView`**

Change:
```ts
case "diary": return <DiaryCardScreen />;
```
to:
```ts
case "diary": return <JournalScreen />;
case "dbt_diary_card": return <DiaryCardScreen />;
```

- [ ] **Step 4: Typecheck and run the full suite**

Run: `npm run lint && npx vitest run`
Expected: `tsc --noEmit` clean; full suite green (this task only changes which component an existing nav target renders — no existing test should reference `DiaryCardScreen` at the `"diary"` aux id directly, since App.tsx-level rendering isn't unit-tested per-aux-view in this codebase; if any test DOES assert on this, update it to expect `JournalScreen` at `"diary"` and `DiaryCardScreen` at `"dbt_diary_card"`).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(journal): diary nav target now opens JournalScreen; DBT card moves to dbt_diary_card"
```

---

### Task 6: Add the DBT diary card row to the Tools hub

**Files:**
- Modify: `src/components/toolsRows.ts`
- Modify: `src/components/toolsRows.test.ts`

**Interfaces:**
- Consumes: `"dbt_diary_card"` aux target (Task 3), existing `go` callback (`ToolRowDeps`).

- [ ] **Step 1: Update the failing test expectations**

In `src/components/toolsRows.test.ts`, update the exact-order assertion:

```ts
it("renders all tool rows in order, when phone is off", () => {
  expect(rowIds(false)).toEqual([
    "plan", "winddown", "sounds", "reach_out", "episode",
    "ema_checkin", "diary", "dbt_diary_card", "medication",
    "problem_solving", "values_to_action", "assessment", "social_rhythm", "exposure", "relapse_plan",
  ]);
});
```

Also update the "does not mark In the moment or Log & track as 'more'" test's `diary` row check to include the new row (it already checks the group via `r.id === "diary"`, so the new row inherits correctly — no change needed there beyond the order list above).

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/toolsRows.test.ts`
Expected: FAIL — `dbt_diary_card` not in the actual row list yet.

- [ ] **Step 3: Implement**

In `src/components/toolsRows.ts`, import `NotebookPen` is already imported for `diary` — reuse it, or add a distinct icon. Add `Sliders` to the lucide-react import list, then add the row right after `diary` in the `"Log & track"` group:

```ts
{ id: "diary", label: t("tool_diary_label"), sub: t("tool_diary_sub"), Icon: NotebookPen, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("diary") },
{ id: "dbt_diary_card", label: "DBT diary card", sub: "Emotion ratings, skills checklist, today's intention", Icon: Sliders, iconClass: "w-5 h-5 text-indigo-400", onTap: () => go("dbt_diary_card") },
```

(Hardcoded label/sub strings, matching the existing `"sounds"` row's precedent in this same file — no new i18n keys needed.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/toolsRows.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/toolsRows.ts src/components/toolsRows.test.ts
git commit -m "feat(journal): add DBT diary card row to the Tools hub, alongside Journal"
```

---

### Task 7: Full-suite verification and cleanup

**Files:** none new — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including every test touched/added in Tasks 1-6.

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Remove the now-dead `DiaryCardScreen` mode/prompt/reminder UI shipped in v1.18.4**

`DiaryCardScreen.tsx` still has the Free write/Gratitude chips, daily-prompt banner, and reminder row added in v1.18.4 (Task 3 of the prior plan) — these are now redundant with `JournalScreen` and were the source of the "wrong feature set / cluttered" feedback on the DBT card specifically. Remove them from `DiaryCardScreen.tsx` (revert to its pre-v1.18.4 Quick Notes section: textarea + tags + "Ask Nila" button only), and correspondingly trim `DiaryCardScreen.test.tsx` to drop the tests for the removed mode chips/prompt/reminder (keep everything else — the DBT sliders, skills checklist, DailyIntentionCard, and Quick-Notes-analysis tests are unaffected and must stay green). Do NOT delete `journalPrompt.ts`, `diaryReminderPrefs.ts`, or the `notifications.ts` diary-reminder functions — `JournalScreen` now owns them.

Run: `npx vitest run src/components/DiaryCardScreen.test.tsx`
Expected: PASS, with fewer tests than before (the mode/prompt/reminder-specific ones removed).

- [ ] **Step 4: Full suite one more time**

Run: `npx vitest run && npm run lint`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/DiaryCardScreen.tsx src/components/DiaryCardScreen.test.tsx
git commit -m "refactor(journal): remove now-redundant mode/prompt/reminder UI from DiaryCardScreen (superseded by JournalScreen)"
```
