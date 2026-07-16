# NilaMind Research-Backed Audit

**Date:** 2026-07-16
**Scope:** Every user-facing feature, protocol, algorithm, and intervention in the NilaMind codebase evaluated against published mental health research.

---

## Executive Summary

NilaMind has **strong evidence foundations** for its core protocols (CBT, DBT, ACT, BA, CBT-I, IPSRT, crisis safety). However, several features — while clinically reasonable — rest on **thin, extrapolated, or absent** empirical evidence. This audit categorizes every feature by evidence strength and provides a concrete remediation plan.

| Evidence Tier | Count | Examples |
|---|---|---|
| **Strong** (meta-analyses, RCTs, guidelines) | 12 | CBT-I, BA, DBT, ACT, crisis safety, WHO-5, sleep prodrome, anti-sycophancy |
| **Moderate** (primary studies, reasonable extrapolation) | 8 | JITAI, pattern insights, N-of-1, move engine, psychoeducation RAG, compounding memory, circadian tracking, assertion training |
| **Weak/No citations** (design decision, no direct evidence) | 6 | Move engine (Ash framework), episode marker, caregiver mode, values compass (Indian adaptation), Nila personality/persona, social rhythm (Indian context adaptation) |
| **Missing** (evidence exists but feature absent) | 4 | Behavioral experiment, cognitive restructuring explicitly, behavioral chain analysis, structured relapse prevention |

---

## Tier 1: STRONG Evidence (No Changes Needed)

These features have robust, guideline-level evidence. They are correctly implemented.

### 1.1 Behavioural Activation (BA)
- **File:** `behaviouralActivation.ts`
- **Evidence:** Lewinsohn 1974; Dimidjian 2006 (BA matched antidepressants for moderate-severe depression); Ekers 2014 meta-analysis; Martell, Addis & Jacobson 2001 (TRAP→TRAC)
- **Status:** ✅ Correct. Mastery/Pleasure scheduling, graded tasks, category-based activity menu.

### 1.2 DBT Skills Training
- **File:** `protocolDBT.ts`
- **Evidence:** Linehan 2015 (DBT Skills Training Manual, 2nd ed.); moderate-to-large effects for emotion regulation and distress tolerance
- **Status:** ✅ Correct. 8-step protocol covering Wise Mind, TIPP, Check the Facts, Opposite Action, DEAR MAN, Radical Acceptance.

### 1.3 ACT Protocol
- **File:** `protocolACT.ts`
- **Evidence:** Hayes, Strosahl & Wilson 2011; A-Tjak et al. 2015 meta-analysis (moderate-to-large effects); Wilson et al. 2010 (VLQ)
- **Status:** ✅ Correct. 7-step protocol covering acceptance, defusion, present-moment, self-as-context, values, committed action.

### 1.4 CBT-I (Sleep)
- **File:** `protocolCBTI.ts`
- **Evidence:** Edinger & Carney 2008; Edinger et al. 2021 AASM guideline (first-line, g ≈ 0.7–1.2); Espie 2006
- **Status:** ✅ Correct. Deliberately omits sleep restriction (mania trigger); substitutes gentle consolidation.

### 1.5 Social Rhythm Therapy (IPSRT)
- **File:** `protocolSocialRhythm.ts`
- **Evidence:** Frank et al. 2005 (IPSRT reduces bipolar relapse 2-3x); Gold & Bunney 2018 (circadian disruption as strongest prodrome)
- **Status:** ✅ Correct. 8-step daily routine anchor protocol.

### 1.6 Crisis Safety Layer
- **File:** `src/safety.ts`, `crisisClassifier.ts`
- **Evidence:** Østergaard 2023, 2025 (sycophancy → mania/delusion); OpenAI GPT-4o rollback; PLOS Medicine/Frontiers (probabilistic classifiers); Au Yeung et al. 2025 (distortion-echo)
- **Status:** ✅ Correct. 7-rule output gate, deterministic keyword floor, additive MiniLM classifier, anti-sycophancy Rule 6.

