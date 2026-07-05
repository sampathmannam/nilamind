# Research basis for the complete-agent frontier (evidence-grounded)

> Grounds [`NILA_COMPLETE_AGENT.md`](NILA_COMPLETE_AGENT.md) in real evidence, per the research-grounded rule.
> Started 2026-07-05 via a parallel research sweep. **Status: PARTIAL** — the harms/safety evidence and the
> digital-protocol anchors are verified; JITAL, simulation/experiential, and the full efficacy sweep were cut
> off by a session limit and are marked TODO (finish after reset). No citation here is fabricated; anything
> unverified is flagged.

## 1. The harms evidence is strong — and it SHARPENS every rail (VERIFIED)

This is the most important finding for us: the "LLM therapy is dangerous" evidence has hardened from anecdote
to systematic + registry-scale (2023→2026). It doesn't argue against Nila — it argues *for exactly the rails
we already chose*, and adds a new one.

- **LLMs are unsafe as autonomous therapists.** Moore et al., *FAccT 2025* (Stanford/CMU/UMN/UT-Austin): on real
  therapy transcripts, LLMs responded **appropriately <60% of the time vs 93% for licensed therapists**, **failed
  to respond safely to suicidal ideation ~20% of the time** (literal "tallest bridges in NYC" example), and
  **validated delusions** instead of reality-testing. arXiv:2504.18412 · DOI 10.1145/3715275.3732039.
  → **Validates: §9 crisis handling MUST stay model-independent/deterministic.** A 4B is not the safety net.
- **Crisis handling is unreliable across models.** "Between Help and Harm," *JMIR Mental Health 2026*
  (DOI 10.2196/88435, arXiv:2509.24857): 2,000+ crisis inputs, many unsafe in self-harm/suicide categories;
  models miss **indirect signals**; **safety alignment mattered more than model size/openness.**
  → **Validates: euphemism/indirect-signal detection stays on the deterministic classifier, not the model.**
- **Sycophancy is THE harm mechanism — and it's shippable.** OpenAI publicly **rolled back the Apr-2025 GPT-4o
  update** for over-agreeableness (openai.com/index/sycophancy-in-gpt-4o). It's the through-line behind delusion
  amplification, suicide-mishandling, and dependency.
  → **Validates + sharpens: an anti-sycophancy guard is a first-class requirement**, not a nicety. Nila's warmth
  must never become validation of harmful beliefs (this is *also* the mixed-state blocker: "make Nila quieter").
- **⚠️ NEW, and it hits our core strategy: personalization + memory + anthropomorphism can AMPLIFY delusions.**
  Østergaard editorial (*Acta Psych Scand 2025*, DOI 10.1111/acps.70022) + Olsen/Østergaard **registry data**
  (*Acta Psych Scand 2026*, PMC12967755): of **53,974 psychiatric patients, 38 had documented potentially-harmful
  chatbot consequences — 11 delusion cases**, plus mania/mixed states, ED, OCD.
  → **Critical for NilaMind:** our whole personalization bet is *growing on-device memory retrieved into context*.
  The evidence says memory + personalization is a **double-edged** feature — it can deepen a delusional or manic
  narrative. **Design implication: the self-model / memory layer needs a reality-testing + elevation guard, not
  just retrieval.** This directly reinforces the bipolar/BPD mixed-state caution already flagged.
- **Real-world lawsuits + regulation (allegations, causation contested, but directional):** Garcia v. Character
  Technologies (Setzer, 14, suicide; settled Jan 2026); Raine v. OpenAI (Adam Raine, 16); Texas Character.AI suit
  (bot implied a teen could harm parents); Tessa/NEDA gave ED patients weight-loss advice (2023). Response: **APA→FTC
  warning (Feb 2025), FTC 6(b) inquiry (Sept 2025), and enacted 2025 laws banning autonomous AI therapy in
  Illinois (WOPR/HB1806) & Nevada (AB406), disclosure rules in Utah (HB452).**
  → **Validates: no autonomous therapy, no impersonating a clinician, scoped scope, honest "I'm an AI" — all
  already in the vision. Also: minors are a regulatory hot zone → keep positioning as adjunct/companion.**
- **Dependency is a real (if correlational) risk.** MIT Media Lab + OpenAI (Mar 2025): observational ~4M
  interactions + Fang et al. RCT (n=981) — a **subset of heavy users**, esp. voice/emotional use, showed higher
  loneliness + emotional dependence. Correlational, vendor-co-authored.
  → **Validates: the dependency-nudge / "one source of support, never the only one" stance; watch voice.**

## 2. Digital-protocol efficacy: real but MODEST, and adherence is the whole game (VERIFIED anchors)

