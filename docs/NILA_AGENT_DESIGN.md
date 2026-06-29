# NilaMind — Agentic Mental-Health Agent: Research-Grounded Design Points

**Scope:** personal, single-user, on-device, manic-episode-first. Two faces — a **Coach** (present-tense, daily) and a **Guardian** (acts on a pact you write when well). This doc is the *what-to-include* spec, every point tied to evidence.

> **Citation honesty:** sources below were gathered + verified by automated research with real DOIs; a handful are flagged `⚠verify` (matched from search metadata, not full-text). Confirm those DOIs before any external/clinical use. Per project rule: **never cite what you can't verify.**

---

## 0. The one governing principle (everything else descends from this)

- **SENSE → ASK → CONFIRM → (pact-authorized) ACT. Never sensor → alarm.** The largest replication found passive-signal↔symptom correlations of only **r ≈ 0.1**, and prediction only worked when **a daily self-report was fused in** — passive data alone was insufficient. *(Currey & Torous 2022, BJPsych Open, doi:10.1192/bjo.2022.507)*
- **Scope strong claims to MANIA; stay humble on depression.** Teaching early-warning-sign recognition delayed manic relapse (65 vs 17 wks) but had **no effect on depressive relapse**; the asymmetry holds meta-analytically. *(Perry 1999, BMJ, doi:10.1136/bmj.318.7177.149; Bond & Anderson 2015, Bipolar Disord, doi:10.1111/bdi.12287)*

---

## 1. What the agent SENSES — the Coach's continuous track (ranked by evidence)

- **Tier 1 — Sleep + circadian timing = the spine.** Next-day episode prediction hit **AUC 0.98 manic / 0.95 hypomanic / 0.80 depressive** from wearable sleep+circadian features; dominant feature = **within-person circadian phase shift (advance → mania)**. Sleep is also the earliest, most-cited manic prodrome, and self-reported as a *causal trigger* for 20–25% of BD-I. *(Lim et al. 2024, npj Digital Medicine, doi:10.1038/s41746-024-01333-z; Jackson 2003, J Affect Disord, doi:10.1016/S0165-0327(02)00266-5; Lewis 2017, Br J Psychiatry, doi:10.1192/bjp.bp.117.202259)*
  - → **A shrinking sleep window + circadian advance is the single highest-yield manic tripwire.** Compute it as a personal Z-score, not an absolute.
- **Tier 2 — GPS location entropy / mobility (content-free).** Beat accelerometer activity for state detection (96%/94% state-change precision/recall). High entropy → mania; low → depression/withdrawal. *(Grünerbl 2014/2015, IEEE JBHI, doi:10.1109/JBHI.2014.2343154 ⚠verify exact doi)*
- **Tier 3 — Linguistic drift in how you type to Nila (on-device, no content leaves).** Keystroke metadata explained depression at R²=0.63, mania R²=0.34 — a privacy-respecting *depression* sensor; weaker for mania. *(Zulueta 2018, JMIR, doi:10.2196/jmir.9775)*
- **Tier 4 — Usage signature** (screen unlocks, app-switch velocity, 2am posting, call/text *frequency* not content): a useful *supplementary* background channel, never diagnostic. *(Faurholt-Jepsen 2019, ANZJP, doi:10.1177/0004867418808900)*
- **Light EMA, adaptive:** ~3–4 check-ins/day default, target **≥80% response**; ask *more* when steady/quiet, *less* when the passive layer is already screaming. Clinical users tolerate higher frequency than non-clinical. *(Wen 2017, JMIR, doi:10.2196/jmir.6641)*
- **Self-throttle on your own falling response-rate** — a steepening decline predicts disengagement (dropouts fall −7 to −10%/wk vs −2%/wk). Back off before you become noise. *(Tonkin 2023, JMIR, doi:10.2196/43826)*
- **Calibration mode:** the personal baseline needs **30–60 days** before it can alarm; observe + ask, don't fire, until then. Consider a population prior → personalize hybrid for day 1. *(Lim 2024; Currey & Torous 2022)*
- **Voice/prosody = experimental, do NOT headline.** Personalized within-person work hit AUC 0.89 for mania, but external review found voice-only ≈ **AUC 0.50**. Validate on *this* user before trusting. *(Faurholt-Jepsen 2016, Transl Psychiatry, doi:10.1038/tp.2016.123 vs Zhong 2025, JMIR, doi:10.2196/72229)*

