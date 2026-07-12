# NilaMind — Framework Self-Assessment

> **This is our own honest self-assessment, not an independent evaluation.** We score conservatively and
> flag where NilaMind does **not** meet a standard — that transparency is the point. We also invite
> independent assessment (e.g. listing on the [M-Health Index & Navigation Database / mindapps.org](https://mindapps.org)).
>
> Framework structures were checked against public summaries in July 2026 and should be re-checked against
> the current official versions before external use (frameworks evolve).
>
> Companions: [`TRANSPARENCY.md`](TRANSPARENCY.md) · [`EVIDENCE.md`](EVIDENCE.md) · [`PILOT_PROTOCOL.md`](PILOT_PROTOCOL.md).

## 1. APA App Evaluation Model

The [APA App Evaluation Model](https://www.psychiatry.org/psychiatrists/practice/mental-health-apps/the-app-evaluation-model)
(Torous et al., *A Hierarchical Framework for Evaluation…*, Psychiatric Services 2018) is a **hierarchical**
model: if an app fails a lower level, the higher levels don't matter. The five levels, in order:

| Level | What it assesses | NilaMind — honest self-rating |
|---|---|---|
| **1 · Access & Background** | Cost, platform, developer transparency, privacy policy, business model | **Met.** Free; Android 7+ (arm64); developer identified; **Apache-2.0, fully public source**; privacy policy published; explicit "wellness, not a medical device" scope; **no data-monetization business model** (it collects nothing). |
| **2 · Privacy & Safety** | Data collection/sharing, security, crisis handling | **Strongly met — our best level.** 100% on-device; **AES-256-GCM** at rest; **no account, no server, no analytics/telemetry**; zero-egress chat/voice/STT; deterministic, model-independent **§9 crisis safety**; a published [system card](TRANSPARENCY.md). |
| **3 · Clinical Foundation / Evidence** | Does *this app* have evidence it works? | **Not met yet — the honest gap.** NilaMind is built on evidence-based *methods* (PHQ-9/GAD-7, BA, DBT/CBT/ACT/CFT — all cited in [`EVIDENCE.md`](EVIDENCE.md)), but **there is no study of the app itself**: no efficacy/effectiveness data, and retention is unmeasured. Like most apps in the category, NilaMind does not clear this level — and we say so. ([`PILOT_PROTOCOL.md`](PILOT_PROTOCOL.md) is the plan to start.) |
| **4 · Engagement & Ease of Use** | Usability, accessibility, will people actually use it | **Partially met.** Voice-first, accessibility work done (WCAG-oriented, reduced-motion, TalkBack), works offline; **but no usability or engagement data**, and adherence is unmeasured. |
| **5 · Clinical Integration / Interoperability** | Fits into care, data portability, sharing with a clinician | **Partially met.** User-initiated clinician **export** — CSV / PDF, a **portable structured JSON**, and an **experimental FHIR R4 bundle** (screening scores as `Observation` resources, LOINC-coded for PHQ-9/GAD-7/PHQ-2; text-only where no established code exists) — plus a caregiver-share snapshot. **But the FHIR export is unvalidated against a real system and there is no EHR integration** or formal care-pathway. |

**Read of the pyramid:** NilaMind is genuinely strong exactly where the model weights the *foundations*
(Levels 1–2), and transparent that it does not yet clear the *evidence* level (3). That is the accurate
picture — a well-built, privacy-first tool whose real-world benefit is not yet demonstrated.

## 2. NICE Evidence Standards Framework (ESF)

The [NICE ESF](https://www.nice.org.uk/what-nice-does/digital-health/evidence-standards-framework-esf-for-digital-health-technologies)
(2022 update) classifies a digital health technology by intended purpose into tiers, with the evidence bar
proportionate to risk:

- **Tier A — system impact** (services with no direct user clinical outcome).
- **Tier B — understanding & communicating** (help users understand or self-manage).
- **Tier C — interventions** (treat, diagnose, or predict — highest evidence bar).

**NilaMind's intended tier: B.** It helps people understand and self-manage — reflection, psychoeducation,
evidence-informed coping tools, symptom self-tracking. It deliberately does **not** claim to treat or
diagnose (that would be **Tier C**), which is consistent with the "wellness companion, not a medical device"
positioning and keeps the evidence bar proportionate.

**Honest note:** even at Tier B, the ESF expects *relevant published evidence of value*. NilaMind does not
have that yet — the same gap as APA Level 3. On the 2022 ESF standards for adaptive/ML technologies: the
on-device §9 classifier is a fixed, shipped model (it does **not** retrain on the device), and the safety
layer around it is deterministic — which keeps that surface simpler than a continuously-learning system.

## 3. What would move the needle

In priority order, honestly:

1. **A retention curve + a small pre/post pilot → a preprint.** This is the single thing that would begin to
   address APA Level 3 / NICE Tier B evidence. Instrumentation and protocol are now in place
   ([`PILOT_PROTOCOL.md`](PILOT_PROTOCOL.md)); the data does not exist yet.
2. **Independent listing / evaluation** — submit NilaMind to the M-Health Index & Navigation Database so the
   privacy and clinical-foundation ratings come from a third party, not from us.
3. **A named clinical advisor** reviewing the content library.
4. **Validate the FHIR export** against a real FHIR server / conformance tooling, and pursue an EHR integration, to fully strengthen Level 5 — the experimental FHIR R4 bundle exists; independent validation and a consuming system are the next steps.

---

*Living document, v1 (2026-07-11). Self-assessment — not an independent evaluation. Frameworks should be
re-checked against their current official versions.*
