# NilaMind Roadmap — Privacy-First, On-Device, Protocol-First MH Agent

_Format: Now / Next / Later. Owner: solo (you). Sequenced by evidence strength × on-device uniqueness × dependency. Phase-0 compliance/safety first._

## North Star

The private, phone-resident, protocol-first mental-health **wellness** agent that answers the **stigma** objection and the **privacy** objection at the same time — for the ~56% who get no treatment at all. Raw data never leaves the phone; only a consented digest powers a cloud-grade insight layer. Positioned as the deliberate anti-Ash.

**Design law (both research briefs agree):** structure is the active ingredient; the free-form LLM is where harm enters. Build protocols + a deterministic safety layer; use the 4B as a detector, rails-runner, and warm layer — never a free-talking therapist.

---

## Status overview

- **Built (keep/harden):** §9 crisis + MiniLM classifier, on-device 4B (Gemma) + Vosk voice, compounding memory, mood check-ins, inflection detection, session persistence.
- **Half-built (finish):** safety plan (needs follow-up loop), between-session presence (L2), skills retrieval (→ embedding RAG).
- **Net-new (the differentiators):** Behavioral Activation core loop, State Engine + on-device sensing, reality-guard/anti-sycophancy gate, Tier-2 cloud insight synthesis, freemium.

---

## NOW — "Safe and legal to exist" (existential, cheap, blocks everything downstream)

| Item | Why / evidence | Status | Done when |
|---|---|---|---|
| **Compliance spine** — scrub all copy to wellness-not-therapy; add AI-disclosure (Utah/NY); 18+ age-gate; honest opt-in privacy policy; **kill all third-party egress** (incl. the flagged Google-Fonts leak) | IL WOPR / NV / FDA line turn on claims; every lawsuit is a teen; FTC BetterHelp/Cerebral/GoodRx all = ad-SDK egress | Not started | No "therapy/therapist/treat/diagnose"; no third-party network calls on any health surface; 18+ gate live |
| **§9 audit to the 988 / NY standard** — deterministic, fail-closed, 988 + Crisis Text Line, never emits method, encourages human disclosure | Now literally NY law; 4B is 13–19% worse at suicide-risk → must stay model-independent | Built → verify | Passes VERA-MH / CRADLE-style crisis eval; unconditional, uncapped, always on strong path |
| **Reality-guard / anti-sycophancy gate** — CBT via fixed Socratic restructuring; never validate distorted thinking; delusion/mania guard | LLMs validate delusions/mania ~49% more than humans — the #1 harm vector, worst in bipolar (your focus) | Net-new | Structured restructuring flow ships; adversarial "validate my delusion/mania" tests fail closed |
| **Surface the privacy moat** — "provably nothing leaves your phone" as the headline | 8% trust AI-MH tools; 49% cite privacy; the one claim no cloud incumbent can truthfully copy | Built → surface | Positioning + store copy lead with zero-egress, honestly |

**Gating test for NOW:** a health-tech/privacy attorney review before any public/stranger launch (focus: MHMDA + the wellness line).

---

## NEXT — "The differentiating core" (highest-evidence + keystone dependency)

| Item | Why / evidence | Status | Depends on |
|---|---|---|---|
| **Behavioral Activation core loop** — monitor activity → schedule value-based activities → grade → track mood | Strongest evidence of any mechanism (g≈0.69) **and works fully automated, LLM-free**. Shifts the spine from chat → protocol | Net-new | Compliance spine |
| **State Engine (digest brain) — zero new signals first** — features over existing messages + check-ins → evidence-linked state estimate | The keystone: sensing, smart presence, and Tier-2 insights all depend on it. Doubles as the Wizard-of-Oz proof | Net-new | — (build on existing signals) |
| **Complete safety planning + follow-up loop + means-restriction** | Stanley-Brown ~50% reduction; the **follow-up is part of what's tested** — a static plan tests a weaker version | Half → done | §9 audit |

**Gating test for NEXT:** the 2-week Wizard-of-Oz on yourself — does a digest built from *existing* signals visibly sharpen NilaMind about you? If two hand-fed signals don't, stop before building sensors.

---

## LATER — "Holistic + moat-deepening" (depends on State Engine; gated by legal + freemium)

| Item | Why / evidence | Status | Depends on |
|---|---|---|---|
| **On-device passive sensing — sleep-first** | The cleanest white space (phenotyping's own 2026 limitation is "cloud dependence"); sleep = two-for-one on mood + bipolar early-warning. **Circadian regularity, not naive sleep-restriction (mania risk).** Soft-signal → nudge only | Net-new | State Engine |
| **Between-session proactive presence** — finish L2 (foreground service, notification, auto-resume) | Homework/continuity evidence (r≈.26); the flagship "presence" cloud apps don't own; on-device context makes check-ins smart. Keep JITAI conservative, opt-in, receptivity-gated | Half → done | State Engine |
| **Embedding-RAG psychoeducation** — retrieve-and-quote vetted content | Kills hallucination on clinical facts; MiniLM already your retriever | Half → done | — |
| **Tier-2 cloud insight synthesis (digest-only)** — Claude (Opus 4.8 empathy / Sonnet 4.6 volume / Haiku classify) on the consented digest | The "research-backed insights" half; the one job a 4B structurally can't do to a zero-hallucination bar | Net-new | State Engine, freemium, legal review |
| **Freemium plumbing** — free = talking + §9 + basic mood/memory (never capped); paid ≈ $69.99/yr = insights, dashboard, deep memory, voice; onboarding paywall + trial, annual pre-selected, BYOK | Gate features, never the talking (Replika/Woebot/Character.ai lessons); $69.99/yr = category gravity; plan 2–3% conversion | Net-new | Compliance spine |
| **Beta with real strangers** — measure conversion + whether insights actually help | "Me first → strangers later"; the real-help metric | Net-new | Legal review, freemium |

---

## Dependencies & risks

- **State Engine is the keystone** — sensing, smart presence, and Tier-2 insights all block on it. Build it early in NEXT, on existing signals, before any new permission.
- **Legal review gates the stranger launch** (MHMDA private right of action = top litigation risk).
- **Freemium gates monetization** — but must never gate the conversation or crisis path.
- **Riskiest assumptions → cheapest tests:** (1) digest-fed value → 2-week Wizard-of-Oz; (2) people pay → freemium conversion; (3) legally defensible → attorney review.

---

## Explicitly NOT doing (scope discipline)

Not calling it therapy · not training a custom foundation model (Ash's unwinnable game) · not serving minors · not shipping raw data · not gating the conversation/crisis · not trusting the 4B for suicide-risk judgment · not naive sleep-restriction for bipolar · not chasing "free frontier for everyone."
