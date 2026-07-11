# NilaMind — Pre/Post Feasibility & Retention Pilot (protocol)

> **Status:** protocol / scoping draft (v0.1, 2026-07-11). Not yet run. This describes *how* a small,
> honest pilot would work; it is not a claim that NilaMind has been validated. NilaMind remains an AI
> companion for self-help, not a therapist or medical device.
>
> Citations here should be verified against their primary sources before any public writeup; less-certain
> attributions are marked **(verify)**.

## 1. Why run this

The dossier's clearest finding: for mental-health apps, the binding constraint is **adherence, not efficacy** —
real-world retention is brutal (industry median: a low-single-digit % of users still active by ~day 15;
Baumel et al. 2019 **(verify)**), and the leading explanation for why *guided* digital interventions beat
unguided ones is human **supportive accountability** (Mohr et al. 2011 **(verify)**). NilaMind is fully
autonomous, so the entire product rests on one unproven bet: **can an on-device AI companion supply enough
of that accountability that people keep using it — and feel better?**

We now have the on-device instrumentation to answer the first half honestly (retention) and to *signal* the
second (symptom change), without collecting anything centrally. This pilot turns that into evidence.

## 2. Questions (in priority order)

1. **Feasibility / retention (primary).** Do enrolled participants keep using NilaMind? What does the
   retention curve look like against the field's benchmark? (Measured on-device via `retentionMetrics.ts`.)
2. **Symptom change (exploratory).** Among those who complete both timepoints, how do PHQ-9 / GAD-7 / WHO-5
   scores change from baseline to endpoint?
3. **Engagement ↔ change (exploratory).** Is more engagement (active days, protocol/skill use) associated
   with larger symptom change?

We deliberately do **not** frame symptom change as a primary or confirmatory outcome — a single-arm pre/post
design cannot support a causal efficacy claim (see §8).

## 3. Design

- **Type:** single-arm, within-subject, pre/post **feasibility pilot** (not an RCT; no control group).
- **Setting:** fully remote, fully on-device. No server, no account, no central data collection.
- **N:** ~30–50 enrolled (a feasibility range; not powered for a confirmatory efficacy test).
- **Duration:** 4–6 weeks of naturalistic use between baseline and endpoint.
- **Population:** consenting adults (18+) who choose to try NilaMind and can read one of the app's languages.
  Not a clinical sample; not a diagnosis-gated sample. People in acute crisis are directed to the §9
  resources and are not an appropriate pilot population.

## 4. Measures — all already shipped in `assessments.ts`

| Construct | Instrument (in-app) | Citation | Role |
|---|---|---|---|
| Depression | **PHQ-9** (0–27) | Kroenke, Spitzer & Williams 2001 | Exploratory pre/post |
| Anxiety | **GAD-7** (0–21) | Spitzer, Kroenke, Williams & Löwe 2006 | Exploratory pre/post |
| Wellbeing | **WHO-5** (0–100, higher = better) | Topp et al. 2015 **(verify)** | Exploratory pre/post |
| Perceived stress | **PSS-4** (0–16) | Cohen & Williamson 1988 **(verify)** | Optional secondary |
| Retention | app-open history | — | **Primary** (via `computeRetention()`) |