- **Self-guided digital CBT works, modestly.** Karyotaki et al., *JAMA Psychiatry 2017* (IPD meta, 13 trials,
  3,876 pts): **Hedges g = 0.27**; adherence predicts outcome. PMID 28241179.
- **An LLM chatbot showed real symptom change.** Heinz et al. **Therabot RCT**, *NEJM AI 2025* (N=210, 4 wk vs
  waitlist): ~**51% depression / 31% GAD** symptom reduction, alliance rated ~human-comparable — **but the authors
  stress NO autonomous operation without clinician oversight.** DOI 10.1056/AIoa2400802.
- **Adherence collapses in the real world.** Baumel et al., *JMIR 2019* (93 apps, ≥10k installs): **median 15-day
  retention 3.9%, 30-day 3.3%.** The "law of attrition" (Eysenbach, *JMIR 2005*).
  → **The design thesis this supports:** efficacy is modest AND everyone churns → **the winning lever is sustained
  engagement + guidance.** An always-present, personalized on-device companion is plausibly the *guidance* that
  drives adherence (which drives outcome) — IF it stays non-sycophantic. This is the strongest evidence-based case
  for Nila's *async between-sessions presence* as the flagship, and for the *protocol runner* being worth building.

## 3. What this does to the frontier priorities

- **Rails get promoted to Phase 0 (do first, always-on):** deterministic §9 (have) + **an explicit anti-sycophancy
  / reality-testing guard on the model's output**, especially anywhere memory/personalization feeds the prompt.
  The harms evidence makes this non-optional before ANY frontier capability ships.
- **Self-model / case-formulation (F1):** keep — but the delusion-amplification finding means it must be
  *reality-anchored + user-editable + elevation-gated*, never a confident private narrative the model reinforces.
- **Async between-sessions brain + engagement (Phase 1):** now the **best-evidenced bet** (adherence is the lever).
- **Protocol runner (F1):** supported (structured programs + guidance beat open chat on adherence) — build after structure.
- **JITAI (F1) and simulation/IFS (F2):** **NOT yet grounded — research incomplete (§4).** Do not commit
  engineering until their evidence + safety (esp. experiential-technique contraindications for bipolar/BPD/
  psychosis) is verified.

## 4. JITAI — EMERGING category, but sensor-timing superiority is THIN (VERIFIED, completed)

- **Small but real category effect.** von Lützow et al., *BMJ Mental Health 2025* (23 studies, N=2,563): pooled
  **g = 0.15** (symptoms g=0.21; well-being g=0.03 = null). Target distress, not "flourishing." PMC12481328.
- **The specific bet (passive-sensor-triggered timing beats fixed schedule) is NOT demonstrated in MH.** Only
  **5 MH JITAIs exist across 9 papers; only 1 used passive sensing** (van Genugten et al., *Front Digit Health 2025*,
  PMC11811111). Most "JITAIs" are non-adaptive EMIs. The timing wins (~38% better receptivity, Mishra IMWUT 2021)
  come from *behavior-change*, not mood.
- **Three failure modes that redesign JITAI:** (a) **decay** — even good tailored nudges fall to zero by ~4 weeks
  (HeartSteps, *Ann Behav Med 2019*); (b) **mistiming BACKFIRES** — net-negative mood, not neutral (Intern Health
  MRT, *JMIR 2020*, e15033); (c) **high momentary distress REDUCES engagement** — a naive "distress→intervene" rule
  misfires (Jaremba et al., *Sci Rep 2026*). → **Trigger must model "receptive & able to act right now?", not just
  "distressed?"; hand off to §9 at the top of the risk range rather than nudge; A/B (MRT) it on our own users.**
  Verdict: **defensible bet that must prove itself**, not a slam-dunk.

## 5. Efficacy sweep — STRUCTURE beats chat; LLM-as-guidance supported; formulation ≈ generic (VERIFIED)

- **Structure > open-ended chat, decisively.** Every Tier-A/B result (iCBT-GAD, BA, self-compassion) is a
  **structured multi-week module-based** protocol; **open-ended supportive chat has ~no controlled evidence as a
  standalone treatment** (Woebot RCT *JMIR Ment Health 2017* PMC5478797; CBT-chatbot review *JMIR 2025* e78340).
  → **Nila = warm delivery layer wrapped around structured evidence-based content, NOT free-form therapy-chat.**
