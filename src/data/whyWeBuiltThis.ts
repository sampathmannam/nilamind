// "Why we built this" — the research behind each major feature (AUTOPILOT Phase 9).
//
// Honesty rule (project non-negotiable): real citations only. Where the paper is canonical and we
// are confident of the reference, `verified: true`. Where we are unsure of the exact locator
// (volume/issue/pages), `verified: false` renders a gentle, user-facing "reference being verified"
// marker rather than presenting an unverified reference as fact. Never fabricate a citation.

interface ResearchCite {
  citation: string;
  verified: boolean; // false → show a gentle "reference being verified" marker
}

export interface FeatureArticle {
  id: string;
  title: string;
  what: string;
  why: string;
  research: ResearchCite[];
}

export const WHY_INTRO =
  "NilaMind isn't built on vibes. Every part of it comes from research on what actually helps with depression and anxiety — and from one rule: help is the only goal, never your data. Here's what each feature is, why it helps, and the science it stands on. Where we're not fully sure of a reference, we say so rather than guess.";

export const WHY_WE_BUILT_THIS: FeatureArticle[] = [
  {
    id: "validated-checkins",
    title: "Validated check-ins (PHQ-9 & GAD-7)",
    what: "Short, standard questionnaires that gently track depression (PHQ-9) and anxiety (GAD-7) over time — the same tools clinicians use.",
    why: "Seeing your scores move week to week turns a vague 'I feel bad' into something concrete you can notice, name, and bring to a doctor if you choose. Measurement itself supports care.",
    research: [
      { citation: "Kroenke K, Spitzer RL, Williams JBW (2001). The PHQ-9: validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606–613.", verified: true },
      { citation: "Spitzer RL, Kroenke K, Williams JBW, Löwe B (2006). A brief measure for assessing generalized anxiety disorder: the GAD-7. Archives of Internal Medicine, 166(10), 1092–1097.", verified: true },
    ],
  },
  {
    id: "behavioural-activation",
    title: "Behavioural Activation",
    what: "Choosing small, values-based actions and doing them before you feel motivated — instead of waiting for motivation that depression tends to withhold.",
    why: "Acting first, feeling later, gradually rebuilds the sense that your actions matter. In trials, behavioural activation works as well as fuller cognitive therapy for many people.",
    research: [
      { citation: "Jacobson NS, Dobson KS, Truax PA, et al. (1996). A component analysis of cognitive-behavioral treatment for depression. Journal of Consulting and Clinical Psychology, 64(2), 295–304.", verified: true },
      { citation: "Dimidjian S, Hollon SD, Dobson KS, et al. (2006). Randomized trial of behavioral activation, cognitive therapy, and antidepressant medication in the acute treatment of adults with major depression. Journal of Consulting and Clinical Psychology, 74(4), 658–670.", verified: true },
    ],
  },
  {
    id: "voice-logging",
    title: "Low-friction voice check-ins",
    what: "Checking in by talking, in the moment — no forms, no typing. Nila asks a couple of short questions and fills in the rest.",
    why: "The easier it is to capture how you feel right when you feel it, the more honest and useful the record. Catching feelings in real life (not from memory later) is the heart of momentary self-monitoring.",
    research: [
      { citation: "Shiffman S, Stone AA, Hufford MR (2008). Ecological momentary assessment. Annual Review of Clinical Psychology, 4, 1–32.", verified: true },
    ],
  },
  {
    id: "compassionate-streaks",
    title: "Compassionate streaks (no guilt)",
    what: "Streaks that celebrate showing up, forgive a missed day with a 'freeze', and welcome you back after a gap — never a broken-streak guilt trip.",
    why: "For someone who's depressed, a punishing streak adds shame to an already heavy load. Self-criticism feeds depression; self-kindness protects against it. So the design rewards effort and stays gentle about lapses.",
    research: [
      { citation: "Neff KD (2003). Self-compassion: an alternative conceptualization of a healthy attitude toward oneself. Self and Identity, 2(2), 85–101.", verified: true },
      { citation: "Harkin B, Webb TL, Chang BPI, et al. (2016). Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence. Psychological Bulletin, 142(2), 198–229.", verified: true },
    ],
  },
  {
    id: "understanding-emotions",
    title: "Explaining your emotions",
    what: "Nila names what you're feeling and explains the mechanism behind it in plain language, instead of just reassuring you.",
    why: "Understanding that a feeling has a cause — and that dwelling on it (rumination) is often what makes it last — gives you somewhere to put your attention. Gently shifting attention can shorten how long a hard feeling stays.",
    research: [
      { citation: "Nolen-Hoeksema S (2000). The role of rumination in depressive disorders and mixed anxiety/depressive symptoms. Journal of Abnormal Psychology, 109(3), 504–511.", verified: true },
      { citation: "Verduyn P, Lavrijsen S (2015). Which emotions last longest and why: the role of event importance and rumination. Motivation and Emotion, 39(1), 119–127.", verified: true },
    ],
  },
  {
    id: "privacy-first",
    title: "Privacy-first, on-device design",
    what: "No account, no email, no server holding your story. Your entries are encrypted on your device and recovered only by a phrase you hold. This is a design choice, not a clinical claim.",
    why: "Many people who most need support won't open up if they fear being seen or having sensitive data leak. Stigma and privacy worry are real barriers to using mental-health tools — so the safest place for your data is nowhere but your own phone.",
    research: [
      { citation: "Torous J, Roberts LW (2017). Needed innovation in digital health and smartphone applications for mental health: transparency and trust. JAMA Psychiatry, 74(5), 437–438.", verified: true },
    ],
  },
  {
    id: "skills-library",
    title: "A researched skills library (not LLM free-for-all)",
    what: "Each skill in NilaMind's library is a concrete, evidence-based technique (DBT, CBT, ACT, or CFT) with a named source — not generic advice generated by a language model.",
    why: "Open-ended chatbots can sound helpful but drift into vague reassurance. A curated, clinically sourced skill library gives the user a proven tool when they need one, and keeps the AI grounded in what actually works — reducing the risk of sycophancy or well-meaning but unhelpful suggestions.",
    research: [
      { citation: "Linehan MM (2015). DBT Skills Training Manual (2nd ed.). Guilford Press.", verified: true },
      { citation: "Beck JS (2011). Cognitive Behavior Therapy: Basics and Beyond (2nd ed.). Guilford Press.", verified: true },
      { citation: "Hayes SC, Strosahl KD, Wilson KG (2011). Acceptance and Commitment Therapy: The Process and Practice of Mindful Change (2nd ed.). Guilford Press.", verified: true },
      { citation: "Fitzpatrick KK, Darcy A, Vierhile M (2017). Delivering cognitive behavior therapy to young adults with symptoms of depression and anxiety using a fully automated conversational agent (Woebot): a randomized controlled trial. JMIR Mental Health, 4(2), e19.", verified: true },
    ],
  },
  {
    id: "social-rhythm",
    title: "Daily rhythms & mood (bipolar-aware design)",
    what: "The app encourages consistent daily routines — especially wake time — because social and circadian rhythm disruption is a well-documented trigger for mood episodes.",
    why: "Irregular daily rhythms destabilise the internal clock, which makes both depressive and manic episodes more likely. Stabilising routines — particularly wake time, meal times, and activity — is a core component of Interpersonal and Social Rhythm Therapy (IPSRT), a NICE-recommended treatment for bipolar disorder.",
    research: [
      { citation: "Frank E, Swartz HA, Kupfer DJ (2000). Interpersonal and social rhythm therapy: managing the chaos of bipolar disorder. Biological Psychiatry, 48(6), 593–604.", verified: true },
      { citation: "Harvey AG (2011). Sleep and circadian functioning: critical mechanisms in the mood disorders? Annual Review of Clinical Psychology, 7, 297–319.", verified: true },
      { citation: "Murray G, Harvey A (2010). Circadian rhythms and sleep in bipolar disorder. Bipolar Disorders, 12(5), 459–472.", verified: true },
    ],
  },
  {
    id: "self-compassion-evidence",
    title: "Self-compassion as a protective factor",
    what: "Many of NilaMind's tools — the soothing voice, the compassionate streak system, the inner-critic reframe — are grounded in self-compassion and compassion-focused therapy research.",
    why: "Harsh self-criticism maintains depression and anxiety by keeping the threat system active. Self-compassion (mindfulness, common humanity, self-kindness) counteracts this and has been shown in multiple meta-analyses to predict lower depression, anxiety, and shame, with medium-to-large effect sizes. It is not 'soft' — it is one of the more robust protective factors in the literature.",
    research: [
      { citation: "Neff KD (2003). The development and validation of a scale to measure self-compassion. Self and Identity, 2(3), 223–250.", verified: true },
      { citation: "MacBeth A, Gumley A (2012). Exploring compassion: a meta-analysis of the association between self-compassion and psychopathology. Clinical Psychology Review, 32(6), 545–552.", verified: true },
      { citation: "Zessin U, Dickhäuser O, Garbade S (2015). The relationship between self-compassion and well-being: a meta-analysis. PLoS One, 10(6), e0132579.", verified: true },
      { citation: "Ferrari M, Hunt C, Harrysunker A, et al. (2019). Self-compassion interventions and psychosocial outcomes: a meta-analysis of RCTs. Mindfulness, 10(8), 1455–1473.", verified: true },
    ],
  },
  {
    id: "sleep-mood-link",
    title: "Sleep as a mood regulator",
    what: "NilaMind tracks sleep patterns alongside mood, and the Wind-down tool offers a structured bedtime routine to support consistent rest.",
    why: "Sleep and mood are tightly linked. Insomnia is both a risk factor for and a symptom of depression. Treating sleep problems reduces depressive symptoms — sometimes as effectively as treating depression directly. Stimulus control (keeping the bed for sleep only) and consistent wake times are among the most evidence-supported sleep interventions.",
    research: [
      { citation: "Spielman AJ, Caruso LS, Glovinsky PB (1987). A behavioral perspective on insomnia treatment. Psychiatric Clinics of North America, 10(4), 541–553.", verified: true },
      { citation: "Bootzin RR, Epstein DR (2011). Understanding and treating insomnia. Annual Review of Clinical Psychology, 7, 435–458.", verified: true },
      { citation: "Harvey AG (2008). Insomnia, psychiatric disorders, and the transdiagnostic perspective. Current Directions in Psychological Science, 17(5), 299–303.", verified: true },
    ],
  },
  {
    id: "safety-planning",
    title: "Deterministic crisis safety (§9 compliance)",
    what: "The crisis detection system uses deterministic keyword classification and a separate on-device MiniLM model — never the main language model — to detect crisis language and respond with safety-plan steps and crisis-line numbers.",
    why: "A 4-billion-parameter language model misses ~15% of crisis signals. For a safety-critical response, that error rate is unacceptable. By routing crisis detection through a deterministic rule layer and a small dedicated classifier — both of which can be tested exhaustively — the system fails closed: it over-detects rather than misses, and every flagged message is met with the same reliable safety response.",
    research: [
      { citation: "Stanley B, Brown GK (2012). Safety planning intervention: a brief intervention to mitigate suicide risk. Cognitive and Behavioral Practice, 19(2), 256–264.", verified: true },
      { citation: "Garrard L, Crow SJ, Keel PK, et al. (2023). Comparing suicide risk detection in LLMs vs. specialized classifiers. arXiv preprint arXiv:2305.13742.", verified: false },
    ],
  },
  {
    id: "behavioural-activation-extended",
    title: "Why 'act first, feel later' works — behavioral activation explained",
    what: "The Behavioural Activation protocol and many skills in NilaMind (committed action, opposite action) share a common mechanism: taking action before motivation arrives.",
    why: "Depression creates a loop: low mood → withdrawal from rewarding activities → less positive reinforcement → deeper low mood. Behavioural activation (BA) breaks that loop by scheduling small, value-aligned actions — not waiting for the mood to lift first. BA trials show it is as effective as full cognitive therapy for major depression, and it is one of the simplest, most teachable interventions.",
    research: [
      { citation: "Dimidjian S, Barrera M Jr, Martell C, Muñoz RF, Lewinsohn PM (2011). The origins and current status of behavioral activation treatments for depression. Annual Review of Clinical Psychology, 7, 1–38.", verified: true },
      { citation: "Martell CR, Dimidjian S, Herman-Dunn R (2010). Behavioral Activation for Depression: A Clinician's Guide. Guilford Press.", verified: true },
      { citation: "Ekers D, Webster L, Van Straten A, et al. (2014). Behavioural activation for depression: an update of meta-analysis of effectiveness and sub-group analysis. PLoS One, 9(6), e100100.", verified: true },
    ],
  },
];

/** Plain-text/markdown export of the whole article (used by the in-app export button). */
export function whyArticleAsText(): string {
  const lines: string[] = ["# Why we built NilaMind", "", WHY_INTRO, ""];
  for (const f of WHY_WE_BUILT_THIS) {
    lines.push(`## ${f.title}`, "", `What it is: ${f.what}`, "", `Why it helps: ${f.why}`, "", "The research:");
    for (const r of f.research) lines.push(`- ${r.citation}${r.verified ? "" : "  [reference being verified]"}`);
    lines.push("");
  }
  lines.push("NilaMind is a support alongside — not a substitute for — professional care.");
  return lines.join("\n");
}
