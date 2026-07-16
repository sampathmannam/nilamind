# In-moment insight: semantic redesign

Status: approved by user, ready for implementation planning
Date: 2026-07-16

## Problem

The "Why you might feel this way" card (`src/services/inMomentInsight.ts` →
`src/services/psychoed.ts`) currently matches the user's message to one of ~22
research-cited psychoeducation topics via plain keyword overlap
(`searchPsychoed`), gated behind a separate lexical distress-word regex list
(`suggestSkill`). When no keyword clears, it silently falls back to a fixed
per-`UserState` default topic (`STATE_TOPIC`).

That fallback is the confirmed root cause of a reported bug: a message about
same-day psychiatrist/psychologist appointments (no emotional keyword match)
still produced the generic "circadian-bipolar" ("why daily rhythms matter for
mood") card two turns in a row, because the user's `UserState` was `elevated`
at the time — completely unrelated to what they'd actually said.

Three complaints, confirmed by the user:
1. The card doesn't reflect what the user is actually saying (root cause above).
2. The 22-topic library is too shallow for how varied real conversations are.
3. Keyword matching doesn't feel like the app "read" the message — it feels
   like keyword bingo, not understanding.

## Constraints (non-negotiable, carried from project conventions)

- **On-device only.** No new network calls, no new model download. NilaMind's
  brain and all safety-relevant classification is 100% on-device.
- **§9 crisis gate is untouched.** `scanForCrisis` still runs first,
  unconditionally; a crisis message never gets a wellness explainer.
- **Research-grounded, never generic.** Every topic (existing and new) cites a
  real, correctly-attributed source. No fabricated citations.
- **No new persistence.** The insight is a UI-only, ephemeral artifact
  attached to the in-memory assistant message, same as today — never written
  to disk, never sent to any model.

## Key finding that shapes the design

The app already has an embedding-based semantic retriever for the psychoed
corpus: `src/services/psychoedRetrieval.ts`. It reuses the same on-device
MiniLM-L6-v2 model (`all-MiniLM-L6-v2`, quantized ONNX, ~22MB, already lazily
warmed at app startup — see `main.tsx`) that powers §9 crisis classification.
Today it's used **only** to quietly ground the chat LLM's own replies
(`retrievePsychoedForQuery` → `psychoedContextBlock`, injected into the system
prompt in `localNila.ts`) — it was never wired to the visible insight card.

This means the "intelligent matching" this feature needs is not a new
capability to build — it's an existing, already-integrated, already-warm
capability to redirect at a second call site.

## Design

### 1. Matching engine

`deriveInMomentInsight` becomes `async` and calls
`embeddingSearchPsychoed(text, { limit: 2 })` (cosine similarity over MiniLM
sentence embeddings — captures paraphrase/synonym/concept matches that
keyword overlap misses) in place of lexical `searchPsychoed`.

- **Relevance gate:** the explainer only shows if its similarity score clears
  a threshold, starting at **0.32** (above the existing `RAG_MIN_SCORE = 0.25`
  used for the softer "the LLM may optionally use this" grounding case, since
  a standalone assertion shown directly to the user needs higher precision
  than a hint the model can silently ignore). Threshold is tuned/verified
  against the test suite described below before ship, not hand-waved.
- **`STATE_TOPIC` fallback is removed.** This is the direct fix for the
  reported bug — no topic is ever shown solely because of `UserState`, only
  because the message's own content scored above the relevance bar.
- **`UserState` becomes a tie-breaker only:** if the top two embedding matches
  both clear the relevance gate and score within 0.03 of each other, prefer
  the one aligned with the known state (starting epsilon — tuned alongside the
  relevance threshold during implementation). It can never promote a topic
  that didn't clear the relevance gate on its own.
- **The "skill that may help" half of the card is unchanged** — still
  `suggestSkill`'s independent lexical distress-map. This redesign is scoped
  to the explainer half only.
- **§9 gate unchanged**, checked first, unconditionally.

### 2. Repeat-avoidance

If the top-scoring topic's `id` equals the `id` on the previous assistant
message's `insight.explainer` (already available in the in-memory `messages`
array — no new storage), fall through to the 2nd-ranked result if it clears
the relevance gate; otherwise suppress the explainer for that turn rather than
repeat it. The skill suggestion is unaffected by this and can still show.

### 3. Call-site / latency handling

`ModeScreen.tsx` currently calls `deriveInMomentInsight` synchronously right
after `sendToNila` resolves, and attaches the result to the same message
object before it's ever rendered. Since the function is now async:

- The assistant message renders immediately with `insight: undefined`.
- Once `deriveInMomentInsight` resolves (~100-300ms — one MiniLM forward pass;
  the reply itself already took seconds to generate, so this is a minor
  progressive-reveal delay, not a new blocking wait), the message is patched
  in place with the resolved `insight`.
