# Nila as a complete on-device mental-health agent

> Vision spec (2026-07-05). Goal: move Nila from a warm *companion chat* to a *complete agent* that uses the
> on-device 4B **completely** — understanding, structuring, reasoning, orchestrating, and reaching out — while
> never breaking the reliability or safety rails. Governed by [`docs/NILA_AI_VISION.md`](NILA_AI_VISION.md).
> This is the use-case map + phasing; each phase gets its own implementation spec + plan when picked.

## The two rails that shape every use case

1. **The model proposes; deterministic systems dispose.** The 4B may *understand, generate, reason, and
   orchestrate*. It is NOT the authority on **crisis/safety** (§9 stays model-independent — `sendToNila` gates
   before + after every call) or **clinical facts** (RAG-grounded over the vetted skills/psychoed library,
   never free-generated). Using the model "completely" = maxing comprehension/generation/reasoning while
   safety + facts stay on rails. A model output that would assert a fact, a diagnosis, or a safety judgement is
   routed through a deterministic verifier, not shown raw.
2. **It's slow (~2 min cold on the test device).** Snappy multi-call interactive chat fights the 4B. So the
   design **pushes heavy reasoning ASYNC** (overnight / on-idle), where latency is invisible, and keeps the
   interactive path lean. *This turns the model's weakness into the flagship feature (below).*

## The flagship reframe: the async "between-sessions brain"

A therapist's value isn't only the session — it's that they *think about you between sessions*. A slow,
private, on-device model can do exactly that, for free:

> While the phone is idle/charging overnight, Nila re-reads the day's conversation + logs → extracts what
> mattered → notices a pattern → updates what she remembers → has a tailored reflection (and, if armed, a
> check-in) ready by morning.

Latency is invisible (nothing waits on it), it's 100% on-device (privacy intact), and it makes Nila a
*continuous presence* rather than a chatbot you poke. **This is Phase 1.**

## The complete-agent loop (the spine)

```
        ┌───────────── interactive (lean) ─────────────┐
   UNDERSTAND ──► INTERVENE ──► REACH OUT (armed pull)
        ▲                                    │
        │        ┌──── async (slow-ok) ──────┘
     REMEMBER ◄── REFLECT ◄── STRUCTURE
```

A complete agent cycles: **understand → structure → intervene → remember → reflect → reach out → repeat.**
Most of *structure / reflect / remember* runs async; *understand / intervene / reach out* is interactive.

## Capability map (use cases)

Tags: `[I]` interactive · `[A]` async · `⭐` high value · **Rail** = what stays deterministic · **Have** = exists today.

### A. UNDERSTAND — nuance keywords can't  `[I]`
- ⭐ **Emotion-granularity coach** — help name the precise feeling ("disappointed *and* ashamed"). Evidence-backed micro-skill. Rail: none (pure reflection).
- **Distortion spotting (CBT)** — name catastrophizing / mind-reading / all-or-nothing in the user's own words. Rail: offer as a *question*, never a verdict.
- **Masked-distress / subtext** — hear the "I'm fine" that isn't. Rail: any risk signal → deterministic §9 classifier (Have: crisisClassifier).

### B. STRUCTURE — free text → therapeutic scaffolding  `[A/I]`  (the "whole toolkit without forms" unlock)
- ⭐ Vent → auto-drafted **thought record** (situation/thought/emotion/evidence). Rail: user edits before it's saved.
- **Safety-plan builder** from conversation. Rail: §9-adjacent — user confirms every field; crisis content never auto-saved.
- **Problem-solving** structure from a worry; **exposure hierarchy** from an anxiety; **values map** (ACT) from stories.
- Rail for all: the model DRAFTS structure; the user owns/edits; nothing clinical is asserted as fact.

### C. REFLECT — reason over the user's OWN history  `[A]`  ⭐ flagship
- ⭐ **Weekly "what I noticed"** — synthesize the week into gentle, specific observations.
- **Dot-connecting** — "you tend to dip after skipping meals." Rail: the *pattern detection* stays deterministic (Have: inflection reliable-change); the model only NARRATES a confirmed signal, never invents a trend.
- **Progress mirror** — "3 weeks ago… this week…". Rail: grounded in logged data only.

### D. INTERVENE — *do* the exercise, not name it  `[I]`
- **Live Socratic reframe** (cognitive restructuring), **behavioral-activation** step + schedule, **guided grounding** adapted to state. Rail: skills come from the vetted library (Have: skillRetrieval); §9 output gate on every turn.