---

## 2. The COACH — present-tense, daily, earns the trust the Guardian spends

- **Build the timing engine on the 6 JITAI slots** (distal outcome, proximal outcomes, decision points, intervention options, tailoring variables, **decision rules**). Keep *when-to-act* in **explicit deterministic rules — do not let the LLM improvise timing.** *(Nahum-Shani 2018, Ann Behav Med, doi:10.1007/s12160-016-9830-8)*
- **Set honest expectations:** adaptive interventions buy a **small** edge (g≈0.15, and only vs active controls, not waitlist/TAU). Chatbot symptom effects ≈ **g≈0.3 short-term**, fading at follow-up. Not therapy-equivalent. *(von Lützow 2025, BMJ Ment Health, doi:10.1136/bmjment-2025-301641; Li 2023, npj Digit Med, doi:10.1038/s41746-023-00979-5)*
- **Relational > gamified.** Reminders + warm, remembered presence raise retention; **gamification did not** (and risks fueling manic "do-more"). No streaks/points. *(Baumel 2019, JMIR, doi:10.2196/14567)*
- **Design for the engagement cliff:** real-world **30-day retention ≈ 3.3%**, ~80% drop by day 10. Value must survive *not opening the app* — lightweight, well-timed, **pull > push**. *(Baumel 2019; Eysenbach 2005, JMIR, doi:10.2196/jmir.7.1.e11)*

---

## 3. The GUARDIAN — past-tense, the when-well pact, spends trust rarely

- **The pact = a self-binding (Ulysses) directive.** **82% of people with bipolar endorse** self-binding directives; the stated reason ("a determinate shift to distorted thinking when unwell — I become a different person") *is* the guardian's premise. Frame it as **autonomy-as-authenticity**: the guardian honors *your own prior wishes*, it doesn't override you. *(Gergel 2021, Lancet Psychiatry, doi:10.1016/S2215-0366(21)00115-2; Gergel & Owen 2015, Int J Law Psychiatry, doi:10.1016/j.ijlp.2015.04.004)*
- **Teeth = friction + recruit-a-human, NOT force/lock.** The evidence-based, low-coercion moves are exactly (a) **caring human contact** (caring-contacts cut re-attempts) and (b) **means-style friction** (restricting access during the acute window reduces harm, little displacement). Hard blocks trigger **psychological reactance → distrust → abandonment.** *(Means-restriction: Nevarez-Flores 2025, Acta Psychiatr Scand, doi:10.1111/acps.13783; reactance/digital-self-control lit ⚠verify specific dois)*
- **PULL not PUSH; opt-in; pre-authorized when calm; always overridable; always explained.** Acting against expressed wishes on a model's judgment is the central paternalism harm. *(IEACP framework, Vilaza et al. 2024, Psychol Med ⚠verify)*
- **Engineer against the 3 pact failure modes its own critics name:** ① **staleness** → periodic well-state re-ratification; ② **over-broad triggers** → precise, user-authored activation conditions, not "when manic"; ③ **treating dissent as pathology** → least-restrictive action that meets the stated goal; reserve any non-overridable floor for narrow, high-consequence, mania-scoped states. *(Gergel 2021 rejecters; Potthoff 2021 anti-Ulysses-for-BPD, doi:10.1007/s11019-020-09967-y)*
- **Honoring is socially fragile** — even formal directives are often not followed. A phone app can't supply capacity assessment or clinical authority. **Pre-negotiate the human hand-off while well:** name *who* it contacts. Its reliable power is *early detection + surfacing your own prior words to the right person*, not unilateral enforcement. *(Swanson 2006, J Behav Health Serv Res, doi:10.1007/s11414-005-9001-3)*
- **First on-phone act when an episode is detected: make Nila QUIETER** (suspend the coach/encouragement), not louder.

