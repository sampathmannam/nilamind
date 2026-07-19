# Orb affect accent

Status: approved by user (revised post Fable design review), ready for
implementation planning
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
system: a brief flicker on the orb's core highlight — warm for positive
valence, a deeper mauve for negative — reflecting the emotional tone of the
exchange that just happened, without altering the orb's speed, size, or
which of the 5 palettes is active.

**Revision note:** this spec was reviewed by Fable (the project's design
authority) after the initial version was approved. The review's five
required changes are incorporated below (marked inline); ship sequencing is
now two-phased as a direct result — see Rollout.

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
- **Clinician report is not a consumer of this feature.** The recent
  clinician-report redesign deliberately removed risk-score sections in favor
  of per-episode narrative built entirely from what the user explicitly told
  the app (check-ins, PHQ-9/GAD-7, episode markers, med logs — see
  `clinicianReport.ts`'s own disclaimer: *"a self-report aid for your
  conversation with a clinician"*). A machine inference silently read off
  private chat text does not belong in that document even as narrative prose
  — narrative framing hides provenance rather than fixing it. Cut from this
  spec entirely; see Explicitly out of scope.
- **Negative-valence accents stay inside the identity hue.** The palette's
  own design comment (`NilaFace.tsx`) states the five states differ "by
  BRIGHTNESS/saturation rather than clashing hues" and encodes negative
  affect as *deeper*, not colder (`anxious` = `#B06AA0`, "grounded deeper
  mauve"). This feature must not introduce a grey/cool tint — it would be the
  app's only cold color, landed at a user's hardest moments, and would read
  louder than the warm pole due to perceptual asymmetry (desaturation + hue
  shift vs. a small warm hue rotation off an already-near-white base).
- **Arousal-driven magnitude never amplifies an already-activated state.**
  The `elevated`/`crisis` dormancy rule alone leaves a gap: `anxious` gets
  full-strength accents under the original design, so a user's most
  activated messages would produce the *largest* flickers — a small dose of
  the exact stimulation-mirroring the elevated rule exists to prevent. Pulse
  magnitude is globally clamped and additionally damped during `anxious`.

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
on the existing inner highlight dot. Everything else `NilaFace` renders
(palette, ring, glow, breathe/spin/shimmer timing) is untouched.

- **Tint (revised per Fable review):** positive valence tints the dot
  peach-white — kept high-lightness, deliberately not drifting toward chroma,
  to stay clear of the reserved crisis terracotta family. Negative valence
  tints toward a **deeper-saturated mauve pulled from the `anxious` palette
  direction (`#B06AA0`)** — not grey/cool — reusing the meaning the app
  already teaches ("I'm here with you") instead of introducing a new,
  contradictory cold-color grammar. Both poles' perceptual distance (ΔE) from
  the resting core color (`#F0DCEA` at calm) are equalized during
  calibration, so neither pole reads louder than the other by construction.
- **Magnitude (revised per Fable review):** pulse magnitude is driven by
  `arousal` but globally clamped to a narrow range — the accent whispers at
  every intensity, never shouts — and additionally damped toward the floor
  of that range specifically when `state === "anxious"` (valence tint still
  renders during `anxious`; only the magnitude channel is damped).
- **Dead-zone threshold:** turns with low-magnitude/near-neutral blended
  output don't trigger a visible flicker at all, so ordinary neutral turns
  (logistics, small talk) don't flicker every single message. Threshold
  tuned empirically alongside the head's calibration.
- **Render cooldown (new per Fable review):** independent of the dead-zone, a
  minimum interval between *rendered* accents — roughly one baseline
  breathing cycle — so a rapid burst of several emotional messages in a row
  can't strobe the dot. Accents inside the cooldown window are still computed
  and still written to `chatAffect.ts` (see Persistence), just not rendered.
- **Safety suppression:** the accent is computed as normal but the render is
  gated off entirely when `state` is `elevated` or `crisis` (checked in
  `NilaFace`, mirroring how it already special-cases crisis for the ring/
  glow). No partial/dampened version for these two states — fully dormant.
- **Reduced motion / sensory comfort:** the flicker respects the existing
  `useReducedMotion`/`useSensoryComfort` hooks the same way ambient orb
  motion already does — suppressed under those settings.

### 4. Persistence (revised per Fable review — Phase 2, separately gated)

A new `src/services/chatAffect.ts`, structurally mirroring
`chatElevation.ts`'s existing latch/store pattern (`secureLocal`-backed,
day-scoped). Stores the blended per-turn `{valence, arousal}` readings
(written whenever the signal is computed, including turns absorbed by the
render cooldown — persistence and rendering are independent).

**Consumers, and only these two:**
- `modeEngine.ts::getUserState()` — folded in as one more input to the
  existing day-level `UserState` synthesis, alongside check-in emotion,
  `emaElevationSignal()`, `chatElevationSignal()`, and compound
  passive-sensing signals. **Must carry the same invariant every existing
  fold in that file already states explicitly** — `foldElevation` and
  `foldCompoundSignals` both hard-code "NEVER overrides explicit distress
  self-report" (`modeEngine.ts:82-84,104`). The new
  `foldAffectAccent`-equivalent must state and test the identical invariant:
  it can act as a tiebreaker for `null`/`calm` but can never upgrade or
  override an explicit self-reported `anxious`/`low`. Also watch the small
  feedback loop this creates — the signal helps set `state`, and `state`
  gates the accent's own render (elevated/crisis dormancy, anxious damping)
  — so the fold must stay weak enough that this can't oscillate.
- Compounding-memory digest — available as one more typed signal for the
  daily reflection pipeline, same tier as existing derived insights.

**Removed as a consumer: the clinician report.** See Constraints — a
provenance problem, not a formatting one. Not narrative-vs-numeric; the
signal doesn't belong in that document in any form yet. If reinstated later,
it needs its own dedicated design pass: per-report opt-in with a preview of
the exact generated sentence, explicit in-prose attribution ("Nila's
on-device model read conversations as trending..."), and a minimum-data
floor (e.g. ≥N emotional turns across ≥M distinct days) before any trend
claim renders at all. That is out of scope for this spec.

Persistence ships behind its **own** flag
(`setAffectAccentPersistenceEnabled`), separate from the visual accent's
flag — see Rollout. This lets the ephemeral, reversible, low-stakes half of
the feature ship and prove itself before the higher-stakes half (which
touches `UserState` synthesis and the daily digest) turns on.

### 5. Rollout (two-phased per Fable review)

**Phase 1 — visual accent only.** Ships gated off by default via
`setAffectAccentEnabled`, mirroring `setCrisisClassifierEnabled` — off until
device-verified (real-hardware latency/battery check for the added per-turn
embedding call, same class of check the crisis classifier went through
before enabling). `chatAffect.ts` writes happen in this phase too (cheap,
local), but nothing reads from it yet — `getUserState()` and the
compounding-memory digest are unmodified. Fail-closed throughout: any error
in the embed/inference path is caught and simply omits the accent for that
turn, never surfaces to the user or blocks the send path.

**Phase 2 — persistence consumers.** Only starts once Phase 1 has shipped,
the affect head's real-world accuracy against the gold set is known, and the
`foldAffectAccent` invariant/tests from section 4 are in place. Gated by the
separate `setAffectAccentPersistenceEnabled` flag. The clinician report is
not part of Phase 2 — see above.

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
  dead-zone threshold suppresses low-magnitude accents; confirm magnitude is
  damped toward floor when `state === "anxious"` while tint still renders;
  confirm the negative tint never emits the old grey-mauve values and stays
  within the `anxious`-family hue; confirm a second accent inside the
  cooldown window is computed/persisted but not rendered.
- `modeEngine.test.ts`: a dedicated test asserting the new fold **never**
  overrides an explicit self-reported `anxious`/`low` — same invariant class
  as the existing `foldElevation`/`foldCompoundSignals` tests — plus
  confirmation that existing test expectations for inputs that predate this
  feature are unchanged (backward-compatible default when no affect signal
  is present).
- Full `tsc` + existing suite green before any version tag; on-device
  sanity pass (a handful of real conversational turns, both flickers and
  suppression during a simulated elevated/crisis/anxious state, plus a rapid
  multi-message burst to confirm the cooldown holds) before flipping
  `setAffectAccentEnabled` on by default in Phase 1, consistent with how the
  crisis classifier was rolled out. Phase 2's `setAffectAccentPersistenceEnabled`
  gets its own separate sanity pass focused on the `getUserState()` fold
  invariant, not re-litigating Phase 1.

## Explicitly out of scope

- Changing `faceMotion.ts`'s state→speed mapping or the `PALETTES` object —
  this feature is purely additive on top of both.
- A dampened/partial accent during `elevated`/`crisis` — fully dormant only,
  no middle ground (see Constraints).
- **Any exposure of this signal in the clinician report — narrative or
  numeric.** Explicitly considered and rejected during Fable's design
  review: the problem is provenance (a machine inference from private chat,
  silently presented as observation), not the numeric-vs-narrative question
  the first draft of this spec focused on. A future opt-in-gated,
  attribution-labeled version is a separate design effort, not part of this
  spec.
- A grey/cool negative-valence tint — considered in the first draft,
  rejected on review for breaking the palette's depth-not-hue grammar and
  for perceptual asymmetry against the warm pole (see Constraints).
- Reusing `detectEmotionUnified`/`detectElevationRisk` directly as the live
  signal — they're used only as weak-label sources for bootstrapping the new
  head's training data, not as the runtime signal itself.
- A full valence/arousal-driven redesign of the orb's ambient (non-accent)
  behavior — out of scope; the existing state-driven system is left as-is.
