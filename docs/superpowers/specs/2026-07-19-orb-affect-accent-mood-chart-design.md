# Orb affect accent — mood-tone chart (user-facing visualization)

Status: approved by user (revised post Fable design review), ready for implementation planning
Date: 2026-07-19
Relationship to prior specs: explicitly named and declined in [2026-07-19-orb-affect-accent-
phase2-design.md](2026-07-19-orb-affect-accent-phase2-design.md)'s "Explicitly out of scope" ("A UI
surface for `recentAffectDays()` beyond feeding the digest... not requested, not designed here"). This
spec is that design pass, now requested. Reads from `chatAffect.ts::recentAffectDays()` (Phase 2) and
reuses `computeConversationToneSummary`'s floor logic (the clinician-report-v2 spec).

## Problem

The orb affect accent's day-bucketed conversation-tone history exists only as machine-readable data
(`chatAffect.ts`) and one clinician-facing text consumer. There is no way for the user themselves to
look back at how their conversations have trended. This spec adds that surface: a small chart on
`DashboardScreen.tsx`, the app's existing "look back at how you've been feeling" screen (already home
to `MoodHeatmap`, `TrendChart`, `WellbeingTrendCard`, `PhaseTimeline`).

## Key finding that shapes this design — a color decision this codebase already made once

The initial proposal for this chart reused the dashboard's existing emerald→amber→rose gradient (the
same palette `MoodHeatmap` uses for self-reported check-in mood), for visual consistency with the rest
of that screen. Fable's review rejected this, and — critically — the rejection isn't a fresh judgment
call. `index.css` (lines ~415-422) already documents this exact pattern being proposed and declined
once before, for a different feature: *"an everyday 'low mood' badge painted from `--color-danger`
would look like a crisis signal exactly when the app should look calmest"* — because in light/Sunrise
theme, rose resolves to a vivid coral-red (`--color-rose-500: #BE3F26`) that is this codebase's
**crisis-exclusive role token**. `NilaFace.tsx`'s own crisis palette is built from that same rose
family. This is not a coincidence to route around — it's a standing house rule this spec must obey:

> **Color encodes provenance in this app, not just severity.** The emerald→amber→rose gradient is
> reserved for what the user told the app (check-ins, assessments — `MoodHeatmap`'s rose cell is "the
> user's own hand reflected back," carrying no automation-bias risk). The orb's own peach-cream→mauve
> palette is reserved for what the app inferred. **The machine's voice always wears the orb's colors,
> never rose.**

Practically: a chart showing this unvalidated (66-74% held-out accuracy), machine-inferred signal in
rose risks two concrete harms — (1) automation bias, where a user's own accurate self-report ("I said
I was fine") gets silently second-guessed by a wrong-colored chart cell claiming otherwise, the
project's #1 named harm (sycophancy/distortion of self-perception, just running in the opposite
direction); (2) diluting the crisis-red signal's meaning through repeated false-alarm-colored everyday
cells, for the moment it's actually needed. Shape or label differentiation alone does not fix this —
color is read preattentively, at glance distance, before any caption is parsed; two rose-colored grids
on one screen read as "two red weeks," not two different kinds of data.

## Constraints

