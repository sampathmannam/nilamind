# NilaMind — master roadmap & documentation index

> The single top-level map: what NilaMind is, where it stands, the governing docs, and the research-grounded
> build plan. Read this first; it points to everything else. (2026-07-05.)

## What NilaMind is

A **privacy-first, fully on-device mental-health companion**. The brain is a fine-tuned on-device 4B (Gemma-3-4B
"Nila") run via llama.cpp — no account, no backend, nothing you say leaves the phone. **North star: help real
people who are suffering; the only metric is *help*.** Focus population includes depression, anxiety, bipolar, BPD.

## The rails (non-negotiable — carried into every feature)

1. **§9 crisis handling is model-independent + deterministic** (before AND after every model call).
2. **Zero garbage / zero hallucination is a BLOCKING gate** — a capability ships only when its rail is proven.
3. **On-device + private** — personalization = growing on-device memory retrieved into context, NOT weight adaptation.
4. **Anti-sycophancy** — warmth must never validate a harmful belief (the harms evidence makes this first-class).
5. **User-armed pull, never autonomous push.** One source of support, never the only one; honest "I'm an AI, not a therapist."
6. **Research-grounded, never generic** — every therapeutic decision traces to evidence (see the research basis).

## Governing docs (the map)

| Doc | What it governs |
|---|---|
| [`NILA_AI_VISION.md`](NILA_AI_VISION.md) | The AI-usage north-star + the reliability/personalization rails |
| [`NILA_COMPLETE_AGENT.md`](NILA_COMPLETE_AGENT.md) | Companion → complete-agent vision, capability map, FRONTIER tier |
| [`NILA_AGENT_RESEARCH_BASIS.md`](NILA_AGENT_RESEARCH_BASIS.md) | The evidence grounding (harms, efficacy, JITAI, simulation) + final priorities |
| [`NILA_SPEED_PLAN.md`](NILA_SPEED_PLAN.md) | On-device latency (the 2.5 GB cold-load problem + fixes) |
| [`NILA_AGENT_DESIGN.md`](NILA_AGENT_DESIGN.md) | Existing agent design (tools / runAgent) |
| [`QA_REPORT_v1.1.md`](QA_REPORT_v1.1.md), [`UX_RESEARCH.md`](UX_RESEARCH.md) | QA audit trail, UX research |

## Current state — SHIPPED (v1.3)

- **On-device brain:** fine-tuned 4B via llama.cpp; §9 deterministic; on-device crisis classifier; skills-RAG
  (DBT/CBT/ACT); compounding memory + daily reflection; inflection detection; episode support.
- **Voice on-device by default** (Vosk STT) — "nothing you say leaves the phone" now literally true.
- **Continuous chat (passive→active, this session):** conversation **persists encrypted** and survives leaving the
  app (device-verified); the in-flight user message is preserved on a mid-reply kill; **auto-resume** answers an
  unanswered turn on reopen (built, §9-safe, 514 tests — on-device flow pending one clean verify); "Nila replied"
  notification scaffolding.
- **Edge-to-edge Nila view;** boot lazy-loaded; released as **v1.3** (versionCode 4), pushed to `origin/main`.

## The research-grounded build plan (phased — from the research basis)

- **Phase 0 — the guard (do first, always-on):** an explicit **anti-sycophancy + reality-testing** check on model
  output, especially where memory/personalization feeds the prompt (harms evidence: personalization can amplify
  delusions/mania). Non-optional before any frontier capability.
