# NilaMind — Plan of Action (the build queue)

**This is the single source of truth for what to build next and how.** Read it with `AGENTS.md` (golden
rules + reward-hacking guardrails). Written 2026-07-06 from a full product/safety audit + strategy brainstorm.

**Autonomy legend:**
- 🟢 **Autonomous** — build it, `npm run guard` green, commit. No sign-off needed.
- 🟡 **Build, then FLAG for human review before merge** — safety-critical; ship the diff for the owner to eyeball.
- 🔴 **Do NOT build** — a human/strategic/business decision, or explicitly dropped. Skip it.

---

## Vision (North Star)
The private, phone-resident, **protocol-first mental-health *wellness* agent** that answers the **stigma** and
**privacy** objections at once — for the ~56% who get no treatment. **Nothing leaves the phone.** The deliberate
anti-Ash (cloud, trains-on-you, overclaims "therapy").

**Design law:** *structure is the active ingredient; the free-form LLM is where harm enters.* The on-device 4B is
a **detector, rails-runner, and warm layer — never a free-talking therapist.** §9 crisis safety is deterministic
and model-independent.

---

## How to build (non-negotiable rules)
1. **TDD.** RED (failing test, watched fail) → GREEN (minimal) → REFACTOR. No production code without a failing test first.
2. **`npm run guard` green before EVERY commit** (tsc + vitest + reward-hacking scan). **Never disable, skip, or delete a test to go green** — that's the #1 documented agent failure and it's a firing offense on a safety app.
3. **WIRE WHAT YOU BUILD.** No dead code. Every new engine must reach a screen or the agent **in the same change**. NilaMind's core problem was "great machinery that never reaches the user" — do not recreate it. A green suite that isn't wired to a user surface is **not done**.
4. **Flag the danger zone.** Any diff touching `safety.ts`, `crisisClassifier*`, `elevationGuard`, `nilaSafetyGate`, `secureLocal`, `secureStore`, `nilaContext`, or any proactive-outreach path → state your reasoning and mark it 🟡 for human review.
5. **Invariants:** nothing leaves the device; wellness, never therapy (no "therapist/treat/diagnose"); 18+ only; never gate the conversation or the crisis path.

---

## Already shipped (do NOT redo — build on it)
§9 hardened (Rule 6 manic-validation, racing-thoughts, directional Rule 2, Gen-Z/Hindi/Tamil, hypersexuality/
religious/pressured markers) · sleep + inflection fed into the chat (context wiring) · warm offline fallback ·
insight-aware nudge · unified episode voice · sleep-prodrome UI · real passthrough/lockout fix · varying
time/returning-aware opener · 18+ age-gate · de-frag (dead screens removed) · unified `searchLearn` logic ·
async overnight reflection (§9-gated) · weekly synthesis · emotion-granularity check-in · crisis button in nav.

---

## The queue

### A — Finish the half-built + wire the dead code (do first)
| # | Item | Tag |
|---|---|---|
| A1 | **Learn screen** — one screen consuming `searchLearn`; retire the 3 reading-library rows (Skills/Understand/Why → 1). | 🟢 |
| A2 | **Wire `thoughtRecordDraft`** into `ThoughtRecordScreen` (auto-draft from venting text). *Built, currently unwired.* | 🟢 |
| A3 | **Wire `distortionSpotter`** — **MUST be §9-gated** (never "spot a distortion" on a crisis disclosure) and framed "hold lightly, never a verdict." *Built, unwired — needs the gate.* | 🟡 |
| A4 | **Wire `armedCheckin` (between-session presence)** — **ONLY user-armed** (a pull: "check on me later"), **opt-in**, **crisis + elevation-gated**, **frequency-capped**. Mixed-state safety blocker: never push a check-in during a manic peak or when the user asked for quiet. *Built, unwired — needs the gates.* | 🟡 |
| A5 | **Surface phone-behaviour insights** (`patternInsights`) on a real screen — computed today but flag-gated/invisible. | 🟢 |
| A6 | **BA / self-compassion → shared in-chat protocol progress** — retire the duplicate standalone screens. | 🟢 |

### B — The differentiating core
| # | Item | Tag |
|---|---|---|
| B1 | **Behavioral Activation loop** — the LLM-free protocol spine (g≈0.69). Harden/complete what exists (`behaviouralActivation`, `protocols`, `ValuesToAction`); don't duplicate. | 🟢 |
| B2 | **State Engine (digest brain)** on EXISTING signals — an evidence-linked state estimate feeding the chat. Much exists (`patternInsights`/`nilaInflection`/`sleepInsight`) — **consolidate + strengthen, do not rebuild.** | 🟢 |
| B3 | **Safety-plan follow-up loop** (Stanley-Brown — the check-in *after* the plan; the follow-up is the tested ingredient). | 🟡 |
| B4 | **Embedding-RAG psychoeducation** — retrieve-and-quote vetted content; MiniLM is the retriever; kills hallucination on clinical facts. | 🟢 |

### C — Holistic / moat / boundaries
| # | Item | Tag |
|---|---|---|
| C1 | **On-device sleep sensing** polish — self-report works; Health Connect seam. Soft-signal *nudge only*; circadian regularity, **not** naive sleep-restriction (mania risk). | 🟡 |
| C2 | **Bundle-size cleanup** — code-split the heavy chunks (recharts/jspdf/vosk); guard-gated. | 🟢 |
| C3 | **Tier-2 cloud insight synthesis** — **DROPPED.** The audit proved the quality gap was *wiring, not the model.* Do **not** build a cloud layer. | 🔴 |
| C4 | **Freemium** (pricing/paywall/BYOK) — business decision. | 🔴 |
| C5 | **Legal review** (WA MHMDA / the wellness line) — human/attorney; not code. | 🔴 |
| C6 | **Felt-quality verification** — human judgment, on the phone. | 🔴 |

---

## Definition of done (every 🟢/🟡 item)
Tested (TDD) · `npm run guard` green · **WIRED to a user surface** · safety diffs flagged for review · no dead code.