- **Never rose.** The chart's color ramp is built exclusively from the orb's own accent palette
  (`NilaFace.tsx`'s `PALETTES.anxious.primary` `#B06AA0`, `PALETTES.calm.primary` `#C784B0`, and the
  orb accent's own positive-tint cream `#FDEFDC`) — capped so the negative end can never drift into
  rose/terracotta hue territory, by construction (no rose value anywhere in the interpolation).
- **Reuse the exact floor `computeConversationToneSummary` already uses** — not `clinicianCharts.ts`'s
  generic `MIN_TREND_POINTS = 3`. Making the user-facing surface *less* conservative than the
  clinician-facing one for the identical signal would be backwards. The chart's "enough data to show"
  gate is `computeConversationToneSummary(30, now) !== null` — the same dual floor (day-count scaled to
  the window, plus a total-readings floor) already governing the clinician report.
- **Form factor must differ from `MoodHeatmap`, not just color.** `chatAffect.ts` retains only 30 days
  (`RETENTION_DAYS = 30`); `MoodHeatmap` shows 182 days as a multi-week grid. A miniature "Year in
  Pixels" clone of a 30-day slice would misrepresent the data's actual shape regardless of color. This
  spec uses a **single-row, 30-cell strip of circular dots** — visually distinct in both form factor and
  shape from `MoodHeatmap`'s multi-week grid of rounded squares.
- **Valence only in v1** — no arousal encoding. Two visual dimensions per cell reads as a denser,
  more gauge-like readout; this codebase already has a standing no-gauge policy for this exact class of
  unvalidated signal (`clinicianCharts.ts`'s documented FDA Non-Device CDS / automation-bias rationale).
- **Sparse days render as neutral-empty, never interpolated** — a day with no chat is not a data point
  to smooth over; it's the absence of one. Matches `MoodHeatmap`'s "no data = dark slot" convention.
- **Gated behind `setAffectAccentPersistenceEnabled`** (already the effective gate, since
  `recentAffectDays()` returns `[]` when it's off) — no new flag. The below-floor state and the
  gate-off state must render **identically** — a neutral empty card, never an explanation that leaks
  which gate is closed.
- **The empty state carries no engagement pressure.** Never phrasing like "chat more to see your tone
  history" — no engagement hook hung off a mental-health inference. Matches `TrendChart`'s neutral "No
  data yet" register exactly.

## Design

### 1. `src/services/affectToneChart.ts` — pure data-shaping, mirrors `clinicianCharts.ts`'s pattern

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

### 2. `src/services/affectToneColor.ts` — the color ramp, never rose

```ts
// Three-stop warm gradient built exclusively from the orb's own accent palette (NilaFace.tsx) — never
// rose, which this codebase reserves exclusively as the crisis safety signal (see this spec's Key
// finding; index.css already documents this exact "everyday badge painted from the crisis token"
// pattern being proposed and rejected once before). The negative end is capped at deep mauve by
// construction — there is no rose/terracotta value anywhere in this file for interpolation to reach.
// Lowercase deliberately — rgbToHex below always emits lowercase, so the boundary tests
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

/** The neutral/empty-slot color — a day with no chat, distinct from any valence reading. */
export const NO_DATA_COLOR = "var(--color-slate-800)"; // matches MoodHeatmap's own no-data convention
```

### 3. `src/components/AffectToneStrip.tsx` — the card

```tsx
import React from "react";
import { buildAffectToneStrip } from "../services/affectToneChart";
import { valenceToColor, NO_DATA_COLOR } from "../services/affectToneColor";

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
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

Rendered on `DashboardScreen.tsx` alongside the existing `MoodHeatmap`/`TrendChart`/`WellbeingTrendCard`/
`PhaseTimeline` cards — same card container style (`glass rounded-2xl p-4`), same screen, no new nav
entry needed.

## Testing

- `affectToneChart.test.ts`: `sufficient` is `false` below the dual floor and `true` once it clears
  (mirroring `computeConversationToneSummary`'s own floor tests — this function's floor behavior is a
  direct pass-through, so tests assert the pass-through, not re-derive the floor math independently);
  `sufficient` is `false` when `setAffectAccentPersistenceEnabled` is off, even with underlying data
  present; `cells` is chronological (oldest first), not `recentAffectDays`'s native most-recent-first
  order; sparse days are simply absent from `cells`, never a zero-valence placeholder.
- `affectToneColor.test.ts`: `valenceToColor(-1)` equals `NEGATIVE` exactly; `valenceToColor(1)` equals
  `POSITIVE` exactly; `valenceToColor(0)` equals `NEUTRAL` exactly; values are clamped outside `[-1,1]`;
  **a regression test scanning every color this function can ever produce for any rose/red hue** — e.g.
  asserting no output at 0.01 intervals across `[-1,1]` has a red channel dominating both green and blue
  by the margin that would read as "warm red" rather than "warm mauve/cream" (a concrete, automatable
  guard against a future edit accidentally widening the ramp into rose territory).
- `AffectToneStrip.tsx`: no dedicated component test — mirrors `MoodHeatmap.tsx`/`TrendChart.tsx`'s
  existing convention (neither has one; the pure data/color functions above carry the real logic and
  are what's tested), consistent with this codebase's established pattern of testing extracted pure
  functions rather than mounting chart components.

## Rollout

No new flag. Gated entirely by `setAffectAccentPersistenceEnabled`'s existing off-by-default state —
`recentAffectDays()` already returns `[]` when it's off, which makes `computeConversationToneSummary`
return `null`, which makes `sufficient` false, which renders the neutral empty card. Nothing in this
spec changes behavior until that flag (and Phase 1's `setAffectAccentEnabled`, upstream of it) are
flipped on a real device — decisions this spec does not make.

## Explicitly out of scope

- Arousal encoding of any kind (cell size, opacity, a second row) — valence-only for v1, per Constraints.
- Any change to `MoodHeatmap.tsx`, its palette, or its data source — this spec adds a new, separate
  component; it does not touch the existing self-report heatmap.
- A tap/expand interaction revealing more detail per cell beyond the hover tooltip (conversation count)
  — not requested, not designed here.
- Continuous (non-30-day-capped) history, or any change to `chatAffect.ts`'s retention window.
- Reusing rose/danger tokens anywhere in this feature, in any theme, for any reason — this constraint
  is treated as permanent, not a v1 placeholder to revisit.