- **Phase 1 — flagship: async "between-sessions presence" wrapping STRUCTURED protocols.** Best-evidenced bet
  (adherence is the lever; an always-on LLM does guidance's job). Overnight/idle: re-read the day → extract → update
  memory → morning reflection/check-in. Deliver **structured, sequenced, evidence-based content** (lead with
  **iCBT-for-GAD/worry + Behavioral Activation**), NOT free-form therapy-chat. Add a **lightweight
  formulation-for-ROUTING** layer (5 P's as intake to pick + personalize the module — NOT a heavy idiographic engine;
  reality-anchored, editable, elevation-gated).
- **Phase 2 — JITAI** (after Phase 1; needs Health Connect/wearable): build as an **A/B-instrumented,
  receptivity-gated** experiment that **hands to §9** at high risk — not a static push loop (mistiming backfires).
- **Phase 3 — simulation** (gated on the V3 faster model + a proven §9 mid-sim interrupt): permit ONLY low-activation
  **behavioral experiments / behavioral rehearsal** behind consent + one-tap Stop + population exclusions
  (mania/psychosis/dissociation/acute-crisis out; BPD→skills-only) + intensity ceiling + grounding closure.
  **DEFER** open-ended IFS parts-work and trauma empty-chair (weak evidence, harms concentrate in our population).
- **Cross-cutting:** **V3 small fine-tuned model** for speed (Qwen3-1.7B hit a capacity ceiling → Llama-3.2-3B /
  Phi-3.5-mini next; needs the user's HF token + a pod); memory **reality-testing + elevation gating**.

## Build progress — autopilot (Phase 0 + Phase 1 spine)

Shipped this run (all TDD'd, committed + pushed; 541 tests green):
- **Phase 0 — anti-sycophancy / reality-testing output gate.** `checkResponse` Rule 4 + `SYCOPHANTIC_AFFIRMATIONS`:
  rejects a reply that AFFIRMS med-stopping, "better off dead/gone", isolation, mania sleep-denial, terminal
  hopelessness, or deserving-suffering. Runs on every reply via `applyOutputSafety`. (`src/safety.ts`)
- **Phase 1 — structured-protocol LOGIC spine (deterministic, on-rails):**
  - `protocols.ts` — `Protocol`/`ProtocolStep` model + `routeToProtocol` (modular matching, returns null on benign
    input), seeded with **Behavioral Activation** + **Worry-Postponement** (the two best-evidenced cards).
  - `protocolProgress.ts` — encrypted-persistent `{protocolId, stepIndex}` (start/getActive/advance→done/abandon,
    resumes across app restart) + `protocolOffer` (offer only when nothing active + a concern matches).
  - **Deterministic UI bridge** — `NilaCard` kind `"protocol"`, `protocolCard(userText)` offer helper, `actionForCard`
    → `{type:"protocol", protocolId}`. Step prompts are VETTED + injected directly (no model → no hallucination).

**Remaining Phase-1 wire (needs device verification — blocked by the evicted model, or browser-verify):**
1. In `AiCoachScreen`: after a reply, add `protocolCard(lastUserMsg)` to the cards — **suppress during crisis
   (`isCrisisState`) and rate-limit** (don't re-offer every turn).
2. Card-tap handler for `{type:"protocol"}` → `startProtocol(id)` → inject step-0 `prompt` as a Nila message +
   a "Next"/"Not now" affordance.
3. "Next" → `advanceProtocol()` → inject next step (or a warm completion on `{done}`); "Not now" → `abandonProtocol()`.
4. Persisted progress means a program resumes on reopen (pairs with the chat-persistence work already shipped).
5. Device-verify end-to-end once the 2.5 GB model is re-downloaded.

**Then:** the async **between-sessions brain** (overnight reflection + memory update) — the other half of Phase 1.

## Open items / pending (the "before we go ahead" checklist)

- **Device-verify auto-resume** — needs the phone's 2.5 GB model **re-downloaded** first (it got evicted by Android
  storage cleanup); then one clean run (send → home → wait → reopen → Nila auto-answers).
- **V3 small model** — provide HF token + accept Llama-3.2 license (or fall back to Phi-3.5-mini), run the pod.
- **Housekeeping** — rotate the leaked keys (HF write-token, NVIDIA); back up `android/nilamind-release.jks` OFF the laptop.
- **First build step when we proceed:** Phase 0 (the anti-sycophancy/reality-testing guard) → then Phase 1.
