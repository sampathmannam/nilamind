# Orb affect accent

Status: approved by user, ready for implementation planning
Date: 2026-07-19

## Problem

`NilaFace.tsx` (the breathing orb, Nila's visual presence) already has a
5-state palette/motion system (`calm | anxious | low | elevated | crisis`),
but the `state` prop is a coarse, session/day-scoped read from
`modeEngine.ts::getUserState()` — refreshed once per turn, not a live
per-message signal. Nothing about the orb currently reacts to what was just
said in the current exchange; it only reflects how the day/session has been
going overall.

This spec adds a small, fast, per-turn "affect accent" on top of the existing
system: a brief warm/cool flicker on the orb's core highlight, reflecting the
emotional tone of the exchange that just happened, without altering the
orb's speed, size, or which of the 5 palettes is active.

## Constraints (non-negotiable, carried from project conventions and this
design's own review)

- **`faceMotion.ts` and the `PALETTES` object are untouched.** The existing
  state → speed mapping (including the deliberate `elevated`-slows-down,
  anti-sycophancy rule citing Østergaard 2023 on mania reinforcement) is not
  touched by this feature. The new accent is additive and cannot change
  `breatheSec`/`spinSec`/`shimmerSec`.
- **Dormant during `elevated` and `crisis`.** The accent is computed but not
  rendered whenever `UserState` is `elevated` or `crisis` — those states stay
  visually "quiet" and unambiguous, consistent with the existing safety
  posture.
- **On-device only.** The new head runs on the same on-device MiniLM
  embedding (`Xenova/all-MiniLM-L6-v2`, already bundled) the §9 crisis
  classifier uses. No new network calls, no new model download.
- **Fail-closed.** Any inference failure (model not loaded, embedding throws,
  head not yet device-verified) simply means no flicker for that turn — never
  blocks or delays the chat turn itself.
- **Clinician report keeps zero numeric risk indicators.** The recent
  clinician-report redesign deliberately removed risk-score sections in favor
  of per-episode narrative. This feature must not reintroduce a numeric/score
  artifact there — see Persistence below.

## Key finding that shapes the design

The crisis pipeline (`crisisEmbedder.ts` → `crisisClassifier.ts`) already
computes an on-device MiniLM sentence embedding of the user's message on
(effectively) every turn, feeding one logistic-regression head trained for
crisis probability. That embedding call is already memoized once per turn.
This means a second, independent head — trained for valence/arousal instead
of crisis — can ride the *same* embedding computation for the user's message
at near-zero additional cost. Only the embedding call for Nila's *reply* is
genuinely new (see Computation below).

The codebase also already has two independent, cheap, per-turn lexical
signals that are not currently fed to the orb: `detectEmotionUnified()`
(`personaConfig.ts`, 11-label regex classifier) and
`detectElevationRisk()` (`elevationGuard.ts`). These aren't reused directly
by this feature (a trained embedding-based head gives a continuous, more
nuanced valence/arousal read rather than a discrete label), but they're the
natural source of **weak/silver labels** for bootstrapping the new head's
training set — see Model below.

## Design

### 1. The model

A new small logistic/MLP head, trained on top of the frozen MiniLM
embedding, outputting `{ valence: number, arousal: number }` (both roughly
[-1, 1]) instead of a single crisis probability. Same technique as the
crisis classifier (`crisisClassifier.weights.json`), new weights file
(`affectHead.weights.json`), new thin inference module
(`src/services/affectHead.ts`) that reuses `crisisEmbedder.ts`'s embedding
function.

**Training data:** bootstrap a large synthetic utterance set labeled via
`detectEmotionUnified`'s 11 emotion labels and `elevationGuard`'s
arousal-relevant markers as weak supervision (mapping discrete
emotion/marker labels to approximate valence/arousal coordinates), refined
with a small hand-curated gold set of real conversational examples — mirrors
how the crisis classifier itself was bootstrapped and tuned rather than
requiring a from-scratch hand-labeled clinical corpus. Threshold/calibration
work (see Visual integration) happens empirically against this set, the same
way the crisis classifier's 0.5796 cutoff was tuned, not hand-picked upfront.

### 2. Computation & blending

Runs once per turn, in `ModeScreen.tsx`'s existing post-send block, right
next to the existing `noteChatElevation(...)` call (after `sendToNila`
resolves and Nila's reply is complete):

1. Embed the user's message — reuses the crisis classifier's already-computed
   embedding for that turn (the memoization the crisis pipeline already has
   makes this free).
2. Embed Nila's completed reply — a new embedding call, not currently made
   anywhere. Adds a small amount of latency *after* the reply has already
   finished streaming (the slow leg of the turn is the LLM generation itself,
   which has already completed by this point), so this is a minor
   progressive addition, not a new blocking wait on the reply.
3. Run both embeddings through the affect head → two `{valence, arousal}`
   pairs.
4. Blend: user-weighted (~70/30) by default, with a divergence-aware nudge —
   if Nila's reply valence is notably warmer/calmer than the user's (e.g.
   validating distress), pull the blended result slightly warmer, as a subtle
   "this is being held" cue. Exact weighting/divergence epsilon tuned during
   implementation against the training/gold set, not hardcoded a priori.

### 3. Visual integration

`NilaFace.tsx` gets one new optional prop, e.g.
`affectAccent?: { valence: number; arousal: number } | null`, consumed only
to drive a new core-dot flicker layer — a brief (~1.4s) scale/opacity pulse
on the existing inner highlight dot, tinted warm (peach-white) for positive
valence or cool (grey-mauve) for negative, magnitude of the pulse scaled by
`arousal`. Everything else `NilaFace` renders (palette, ring, glow, breathe/
spin/shimmer timing) is untouched.

- **Dead-zone threshold:** turns with low-magnitude/near-neutral blended
  output don't trigger a visible flicker at all, so ordinary neutral turns
  (logistics, small talk) don't flicker every single message. Threshold
  tuned empirically alongside the head's calibration.
- **Safety suppression:** the accent is computed as normal but the render is
  gated off entirely when `state` is `elevated` or `crisis` (checked in
  `NilaFace`, mirroring how it already special-cases crisis for the ring/
  glow). No partial/dampened version — fully dormant.
- **Reduced motion / sensory comfort:** the flicker respects the existing
  `useReducedMotion`/`useSensoryComfort` hooks the same way ambient orb
  motion already does — suppressed under those settings.

### 4. Persistence

A new `src/services/chatAffect.ts`, structurally mirroring
`chatElevation.ts`'s existing latch/store pattern (`secureLocal`-backed,
day-scoped). Stores the blended per-turn `{valence, arousal}` readings.

**Consumers:**
- `modeEngine.ts::getUserState()` — folded in as one more input to the
  existing day-level `UserState` synthesis, alongside check-in emotion,
  `emaElevationSignal()`, `chatElevationSignal()`, and compound
  passive-sensing signals.
- Compounding-memory digest — available as one more typed signal for the
  daily reflection pipeline, same tier as existing derived insights.
- Clinician report — **qualitative narrative only.** Folded into the
  existing per-episode narrative prose generator as descriptive language
  (e.g. "conversations in this period trended more difficult/withdrawn"),
  never as a numeric score, chart, or trend line. This is a hard constraint
  from this design's own review (see Constraints), not a nice-to-have.

### 5. Rollout

Ships gated off by default via a new `setAffectAccentEnabled` flag, mirroring
`setCrisisClassifierEnabled` — off until device-verified (real-hardware
latency/battery check for the added per-turn embedding call, same class of
check the crisis classifier went through before enabling). Fail-closed: any
error in the embed/inference path is caught and simply omits the accent and
skips the `chatAffect.ts` write for that turn, never surfaces to the user or
blocks the send path.

## Testing

- `affectHead.ts` unit tests: known-valence/arousal input embeddings (from
  the gold set) produce output within expected bands; malformed/failed
  embedding input fails closed (returns `null`, not a throw that could
  propagate).
- `chatAffect.ts` unit tests mirroring `chatElevation.test.ts`'s existing
  coverage shape (latch read/write, day-boundary reset).
- `nilaFaceMotion`/`NilaFace` tests: confirm `affectAccent` never alters
  `breatheSec`/`spinSec`/`shimmerSec` output for any state; confirm render is
  suppressed for `elevated`/`crisis` regardless of accent magnitude; confirm
  dead-zone threshold suppresses low-magnitude accents.
- `modeEngine.test.ts`: confirm the new signal folds into `getUserState()`
  synthesis without changing existing test expectations for inputs that
  predate this feature (backward-compatible default when no affect signal is
  present).
- Clinician report generator: a test asserting the narrative output for a
  fixture with strong affect-accent history contains no numeric value derived
  from `valence`/`arousal` (regression guard for the hard constraint above).
- Full `tsc` + existing suite green before any version tag; on-device
  sanity pass (a handful of real conversational turns, both flickers and
  suppression during a simulated elevated/crisis state) before flipping
  `setAffectAccentEnabled` on by default, consistent with how the crisis
  classifier was rolled out.

## Explicitly out of scope

- Changing `faceMotion.ts`'s state→speed mapping or the `PALETTES` object —
  this feature is purely additive on top of both.
- A dampened/partial accent during `elevated`/`crisis` — fully dormant only,
  no middle ground (see Constraints).
- Numeric/visual affect indicators anywhere in the clinician report — that
  question was explicitly considered and declined during this design's
  review; only qualitative narrative framing is in scope.
- Reusing `detectEmotionUnified`/`detectElevationRisk` directly as the live
  signal — they're used only as weak-label sources for bootstrapping the new
  head's training data, not as the runtime signal itself.
- A full valence/arousal-driven redesign of the orb's ambient (non-accent)
  behavior — out of scope; the existing state-driven system is left as-is.
