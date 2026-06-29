// "Why we built this" — the research behind each major feature (AUTOPILOT Phase 9).
//
// Honesty rule (project non-negotiable): real citations only. Where the paper is canonical and we
// are confident of the reference, `verified: true`. Where we are unsure of the exact locator
// (volume/issue/pages), `verified: false` renders a gentle, user-facing "reference being verified"
// marker rather than presenting an unverified reference as fact. Never fabricate a citation.

export interface ResearchCite {
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