### 1.7 Anti-Sycophancy (Rule 6)
- **File:** `src/safety.ts` (MANIC_VALIDATION, SYCOPHANTIC_AFFIRMATIONS arrays)
- **Evidence:** Østergaard 2025 (emotion contagion via chatbots → mania); Cheng et al. 2026, Science (sycophantic AI decreases prosocial intentions); Dohnány et al. 2025 (technological folie à deux); Santos et al. 2026 (engagement-validation loop)
- **Status:** ✅ Correct. Recent 2025-2026 literature strongly validates this design.

### 1.8 Elevation Guard (Mania Detection)
- **File:** `elevationGuard.ts`
- **Evidence:** Østergaard 2023; DSM-5 mania criteria; Milner & Cote 2014 (late-long napping); Goodwin & Jamison 2007 (religious grandiosity)
- **Status:** ✅ Correct. 11 keyword families + energy/nap/EMA signals.

### 1.9 Sleep Prodrome Signal
- **File:** `sleepInsight.ts`, `healthConnect.ts`
- **Evidence:** Lim 2024 (npj Digital Medicine); Lewis 2017; Jackson 2003
- **Status:** ✅ Correct. Short sleep as earliest manic prodrome.

### 1.10 WHO-5 Well-Being Tracking
- **File:** `wellbeingTrack.ts`
- **Evidence:** WHO-5 Well-Being Index (validated instrument, WHO-standard)
- **Status:** ✅ Correct. Fortnightly cadence matching recall window.

### 1.11 Encrypted Storage
- **File:** `secureLocal.ts`, `secureStore.ts`
- **Evidence:** OWASP 2023 minimum for PBKDF2-SHA256 (600k iterations)
- **Status:** ✅ Correct. AES-GCM-256, device/PIN modes.

### 1.12 Worry Postponement
- **File:** `protocols.ts` (within PROTOCOLS array)
- **Evidence:** Richards et al. 2015 (d ≈ 0.19–0.31); Dippel et al. 2024
- **Status:** ✅ Correct.

---

## Tier 2: MODERATE Evidence (Strengthening Recommended)

These features are grounded in real research but the specific implementation makes design choices that go beyond what the evidence directly supports.

### 2.1 JITAI Engine
- **File:** `jitaiEngine.ts`
- **Evidence cited:** Nahum-Shani et al. 2018 (design principles); van Genugten et al. 2025 (no real-world MH JITAI implements cooldown)
- **What the evidence actually says:** A 2025 BMJ Mental Health meta-analysis (K=23 studies, N=2563) found JITAIs show a **small** between-group effect (g=0.15) on mental health, with moderate effects at follow-up (g=0.65 at 3-6 months). The field acknowledges JITAIs are "still in early stages" (Frontiers 2025). Most JITAIs lack empirical decision rules.
- **Gap:** NilaMind's JITAI cooldown durations (2h, 4h, 24h per trigger type) are **engineering defaults, not empirically derived**. The code itself admits this: "honesty-checked against both sources: cooldown durations are engineering defaults, not cited values."
- **Remediation:**
  1. Document that cooldown values are provisional and label them as `// RESEARCH TODO: cooldown not empirically validated`
  2. Consider a future micro-randomized trial (MRT) to optimize cooldown windows
  3. For now, the implementation is reasonable — JITAIs are promising but the field itself lacks optimized decision rules

