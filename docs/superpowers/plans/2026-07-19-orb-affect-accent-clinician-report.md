# Orb Affect Accent — Clinician Report v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-report, freeze-at-consent "Conversation Tone" section to the clinician PDF report, per
[docs/superpowers/specs/2026-07-19-orb-affect-accent-clinician-report-design.md](../specs/2026-07-19-orb-affect-accent-clinician-report-design.md).

**Architecture:** A pure, closed-vocabulary function in `chatAffect.ts` computes the exact sentence from
existing day-bucketed history. `clinicianReport.ts` renders it, always last, only when explicitly
given. `YourDataScreen.tsx` adds an off-by-default toggle that freezes a *fresh* computation at
click-time (not a stale render value) into local-only state, previews it verbatim, and passes that
frozen object — never recomputed — at export time.

**Tech Stack:** TypeScript, Vitest, React — no new dependencies.

**Spec:** [docs/superpowers/specs/2026-07-19-orb-affect-accent-clinician-report-design.md](../specs/2026-07-19-orb-affect-accent-clinician-report-design.md)

## Global Constraints

- The toggle is **per-report, never persisted** — plain `useState`, resets to unchecked on every visit.
- **Freeze-at-click, from a fresh call** — the toggle's `onChange` calls `computeConversationToneSummary`
  itself at that instant; it never freezes a value that was merely computed at the component's last
  render. Changing the report period resets the frozen value synchronously, in the same handler that
  changes the period.
- **Closed vocabulary**: exactly five possible verb phrases (`trended difficult`, `trended positive`,
  `was mostly difficult`, `was mostly positive`, `was mixed`), never free text, never a raw number,
  never the model's accuracy figure. `"trended X"` requires both ≥5 distinct days **and** a real
  computed direction (first-half vs. second-half means differing by ≥0.15) — day count alone is not
  sufficient. `"mixed"` never takes trajectory language.
- The section **always renders last** in `buildClinicianReport`'s output — after every other section.
- No new rollout flag — gated entirely by `setAffectAccentPersistenceEnabled` already being off
  (`recentAffectDays()` already returns `[]` when it's off, making the new function return `null` and
  the toggle never render). This plan does not flip any flag.