---

## 4. §9 CRISIS — model-independent, now backed by hard evidence

- **Detect PRESENT expressed crisis; never *predict* risk.** Suicide-risk prediction models have **PPV ≤ 0.01 ("near 0")** for the individual — autonomous escalation on a "risk score" would be almost all false alarms. The APA's 2025 advisory states AI "cannot accurately assess risk." *(Belsher 2019, JAMA Psychiatry, doi:10.1001/jamapsychiatry.2019.0174; APA Health Advisory, Nov 2025)*
- **Deterministic, fail-closed, model-independent, keyed to means + intent** (not the keyword "suicide"). LLMs answered high-lethality means questions and even gave bridge locations in crisis context. *(McBain 2025, Psychiatric Services, doi:10.1176/appi.ps.20250086; Moore 2025, FAccT, doi:10.1145/3715275.3732039)*
- **Always *additionally* reachable.** Even strong classifiers miss ~**38%** and false-positive ~**7%** — never suppress the §9 surface just because the model said "benign." *(Broadbent 2023, Front Psychiatry, doi:10.3389/fpsyt.2023.1110527)*
- **Terminal action = hand off to a human / 988-equivalent**, hard-coded + version-checked (a model once emitted an outdated hotline number). The agent never positions itself as *managing* the crisis. *(APA 2025; McBain 2025)*
- **Intent-resolution layer over every consequential/agentic action** (search, location, tools): a benign-looking request riding on crisis context must be caught before a tool answers it. *(Moore 2025)*

---

## 5. The AI-specific harms to engineer against (the genuinely hard part)

- **Sycophancy + persistent memory = mania/delusion amplification ("AI psychosis") — the #1 risk for a manic-first companion.** The very trait that makes "validation" feel good (agreeing) reinforces grandiose/delusional content, and cross-session memory weaves the AI *into* the delusion. → Add **reality-testing / gentle disconfirmation** for grandiose/paranoid content; **gate what compounding-memory is allowed to reinforce** (never persist or echo delusional themes). *(Østergaard 2023, Schizophr Bull, doi:10.1093/schbul/sbad128; Morrin 2025, arXiv:2509.10970)*
- **Dependency:** heavy daily use → **higher loneliness, emotional dependence, problematic use, less real-world socializing**; high-attachment users fare worst. → Build **deliberate friction toward human connection**, usage ceilings, and *anti-"come back to me"* design. Treat rising dependence as a harm signal, not a retention win. *(Fang et al. 2025, MIT Media Lab × OpenAI, arXiv:2503.17473)*
- **Fine-tuning erodes safety** — it lives in the first few tokens, and even *benign* fine-tuning (therapy transcripts) strips guardrails. This *is* the mechanism behind the V2 role-confusion. → **Keep §9 outside the LLM; re-run an adversarial safety eval after every adapter; treat any safety regression as a ship-blocker.** *(Qi 2024, ICLR, arXiv:2310.03693; Qi 2025, ICLR, arXiv:2406.05946)*
- **Real-world harm pattern to avoid:** companion + vulnerable user + self-harm context + no hard floor. Tessa (eating-disorder bot pulled in days for weight-loss advice), Character.AI / Sewell Setzer (wrongful-death, settled), FTC 6(b) inquiry into companion AIs. *(NPR 2023; Garcia v. Character Technologies 2024–26; FTC Sept 2025)*

---

## 6. Privacy — an invariant, not a feature

- **On-device, no-network, derived-digest-only** is the strongest available answer to passive-sensing's consent harms (continuous monitoring isn't covered by one-time consent; the named harm is data *leaving* the health context — which you've eliminated by construction). *(Martinez-Martin 2018, npj Digit Med; Mulvenna 2021 Delphi, JMIR mHealth, doi:10.2196/27343)*
- **"What Nila senses" gets the same view / edit / delete transparency as "what Nila remembers."** Passive monitoring is explicitly toggleable and explained in plain language.