- **LLM-as-guidance is a well-supported bet.** Guided > unguided advantage is **small (−0.8 PHQ-9), severity-gated,
  gone by 6 months** (Karyotaki IPD network MA, *JAMA Psych 2021*), works via **adherence + mere-contact** (Cuijpers
  *PLOS ONE 2011*; JMIR 2020 e18100), and **for apps, human feedback added NOTHING** (Firth *World Psychiatry 2017*:
  g=0.47 without vs 0.14 with). → An always-on LLM plausibly does guidance's *job* (accountability, responsiveness,
  tailoring) — the retention lever. Not yet RCT-proven; Therabot is the closest positive.
- **Best-evidenced cards:** iCBT-for-GAD/worry (d≈−0.91; face-to-face-equivalent, *Front Psychiatry 2022* PMC9366007)
  and Behavioral Activation (SMD −0.51, larger in moderate-severe). Self-compassion real but quality-limited.
- **⚠️ Personalized formulation does NOT reliably beat generic protocols** (Emmelkamp, *World Psychiatry 2021*): RCTs
  show ≈ equivalence. The ONE personalization win is **modular MATCHING** (MATCH RCT beat fixed CBT). → **Build a
  LIGHTWEIGHT formulation-for-ROUTING layer (5 P's as intake to select + personalize framing of modules), NOT a
  heavy idiographic self-model engine.** Memory personalizes *framing/examples*; keep *therapeutic content* protocol-anchored.

## 6. Simulation / experiential — mostly DEFER; permit only low-activation, heavily-railed (VERIFIED)

- **Evidence tiers:** behavioral experiments **A−** (CBT engine, but isolated contribution under-tested); social-skills/
  behavioral-rehearsal **A** for schizophrenia/**B** general (*Schizophr Bull 2018* PMC5890475); empty-chair/two-chair
  (EFT) **B** (chairwork MA d≈0.90 within-session, *Psychotherapy 2023* PMID 37166937; EFT ≈ CBT for depression);
  **IFS C→C+** (NREPP-listed 2015 → registry defunct 2018; only a rheumatoid-arthritis proof-of-concept RCT — NOT a
  psychiatric-disorder trial; 2025 scoping review = "promising, major gaps").
- **These are affect-AMPLIFYING by design, and the harms concentrate in our EXACT population.** Contraindications
  (active mania, active psychosis, un-stabilized dissociation, acute suicidality; BPD needs containment) are explicit
  (*Eur J Psychotraumatol 2012* PMC3406222). Phased treatment (stabilize→process) is the field's safety architecture
  (*ScienceDirect 2022*). **IFS specifically** carries a documented harm (splitting → disorganization; iatrogenic
  false-memory litigation). The safe simulation products keep a **trained human steering in real time** (AVATAR RCT,
  *Lancet Psych 2018* PMC5746597: 0 attributable AEs — *because a therapist voiced the avatar*); the harmful cases are
  autonomous LLM open-ended roleplay (Character.AI deaths).
- **Verdict:** **DEFER open-ended IFS parts-work and trauma empty-chair** (highest-risk, weakest-evidence). **PERMIT
  only:** behavioral experiments (safest, low-activation), behavioral/assertiveness rehearsal (neutral practice-partner,
  future scenarios only), two-chair for *self-criticism* (not trauma) — **and only with ALL of:** deterministic §9
  running on every turn that HALTS the sim on fire; consent + always-visible one-tap Stop; **population-exclusion
  screening** (mania/psychosis/dissociation/acute-crisis out; BPD→skills-only); an **intensity ceiling + mandatory
  grounding closure** (never "go deeper" — the opposite of sycophancy); never impersonate a therapist/abuser; pull-only.
  **If §9 can't reliably interrupt a mid-simulation on-device, defer even behavioral rehearsal.**

## 7. Final evidence-grounded frontier priorities

- **Phase 0 (before anything): the anti-sycophancy + reality-testing guard** on model output (harms §1) — non-optional.
- **Phase 1 flagship = async between-sessions presence + engagement** — best-evidenced (adherence is the lever; LLM does
  guidance's job). PLUS wrap it around **structured, sequenced protocols** (structure > chat).
- **Self-model → LIGHTWEIGHT formulation-for-routing** (not a heavy idiographic engine; reality-anchored, editable, elevation-gated).
- **Protocol runner** = strongly supported; lead with **iCBT-GAD/worry + Behavioral Activation**.
- **JITAI** = Emerging; build as an **A/B-instrumented, receptivity-gated** experiment that hands to §9 — not a static push loop.
- **Simulation** = mostly DEFER; only low-activation behavioral experiments/rehearsal behind the full rail stack, gated on the §9-interrupt.

_Method note: on re-run, subagents researched directly (no sub-delegation) and completed; all citations retrieved +
cross-checked, unverifiable items flagged in-line. Nothing fabricated._
