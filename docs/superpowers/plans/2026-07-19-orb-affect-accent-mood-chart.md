# Orb Affect Accent — Mood-Tone Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 30-cell "Conversation tone (automatic)" strip to `DashboardScreen.tsx`, per
[docs/superpowers/specs/2026-07-19-orb-affect-accent-mood-chart-design.md](../specs/2026-07-19-orb-affect-accent-mood-chart-design.md).

**Architecture:** A pure color-ramp function (orb's own peach-cream↔mauve palette, never rose), a pure
data-shaping function reusing `computeConversationToneSummary`'s existing floor, and a small React
component rendered alongside `DashboardScreen.tsx`'s existing `MoodHeatmap`/`TrendChart`/
`WellbeingTrendCard`/`PhaseTimeline` cards.

**Tech Stack:** TypeScript, Vitest, React, `@testing-library/react` (already used by this codebase's
other chart component tests) — no new dependencies.

**Spec:** [docs/superpowers/specs/2026-07-19-orb-affect-accent-mood-chart-design.md](../specs/2026-07-19-orb-affect-accent-mood-chart-design.md)

## Global Constraints

- **Never rose.** The color ramp is built exclusively from three orb-palette hex values
  (`#b06aa0`/`#c784b0`/`#fdefdc`, lowercase — see Task 1's note on why) — no rose/danger token anywhere
  in this feature.
- **Reuse `computeConversationToneSummary`'s exact dual floor** — not a separate, looser threshold. The
  chart's "enough data" gate is `computeConversationToneSummary(30, now) !== null`.
- **A 30-cell single-row strip of circular dots** — not a `MoodHeatmap`-style multi-week grid.
  `chatAffect.ts` only retains 30 days total; a miniature year-grid would misrepresent that.
- **Valence only** — no arousal encoding in v1.
- **No new flag.** Gated entirely by `setAffectAccentPersistenceEnabled`'s existing off-by-default
  state (`recentAffectDays()` already returns `[]` when it's off).
- **Below-floor and gate-off render identically** — a neutral "No data yet." card, no explanation that
  leaks which gate is closed, no engagement-pressure copy.

---

## Task 1: `affectToneColor.ts` — the color ramp, never rose

**Files:**
- Create: `src/services/affectToneColor.ts`
- Create: `src/services/affectToneColor.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no dependencies).
- Produces: `valenceToColor(valence: number): string`, `NO_DATA_COLOR: string`. Task 3
  (`AffectToneStrip.tsx`) consumes both.

- [ ] **Step 1: Write the failing tests**

Create `src/services/affectToneColor.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { valenceToColor, NO_DATA_COLOR } from "./affectToneColor";

describe("valenceToColor — orb-palette warm gradient, never rose", () => {
  it("valenceToColor(-1) equals the orb's negative-tint deep mauve exactly", () => {
    expect(valenceToColor(-1)).toBe("#b06aa0");
  });

  it("valenceToColor(0) equals the orb's resting identity color exactly", () => {
    expect(valenceToColor(0)).toBe("#c784b0");
  });

  it("valenceToColor(1) equals the orb's positive-tint cream exactly", () => {
    expect(valenceToColor(1)).toBe("#fdefdc");
  });

  it("clamps values outside [-1, 1]", () => {
    expect(valenceToColor(-5)).toBe(valenceToColor(-1));
    expect(valenceToColor(5)).toBe(valenceToColor(1));
  });

  it("interpolates distinctly between the three stops", () => {
    const negSide = valenceToColor(-0.5);
    const posSide = valenceToColor(0.5);
    expect(negSide).not.toBe(valenceToColor(-1));
    expect(negSide).not.toBe(valenceToColor(0));
    expect(posSide).not.toBe(valenceToColor(0));
    expect(posSide).not.toBe(valenceToColor(1));
  });

  it("NEVER produces a color close to the app's reserved crisis-red hue, across the whole range", () => {
    // --color-rose-500 in light/Sunrise theme: #be3f26 (index.css) — the app's crisis-exclusive token.
    const crisisR = 0xbe, crisisG = 0x3f, crisisB = 0x26;
    for (let v = -1; v <= 1; v += 0.05) {
      const hex = valenceToColor(v);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const dist = Math.sqrt((r - crisisR) ** 2 + (g - crisisG) ** 2 + (b - crisisB) ** 2);
      // Verified during spec review: the ramp's actual minimum distance to this hex is ~130 (of a max
      // possible ~441). 100 is a safely conservative regression floor, not a tight-fit threshold.
      expect(dist).toBeGreaterThan(100);
    }
  });

  it("NO_DATA_COLOR matches MoodHeatmap's own empty-slot convention", () => {
    expect(NO_DATA_COLOR).toBe("var(--color-slate-800)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/affectToneColor.test.ts`
Expected: FAIL — `Cannot find module './affectToneColor'`

- [ ] **Step 3: Write the implementation**

Create `src/services/affectToneColor.ts`:

```ts
// Three-stop warm gradient built exclusively from the orb's own accent palette (NilaFace.tsx) — never
// rose, which this codebase reserves exclusively as the crisis safety signal. index.css (lines
// ~415-422) already documents this exact "everyday badge painted from the crisis-exclusive rose
// token" pattern being proposed and rejected once before, for a different feature — this file must
// not reintroduce it. The negative end is capped at deep mauve BY CONSTRUCTION: there is no
// rose/terracotta value anywhere in this file for interpolation to reach.
//
// Lowercase hex constants deliberately — rgbToHex always emits lowercase, so the boundary tests
// (valenceToColor(-1) === NEGATIVE, etc.) are exact string equality, not a case-insensitive compare.
const NEGATIVE = "#b06aa0"; // NilaFace.tsx PALETTES.anxious.primary — orb's negative-tint deep mauve
const NEUTRAL = "#c784b0";  // NilaFace.tsx PALETTES.calm.primary — orb's resting identity color
const POSITIVE = "#fdefdc"; // orb accent's positive-tint warm cream (NilaFace.tsx accent flicker)

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** valence in [-1, 1] → a hex color on the orb's own cream↔mauve ramp. */
export function valenceToColor(valence: number): string {
  const clamped = Math.max(-1, Math.min(1, valence));
  const [fromHex, toHex, t] =
    clamped < 0 ? [NEGATIVE, NEUTRAL, clamped + 1] : [NEUTRAL, POSITIVE, clamped];
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  return rgbToHex([lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)]);
}

/** The neutral/empty-slot color — a day with no chat, distinct from any valence reading. Matches
 *  MoodHeatmap.tsx's own "no data = dark slot" convention. */
export const NO_DATA_COLOR = "var(--color-slate-800)";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/affectToneColor.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/affectToneColor.ts src/services/affectToneColor.test.ts
git commit -m "feat: add orb-palette color ramp for the mood-tone chart (never rose)"
```

---

## Task 2: `affectToneChart.ts` — pure data-shaping

**Files:**
- Create: `src/services/affectToneChart.ts`
- Create: `src/services/affectToneChart.test.ts`

**Interfaces:**
- Consumes: `recentAffectDays`, `computeConversationToneSummary` from `./chatAffect` (both already shipped).
- Produces: `buildAffectToneStrip(now?): AffectToneStrip`,
  `interface AffectToneStrip { sufficient: boolean; cells: AffectToneCell[] }`,
  `interface AffectToneCell { date: string; valence: number; count: number }`. Task 3 consumes this directly.

- [ ] **Step 1: Write the failing tests**

Create `src/services/affectToneChart.test.ts`:

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

import { buildAffectToneStrip } from "./affectToneChart";
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

describe("buildAffectToneStrip — pure data-shaping for the mood-tone chart", () => {
  it("sufficient is false with no data", () => {
    expect(buildAffectToneStrip(Date.now()).sufficient).toBe(false);
  });

  it("sufficient is false below computeConversationToneSummary's own dual floor", () => {
    const now = Date.now();
    seedDay(now, 0, -0.5, 1);
    seedDay(now, 1, -0.5, 1);
    seedDay(now, 2, -0.5, 1); // 3 days clears the day-count floor, but only 3 total readings (<10)
    expect(buildAffectToneStrip(now).sufficient).toBe(false);
  });

  it("sufficient is true once the dual floor clears", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2); // 9 days, 18 readings — clears both
    expect(buildAffectToneStrip(now).sufficient).toBe(true);
  });

  it("sufficient is false when persistence reads are disabled, even with data present", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    setAffectAccentPersistenceEnabled(false);
    expect(buildAffectToneStrip(now).sufficient).toBe(false);
  });

  it("cells are chronological (oldest first), not recentAffectDays' native most-recent-first order", () => {
    const now = Date.now();
    seedDay(now, 2, -0.9, 2);
    seedDay(now, 1, 0.0, 2);
    seedDay(now, 0, 0.5, 2);
    const { cells } = buildAffectToneStrip(now);
    expect(cells.map((c) => c.date)).toEqual([...cells.map((c) => c.date)].sort());
  });

  it("sparse days are simply absent from cells, never a zero-valence placeholder", () => {
    const now = Date.now();
    seedDay(now, 5, -0.5, 2);
    seedDay(now, 0, 0.5, 2); // gap of days 1-4 with no chat at all
    const { cells } = buildAffectToneStrip(now);
    expect(cells.length).toBe(2);
    expect(cells.some((c) => c.valence === 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/affectToneChart.test.ts`
Expected: FAIL — `Cannot find module './affectToneChart'`

- [ ] **Step 3: Write the implementation**

Create `src/services/affectToneChart.ts`:

```ts
import { recentAffectDays, computeConversationToneSummary } from "./chatAffect";

export interface AffectToneCell {
  date: string;
  valence: number;
  count: number;
}

export interface AffectToneStrip {
  sufficient: boolean;
  cells: AffectToneCell[]; // chronological (oldest → newest), sparse days simply absent
}

const WINDOW_DAYS = 30; // matches chatAffect.ts's own RETENTION_DAYS cap — this is the whole history

/** Pure data-shaping for the mood-tone chart. No DOM here — see AffectToneStrip.tsx for rendering.
 *  `sufficient` reuses computeConversationToneSummary's own dual floor (day-count scaled to the
 *  window, plus a total-readings floor) rather than a separate, looser threshold — the user-facing
 *  surface must not be less conservative than the clinician-facing one for the identical signal. */
export function buildAffectToneStrip(now: number = Date.now()): AffectToneStrip {
  const sufficient = computeConversationToneSummary(WINDOW_DAYS, now) !== null;
  const cells = [...recentAffectDays(WINDOW_DAYS, now)] // most-recent-first
    .reverse() // → chronological, oldest first, matching the strip's left-to-right reading order
    .map((d) => ({ date: d.date, valence: d.valence, count: d.count }));
  return { sufficient, cells };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/affectToneChart.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/affectToneChart.ts src/services/affectToneChart.test.ts
git commit -m "feat: add pure data-shaping for the mood-tone chart"
```

---

## Task 3: `AffectToneStrip.tsx` + `DashboardScreen.tsx` wiring

**Files:**
- Create: `src/components/AffectToneStrip.tsx`
- Create: `src/components/AffectToneStrip.test.tsx`
- Modify: `src/components/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `buildAffectToneStrip` from `../services/affectToneChart` (Task 2); `valenceToColor`,
  `NO_DATA_COLOR` from `../services/affectToneColor` (Task 1); `localDateKey` from
  `../services/storageUtils` (already shipped).
- Produces: default export `AffectToneStrip` — a self-contained card component taking no props,
  matching `WellbeingTrendCard`/`PhaseTimeline`'s self-wrapping-card convention.

- [ ] **Step 1: Write the failing tests**

Create `src/components/AffectToneStrip.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import { render, screen } from "@testing-library/react";
import React from "react";
import AffectToneStrip from "./AffectToneStrip";
import { setAffectAccentPersistenceEnabled, noteChatAffect } from "../services/chatAffect";

// @vitest-environment jsdom

beforeEach(() => {
  document.body.innerHTML = "";
  store = {};
  setAffectAccentPersistenceEnabled(false);
});

describe("AffectToneStrip", () => {
  it("renders the empty state when below the floor", () => {
    render(<AffectToneStrip />);
    expect(screen.getByText("Conversation tone (automatic)")).toBeTruthy();
    expect(screen.getByText("No data yet.")).toBeTruthy();
  });

  it("renders 30 dots and the attribution caption once the floor clears", () => {
    setAffectAccentPersistenceEnabled(true);
    const now = Date.now();
    for (let d = 0; d < 9; d++) {
      const ts = now - d * 86400000;
      noteChatAffect({ valence: -0.5, arousal: 0 }, ts);
      noteChatAffect({ valence: -0.5, arousal: 0 }, ts);
    }
    const { container } = render(<AffectToneStrip />);
    expect(container.querySelectorAll(".rounded-full").length).toBe(30);
    expect(screen.getByText(/not something you told the app/)).toBeTruthy();
  });
});
```

(Note: this mocks `secureLocal` fully with an in-memory `store`, rather than `MoodHeatmap.test.tsx`'s
`vi.importActual` passthrough — that pattern works there only because `MoodHeatmap` takes its data as a
prop and never actually touches storage. `AffectToneStrip` genuinely reads through `chatAffect.ts`, so
it needs the same real, isolated in-memory store the pure-function tests already use, or test data
could leak between the two `it` blocks via whatever `secureLocal` really resolves to in this test
environment.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AffectToneStrip.test.tsx`
Expected: FAIL — `Cannot find module './AffectToneStrip'`

- [ ] **Step 3: Write the implementation**

Create `src/components/AffectToneStrip.tsx`:

```tsx
import React from "react";
import { buildAffectToneStrip } from "../services/affectToneChart";
import { valenceToColor, NO_DATA_COLOR } from "../services/affectToneColor";
import { localDateKey } from "../services/storageUtils";

/** A 30-cell horizontal strip, one circular dot per day — deliberately NOT a multi-week grid like
 *  MoodHeatmap (chatAffect.ts only retains 30 days total; a miniature "Year in Pixels" would
 *  misrepresent that as a denser dataset than it is) and deliberately circular, not MoodHeatmap's
 *  rounded squares, so the two cards are never mistakable for each other at a glance. */
export default function AffectToneStrip() {
  const { sufficient, cells } = buildAffectToneStrip();
  const byDate = new Map(cells.map((c) => [c.date, c]));

  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
        Conversation tone (automatic)
      </h3>
      {!sufficient ? (
        <p className="text-[11px] text-slate-500">No data yet.</p>
      ) : (
        <>
          <div
            className="flex gap-1 overflow-x-auto"
            role="img"
            aria-label="Conversation tone over the last 30 days, an automatic estimate"
          >
            {Array.from({ length: 30 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (29 - i));
              const key = localDateKey(d);
              const cell = byDate.get(key);
              return (
                <div
                  key={key}
                  title={cell ? `${key}: ${cell.count} conversation${cell.count === 1 ? "" : "s"}` : `${key}: no data`}
                  className="rounded-full shrink-0"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: cell ? valenceToColor(cell.valence) : NO_DATA_COLOR,
                  }}
                />
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            An automatic tone estimate from the app's on-device model — not something you told the app.
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AffectToneStrip.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire into `DashboardScreen.tsx`**

Add to the imports (after the existing `import TrendChart, { PHQ9_BANDS, GAD7_BANDS } from "./TrendChart";` line):

```tsx
import AffectToneStrip from "./AffectToneStrip";
```

Find the existing Mood Heatmap block:

```tsx
       {/* Mood Heatmap — Year in Pixels */}
       {mood.length >= 7 && (
         <MoodHeatmap moods={mood} days={182} />
       )}
```

Add the new card immediately after it (unconditional — the component handles its own empty/sufficient
state internally, matching `TrendChart`'s self-contained empty-state pattern rather than `MoodHeatmap`'s
parent-level `{mood.length >= 7 && ...}` gate):

```tsx
       {/* Mood Heatmap — Year in Pixels */}
       {mood.length >= 7 && (
         <MoodHeatmap moods={mood} days={182} />
       )}

       {/* Conversation tone — orb affect accent, automatic estimate, own empty-state handling */}
       <AffectToneStrip />
```

- [ ] **Step 6: Type-check**

Run: `npm run lint`
Expected: no new TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/AffectToneStrip.tsx src/components/AffectToneStrip.test.tsx src/components/DashboardScreen.tsx
git commit -m "feat: add the mood-tone chart to DashboardScreen"
```

---

## Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all suites green — no regressions. `AffectToneStrip` is inert (renders "No data yet.")
in every existing test that doesn't explicitly enable `setAffectAccentPersistenceEnabled` and seed data,
which no existing `DashboardScreen`-adjacent test does.

- [ ] **Step 2: Run the type checker**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Confirm no flags flipped**

Run: `grep -rn "setAffectAccentPersistenceEnabled(true)\|setAffectAccentEnabled(true)" src/main.tsx`
Expected: no matches (only the existing comment reference, if any) — this plan does not enable either
upstream flag.

## Explicitly out of scope for this plan

- Arousal encoding of any kind.
- Any change to `MoodHeatmap.tsx`, its palette, or its data source.
- A tap/expand interaction beyond the hover tooltip.
- Any change to `chatAffect.ts`'s 30-day retention window.
- Flipping either rollout flag.
