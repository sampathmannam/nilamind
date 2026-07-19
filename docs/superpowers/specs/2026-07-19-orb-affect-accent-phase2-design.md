# Orb affect accent — Phase 2 (persistence consumers)

Status: approved by user, ready for implementation planning
Date: 2026-07-19
Supersedes: the "Persistence (revised per Fable review — Phase 2, separately gated)" section of
[2026-07-19-orb-affect-accent-design.md](2026-07-19-orb-affect-accent-design.md) — that section named
the two consumers and the invariant they must carry but deliberately left the exact fold rule and
storage shape undesigned. This spec fills that in.

## Problem

Phase 1 shipped `chatAffect.ts`, a write-only latch storing the single most recent per-turn
`{valence, arousal}` reading (overwritten every turn, no history). Nothing reads it. Phase 2 wires two
read consumers Phase 1 explicitly deferred:

1. `modeEngine.ts::getUserState()` — the day-level `UserState` synthesis that already drives the orb's
   palette/speed and other UI (must carry the same "never overrides explicit self-report" invariant
   every existing fold in that file already states).
2. The compounding-memory digest (`buildReflectionDigest()` in `nilaContext.ts`, feeding
   `nilaInsights.ts`'s daily LLM reflection) — a 30-day narrative summary.

**Key finding that reshapes the design:** these two consumers need different temporal shapes. The
`modeEngine` fold is inherently "how has today been going" — `chatAffect.ts`'s single-latest-reading
shape is nearly right for this already. The digest is inherently multi-day ("the last week trended
X") — a single latest reading says nothing meaningful there. Phase 1's storage shape can't serve both,
so this spec upgrades `chatAffect.ts` from a single latch to a day-bucketed rolling history, and both
consumers read different slices of the same store.

## Constraints (carried from Phase 1, still binding)

- Every fold this spec adds must carry the exact invariant `foldElevation`/`foldCompoundSignals`
  already state (`modeEngine.ts:82-84,104`): **never overrides an explicit self-reported `anxious` or
  `low`**. It may only promote from `base === null || base === "calm"` — the identical gate
  `foldElevation` already uses (`modeEngine.ts:86-90`).
- The clinician report is **not** a consumer here either — that constraint from Phase 1 stands
  unchanged and is not reopened by this spec.
- Both new read paths are gated behind `setAffectAccentPersistenceEnabled` (named in the Phase 1 spec,
  not yet implemented), off by default. This is a **second, independent gate** on top of Phase 1's
  `setAffectAccentEnabled`: `chatAffect.ts` only ever receives data when Phase 1's flag is on (writes
  happen in `ModeScreen.tsx` only when `affectAccentActive()` is true), so Phase 2's consumers can be
  fully wired and tested against synthetic history while remaining functionally inert on a real device
  until *both* flags are flipped.
- Fail-closed / best-effort throughout, matching every existing fold and digest line in this codebase
  (each already wrapped in its own try/catch so a storage error can't take down `getUserState()` or
  `buildReflectionDigest()`).

## Design

### 1. `chatAffect.ts` — day-bucketed rolling history

Replace the single-latest-reading latch with a capped map, one running-average bucket per **local**
calendar day (`localDateKey()` from `storageUtils.ts` — this codebase's established day-key utility;
never `toISOString()`, which rolls the day over at UTC midnight and mis-stamps local evening entries,
per that function's own doc comment and the 2026-07-17 tester-pass fix it documents).

```ts
interface AffectBucket { valence: number; arousal: number; count: number }
type AffectHistory = Record<string, AffectBucket>; // key: localDateKey(), e.g. "2026-07-19"
```

- `noteChatAffect(reading, now = Date.now())`: folds `reading` into *today's* bucket as a running
  average (`newAvg = (oldAvg * count + reading) / (count + 1)`, `count++`) instead of overwriting a
  single value. Creates today's bucket if absent.
- On every write, prune any bucket keyed more than 30 days before `localDateKey(new Date(now))` —
  bounded storage regardless of message volume (matches `buildReflectionDigest()`'s own 30-day window).
- New reader `todayAffectBucket(now = Date.now()): AffectBucket | null` — today's bucket, or null if
  absent. Consumed by the `modeEngine` fold (Design §2).
- New reader `recentAffectDays(days: number, now = Date.now()): Array<{ date: string } & AffectBucket>`
  — buckets from the last `days` local days that have data (sparse — days with no chat produce no
  entry), most recent first. Consumed by the digest line (Design §3).
- The Phase 1 test file (`chatAffect.test.ts`) already covers write/overwrite/`Date.now()`-default —
  this spec's implementation task rewrites those tests for the new running-average/bucket-key shape
  (there is no "latest single value" left to test once this ships).

### 2. `modeEngine.ts` — `foldAffectAccent`, reads *today's* bucket only

New fold, chained last in `getUserState()` (after the existing `foldElevation`/`foldCompoundSignals`
chain at `modeEngine.ts:69-71`) — appending last is safe because it only ever promotes from
`null`/`calm`, so it can never undo an `elevated` promotion `foldElevation` already made, exactly the
same non-interference property `foldCompoundSignals` already has with `foldElevation`'s output.

```ts
// NEVER overrides explicit distress self-report OR an elevation promotion already made this call —
// only ever promotes from null/calm, same gate as foldElevation.
export function foldAffectAccent(base: UserState | null, today: AffectBucket | null): UserState | null {
  if (base !== null && base !== "calm") return base;
  if (!today || today.count < 2) return base; // dead-zone: need >=2 readings today, not one noisy message
  if (today.valence > -0.4) return base; // not clearly negative
  return today.arousal >= 0.2 ? "anxious" : "low";
}
```

Thresholds (`count >= 2`, `valence <= -0.4`, `arousal >= 0.2` split) are an empirically-informed
engineering judgment call, not a fitted value — same posture as this codebase's other uncalibrated
defaults (`crisisClassifier.ts`'s `CRISIS_HIGH_CONFIDENCE_THRESHOLD`, Phase 1's own dead-zone/cooldown
constants). Tuned during implementation against real usage once device-verified, not treated as final.

**Feedback-loop check (the concern Fable flagged in the Phase 1 review):** `getUserState()`'s `base`
is re-derived fresh from check-in data on every call (`modeEngine.ts:38-75`) — it is never the previous
call's *output*. `foldAffectAccent`'s own input (`today`'s bucket) is likewise independent of what
`UserState` the render layer currently shows. So there is no cycle where this fold's output feeds back
into its own next input — each call is a stateless function of (check-in, elevation signals, today's
affect bucket), not of the orb's own prior rendered state. No oscillation risk to guard against beyond
the dead-zone already specified.

### 3. Digest line — `buildReflectionDigest()`, reads the last 7 days, minimum-data floor

New line in `nilaContext.ts::buildReflectionDigest()` (alongside the existing `Check-ins`/`Skills that
have helped`/`Hard moments` lines, `nilaContext.ts:691-747`), same factual/data-shaped style — this
feeds the reflection LLM raw material to *optionally* surface as an `Insight`, it is not pre-written
prose shown directly to the user (matching the file's own stated pattern: "a compact, DERIVED summary
... for the daily reflection job").

```ts
try {
  const affectDays = recentAffectDays(7);
  if (affectDays.length >= 3) { // minimum-data floor — a single bad day never asserts a "trend"
    const avgValence = Math.round(
      (affectDays.reduce((s, d) => s + d.valence, 0) / affectDays.length) * 100
    ) / 100;
    const trend = avgValence <= -0.2 ? "trended difficult" : avgValence >= 0.2 ? "trended positive" : "stayed mixed";
    lines.push(`Conversation tone (${affectDays.length}d): ${trend}; avg valence ${avgValence}.`);
  }
} catch {
  /* best-effort — matches every other block in this function */
}
```

The `>= 3` distinct-day floor is the same "minimum-data-floor before any trend claim renders" discipline
Fable required for the (rejected) clinician-report path in Phase 1 — applied here too even though the
audience differs (this feeds `nilaInsights.ts`'s warm, second-person `NilaMemoryScreen.tsx` surface, not
a clinical document), because the underlying risk (asserting a "trend" off noise) is the same regardless
of who reads the output.

**No new `Insight` shape.** This does not add a code path that deterministically mints an `Insight`
from a number — `nilaInsights.ts` has no such precedent (every existing `Insight.text` is LLM-authored
or user-authored free text; see the researched precedent in `nilaContext.ts`'s other context-block
functions for continuous→descriptive-text conversion, e.g. `buildPersonalContext`'s "energy has been
rising/falling" lines). The new line only ever hands the reflection LLM one more factual data point,
the same tier as every other line in the function; whether/how it becomes a visible `Insight` is
entirely the existing LLM-mediated `fetchReflection`/`reconcile` pipeline's call, unchanged by this spec.

### 4. Rollout

Both new read paths — `foldAffectAccent` in `getUserState()` and the new digest line — are gated
behind `setAffectAccentPersistenceEnabled` (off by default). Since this sits on top of Phase 1's
already-off `setAffectAccentEnabled`, Phase 2 can be fully implemented, tested against synthetic
`AffectHistory` fixtures, and merged without any behavior change on a real device until *both* flags
are manually flipped — mirroring the "persistence consumers earn their way in behind separate flags"
sequencing Phase 1's own spec already committed to.

## Testing

- `chatAffect.test.ts` (rewritten): running-average fold-in math for repeated same-day notes; a new
  day creates a new bucket rather than continuing yesterday's average; 30-day pruning drops buckets
  older than the cutoff relative to `now`; `todayAffectBucket`/`recentAffectDays` read shapes,
  including the "no data for today" / "fewer than N days present" cases.
- `modeEngine.test.ts`: a dedicated `describe("foldAffectAccent — ...")` block mirroring the existing
  `foldElevation` block's shape — passthrough when `base` is `anxious`/`low`/`elevated`; passthrough
  when `today` is null or `count < 2`; passthrough when `valence > -0.4`; promotes `null`/`calm` to
  `"low"` vs `"anxious"` on the arousal split; then the same invariants re-asserted through the full
  `getUserState()` integration test with mocked storage, per that file's existing two-tier pattern.
- `nilaContext.digest.test.ts`: asserts the new "Conversation tone" line appears only with `>= 3` days
  of synthetic history and is absent below that floor; asserts the line contains only the derived
  `avgValence` number and trend word, never raw per-message text (this file's existing privacy-invariant
  assertion pattern — no free-text field ever leaks into the digest).
- Full `tsc` + suite green before any version tag, per usual project process. No on-device verification
  is required to merge this (unlike Phase 1) since both flags stay off — but a sanity pass is still
  warranted before either flag is ever flipped on a real device, at that time.

## Explicitly out of scope

- Flipping either `setAffectAccentEnabled` (Phase 1) or `setAffectAccentPersistenceEnabled` (this
  spec) on by default — both stay manual, gated on their own device-verification passes.
- The clinician report as a consumer — unchanged from Phase 1's rejection; not reopened here.
- A deterministic `Insight`-minting path in `nilaInsights.ts` — the digest line only ever feeds the
  existing LLM-mediated reflection pipeline one more data point, per Design §3.
- Retuning Phase 1's `resolveAccentRender` dead-zone/cooldown/tint constants — unrelated to persistence,
  untouched by this spec.
- A UI surface for `recentAffectDays()` beyond feeding the digest (e.g. a chart/graph of mood-tone over
  time) — not requested, not designed here.