### E. REACH OUT — user-armed pull, NOT autonomous push  `[I/A]`
- ⭐ **Smart check-ins** — "check on me tonight" → a *context-aware* message ("how'd the review go?"). Rail: only when armed by the user; deployment push-floor ≈ 0 (Have: notifications + the agent-pivot wedge).
- **Anticipatory prep** (remembers Friday's hard) · **your-own-warning-signs watch** (from the safety plan).

### F. ORCHESTRATE — the actual agent  `[I]`
- Model reasons which intervention fits *this* moment (state + history + skills) and ACTS — opens the skill, logs the mood, drafts the check-in, surfaces the memory. Rail: tools are a fixed, safe allow-list; §9 pre-pass front-runs every action (Have: runAgent command pre-pass, hardened in v1.1).

## Phasing (value × latency-fit × safety)

- **Phase 1 — Async reflection (the between-sessions brain).** C + the memory-update loop, run overnight/idle.
  Highest "feels real" payoff, latency-invisible, builds on compounding memory + inflection you already have.
  Smart check-in (E) rides on top once reflection exists. **Start here.**
- **Phase 2 — Free-text → structure (B).** Thought records + safety-plan builder first (highest daily utility);
  interactive but each is one model call, and the draft-then-user-edits pattern keeps it safe + latency-tolerant.
- **Phase 3 — Orchestration (F) + richer intervene (D).** The truest "agent"; most tool-wiring + latency, so it
  comes after the async spine + structure exist. Needs a tool allow-list + the §9 pre-pass proven at scale.
- **Cross-cutting, ongoing:** UNDERSTAND (A) improvements land inside whichever phase touches that surface.

## FRONTIER tier — state-of-the-art capabilities (novel, defensible, higher-risk)

The reframe that makes these "advanced" instead of reckless: **sophistication lives in the harness, not in an
unleashed model.** Every item is "the 4B as a reasoning / simulation / personalization ENGINE, wrapped in
deterministic safety + evidence rails so it never claims clinical authority." Two extra filters: **latency**
(a 2-min/turn 4B can't do live simulation → tag async vs needs-faster-model) and **mixed-states** (bipolar/BPD:
the hardest safety case — the elevation guard stays model-independent underneath all of these).

### F1 — the real SOTA (differentiated, hard for anyone else to ship)
- ⭐ **JITAI — Just-In-Time Adaptive Intervention** `[I + sensor]`. Model reasons over **sensor + context +
  language together** (Health Connect sleep/HR/steps + conversation) to deliver the right micro-intervention at
  the right moment. THE digital-MH research frontier; on-device + LLM + wearable is a combination cloud apps
  can't do without being creepy. *Rail:* suggestions only, user-armed; §9/elevation deterministic. Own phase
  (needs sensor integration — the COROS/Health-Connect thread).
  > Test case: 4h sleep + tense text thread + rising resting HR → *before* the user opens the app, an armed Nila
  > offers one 90-sec grounding tuned to "wired + under-slept," not a generic nudge.
- ⭐ **Longitudinal self-model → collaborative case formulation** `[A]`. The async brain builds a private,
  structured model of the person (recurring thought-loops, the inner-critic's actual voice, triggers, what
  works FOR THEM) and co-drafts a **5-P formulation** (predisposing/precipitating/perpetuating/protective/
  presenting). Depth no 1-hr/week clinician can hold. **Rail (critical):** DRAFT + shared + editable + provisional
  — "a pattern I *might* be seeing — does this fit?"; NEVER a verdict/diagnosis; user owns + edits. Extends Phase 1.
- ⭐ **Adaptive multi-week protocol runner** `[A + I]`. Runs an evidence-based program over weeks (behavioral
  activation, CBT-for-worry, self-compassion course): assigns + reviews homework, tracks progress, adapts the
  plan. A therapist-guided protocol, self-paced, on-device.

### F2 — simulation (what rules can NEVER do)
- **Rehearsal / role-play engine** `[I — needs a FASTER model, gates on V3]`. The model *becomes* the other
  person in a safe sandbox: difficult-conversation rehearsal (assertiveness + exposure), empty-chair / IFS
  parts-work (voice the "inner critic"/a part to dialogue with), behavioral experiments (design→predict→
  rehearse→debrief). *Rail:* explicit consent + an exit + §9 live underneath; live turns need the small fast
  model, so this is gated on the V3 speed track.
- **Bespoke generated-for-you interventions** `[A]`. Not templates — the model *composes* in the user's own
  language + values: custom coping card, a "compassionate friend" reply tuned to what soothes THIS person, a
  values-based activity menu, a personalized relapse-prevention plan.

### F3 — deep insight (async mirror-that-reasons)
- **Pattern archaeology** `[A]` — patterns a human couldn't hold ("hardest on yourself the day *after* you
  rest"). Rail: detection deterministic; model only narrates confirmed signals.
- **Narrative re-authoring** `[A]` (narrative therapy) — reflect the life-story arc, offer alternative framings.
- **Values-drift radar** `[A]` — notice actions drifting from stated values, surface gently.

### Hold-the-line (defer or heavily-rail — being sophisticated ≠ removing guardrails)
- **Case formulation** can pathologize / plant a false self-narrative → collaborative + editable + provisional only.
- **Role-play as a real person** can retraumatize → consent + exit + §9 always live.
- **Diagnosis or any clinical-fact claim** → hard no (the reliability gate).
- **Autonomous outreach** → still user-armed pull only.

### How the frontier phases in
- **Async-frontier (self-model, formulation, bespoke interventions, pattern archaeology) folds INTO Phase 1** —
  it's the deep end of the between-sessions brain; ships incrementally as the self-model matures.
- **JITAI = its own phase** after Phase 1 (needs sensor/Health-Connect integration).
- **Simulation = gated on the V3 faster model** (live turns); design now, build when speed lands.
- **Protocol runner** after structure (Phase 2) exists to hang homework on.

## Non-negotiables (carried from the vision)
- Zero garbage / zero hallucination is a BLOCKING gate — a capability ships only when its rail is proven.
- Safety is model-independent; personalization is on-device memory retrieval, not weight adaptation.
- Proactivity is user-armed pull; nothing autonomous-pushes.
- Every therapeutic claim traces to research (thought records/CBT, behavioral activation, values/ACT,
  emotion granularity, safety planning — all evidence-based).

## What already exists to build on
`sendToNila` (§9 gates) · `runAgent` (agentic pre-pass) · `skillRetrieval`/`skillsLibrary` (RAG) · compounding
memory + insights · `inflection` (deterministic pattern signal) · `episodePrompt` · `notifications` · `sessionChat`
(persistence + auto-resume) · `buildPersonalContext`. The agent expands these — it doesn't reinvent them.