- This mirrors the existing pattern of best-effort, non-blocking RAG lookups
  elsewhere in the codebase (`localNila.ts`'s own psychoed/exemplar retrieval
  is wrapped in try/catch and never blocks the turn on failure) — same
  fail-open posture: if the embedder throws, the card is simply omitted for
  that turn.

Explicitly **not** doing: threading the topic already computed during
`askNilaLocalStream`'s own RAG call back through `LocalNilaResult` to avoid a
second embedding call. That would couple the transport layer (which mirrors
multiple backends) to a UI-only feature, and reuse a threshold tuned for a
different (much looser) purpose. The independent call keeps
`deriveInMomentInsight` a small, pure, testable unit, and the extra latency is
negligible.

### 4. Library expansion

Roughly doubling the corpus (~22 existing → ~44 total), grouped by territory
currently uncovered. Each gets the same shape as existing entries
(`id/title/summary/body/basis/tags`) in `PSYCHOED_TOPICS`
(`src/services/psychoed.ts`) — no structural change to the type or the index
(embedding index rebuilds automatically on first query after the corpus
changes).

New topics, with a proposed real citation basis to verify/finalize during
implementation (a dedicated research pass — see Testing below — not
fabricated from memory):

**Emotional states**
- Grief and loss — Stroebe & Schut, dual-process model of bereavement
- Anger as a threat/secondary emotion — Novaco's anger model; DiGiuseppe & Tafrate
- Guilt vs. shame (behavior vs. self) — Tangney & Dearing
- Boredom / emptiness — Eastwood et al. 2012, boredom as attention-engagement failure

**Relationships**
- Relationship conflict patterns — Gottman's four horsemen
- Setting boundaries — Linehan, DBT interpersonal effectiveness
- People-pleasing / the fawn response — Walker; Porges, polyvagal theory
- Heartbreak / romantic rejection — Fisher et al. 2010

**Cognitive patterns**
- Perfectionism — Shafran, Cooper & Fairburn, clinical perfectionism model
- Imposter feelings — Clance & Imes 1978
- Catastrophizing — Beck's cognitive distortions
- All-or-nothing thinking — Beck, cognitive therapy
- Decision fatigue / choice overwhelm — Vohs et al. 2008
- Social comparison (incl. social media) — Festinger 1954; Fardouly & Vartanian

**Body/health**
- Health anxiety — Salkovskis & Warwick
- Burnout specifically — Maslach & Leiter (distinct from the existing general `stress-hpa-axis` card)
- Chronic pain and mood — Gatchel, biopsychosocial model

**Work/transitions**
- Work stress / role overload — Karasek, job demands-control model
- Procrastination as mood-repair — Sirois & Pychyl 2013
- Life transitions (new job, moving, major change) — Bridges' transition model

**Meaning/ambivalence**
- Ambivalence about seeking help — Prochaska & DiClemente, stages of change
  (directly relevant to appointment/logistics-adjacent but emotionally loaded
  messages, like the one that surfaced this bug)
- Meaning-making after hard things — Tedeschi & Calhoun, post-traumatic growth
  (invitation-framed only — never "everything happens for a reason")

**Explicitly out of scope for this pass:** body-image and eating-related
topics. That territory carries a different risk class than the rest of the
library (proximity to disordered-eating content) and needs its own dedicated
safety review, not a same-tier card bolted on here.

## Testing

- `inMomentInsight.test.ts` rewritten for the async signature; all existing
  §9/empty-input/skill-present tests carried over unchanged in intent.
- Per new topic: at least one positive case (a paraphrase the old lexical
  matcher would have missed — this is the actual regression-proof of the
  redesign's value) and one negative case (topic-adjacent vocabulary without
  personal distress, e.g. "my friend told me about imposter syndrome") to
  guard the relevance threshold against false positives.
- Repeat-avoidance: same top match twice in a row → second call returns the
  #2 match or `null`, never a repeat.
- Citation accuracy: each new topic's `basis` field is verified against the
  real source before merging (same bar the existing 20 note they went through
  — "3-critic review"). A topic that doesn't clear this is cut or deferred,
  not shipped with a shaky citation.
- Full `tsc` + existing suite green before any version tag, per usual project
  process.

## Rollout

Pure TypeScript change, no native/Android code touched — ships as a normal
version bump gated on tests green, not a special native build. Because it
changes the feel of a user-facing, ML-adjacent surface, a quick on-device
sanity pass (a handful of real conversational turns) before tagging the
release, consistent with how past on-device ML-adjacent changes here have
been spot-checked.

## Explicitly out of scope

- Changing the "skill that may help" half of the card (`suggestSkill`) — it
  keeps its own independent lexical gate.
- An LLM-authored bridging sentence connecting the topic to the user's
  specific words — considered and declined (adds latency + a hallucination
  surface for a card that's meant to be a trustworthy, vetted fact, not a
  generated one).
- Threading the already-computed RAG topic from `askNilaLocalStream` back
  through the transport layer to save one embedding call — not worth the
  coupling for a ~100-300ms saving.
- Body-image / eating-related topics (see Library expansion above).