---

## 7. The cost-of-wrong asymmetry (why the bar is high, not low)

- **A false alarm isn't free:** over-reassurance/false-alarm episodes **deter future help-seeking for months**. → Keep the *high-stakes* trigger **rare + high-precision**; keep the *low-stakes* support path **always-on + generous**. Few unsolicited "are you okay?" pings (the existing ≤1/day, off-by-default inflection ceiling is well-aligned). *(Renzi 2015, BMJ Open, doi:10.1136/bmjopen-2014-007002)*

---

## 8. Regulatory & honesty posture

- **Don't imply therapy-equivalence** — cite g≈0.3 short-term, vendor-run and brief.
- **FDA wellness-vs-SaMD line is actively moving (Jan 2026 deregulatory updates)**; an agent that *detects suicidality and takes actions* leans toward medical-device territory — **treat as an open question, not settled.** No FDA doc squarely classifies an autonomous crisis-acting agent. *(FDA general-wellness/CDS guidance 2026; flagged unsettled)*

---

## 9. The build order the evidence implies

1. **Sensor spine first:** on-device sleep/circadian tracking + personal-baseline calibration mode. (Highest-yield, lowest-ethical-risk.)
2. **Coach** on the JITAI 6-slot engine with explicit decision rules + adaptive EMA + self-throttle.
3. **Pact authoring UX** (when-well, re-ratifiable, precise triggers, named human).
4. **Guardian** with friction + recruit-a-human teeth only; PULL-armed; always overridable/explained.
5. **Harden** §9 (means+intent, outside the LLM) + the sycophancy/reality-test + dependency guards **before** any of the above ships.

---

### Master citation list
Currey & Torous 2022 · Lim 2024 · Jackson 2003 · Lewis 2017 · Grünerbl 2014 · Zulueta 2018 · Faurholt-Jepsen 2016/2019 · Zhong 2025 · Nahum-Shani 2018 · von Lützow 2025 · Li 2023 · Wen 2017 · Tonkin 2023 · Eysenbach 2005 · Baumel 2019 · Perry 1999 · Bond & Anderson 2015 · Morriss/Cochrane 2007 · Gergel 2021 · Gergel & Owen 2015 · Potthoff 2021 · Swanson 2006 · Belsher 2019 · Broadbent 2023 · McBain 2025 · Moore 2025 · Vilaza/IEACP 2024 · Renzi 2015 · Nevarez-Flores 2025 · Martinez-Martin 2018 · Mulvenna 2021 · Fang 2025 · Østergaard 2023 · Morrin 2025 · Qi 2024/2025 · APA 2025 advisory.

---

# POST-REVIEW UPDATE — red panel (4 reviewers) + COROS Pace 3 wearable

## Red-panel verdict: UNANIMOUS "GO-WITH-CONDITIONS" — and the conditions invert the build order
Four independent adversarial reviewers (clinical-safety, technical-feasibility, ethics-autonomy, product-adherence) converged on one cut: **ship the Coach + additive §9; do NOT ship the continuous-sensor-spine or the acting-Guardian as designed.** The doc's own first principle (*sense → ask → confirm; passive r≈0.1*) is the off-ramp that lets you cut the unbuildable/unsafe parts without losing the thesis.

