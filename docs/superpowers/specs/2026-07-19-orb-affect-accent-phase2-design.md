# Orb affect accent — Phase 2 (persistence consumers)

Status: approved by user (revised post Fable design review), ready for implementation planning
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
  `low`**.
- **Revised per Fable review:** `foldElevation`'s `base === null || base === "calm"` gate does NOT
  transfer to this fold as-is. `foldElevation` is justified in overriding `calm` because hypomanic
  self-report is characteristically unreliable (Østergaard 2023) and its signal is high-precision by
  construction — neither property holds for a soft valence/arousal estimate off two chat messages.
  `modeEngine.ts:53` maps a check-in of "okay/good/fine/calm" to `base = "calm"`; without this
  revision, this fold would let the orb visibly contradict a user's own same-day "I'm okay" — the
  project's #1 harm (invalidation), not a hypothetical. This fold may promote from `base === null`
  unconditionally, but may only promote from `base === "calm"` when there is **no check-in today**
  (`hasCheckinToday(localDateKey())` — already imported/used in this file, `modeEngine.ts:140`).
  Affect may fill the absence of self-report (including a `calm` derived from a *stale*, prior-day
  check-in); it must never re-color a same-day one. See Design §2 for the exact gate.
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

**Why averaging (not the raw sequence) is the right shape here, per Fable review:** a single severe
message diluted into an otherwise-fine day's average sounds like a loss of signal, but that acute case
is deliberately not this layer's job. A genuinely severe message is caught by §9/the crisis classifier
(model-independent, unconditional, runs first). In-the-moment acknowledgment is already Phase 1's
per-turn flicker, which renders off that same turn's own value directly in `ModeScreen.tsx`/`NilaFace`,
never off this store. This store is the slow, ambient, day-level layer specifically — and a slow layer
that whipsaws on one message would be worse than one that dilutes it. The reverse risk (one cheerful
message masking an otherwise bad day) is handled acceptably by the fold's `-0.4` bar in Design §2: the
day has to be predominantly negative to register at all.

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
- **Pinned per Fable review: stored readings are the raw blended head output, never render-damped.**
  Phase 1's `resolveAccentRender` (`nilaFaceAccent.ts`) damps arousal-driven *pulse magnitude* at
  render time inside `NilaFace.tsx`, specifically when `state === "anxious"` — a display-only
  transform. `ModeScreen.tsx`'s Phase 1 wiring already calls `noteChatAffect(turnAffectAccent)` with
  `turnAffectAccent = blendAffect(userScore, nilaScore)` — the raw blended value — *before* that value
  is ever passed to `NilaFace`/`resolveAccentRender`, so this property already holds structurally (the
  render-side damping lives in a different module and never flows back into what gets stored). This
  spec adds an explicit regression test pinning it (Testing, below), since nothing currently asserts it
  and a future refactor could silently break the boundary.

### 2. `modeEngine.ts` — `foldAffectAccent`, reads *today's* bucket only

New fold, chained last in `getUserState()` (after the existing `foldElevation`/`foldCompoundSignals`
chain at `modeEngine.ts:69-71`) — appending last is safe because it only ever promotes from
`null`/`calm`, so it can never undo an `elevated` promotion `foldElevation` already made, exactly the
same non-interference property `foldCompoundSignals` already has with `foldElevation`'s output.

```ts
// NEVER overrides explicit distress self-report (anxious/low/elevated). May promote from null
// unconditionally; may promote from "calm" ONLY when there is no check-in today (a same-day "I'm
// okay" is self-report and must never be re-colored — see Constraints, Fable review).
export function foldAffectAccent(
  base: UserState | null,
  today: AffectBucket | null,
  checkedInToday: boolean
): UserState | null {
  if (base !== null && base !== "calm") return base;
  if (base === "calm" && checkedInToday) return base;
  if (!today || today.count < 3) return base; // need a real exchange, not one noisy message
  if (today.valence > -0.4) return base; // not clearly negative
  return today.arousal >= 0.2 ? "anxious" : "low";
}
```

Called from `getUserState()` as `foldAffectAccent(withCompoundSignals, todayAffectBucket(), hasCheckinToday(localDateKey()))`.

Thresholds (`count >= 3` — raised from an initial `2` per Fable review, cheap and reduces boundary
flapping; `valence <= -0.4`, `arousal >= 0.2` split) are an empirically-informed engineering judgment
call, not a fitted value — same posture as this codebase's other uncalibrated defaults
(`crisisClassifier.ts`'s `CRISIS_HIGH_CONFIDENCE_THRESHOLD`, Phase 1's own dead-zone/cooldown
constants). Tuned during implementation against real usage once device-verified, not treated as final.

**Known, accepted residual gap (flagged by Fable, not closed by this spec):** `foldCompoundSignals`
can itself promote `base === null` to `"calm"` via its `resilience-cluster` signal
(`modeEngine.ts:122,127` — a deliberate protective classification from multi-modal passive-sensing
evidence). Because `foldAffectAccent` is chained after it and treats any `"calm"` the same way (subject
only to the same-day-check-in gate above), a `resilience-cluster`-derived `calm` with no check-in today
can still be overridden by this fold, the same as a plain default `calm` would be. Distinguishing
"calm because nothing said otherwise" from "calm because compound signals actively indicated
resilience" would require threading additional provenance through the fold chain that no fold in this
file currently carries. Per Fable's review, this is accepted as a known limitation for this pass rather
than solved now — worth a name-check during the eventual on-device verification, not a blocker.

