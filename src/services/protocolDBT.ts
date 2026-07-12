// Structured DBT skills training: an 8-step protocol covering the four core DBT modules
// (mindfulness → distress tolerance → emotion regulation → interpersonal effectiveness),
// modeled on Linehan 2015, DBT Skills Training Manual (2nd ed.) and the eDBT app structure.
// Safe for all populations — no sleep restriction, no exposure hierarchy.

import { type Protocol } from "./protocols";

export const DBT_SKILLS_TRAINING: Protocol = {
  id: "dbt-skills-training",
  title: "DBT Skills Training",
  basis:
    "Dialectical Behavior Therapy (DBT) skills training reduces emotion dysregulation, " +
    "impulsive behaviour, and interpersonal conflict across clinical and non-clinical populations " +
    "(Linehan 2015, DBT Skills Training Manual 2nd ed.; meta-analyses show moderate-large effects " +
    "for emotion regulation and distress tolerance). This protocol introduces one cornerstone skill " +
    "from each of the four DBT modules, sequenced per the standard skills-training curriculum.",
  forConcerns: [
    "intense emotions", "overwhelming", "overwhelmed", "can't cope", "cant cope",
    "impulsive", "impulse", "urges", "acting out", "outbursts",
    "relationship conflict", "people pleasing", "people-pleasing",
    "can't say no", "cant say no", "emotionally unstable",
    "mood swings", "extreme feelings", "can't handle feelings", "cant handle feelings",
    "explosive", "shut down", "shutting down",
  ],
  steps: [
    {
      id: "dbt-1",
      kind: "psychoed",
      title: "How DBT skills work",
      prompt:
        "DBT skills training gives you a set of practical tools across four areas: mindfulness (staying present), " +
        "distress tolerance (getting through crisis without making it worse), emotion regulation (shifting how you feel " +
        "over time), and interpersonal effectiveness (handling relationships without losing yourself). " +
        "We'll try one skill from each area — not a full course, just a gentle introduction. Ready to begin?",
    },
    {
      id: "dbt-2",
      kind: "exercise",
      title: "Mindfulness — Wise Mind",
      prompt:
        "Let's start with Wise Mind — the place where your emotional wisdom and logical thinking meet. " +
        "Take a breath and notice: right now, are you in Emotion Mind (driven by feelings) or Reasonable Mind (cool logic)? " +
        "Neither is wrong — Wise Mind is the intersection of both. Gently ask yourself: what does Wise Mind know right now?",
    },
    {
      id: "dbt-3",
      kind: "exercise",
      title: "Distress Tolerance — TIPP",
      prompt:
        "When emotions feel unbearable, TIPP can cool the intensity fast. T — Temperature (splash cold water on your face). " +
        "I — Intense exercise (20 jumping jacks or a quick run in place). P — Paced breathing (breathe out longer than in). " +
        "P — Paired muscle relaxation (tense then release as you exhale). Try one of these right now, and notice what shifts.",
    },
    {
      id: "dbt-4",
      kind: "exercise",
      title: "Emotion Regulation — Check the Facts",
      prompt:
        "Intense emotions often come with interpretations that amplify them. " +
        "Pick a feeling you've had recently and walk through it: what happened (just the facts)? " +
        "What story did you add (assumptions, interpretations)? " +
        "Does the emotion's intensity fit the actual facts? If not, the feeling is telling you more about a thinking pattern than the situation — and you have room to respond differently.",
    },
    {
      id: "dbt-5",
      kind: "exercise",
      title: "Emotion Regulation — Opposite Action",
      prompt:
        "Here's one of DBT's most powerful ideas: if an emotion doesn't fit the facts, act opposite to its urge. " +
        "Fear says avoid — approach gently. Shame says hide — turn toward trusted connection. " +
        "Anger says attack — step back and validate. " +
        "Think of a recent emotion that didn't quite fit — what would the opposite action have been? " +
        "Even a small opposite move can start to shift the feeling.",
    },
    {
      id: "dbt-6",
      kind: "exercise",
      title: "Interpersonal — DEAR MAN",
      prompt:
        "Asking for something or saying no can feel impossible. DEAR MAN is a structure for effective communication. " +
        "Describe the situation factually. Express your feelings with 'I' statements. " +
        "Assert what you need clearly. Reinforce by explaining why it helps both of you. " +
        "Stay Mindful (ignore attacks, repeat your point). Appear Confident. Negotiate if needed. " +
        "Try writing one DEAR MAN for something small you need to ask for — even just a draft.",
    },
    {
      id: "dbt-7",
      kind: "exercise",
      title: "Distress Tolerance — Radical Acceptance",
      prompt:
        "Sometimes pain is unavoidable — but fighting reality adds suffering on top of the pain. " +
        "Radical acceptance is saying 'it is what it is' in a deep way. Not approval, not giving up — just stopping the fight. " +
        "Name one reality you've been resisting today. Take a breath and let it be real for a moment. " +
        "You don't have to like it — just let it be true. The energy you were using to fight it is now free.",
    },
    {
      id: "dbt-8",
      kind: "reflect",
      title: "Your skills practice",
      prompt:
        "You've just touched one skill from each DBT module. The real shift comes from practice — " +
        "try picking one skill that resonated and use it this week. The in-app diary card is a great place to track " +
        "which skills you use and how they land. Which of today's skills will you try in real life?",
    },
  ],
};