- **CLINICAL (hard blocker):** the mania-vs-depression binary is a *safety* blind spot — absolute suicide risk is highest in **depressive and mixed** states, the lanes the design is weakest on. Worst single line in the doc: in a **MIXED state** (manic energy + suicidal despair) the sensors read "manic" → the Guardian's "make Nila quieter" rule *withdraws support at peak suicide risk*. Fixes (gating): ① model **MIXED** as first-class — high-activation + any distress ⇒ highest §9 sensitivity, **never** "quieter"; ② build the **depressive safety floor** before the manic Coach; ③ **gate reality-testing on a capability eval** (the shipped 1B can't do calibrated disconfirmation) with a deterministic scripted fallback; ④ handle **rapid cycling** (breaks the baseline + pact-ratification); ⑤ cover **euphemistic/calm** crisis ("gave away my guitar"), not just means+intent.
- **TECHNICAL:** the sensor-spine is largely **unbuildable on Capacitor** — no background loop (foreground snapshots only → the 30-60-day baseline can't accrue from app-opens), cross-app keystroke is sandbox-impossible, and Guardian "friction on other apps" is **Play-policy-fatal** (Oct 2025 Accessibility ban on monitoring/assistant apps). `phoneBehaviour.ts` already proves the limits (`firstPickupTime: null`). Cuts: cross-app acting, ambient keystroke; "recruit a human" ⇒ a **user-tapped, pre-filled handoff**. The one credible sleep path is **Health Connect** (see COROS below).
- **ETHICS:** **user = developer = subject** collapses the entire Ulysses-pact ethics it cites (those *assume* an independent binder/clinician). You hold root, so a self-bound pact is either theater or **unaccountable self-coercion**. And the gravest: built for "someone who can't open up to humans" — the population the dependency evidence (Fang 2025) flags as **most harmed** by a warm always-on companion, so **the success case is the harm case.** Bright lines: **no non-overridable floor**, ever; **§9 only ADDS a human, never RESTRICTS**; the pact may **never use dissent as a trigger or as confirmation**; **require a named, consented human before the Guardian gets any teeth**; **dependency is a ship-blocker, not a tuning knob**; reframe **companion → bridge** and make "human-connection facilitated" the metric retention is subordinate to.
- **PRODUCT:** the 30-60-day baseline **is** the engagement cliff (~97% gone before the Guardian is useful); "agentic" is **YAGNI** — the doc's own evidence credits the *relationship*, not the agency. Smallest thing that helps: **warm Coach + additive §9 + a one-time "letter to my unwell self"** surfaced when *you* report bad sleep and tap to loop in a named human.

## COROS Pace 3 delta (VERIFIED) — unblocks 2 of the 4 objections, leaves 2 standing
The user wears a **COROS Pace 3** (sleep staging, continuous HR, SpO2). COROS **syncs sleep + resting/daily HR to Health Connect** (Profile → Settings → 3rd Party Apps → Health Connect). Impact:
- **Unblocks TECHNICAL:** sleep/circadian — the **AUC-0.98 manic-prodrome spine** (Lim 2024, which itself used *wearable* sleep data) — becomes readable via the exact Health-Connect path the technical reviewer endorsed. The "a phone can't sense sleep" blocker is removed; read sleep + resting-HR through a Capacitor Health Connect plugin.
- **Unblocks PRODUCT/cold-start:** the watch collects **24/7 on the wrist**, so the 30-60-day baseline accrues **without the user opening the app** — defusing the "death before value" engagement-cliff trap.
- **Enriches (to validate):** resting-HR / HRV (autonomic activation can precede mania) and SpO2 (sleep quality). Sleep remains the *verified* spine; treat HR/HRV/SpO2 as research-worthy additions, not headline claims.
- **UNCHANGED by the watch:** the clinical **mixed-state safety** blocker and the **ethics** bright lines (solo-subject, dependency). **The wearable makes the sensing buildable — it does not make the Guardian safe or ethical.**

## Net direction
**Build now:** warm Coach · additive model-independent §9 (mixed-state-aware) · Health-Connect sleep + resting-HR (COROS) as the early-warning *signal* · a witness-gated "letter to my unwell self." **Defer/cut:** autonomous Guardian teeth, cross-app acting, ambient phone sensing. **Gate the Guardian** on the clinical (mixed-state, depressive floor, reality-testing eval) and ethics (named human, no non-overridable floor, dependency ship-blocker) conditions — not before.

> Citation-verification + the `⚠verify` DOIs above remain open; the red panel added a hard item: **re-run the adversarial §9/safety eval after every model adapter as a CI gate, and version-check the hard-coded helpline on every build.**