- `clinicianPdf.ts`'s `drawMutedNote` de-emphasis styling is **out of scope** for this plan — the
  section still reaches the PDF (via `buildClinicianReport`'s one production caller), correctly
  positioned last with full in-prose attribution, just without the dashed-box visual treatment.

---

## Task 1: `chatAffect.ts` — `computeConversationToneSummary`

**Files:**
- Modify: `src/services/chatAffect.ts`
- Modify: `src/services/chatAffect.test.ts`

**Interfaces:**
- Consumes: `recentAffectDays` (already in this file).
- Produces: `computeConversationToneSummary(periodDays, now?): ConversationToneSummary | null`,
  `interface ConversationToneSummary { text: string; daysUsed: number; windowDays: number }`. Task 2
  (`clinicianReport.ts`) consumes the interface shape. Task 3 (`clinicianToneOptIn.ts`) consumes the
  function directly.

- [ ] **Step 1: Write the failing tests**

Add to `src/services/chatAffect.test.ts` (after the existing `describe` blocks, same file — it already
mocks `secureLocal` and imports `noteChatAffect`/`setAffectAccentPersistenceEnabled`):

```ts
import { computeConversationToneSummary } from "./chatAffect";

function seedDay(now: number, offsetDays: number, valence: number, count: number) {
  const ts = now - offsetDays * 86400000;
  for (let i = 0; i < count; i++) noteChatAffect({ valence, arousal: 0 }, ts);
}

const VERB_TEMPLATE = /^Model estimate — \d+ days of conversation across the last \d+ days: (trended difficult|trended positive|was mostly difficult|was mostly positive|was mixed)\. This is an automatic tone estimate from the app's on-device model, not something the patient explicitly told the app, and it is not a clinically validated measure\. If this conflicts with other self-reported data in this summary, trust the self-reported data\.( \(Conversation-tone history is kept for 30 days, so this covers the most recent 30 only\.\))?$/;

describe("computeConversationToneSummary — closed-vocabulary clinician-report line", () => {
  it("returns null below the day-count floor (7-day window needs 3 days)", () => {
    const now = Date.now();
    seedDay(now, 0, -0.5, 4);
    seedDay(now, 1, -0.5, 4);
    expect(computeConversationToneSummary(7, now)).toBeNull();
  });

  it("returns null below the total-readings floor even when the day-count floor clears", () => {
    const now = Date.now();
    seedDay(now, 0, -0.5, 1);
    seedDay(now, 1, -0.5, 1);
    seedDay(now, 2, -0.5, 1); // 3 distinct days (clears the 7-day floorDays=3) but only 3 total readings (<10)
    expect(computeConversationToneSummary(7, now)).toBeNull();
  });

  it("floorDays scales with the capped window: 30-day period needs 9 days, not 3", () => {
    const now = Date.now();
    for (let d = 0; d < 8; d++) seedDay(now, d, -0.5, 2); // 8 days, 16 readings — clears totals, misses the 9-day floor for a 30-day window
    expect(computeConversationToneSummary(30, now)).toBeNull();
    seedDay(now, 8, -0.5, 2); // 9th day
    expect(computeConversationToneSummary(30, now)).not.toBeNull();
  });

  it("a genuinely worsening run of ≥5 days produces 'trended difficult'", () => {
    const now = Date.now();
    // chronological (oldest first): day4=-0.1, day3=-0.15, day2=-0.3, day1=-0.5, day0=-0.6
    seedDay(now, 4, -0.1, 2);
    seedDay(now, 3, -0.15, 2);
    seedDay(now, 2, -0.3, 2);
    seedDay(now, 1, -0.5, 2);
    seedDay(now, 0, -0.6, 2);
    const result = computeConversationToneSummary(7, now);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("trended difficult");
  });

  it("a FLAT run of uniformly negative days at the same day count produces level language, not a trend", () => {
    const now = Date.now();
    for (let d = 0; d < 5; d++) seedDay(now, d, -0.4, 2); // same valence every day — no direction
    const result = computeConversationToneSummary(7, now);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("was mostly difficult");
    expect(result!.text).not.toContain("trended");
  });

  it("fewer than 5 distinct days never uses trajectory language, even with a real difference between readings", () => {
    const now = Date.now();
    seedDay(now, 0, -0.6, 4);
    seedDay(now, 1, -0.6, 4);
    seedDay(now, 2, -0.1, 4); // 3 days / 12 total readings — clears both floors, but below TRAJECTORY_MIN_DAYS (5)
    const result = computeConversationToneSummary(7, now);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("was mostly difficult");
    expect(result!.text).not.toContain("trended");
  });

  it("'mixed' NEVER takes trajectory language, even when a real swing is detected", () => {
    const now = Date.now();
    // chronological: +0.8, +0.7, 0.0, -0.7, -0.8 — big swing, but averages to ~0 (mixed)
    seedDay(now, 4, 0.8, 2);
    seedDay(now, 3, 0.7, 2);
    seedDay(now, 2, 0.0, 2);
    seedDay(now, 1, -0.7, 2);
    seedDay(now, 0, -0.8, 2);
    const result = computeConversationToneSummary(7, now);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("was mixed");
    expect(result!.text).not.toMatch(/trended|stayed/);
  });

  it("includes the 30-day-cap disclosure only when periodDays > 30", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    expect(computeConversationToneSummary(30, now)!.text).not.toContain("kept for 30 days");
    expect(computeConversationToneSummary(90, now)!.text).toContain("kept for 30 days");
  });

  it("windowDays is capped at 30 regardless of periodDays", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    expect(computeConversationToneSummary(90, now)!.windowDays).toBe(30);
  });

  it("returns null when persistence reads are disabled, even with data present", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    setAffectAccentPersistenceEnabled(false);
    expect(computeConversationToneSummary(30, now)).toBeNull();
  });

  it("every non-null result matches the full closed template", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    const result = computeConversationToneSummary(90, now);
    expect(result).not.toBeNull();
    expect(result!.text).toMatch(VERB_TEMPLATE);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/chatAffect.test.ts`
Expected: FAIL — `computeConversationToneSummary` is not exported yet.

- [ ] **Step 3: Write the implementation**

Add to `src/services/chatAffect.ts` (after `recentAffectDays`):

```ts
export interface ConversationToneSummary {
  text: string;
  daysUsed: number;
  windowDays: number;
}

// Below this many distinct days, only LEVEL language is honest ("was mostly difficult") — a
// trajectory claim ("trended difficult") implies more points than 3-4 scattered days can support,
// and "trend" is precisely the word a clinician will weight most heavily.
const TRAJECTORY_MIN_DAYS = 5;
// A minimum total-reading floor alongside the day-count floor: three days of count:1 (one turn each)
// would otherwise clear a day-count-only floor on three total model readings from a head that's wrong
// roughly 1 time in 3-4.
const MIN_TOTAL_READINGS = 10;
// Minimum gap between the older and newer half's mean valence before "trended X" is justified — day
// count alone is a NECESSARY condition for trajectory language, never a SUFFICIENT one: a flat run of
// uniformly negative days at 5+ distinct days is a level, not a trend, and must render as "was mostly
// difficult", not "trended difficult".
const DIRECTION_THRESHOLD = 0.15;

/** A closed-vocabulary, per-report clinician-facing summary of recent conversation tone — see
 *  docs/superpowers/specs/2026-07-19-orb-affect-accent-clinician-report-design.md. Pure and
 *  side-effect-free; callers are responsible for freezing the result at consent-time (see
 *  clinicianToneOptIn.ts) rather than recomputing it later. */
export function computeConversationToneSummary(
  periodDays: number,
  now: number = Date.now()
): ConversationToneSummary | null {
  const windowDays = Math.min(periodDays, 30); // chatAffect.ts's own 30-day retention cap
  const days = recentAffectDays(windowDays, now); // most-recent-first, per recentAffectDays's own contract
  const floorDays = Math.max(3, Math.ceil(windowDays * 0.3));
  const totalReadings = days.reduce((s, d) => s + d.count, 0);
  if (days.length < floorDays || totalReadings < MIN_TOTAL_READINGS) return null;

  // Deliberately unweighted by `count` — a 1-turn day and a 20-turn day count equally toward the
  // level. Day-level equal weighting (not reading-level) is the intended aggregation; do not "fix"
  // this into a count-weighted average.
  const avgValence = days.reduce((s, d) => s + d.valence, 0) / days.length;
  const level = avgValence <= -0.2 ? "difficult" : avgValence >= 0.2 ? "positive" : "mixed";

  // Real direction check: split chronologically (oldest half vs newest half) and compare means.
  // recentAffectDays returns most-recent-first, so reverse before halving.
  const chronological = [...days].reverse();
  const mid = Math.floor(chronological.length / 2);
  const olderHalf = chronological.slice(0, mid);
  const newerHalf = chronological.slice(mid);
  const olderAvg = olderHalf.reduce((s, d) => s + d.valence, 0) / olderHalf.length;
  const newerAvg = newerHalf.reduce((s, d) => s + d.valence, 0) / newerHalf.length;
  const hasDirection = days.length >= TRAJECTORY_MIN_DAYS && Math.abs(newerAvg - olderAvg) >= DIRECTION_THRESHOLD;

  // "mixed" never takes trajectory language — a near-zero average produced by real volatility (e.g.
  // swinging from very positive to very negative) would misreport as "stayed mixed" if trajectory
  // wording applied here; "was mixed" is the only phrase this level ever emits.
  const verb =
    level === "mixed"
      ? "was mixed"
      : (hasDirection ? `trended ${level}` : `was mostly ${level}`);

  const capNote = periodDays > 30
    ? " (Conversation-tone history is kept for 30 days, so this covers the most recent 30 only.)"
    : "";

  const text =
    `Model estimate — ${days.length} days of conversation across the last ${windowDays} days: ${verb}. ` +
    `This is an automatic tone estimate from the app's on-device model, not something the patient ` +
    `explicitly told the app, and it is not a clinically validated measure. If this conflicts with ` +
    `other self-reported data in this summary, trust the self-reported data.${capNote}`;

  return { text, daysUsed: days.length, windowDays };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/chatAffect.test.ts`
Expected: PASS (all existing tests + 11 new tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/chatAffect.ts src/services/chatAffect.test.ts
git commit -m "feat: add computeConversationToneSummary (closed-vocabulary clinician-report line)"
```

---

## Task 2: `clinicianReport.ts` — the "Conversation Tone" section

**Files:**
- Modify: `src/services/clinicianReport.ts`
- Modify: `src/services/clinicianReport.test.ts`

**Interfaces:**
- Consumes: nothing new at the type level — `conversationTone?: { text: string; daysUsed: number; windowDays: number }` is a plain inline shape (not importing `ConversationToneSummary` from `chatAffect.ts`, to keep `clinicianReport.ts` free of a dependency on the affect-accent feature's internal types — this mirrors how every other optional field on `ClinicianReportInput` is a locally-declared inline/imported-summary shape, not a re-export of the producing service's own type).
- Produces: nothing for later tasks — Task 3 passes a value shaped to match this field, not an import from this file.

- [ ] **Step 1: Write the failing tests**

Add to `src/services/clinicianReport.test.ts` (after the existing `describe` blocks):

```ts
describe("buildClinicianReport — conversation tone (affect accent v2)", () => {
  const toneText =
    "Model estimate — 9 days of conversation across the last 30 days: trended difficult. " +
    "This is an automatic tone estimate from the app's on-device model, not something the patient " +
    "explicitly told the app, and it is not a clinically validated measure. If this conflicts with " +
    "other self-reported data in this summary, trust the self-reported data.";

  it("includes the section only when conversationTone is provided", () => {
    const d = buildClinicianReport({ ...baseInput, conversationTone: { text: toneText, daysUsed: 9, windowDays: 30 } });
    expect(d).toContain("Conversation Tone (automatic estimate — see note)");
    expect(d).toContain(toneText);
  });

  it("omits the section when conversationTone is not provided", () => {
    const d = buildClinicianReport(baseInput);
    expect(d).not.toContain("Conversation Tone");
  });

  it("renders the section strictly LAST — after every other section, including the phenomenological summary", () => {
    const fullInput: ClinicianReportInput = {
      ...baseInput,
      conversationTone: { text: toneText, daysUsed: 9, windowDays: 30 },
      emotionalStateSummary: {
        intensityDistribution: { mild: 40, moderate: 40, severe: 20 },
        topGranularEmotions: [{ emotion: "anxious", count: 5 }],
        emotionalVariability: 1.2,
      },
    };
    const d = buildClinicianReport(fullInput);
    const toneIndex = d.indexOf("Conversation Tone");
    const phenomenologicalIndex = d.indexOf("Enhanced Phenomenological Summary");
    expect(toneIndex).toBeGreaterThan(-1);
    expect(phenomenologicalIndex).toBeGreaterThan(-1);
    expect(toneIndex).toBeGreaterThan(phenomenologicalIndex);
    // and strictly before the trailing disclaimer
    expect(toneIndex).toBeLessThan(d.indexOf("Generated by NilaMind"));
  });

  it("never contains a raw numeric valence/arousal value or an accuracy figure", () => {
    const d = buildClinicianReport({ ...baseInput, conversationTone: { text: toneText, daysUsed: 9, windowDays: 30 } });
    const toneSection = d.slice(d.indexOf("Conversation Tone"));
    expect(toneSection).not.toMatch(/-?0\.\d/); // no raw decimal (e.g. valence) in or after the section
    expect(toneSection).not.toMatch(/6[0-9]%|7[0-4]%/); // no accuracy-figure-shaped percentage
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/clinicianReport.test.ts`
Expected: FAIL — the section doesn't exist yet.

- [ ] **Step 3: Write the implementation**

In `src/services/clinicianReport.ts`, add to `ClinicianReportInput` (after the existing `userInsightsSummary?` field, before the closing `}`):

```ts
  /**
   * Orb affect accent v2 — a machine-inferred conversation-tone estimate. Populated ONLY from a
   * user-previewed, per-generation opt-in captured at toggle-time on YourDataScreen.tsx (see
   * docs/superpowers/specs/2026-07-19-orb-affect-accent-clinician-report-design.md §3) — NEVER from a
   * stored preference, and NEVER recomputed after the user has seen the previewed text. The caller is
   * responsible for passing the frozen ConversationToneSummary object verbatim.
   */
  conversationTone?: { text: string; daysUsed: number; windowDays: number };
```

In `buildClinicianReport`, insert immediately before the final two lines:

```ts
    lines.push(SEPARATOR);
    lines.push(DISCLAIMER);
```

add:

```ts
    // Orb affect accent v2 — machine-inferred conversation tone. Always rendered LAST, deliberately
    // positioned as the least-emphasized section in a report that's otherwise entirely self-report or
    // validated instruments. Vocabulary is deliberately coarse (see computeConversationToneSummary's
    // own doc comment in chatAffect.ts) because the underlying signal is unvalidated.
    if (input.conversationTone) {
      lines.push("Conversation Tone (automatic estimate — see note)");
      lines.push(`  ${input.conversationTone.text}`);
      lines.push("");
    }

    lines.push(SEPARATOR);
    lines.push(DISCLAIMER);
```

(i.e., the new block goes immediately above the existing `lines.push(SEPARATOR); lines.push(DISCLAIMER);` pair — nothing else changes.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/clinicianReport.test.ts`
Expected: PASS (all existing tests + 4 new tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/clinicianReport.ts src/services/clinicianReport.test.ts
git commit -m "feat: render Conversation Tone section last in the clinician report"
```

---

## Task 3: Freeze-at-click logic + `YourDataScreen.tsx` wiring

**Files:**
- Create: `src/services/clinicianToneOptIn.ts`
- Create: `src/services/clinicianToneOptIn.test.ts`
- Modify: `src/components/YourDataScreen.tsx`

**Interfaces:**
- Consumes: `computeConversationToneSummary`, `type ConversationToneSummary` from `./chatAffect` (Task 1).
- Produces: `resolveToneToggle(checked, periodDays, now?): ConversationToneSummary | null`. Consumed
  directly by `YourDataScreen.tsx`'s toggle handler.

**Note on scope:** `YourDataScreen.tsx` has 40+ service imports and no existing test file; mounting it
for a full component-render test is a large, separate undertaking not justified by this feature alone.
The freeze-at-click-time behavior — the actual risk a design review caught (freezing a stale
render-scoped value instead of a fresh computation) — is extracted into a small pure function and
fully unit-tested below. The remaining JSX wiring (period-change reset, passing the frozen value at
export, never touching storage) is single-line, directly-readable state assignment with no hidden
logic to hide a bug; it's covered by careful code review here, not a mounted-component test.

- [ ] **Step 1: Write the failing test for the pure logic**

Create `src/services/clinicianToneOptIn.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import { resolveToneToggle } from "./clinicianToneOptIn";
import { noteChatAffect, setAffectAccentPersistenceEnabled } from "./chatAffect";

beforeEach(() => {
  store = {};
  setAffectAccentPersistenceEnabled(true);
});

afterEach(() => {
  setAffectAccentPersistenceEnabled(false);
});

function seedDay(now: number, offsetDays: number, valence: number, count: number) {
  const ts = now - offsetDays * 86400000;
  for (let i = 0; i < count; i++) noteChatAffect({ valence, arousal: 0 }, ts);
}

describe("resolveToneToggle — freeze-at-click-time state transition", () => {
  it("unchecking always returns null", () => {
    expect(resolveToneToggle(false, 30)).toBeNull();
  });

  it("checking with insufficient data returns null — the toggle simply doesn't turn on", () => {
    expect(resolveToneToggle(true, 30)).toBeNull();
  });

  it("checking with sufficient data returns a fresh ConversationToneSummary", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    const result = resolveToneToggle(true, 30, now);
    expect(result).not.toBeNull();
    expect(result!.daysUsed).toBe(9);
  });

  it("is a fresh call each time — reflects data written between two calls, not a cached value (the null-at-click race regression guard)", () => {
    const now = Date.now();
    expect(resolveToneToggle(true, 7, now)).toBeNull(); // no data yet
    for (let d = 0; d < 3; d++) seedDay(now, d, -0.5, 4); // now clears the 7-day window's floor
    const second = resolveToneToggle(true, 7, now);
    expect(second).not.toBeNull(); // same function, same args, DIFFERENT real-world state → different result
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/clinicianToneOptIn.test.ts`
Expected: FAIL — `Cannot find module './clinicianToneOptIn'`

- [ ] **Step 3: Write the implementation**

Create `src/services/clinicianToneOptIn.ts`:

```ts
import { computeConversationToneSummary, type ConversationToneSummary } from "./chatAffect";

/**
 * Pure state-transition for the clinician-report tone opt-in toggle. Extracted from
 * YourDataScreen.tsx so the freeze-at-click-time behavior — a fresh computation captured the instant
 * the toggle turns on, never a value merely computed at the component's last render — is unit-testable
 * without mounting the whole (very large) screen component. Call this directly from the toggle's
 * onChange handler and pass its return value straight into setState.
 *
 * Returns null when unchecked, OR when checked but the fresh call comes back null (data aged below the
 * floor since the component's last render — the toggle simply doesn't turn on in that case), OR the
 * freshly-computed ConversationToneSummary to freeze into state.
 */
export function resolveToneToggle(
  checked: boolean,
  periodDays: number,
  now: number = Date.now()
): ConversationToneSummary | null {
  if (!checked) return null;
  return computeConversationToneSummary(periodDays, now);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/clinicianToneOptIn.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Wire the UI in `YourDataScreen.tsx`**

Add to the imports (after the existing `import { generateClinicianPdfBlob } from "./services/clinicianPdf";` line — actual existing line is `import { generateClinicianPdfBlob } from "../services/clinicianPdf";`):

```tsx
import { computeConversationToneSummary, type ConversationToneSummary } from "../services/chatAffect";
import { resolveToneToggle } from "../services/clinicianToneOptIn";
```

Add new state immediately after the existing `const [reportPeriod, setReportPeriod] = useState<ReportPeriod>(30);`:

```tsx
const [toneOptIn, setToneOptIn] = useState<ConversationToneSummary | null>(null);
```

Add, near where `reportPeriod` is read in the render body (anywhere before the JSX that uses it — e.g.
immediately after the `toneOptIn` state declaration above, since it's a plain computed value, not a hook):

```tsx
const toneAvailable = computeConversationToneSummary(reportPeriod);
```

Find the existing period-selector button:

```tsx
            <button
              key={d}
              onClick={() => setReportPeriod(d)}
              aria-pressed={reportPeriod === d}
```

Replace the `onClick` with a synchronous reset in the same handler:

```tsx
            <button
              key={d}
              onClick={() => { setReportPeriod(d); setToneOptIn(null); }}
              aria-pressed={reportPeriod === d}
```

Find the existing period-selector's closing `</div>` immediately before the export-button `<div className="flex flex-wrap gap-2">`:

```tsx
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportClinicianPdf} disabled={reportBusy} id="export-clinician-pdf" className="flex-1 min-w-[64px] bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 text-blue-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
```

Insert the new toggle + preview block between them:

```tsx
        </div>
        {toneAvailable && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={toneOptIn !== null}
                onChange={(e) => setToneOptIn(resolveToneToggle(e.target.checked, reportPeriod))}
                className="cursor-pointer"
              />
              Include an automatic conversation-tone estimate
            </label>
            {toneOptIn && (
              <div className="text-[11px] text-slate-400 bg-page border border-slate-800 rounded-lg px-3 py-2 leading-relaxed">
                {toneOptIn.text}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportClinicianPdf} disabled={reportBusy} id="export-clinician-pdf" className="flex-1 min-w-[64px] bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 text-blue-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
```

Find the `input: ClinicianReportInput = {` object in `handleExportClinicianPdf` and add the new field
immediately after the existing `userInsightsSummary` line:

```tsx
          enhancedSocialRhythmDetails,
          behavioralInsights,
          userInsightsSummary
       };
```

becomes:

```tsx
          enhancedSocialRhythmDetails,
          behavioralInsights,
          userInsightsSummary,
          conversationTone: toneOptIn ?? undefined,
       };
```

- [ ] **Step 6: Type-check**

Run: `npm run lint`
Expected: no new TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/clinicianToneOptIn.ts src/services/clinicianToneOptIn.test.ts src/components/YourDataScreen.tsx
git commit -m "feat: wire the freeze-at-click tone opt-in toggle into YourDataScreen"
```

---

## Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all suites green — no regressions. The new UI code path is inert in every existing
test (`toneAvailable` is `null` unless `setAffectAccentPersistenceEnabled(true)` and real day-bucketed
data are both present, neither of which any existing test sets up).

- [ ] **Step 2: Run the type checker**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Confirm no flags flipped**

Run: `grep -rn "setAffectAccentPersistenceEnabled(true)\|setAffectAccentEnabled(true)" src/main.tsx`
Expected: no matches (only the existing comment reference, if any) — this plan does not enable either
upstream flag; the entire feature stays dark in production until they are, independently, later.

## Explicitly out of scope for this plan

- `clinicianPdf.ts`'s `drawMutedNote` de-emphasized visual treatment — the section reaches the PDF via
  `buildClinicianReport`'s one production caller, correctly positioned and attributed, just without the
  dashed-box styling.
- A full mounted-component test suite for `YourDataScreen.tsx` — see Task 3's scope note.
- Flipping either rollout flag.
- Any change to `nilaContributions.ts` or its donation flow (cited for UI shape only, not modified).