**Feedback-loop check (the concern Fable flagged in the Phase 1 review):** `getUserState()`'s `base`
is re-derived fresh from check-in data on every call (`modeEngine.ts:38-75`) — it is never the previous
call's *output*. `foldAffectAccent`'s own input (`today`'s bucket) is likewise independent of what
`UserState` the render layer currently shows. So there is no cycle where this fold's output feeds back
into its own next input — each call is a stateless function of (check-in, elevation signals, today's
affect bucket), not of the orb's own prior rendered state — there is no feedback cycle.

**Boundary flapping is a separate, real concern (per Fable review) — not fully addressed by the
dead-zone.** The dead-zone guards single-reading noise, not a running average hovering near the
`-0.4` boundary: at low counts the average can cross back and forth across it turn to turn, visibly
flapping the orb between `calm`↔`low` across a short exchange. Raising `count >= 3` (above) narrows
this window but doesn't eliminate it. If this is visible during the eventual on-device pass, the fix
is exit hysteresis (enter at `<= -0.4`, exit only above `-0.3`, tracked as a small persisted "currently
in a promoted state today" flag) — not designed here, since it may prove unnecessary in practice.

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
    const avgValence = affectDays.reduce((s, d) => s + d.valence, 0) / affectDays.length;
    const trend = avgValence <= -0.2 ? "trended difficult" : avgValence >= 0.2 ? "trended positive" : "stayed mixed";
    lines.push(
      `Conversation tone (${affectDays.length}d, an automatic tone estimate — not something they said): ` +
      `${trend}. If this conflicts with what they've told you directly (e.g. a check-in), trust what they said.`
    );
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

**Revised per Fable review — provenance and no raw float.** Every other line in
`buildReflectionDigest()` is self-report (check-ins, skills used, episodes) and reads, to the
reflection LLM, as equally factual as this inferred one — the digest has no marker distinguishing
"the user said this" from "a model estimated this." Left unlabeled, a small model can plausibly
synthesize something like *"even when they say they're okay, things feel heavy for them"* —
the app contradicting the user's own self-report, in Nila's voice, on a durable, resurfaceable
`nilaInsights.ts` record. Two changes close this: (1) the line now says outright that it's "an
automatic tone estimate — not something they said" and instructs the model that self-report wins
on conflict, expressing the same "never overrides self-report" invariant in the only form this
prose pipeline can actually enforce it (the `modeEngine` fold enforces it mechanically; this path
has no equivalent mechanism, so it has to be said). (2) The raw `avgValence` float is dropped from
the line entirely — this codebase's own history (the exemplar-RAG/companion-voice work) already
established that small on-device models imitate their context near-verbatim, so a bare number like
"avg valence −0.43" left in the input is an invitation for that exact fragment to surface jargon
verbatim in a user-facing `Insight`, which `checkResponse` would not reliably catch. The trend word
plus the day count carries all the signal the model can actually use.

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
- **New regression test (per Fable review): `noteChatAffect` stores the raw blended value.** Asserts
  that calling `noteChatAffect` with a given `{valence, arousal}` produces exactly that value in
  today's bucket (post running-average math) — with no dependency on, or import of, anything from
  `nilaFaceAccent.ts`/`NilaFace.tsx`'s render-side damping. Pins the module-boundary property Design §1
  now states explicitly.
- `modeEngine.test.ts`: a dedicated `describe("foldAffectAccent — ...")` block mirroring the existing
  `foldElevation` block's shape — passthrough when `base` is `anxious`/`low`/`elevated`; passthrough
  when `today` is null or `count < 3`; passthrough when `valence > -0.4`; promotes `null` to `"low"`
  vs `"anxious"` on the arousal split regardless of check-in status; **promotes `"calm"` only when
  `checkedInToday` is `false`** — a dedicated test asserting a same-day `"calm"` (checkedInToday: true)
  is passed through untouched even with a strongly negative `today` bucket, this being the specific
  invalidation scenario the Fable review caught; then the same invariants re-asserted through the full
  `getUserState()` integration test with mocked storage, per that file's existing two-tier pattern.
- `nilaContext.digest.test.ts`: asserts the new "Conversation tone" line appears only with `>= 3` days
  of synthetic history and is absent below that floor; asserts the line contains the trend word and
  the "automatic tone estimate — not something they said" / self-report-wins language, but **never a
  raw numeric valence value** (revised per Fable review — the float was dropped from the line); asserts
  the line contains no raw per-message text (this file's existing privacy-invariant assertion pattern —
  no free-text field ever leaks into the digest).
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
- Any additional fields on `AffectBucket` beyond `{valence, arousal, count}` (e.g. a stored
  `minValence`/extremum for spike sensitivity) — explicitly declined per Fable review's data-minimization
  point: nothing in this spec's two consumers reads such a field, so it doesn't get stored speculatively.
  A future consumer that genuinely needs spike sensitivity designs its own field then.
- Exit hysteresis for the boundary-flapping risk named in Design §2 — not implemented now, flagged for
  the on-device pass to decide whether it's actually needed in practice.
