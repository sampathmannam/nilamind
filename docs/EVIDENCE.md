# NilaMind — What the Evidence Says (and What It Doesn't)

> **The honest version.** This page states the clinical basis behind each part of NilaMind **and its
> limits**. The single most important thing to understand: the evidence below is for the *methods and
> instruments* NilaMind draws on — it does **not** transfer to this app. An app that references PHQ-9 or
> the Stanley-Brown plan is not thereby validated. **NilaMind itself has not been evaluated in a trial.**
>
> Companion documents: [`TRANSPARENCY.md`](TRANSPARENCY.md) (model card + §9 safety system card + privacy
> datasheet) and [`PILOT_PROTOCOL.md`](PILOT_PROTOCOL.md) (how we would actually measure whether it helps).

## How to read this

- **✓ cited in source** — the citation is present in the code (e.g. `assessments.ts`, `safety.ts`), not just here.
- **Clinical basis** — what the underlying method/instrument has evidence for.
- **Honest limit** — what that evidence does *not* establish, and what NilaMind therefore does not claim.
- Citations should be checked against their primary sources before being relied upon; less-certain
  attributions are marked **(verify)**. This is itself the standard we hold ourselves to — the field's
  number-one credibility problem is claims that outrun the evidence.

Three limits apply *everywhere* and are not repeated in every row:
1. **Screening is not diagnosis.** A score or a detected pattern is a prompt to reflect or seek help, never a diagnosis.
2. **Method evidence ≠ app evidence.** Effect sizes below are for the method as studied (often therapist-guided), not for NilaMind.
3. **This is a wellness companion, not a therapist or medical device.**

---

## Screenings & assessments

| Feature | Clinical basis | Honest limit |
|---|---|---|
| **PHQ-9** (depression) | Kroenke, Spitzer & Williams 2001 ✓ — validated screen; sens/spec ≈ 88/88 at ≥10 | A score is not a diagnosis; item 9 routes to §9 safety, not clinical triage |
| **GAD-7** (anxiety) | Spitzer, Kroenke, Williams & Löwe 2006 ✓ — sens/spec ≈ 89/82 at ≥10 | Screening only; population-dependent |
| **WHO-5** (wellbeing) | Topp et al. 2015 ✓ — validated wellbeing index | A low score warrants follow-up, not a diagnosis |
| **PHQ-2** (ultra-brief) | Kroenke, Spitzer & Williams 2003 ✓ | A positive screen means "take the full PHQ-9", nothing more |
| **PSS-4** (perceived stress) | Cohen & Williamson 1988; Warttig et al. 2013 ✓ | **No official clinical cut-off** — a continuous self-tracking measure, not a screen for a disorder |

## Structured protocols

| Feature | Clinical basis | Honest limit |
|---|---|---|
| **Behavioral Activation** | Ekers et al. 2014 ✓ (meta-analysis, SMD ≈ −0.74 for depression); broader base: Richards COBRA 2016 (non-inferior to CBT — *external, not cited in code*) | The evidence is strongest for **guided/therapist-supported** BA; NilaMind provides deterministic step prompts, not a therapist |
| **Cognitive restructuring** | Beck (CBT) ✓ — extensive evidence base | Computerised/unguided CBT is weaker than therapist-led; the model narrates, the app doesn't treat |
| **Worry postponement (GAD)** | CBT-for-GAD stimulus-control component | Component-level technique; effect studied within a broader protocol |
| **Self-compassion** | Neff ✓; broader meta-analytic support | Growing evidence base; effect varies by outcome |
| **Sleep wind-down** | CBT-I principles (bipolar-safe framing) | Not a treatment for a sleep disorder; a self-help routine |

## Skills library (~40 micro-skills)

| Feature | Clinical basis | Honest limit |
|---|---|---|
| **DBT skills** | Linehan ✓ | Evidence is strongest for the **full DBT skills program**; standalone micro-skills are less studied |
| **CBT skills** | Beck ✓ | Well-established techniques; delivered here as self-help, not therapy |
| **ACT skills** | Hayes ✓ | Solid for process; outcome sizes moderate |
| **CFT skills** | Gilbert ✓ | Younger evidence base — claims kept proportionate |
| **Grounding / breathing** | Standard anxiety-regulation techniques | Symptom relief in the moment; not a treatment |