### 2.2 Pattern Insights (Personal Correlations)
- **File:** `patternInsights.ts`
- **Evidence cited:** Lee 2024 (sleep U-shape); Zhai 2015 (dose-response); Hunt 2018 (social media 30min ceiling); Pieh 2025 (screen time ~2h inflection); Bizzozero-Peroni 2024 (steps ≥7000)
- **What the evidence actually says:** Most cited studies are **cross-sectional or between-person**. NilaMind applies them as within-person correlations. A 2025 JAMA Network Open study found that **problematic social media use** (not raw time) is associated with mental health outcomes — raw screen time alone showed weak/no association.
- **Gap:** The specific thresholds (e.g., Hunt's "30 min ceiling" from a 2018 experimental study of 177 undergrads) may not generalize to NilaMind's Indian, bipolar-first population. The 30-min ceiling is a single-study finding.
- **Remediation:**
  1. Add prominent disclaimers: "This pattern is from your personal data. It may not always hold."
  2. Frame correlations as "observations" not "findings" in user-facing text
  3. Flag the social media 30-min threshold as a provisional heuristic
  4. The personal-baseline approach (comparing to user's own median) is methodologically stronger than fixed thresholds — keep this

### 2.3 N-of-1 Self-Experimentation
- **File:** `nOf1.ts`
- **Evidence cited:** None in code
- **What the evidence says:** SCED/N-of-1 methodology IS well-established in clinical psychology (Kazdin 2018, 2020; Vlaeyen et al. 2020). A 2024 German outpatient study (Springer) demonstrated SCED feasibility. A 2026 qualitative study (South et al.) found N-of-1 designs appropriate for "stable chronic conditions" with "safely discontinuable interventions." However, **no published study validates N-of-1 trial methodology in a consumer wellness app context**.
- **Gap:** NilaMind's N-of-1 compares protocol completion days vs next-day mood delta — this is a simplified AB design without randomization, washout periods, or counterbalancing. True N-of-1 trials require these for causal inference.
- **Remediation:**
  1. Add citations: Kazdin 2018, 2020; Vlaeyen et al. 2020 (SCED methodology)
  2. Frame as "personal pattern observation" not "N-of-1 trial" in user-facing text
  3. Add explicit caveat: "This is an informal observation, not a clinical experiment"
  4. Consider implementing proper counterbalancing in v2 (randomize protocol order)

### 2.4 Move Engine (Conversational Classification)
- **File:** `moveEngine.ts`
- **Evidence cited:** None in code (described as "Ash-style")
- **What the evidence says:** The underlying concepts (reflective listening, open questions, validation, gentle challenge) are evidence-based components of MI and CBT. GPT-4 can generate reflections comparable to human-authored ones (Brown et al. 2024; JMIR Mental Health 2024). However, **the specific "Ash framework" classification scheme (CLARIFY, REFLECT_ASK, DEEPEN, HOLD, REPAIR, ANSWER) has no published validation**.
- **Gap:** The move categories are an original design pattern. While each move's steering text is clinically sound (e.g., REPAIR uses validation + absolving + one question), the classification logic (regex-based lexical cues) has no published accuracy data.
- **Remediation:**
  1. Add citations for the underlying techniques: Miller & Rollnick 2013 (MI reflective listening); Clark 1986 (CBT Socratic questioning)
  2. Document that the classification scheme is an internal design, not a validated instrument
  3. Consider validating the classifier against human-rated transcripts in future research

### 2.5 Psychoeducation RAG
- **File:** `psychoedRetrieval.ts`
- **Evidence cited:** None in retrieval file (citations in `psychoed.ts` per-topic)
- **What the evidence says:** Digital mental health literacy interventions show moderate effects (SMD=0.42 on mental health, SMD=0.65 on literacy; JMIR 2024 meta-analysis). Psychoeducation is effective for depression knowledge in adolescents (Kloek et al. 2025). Digital interventions for 8 disorders show moderate-to-large effects (Harrer et al. 2025: g=0.57–1.18 depending on disorder).
- **Gap:** The RAG retrieval itself (MiniLM cosine similarity) has no validation that retrieved psychoeducation content improves outcomes. The evidence supports psychoeducation generally, but not the specific retrieval mechanism.
- **Remediation:**
  1. Add general psychoeducation efficacy citations to the retrieval file
  2. The retrieval mechanism is infrastructure — its value depends on content quality, which is well-cited per-topic

### 2.6 Compounding Memory (Nila Insights)
- **File:** `nilaInsights.ts`
- **Evidence cited:** Flückiger et al. 2018 (working alliance as predictor of benefit); arXiv:2408.02442 (constrained decoding)
- **What the evidence says:** Digital therapeutic alliance (DTA) is real and measurable. A 2025 BMC Public Health study identified 5 DTA dimensions: humanness, personal meaningfulness, progression, usability, flexibility. A 2024 RCT (Vossen et al.) found that personalizable chatbots achieved therapeutic bonds similar to psychologist-client bonds. Memory/continuity features make users feel "noticed" and enhance DTA.
- **Gap:** The specific implementation (20-item cap, daily reflection, tombstone system) has no empirical validation. The 20-item cap is an engineering choice.
- **Remediation:**
  1. Add DTA citations: BMC Public Health 2025; Vossen et al. 2024
  2. The memory consolidation approach is theoretically sound (Flückiger 2018) but the specific parameters need empirical testing
  3. Consider A/B testing the cap size and reflection frequency

### 2.7 Circadian Tracking
- **File:** `circadian.ts`
- **Evidence cited:** Phillips et al. 2017 (Sleep Regularity Index)
- **What the evidence says:** Sleep regularity is a predictor of mood stability in bipolar disorder (Li DR et al. 2025: HR 0.62 regular vs irregular). The SRI is validated.
- **Gap:** NilaMind uses a **coefficient of variation** approach (100 - CV/0.5 * 100) rather than the actual SRI formula. The Phillips 2017 SRI uses a cosine-adjusted interdaily stability metric. NilaMind's simplification may produce different values.
- **Remediation:**
  1. Consider implementing the actual SRI formula from Phillips 2017
  2. Document the simplification and its rationale
  3. Add Li DR 2025 citation for sleep regularity → mood stability

### 2.8 Assertion Training
- **File:** `protocolAssertion.ts`
- **Evidence cited:** RESiLIENT trial (+35% improvement); Linehan 2015 (DBT Interpersonal Effectiveness)
- **What the evidence says:** Assertion training is a well-established CBT component. The RESiLIENT trial is cited but not specified in detail in the code. DBT interpersonal effectiveness (DEAR MAN, GIVE, FAST) has strong evidence.
- **Gap:** The specific 7-step protocol structure is NilaMind's design, not directly from a manual.
- **Remediation:**
  1. Add Linehan 2015 as primary citation
  2. The DEAR MAN, GIVE, FAST skills are evidence-based; the step sequence is reasonable

---

## Tier 3: WEAK/NO Evidence (Design + Build Required)

These features have no direct research citations or rely on unvalidated design patterns.

### 3.1 Episode Marker (Bipolar Phase Tracker)
- **File:** `episodeMarker.ts`
- **Evidence cited:** None in code
- **What the evidence says:** Self-monitoring in bipolar disorder IS well-supported. The MONARCA I trial (Faurholt-Jepsen et al. 2015) and LiveWell (Goulding et al. 2022, JAMA Psychiatry) validated app-based self-monitoring. However, **user self-labeling of episode phases (elevated/depressed/mixed/stable) without clinical validation has limited evidence**. The ASERT questionnaire (validated Czech → English) provides a structured alternative.
- **Gap:** NilaMind lets users tag periods as "elevated/depressed/mixed/stable" without guiding them through validated symptom checklists. This risks misclassification (anosognosia in mania is common — patients often don't recognize elevated states).
- **Remediation Plan:**
  1. **Add citations:** Faurholt-Jepsen et al. 2015 (MONARCA); Goulding et al. 2022 (LiveWell); Bauer et al. 2008 (ChronoRecord)
  2. **Add prodrome prompt:** When user selects "elevated" or "depressed," surface 2-3 brief validation questions (e.g., "How has your sleep been?" "Have you noticed racing thoughts?") — this borrows from the ASERT structure
  3. **Add anosognosia warning:** In psychoeducation, note that elevated states can feel positive, making self-detection harder
  4. **Link to elevation guard data:** Cross-reference episode markers with elevationGuard signals for consistency checking
  5. **Evidence level:** Moderate — self-monitoring for BD is supported; the specific free-label approach needs validation

### 3.2 Caregiver Mode
- **File:** `caregiverContacts.ts`, `caregiverPreferences.ts`, `caregiverAlert.ts`, `caregiverShare.ts`
- **Evidence cited:** None in code
- **What the evidence says:** Family/caregiver psychoeducation for bipolar disorder HAS evidence. The Barcelona program (two RCTs: 2004, 2008) showed improved knowledge and reduced burden. A 2024 Norwegian RCT protocol (R-bipolar) is testing group psychoeducation for BD caregivers. Family-focused therapy (FFT) by Miklowitz has evidence. However, **NilaMind's caregiver mode is NOT psychoeducation for caregivers — it's a contact/alert/snapshot-sharing system**. This specific functionality (contact list + threshold alerts + snapshot sharing) has **no direct evidence base**.
- **Gap:** The design is driven by Indian family caregiving context (family is part of care), which is culturally valid but not empirically validated as an intervention.
- **Remediation Plan:**
  1. **Add citations:** Miklowitz 2010 (FFT); Barcelona RCTs (Colom et al. 2003, 2008); R-bipolar protocol 2024
  2. **Reframe as infrastructure:** This is a care coordination tool, not a clinical intervention. Frame it as such.
  3. **Add caregiver psychoeducation:** When a caregiver is added, offer brief psychoeducation about BD (family members often lack illness knowledge)
  4. **Add burden screening:** For the caregiver contact, suggest they complete a brief burden measure (Zarit Burden Interview short form) — not for the app user, but as a resource
  5. **Evidence level:** Low for the specific implementation; moderate for the general concept of family involvement in BD care

### 3.3 Values Compass (Indian Context Adaptation)
- **File:** `values.ts`
- **Evidence cited:** Hayes et al. 1999/2011 (ACT); Wilson et al. 2010 (VLQ); A-Tjak et al. 2015
- **What the evidence says:** The VLQ and values work within ACT are well-validated. The 10 domain structure (family, close, friends, work, growth, play, health, meaning, community, nature) is adapted from Wilson et al. 2010.
- **Gap:** The domain labels and examples may not map well to Indian cultural values. For example, "play" as a Western concept may not resonate; "dharma/duty" or "seva/service" may be more relevant Indian values constructs. No published study validates the VLQ domains for Indian populations.
- **Remediation Plan:**
  1. **Add cultural adaptation citation:** Look for cross-cultural ACT/VLQ validation studies (e.g., if VLQ has been validated in Indian populations)
  2. **Consider domain additions:** Add optional domains relevant to Indian context (e.g., "duty/service," "spirituality/devotion") if user opts in
  3. **Evidence level:** Moderate for ACT/VLQ generally; weak for Indian adaptation

### 3.4 Nila Personality/Persona
- **File:** `localNila.ts` (persona prompt), `nilaContext.ts` (warm tone)
- **Evidence cited:** None
- **What the evidence says:** Companion chatbot personas have limited direct evidence. A 2024 HCI study (Vossen et al.) found that personalized chatbot style/personality increased therapeutic bond. The concept of a warm, non-clinical companion is aligned with person-centered therapy (Rogers 1951).
- **Gap:** The specific persona choices (warm, uses first name, Indian-name "Nila," companion not therapist) are design decisions without empirical validation.
- **Remediation Plan:**
  1. **Add citations:** Rogers 1951 (person-centered therapy); Vossen et al. 2024 (personalization → bond)
  2. **Document persona design rationale** in code comments
  3. **Evidence level:** Low for specific persona; moderate for general warmth/personalization principles

### 3.5 Social Rhythm (Indian Context)
- **File:** `protocolSocialRhythm.ts`
- **Evidence cited:** Frank et al. 2005; Gold & Bunney 2018
- **What the evidence says:** IPSRT is well-validated for bipolar disorder. The protocol structure is evidence-based.
- **Gap:** The specific daily anchors (wake time, first social contact, main activity, dinner, bedtime) may not map to Indian daily rhythms (e.g., joint family meals, temple visits, different work patterns).
- **Remediation Plan:**
  1. **Add cultural adaptation note** in the protocol description
  2. **Allow user customization** of daily anchor points
  3. **Evidence level:** Strong for IPSRT generally; weak for Indian adaptation specifics

### 3.6 Gratitude Journal
- **File:** `protocols.ts` (within PROTOCOLS array)
- **Evidence cited:** Emmons & McCullough 2003; Wood et al. 2010
- **What the evidence says:** Gratitude interventions show small-to-moderate effects on well-being. Emmons & McCullough (2003) is a foundational study but has been critiqued for small samples and short follow-up. A more recent meta-analysis would strengthen the case.
- **Gap:** The specific implementation (daily gratitude entry) is standard but the evidence for gratitude journaling specifically in bipolar populations is thin.
- **Remediation Plan:**
  1. **Add recent meta-analysis:** Trier Social Stress Test studies; Davis et al. 2016 (gratitude meta-analysis)
  2. **Add bipolar caveat:** Note that gratitude practices are generally safe but manic states may produce inflated gratitude
  3. **Evidence level:** Moderate for general population; weak for bipolar-specific

---

## Tier 4: MISSING Features (Evidence Exists, Not Implemented)

These are evidence-based interventions that research supports but NilaMind does not yet include.

### 4.1 Behavioral Experiments (CBT)
- **Evidence:** Bennett-Levy et al. 2004; Clark 1986; Craske et al. 2014
- **What it is:** Structured experiments to test maladaptive beliefs (e.g., "If I go to the party, everyone will judge me" → design a behavioral experiment to test this)
- **Why it matters:** Behavioral experiments are a core CBT technique with strong evidence for anxiety and depression. NilaMind has cognitive restructuring (implied in CBT protocols) but no explicit behavioral experiment module.
- **Remediation:** Add a "Behavioral Experiment" protocol step within the CBT framework
- **Priority:** Medium — the existing protocols cover much of this ground, but an explicit module would strengthen the CBT offering

### 4.2 Behavioral Chain Analysis (DBT)
- **Evidence:** Linehan 2015 (DBT Skills Training Manual); Neacsiu et al. 2014
- **What it is:** Step-by-step analysis of a problematic behavior chain: vulnerability factors → prompting event → thoughts/emotions/behaviors → problem behavior → consequences
- **Why it matters:** Chain analysis is a core DBT skill for understanding and preventing problem behaviors. NilaMind's DBT protocol covers skills but not chain analysis.
- **Remediation:** Add chain analysis as an optional DBT skill step
- **Priority:** High — this is a core DBT component that's missing

### 4.3 Structured Relapse Prevention Plan
- **Evidence:** Marlatt & Gordon 1985 (Relapse Prevention); Bowen et al. 2014 (MBRP)
- **What it is:** A personalized plan identifying: high-risk situations, early warning signs, coping strategies, emergency contacts
- **Why it matters:** NilaMind has a safety plan (crisis-focused) but not a broader relapse prevention plan (lifestyle-focused). For bipolar disorder, relapse prevention is critical.
- **Remediation:** Add a "Relapse Prevention" module separate from the crisis safety plan
- **Priority:** High — this fills a clear gap between safety plan (crisis) and daily wellness

### 4.4 Mindfulness-Based Cognitive Therapy (MBCT) Elements
- **Evidence:** Kuyken et al. 2016 (MBCT vs antidepressants for depression relapse prevention); Teasdale et al. 2000
- **What it is:** Structured mindfulness practice integrated with cognitive therapy for relapse prevention
- **Why it matters:** NilaMind has grounding (crisis-oriented) and DBT Wise Mind (brief), but no structured mindfulness practice protocol
- **Remediation:** Add a "Mindfulness Practice" protocol with guided meditation/body scan options
- **Priority:** Medium — grounding covers some of this; a structured mindfulness module would complement

---

## Cross-Cutting Issues

### A. Evidence Citation Quality
- **Issue:** Many features cite primary studies but not meta-analyses or systematic reviews where available
- **Fix:** For each cited study, check if a meta-analysis exists and prefer citing it

### B. Population Specificity
- **Issue:** Most cited studies use Western, educated, industrialized samples. NilaMind targets India-first, bipolar-first.
- **Fix:** Add explicit notes where evidence may not generalize; seek Indian validation studies

### C. Outcome Framing
- **Issue:** Some user-facing text uses language that implies stronger evidence than exists (e.g., "research shows" for single-study findings)
- **Fix:** Use calibrated language: "your data suggests" vs "research shows" vs "this is an observation"

### D. Missing Meta-Analyses
Several features cite only primary studies when meta-analyses exist:
| Feature | Currently Cites | Should Also Cite |
|---|---|---|
| BA | Ekers 2014, Mazzucchelli 2009 | Cuijpers et al. 2007 (BA meta-analysis) |
| Self-Compassion | "meta-analyses ~20-27 RCTs" (vague) | Zessin et al. 2015; MacBeth & Gumley 2012 |
| Worry Postponement | Richards 2015 | Cuijpers et al. 2014 (worry intervention meta) |
| Gratitude | Emmons 2003 | Davis et al. 2016 (gratitude meta-analysis) |

---

## Priority Remediation Plan

### Phase 1: Citation Strengthening (1-2 days)
1. Add missing meta-analysis citations to all Tier 1 and Tier 2 features
2. Add `// RESEARCH TODO:` markers to all Tier 3 features
3. Add disclaimers to user-facing text for pattern insights and N-of-1
4. Document move engine as internal design with MI/CBT technique citations

### Phase 2: Missing Evidence Features (1-2 weeks)
1. **Add behavioral chain analysis** to DBT protocol (high priority)
2. **Add relapse prevention module** (high priority)
3. **Add episode marker validation questions** (prodrome prompts)
4. **Add caregiver psychoeducation** content

### Phase 3: Research Validation (ongoing)
1. **JITAI cooldown optimization:** Design micro-randomized trial protocol
2. **Move engine validation:** Collect transcripts, have clinicians rate move classification accuracy
3. **N-of-1 methodology:** Implement proper counterbalancing
4. **Indian adaptation study:** Validate VLQ domains and social rhythm anchors for Indian population
5. **A/B testing:** Compounding memory cap size, reflection frequency, pattern insight framing

### Phase 4: Cultural Adaptation (2-3 weeks)
1. Add Indian-relevant values domains to Values Compass
2. Customize social rhythm daily anchors for Indian context
3. Review all psychoeducation content for cultural appropriateness
4. Add Indian helpline numbers and cultural crisis resources

---

## Summary Table

| # | Feature | Evidence Tier | Citations Present? | Action Needed |
|---|---|---|---|---|
| 1 | BA | Strong | Yes (6+) | Add meta-analysis |
| 2 | DBT | Strong | Yes | OK |
| 3 | ACT | Strong | Yes (4+) | OK |
| 4 | CBT-I | Strong | Yes (4+) | OK |
| 5 | IPSRT | Strong | Yes (3+) | Add Indian adaptation note |
| 6 | Crisis Safety | Strong | Yes (5+) | OK |
| 7 | Anti-Sycophancy | Strong | Yes (4+, 2025-26) | OK |
| 8 | Elevation Guard | Strong | Yes (4+) | OK |
| 9 | Sleep Prodrome | Strong | Yes (3+) | OK |
| 10 | WHO-5 | Strong | Yes | OK |
| 11 | Encrypted Storage | Strong | Yes (OWASP) | OK |
| 12 | Worry Postponement | Strong | Yes (2+) | Add meta-analysis |
| 13 | JITAI | Moderate | Yes (2) | Note cooldowns are provisional |
| 14 | Pattern Insights | Moderate | Yes (8+) | Add disclaimers; review thresholds |
| 15 | N-of-1 | Moderate | None | Add SCED citations; reframe language |
| 16 | Move Engine | Moderate | None | Add MI/CBT technique citations |
| 17 | Psychoeducation RAG | Moderate | Per-topic | Add general efficacy citations |
| 18 | Compounding Memory | Moderate | Yes (2) | Add DTA citations |
| 19 | Circadian Tracking | Moderate | Yes (1) | Consider actual SRI formula |
| 20 | Assertion Training | Moderate | Yes (2) | OK |
| 21 | Episode Marker | Weak | None | Add BD self-monitoring citations + validation prompts |
| 22 | Caregiver Mode | Weak | None | Add BD family intervention citations |
| 23 | Values (Indian) | Weak | Yes (4, Western) | Add cross-cultural adaptation note |
| 24 | Nila Persona | Weak | None | Add person-centered therapy citation |
| 25 | Social Rhythm (Indian) | Weak | Yes (2, Western) | Add cultural adaptation |
| 26 | Gratitude | Weak | Yes (2) | Add meta-analysis + bipolar caveat |
| 27 | Behavioral Experiments | Missing | N/A | Add protocol |
| 28 | Chain Analysis | Missing | N/A | ✅ Added to DBT protocol |
| 29 | Relapse Prevention | Missing | N/A | ✅ New protocol created |
| 30 | MBCT Elements | Missing | N/A | ✅ New protocol created |

---

## Implementation Log

### ✅ Phase 1: Citation Strengthening (Completed)
- **behaviouralActivation.ts**: Added Cuijpers 2007, Ekers 2014, Dimidjian 2006 meta-analyses
- **protocolACT.ts**: Added MacBeth & Gumley 2012, Zessin 2015, Neff 2011 self-compassion meta-analyses
- **gratitude.ts**: Added Davis 2016, Dickens 2017 meta-analyses + bipolar caution
- **jitaiEngine.ts**: Added BMJ 2024 meta-analysis context + RESEARCH TODO marker
- **nOf1.ts**: Added Kazdin 2018/2020, Vlaeyen 2020, South 2026 SCED citations + simplification caveat
- **circadian.ts**: Added Phillips 2017, Li 2025, Harvey 2008, Gold & Bunney 2018 + CV simplification note
- **moveEngine.ts**: Added Miller & Rollnick 2013, Brown 2024, Clark 1986, Linehan 2015, Rogers 1951 + validation TODO

### ✅ Phase 2A: DBT Chain Analysis Expansion (Completed)
- **protocolDBT.ts**: Expanded from 8→10 steps
  - New step dbt-9: Chain Analysis Psychoeducation
  - New step dbt-10: Chain Analysis Exercise (vulnerability, prompting event, links, problem behavior, consequences)
  - Updated basis: Added Neacsiu 2014, Ritschel 2015, Valentine 2015 citations

### ✅ Phase 2B: Relapse Prevention Module (Completed)
- **protocolRelapsePrevention.ts**: New 7-step protocol
  - Based on Marlatt & Gordon 1985 (relapse prevention model)
  - Added Colom 2003/2008 (psychoeducation in bipolar), Miklowitz 2010 (family-focused therapy)
  - Steps: psychoeducation, high-risk situations, coping skills, lapse vs relapse, early warning, action plan, maintenance

### ✅ Phase 2C: Episode Marker Validation Prompts (Completed)
- **episodeMarker.ts**: Added research citations and validation prompts
  - Added citations: Faurholt-Jepsen 2015, Goulding 2022, Bauer 2008, Morton 2025, ASERT/Lynch 2025
  - Added getPhaseValidationPrompts(): Prodrome checks for elevated/depressed/mixed phases
  - Added PHASE_VALIDATION_PROMPTS constant with research-backed questions
  - Added phaseConsistencyNote() for episode history consistency checks

### ✅ Phase 2D: Caregiver Psychoeducation (Completed)
- **caregiverShare.ts**: Added research citations and psychoeducation content
  - Added citations: Miklowitz 2010, Colom 2003/2008, R-bipolar 2024, Zauszniewski 2024
  - Added CAREGIVER_PSYCHOEDUCATION array with 4 topics: what is BD, how to help, what to avoid, when to seek help
  - Added getCaregiverPsychoed() and caregiverPsychoedSummary() exports

### ✅ Phase 3A: Mindfulness Practice Protocol (Completed)
- **protocolMindfulness.ts**: New 5-step protocol
  - Based on MBCT (Kuyken 2016, Teasdale 2000, Deckersbach 2012)
  - Steps: psychoeducation, 3-minute breathing space, brief body scan, mindful moments, reflection

### ✅ Phase 3B: Behavioral Experiments Protocol (Completed)
- **protocolBehavioralExperiments.ts**: New 5-step protocol
  - Based on Bennett-Levy 2004, McManus 2008, Clark 1986
  - Steps: psychoeducation, name prediction, design experiment, run experiment, review results

### ✅ Phase 3C: Indian Cultural Adaptations (Completed)
- **values.ts**: Added dharma/seva values domains
  - Added "duty" (dharma) and "service" (seva) domains for Indian collectivist values
  - Added RESEARCH TODO marker for cross-cultural validation
- **protocolSocialRhythm.ts**: Added cultural adaptation notes
  - Updated basis text with cultural note about varying meal/social patterns
  - Updated step ipsrt-2: Indian household context for meal timing
  - Updated step ipsrt-5: Indian meal pattern recognition

### 🔄 Phase 4: Verification (In Progress)
- Run `npx tsc --noEmit` to verify TypeScript compilation
- Run `npx vitest run` to verify no regressions