**Anchors for interpreting change (report, don't over-read):** commonly-cited minimal clinically important
differences are ≈5 points for PHQ-9 and ≈4 for GAD-7 **(verify — MCIDs vary by population and method)**.
Report change *with* its confidence interval, not just a point estimate.

**Screening ≠ diagnosis** must be stated on every score, and **PHQ-9 item 9** keeps its existing §9
safety routing throughout the pilot — the pilot changes nothing about crisis handling.

## 5. Procedure

1. **Enroll & consent** (on-device): plain-language consent that this is a self-help pilot, that all data
   stays on the device, that sharing is voluntary, and that they may withdraw / delete at any time.
2. **Baseline (day 0):** complete PHQ-9 + GAD-7 (+ WHO-5). These are stored, date-stamped, encrypted at rest,
   exactly like any other assessment today.
3. **Naturalistic use (weeks 1–4/6):** the participant uses NilaMind however they like. No scripted usage.
   Existing opt-in nudges (EMA, reminders) are unchanged. `recordAppOpen()` accrues the retention curve.
4. **Endpoint (day 28–42):** re-take PHQ-9 + GAD-7 (+ WHO-5).
5. **Share (voluntary):** the participant runs the existing **export** (`exportReport.ts`) — which already
   contains the assessment history and the on-device retention block — and sends the resulting report to the
   study contact by a channel of their choosing. **Nothing is transmitted automatically.**

## 6. Data & privacy model

- **On-device only.** Every measure lives in the encrypted store (`secureLocal`, AES-256-GCM). There is no
  study server and no telemetry. This is the same posture the app already ships.
- **Participant-mediated sharing.** Data reaches the researcher **only** if the participant exports and sends
  it. The export is a plain report (no raw chat transcripts); the retention block is the participant's own
  app-open summary.
- **De-identification.** The report carries no name/email/account (there is no account; identity is a local
  BIP39 seed). A study code is assigned out-of-band at enrollment.
- **Withdrawal.** "What Nila remembers" + Your Data already provide full view/edit/delete; withdrawal =
  simply not sending the export (and deleting locally if desired).

## 7. Analysis

- **Retention (primary):** plot the day-N retention curve and report `activeDaysLast7/30`, median span, and
  the % of enrollees who completed the endpoint. Compare qualitatively to the Baumel benchmark.
- **Symptom change (exploratory):** paired analysis of completers — Wilcoxon signed-rank (robust to small N)
  and paired *t* for PHQ-9 / GAD-7 / WHO-5; report the mean change, its 95% CI, and a standardized effect
  size. State the completer-only denominator explicitly (dropout is itself a finding, not a nuisance).
- **Engagement ↔ change (exploratory):** correlate active-days / protocol use with symptom change, framed as
  hypothesis-generating only.

## 8. Honest limitations (state these up front, every time)

- **No control group.** Single-arm pre/post cannot separate the app's effect from **regression to the mean,
  natural remission, expectancy/placebo, or measurement reactivity.** Any symptom improvement is a *signal to
  justify a controlled trial*, not evidence that NilaMind works.
- **Self-selected, small, unblinded.** Enrollees are motivated volunteers; results don't generalize.
- **Completer bias.** People who feel better may be likelier to complete the endpoint, inflating apparent
  improvement — which is exactly why retention is the *primary* outcome and change is exploratory.
- **Not a medical study.** No diagnosis, no clinical monitoring beyond the app's §9 layer.

Framed this way, a positive result is modest and defensible; a null or low-retention result is *equally
valuable* — it tells us the accountability bet needs rework before anything else.

## 9. Deliverable

A short methods + results writeup (a preprint is appropriate): retention curve, completer pre/post changes
with CIs, and a frank limitations section. Per the transparency standard, the writeup states what the pilot
can and cannot support. One honest study of *this app* sits at the top of the APA evaluation pyramid.

## 10. What in-app scaffolding this needs

Most of the pilot is **runnable today** with existing features (assessments already store dated PHQ-9/GAD-7/
WHO-5; the export already carries assessment history + the retention block). The only additions that would
make it clean and reduce dropout:

1. A consented, opt-in **"Research pilot" enrollment** that stamps an enrollment date and shows the consent copy.
2. A single scheduled **endpoint reminder** (reuse `notifications.ts`) at day 28–42 to re-take the measures.
3. A **pilot export section** that lays out baseline vs. endpoint side-by-side with the change and the
   retention summary (extend the existing `buildTextReport` retention block; no new data types).

All three reuse shipped infrastructure (assessments, notifications, exportReport, retentionMetrics) and add
**no** network path and **no** always-on surface. They can be built behind an opt-in so they never touch a
non-participant's experience.

---

*Living document. The pilot must be reviewed by a qualified person before running with real participants;
this protocol is a starting point, not an approval.*