## Crisis safety (§9)

| Feature | Clinical basis | Honest limit |
|---|---|---|
| **Layered detection** | High-recall lexical + semantic screening | Cross-validated recall ≈ 89% (from ≈ 61% keyword-only), **not 100%** — it will miss cases; the English classifier is the only ML layer, and it is additive-only |
| **Anti-sycophancy output gate** | Sycophancy is a documented harm mechanism of LLM MH tools (OpenAI GPT-4o rollback; Østergaard 2023 ✓) | Deterministic guards are imperfect; they reduce, not eliminate, harmful affirmation |
| **Mania / activation guard** | DSM-5 mania criteria; Østergaard 2023 ✓ (sycophancy→mania amplification); Goodwin & Jamison 2007 ✓ (religious grandiosity) | Marker lists are high-precision, not exhaustive; **not** a diagnosis of bipolar disorder |
| **Stanley-Brown safety plan** | Stanley & Brown 2012 ✓; follow-up associated with ≈ halving of suicidal behaviour (Stanley et al. 2018) | That figure is a **cohort study, not an RCT**; means-restriction is the best-evidenced element; NilaMind's follow-up is in-app, not clinician-delivered |

## Mood, EMA & analytics

| Feature | Clinical basis | Honest limit |
|---|---|---|
| **Daily check-ins** | Self-monitoring (core CBT technique) | Aids therapy; standalone effect is modest |
| **EMA (momentary check-ins)** | Shiffman, Stone & Hufford 2008 ✓; Webb ✓ | A validated **measurement** method — measurement can itself change behaviour (reactivity); it measures, it doesn't treat |
| **Correlation / pattern engine** | Multiple domain citations in code | Surfaces **correlational** noticings only — never causal or clinical inference; hedged by design |
| **Inflection awareness** | Reliable-change logic (Jacobson–Truax lineage) ✓ | A prompt to reflect on a shift in *your own* trajectory, not a verdict; off by default |

## Companion, memory & privacy

| Feature | Clinical basis | Honest limit |
|---|---|---|
| **Nila persona / alliance framing** | Flückiger et al. 2018 ✓ — therapeutic alliance predicts outcome | That evidence is for **human** therapists; human–AI alliance is emerging — NilaMind claims no "relationship" outcome |
| **On-device model** | — | Reply quality is limited by a small (≈1B) on-device model; small-model clinical quality is unproven |
| **Weekly reflection / memory** | Measurement-based care (Shimokawa & Lambert 2010 — *external context*) | MBC's proven mechanism is *clinician* feedback; on-device self-review is analogous, **not** proven to the same effect |
| **On-device, encrypted, no account** | Not a clinical claim | A genuine engineering/privacy property (see [`TRANSPARENCY.md`](TRANSPARENCY.md)) — strong for trust, unrelated to efficacy |

---

## The bottom line — what NilaMind has *not* shown

Stated plainly, so no reader has to infer it:

- **No trial of this app.** NilaMind has never been evaluated in a controlled study. Every effect size above belongs to a method, not to NilaMind.
- **Retention is unmeasured.** The field's real constraint is whether people keep using a tool at all. We have just added on-device retention instrumentation and a pilot protocol to measure this honestly — results do not exist yet (see [`PILOT_PROTOCOL.md`](PILOT_PROTOCOL.md)).
- **Small-model reply quality is unproven**, and depends on the model installed.
- **The autonomous-companion bet is unvalidated.** Guided digital interventions beat unguided ones largely because of human accountability; whether an on-device AI companion can stand in for that is the open question the whole product rests on.

A positive future result would be modest and worth reporting; a null or low-retention result would be **equally worth reporting**. Either way, we will say what the evidence supports and no more.

---

*Living document, v1 (2026-07-11). Sources to be verified against primaries before external use.*
