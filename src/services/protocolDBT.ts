// Structured DBT skills training: a 10-step protocol covering the four core DBT modules
// (mindfulness → distress tolerance → emotion regulation → interpersonal effectiveness),
// modeled on Linehan 2015, DBT Skills Training Manual (2nd ed.) and the eDBT app structure.
// Safe for all populations — no sleep restriction, no exposure hierarchy.
//
// RESEARCH BASIS:
//   - Linehan (2015, DBT Skills Training Manual, 2nd ed.) — comprehensive DBT skills curriculum
//   - Neacsiu et al. (2014, Behav Ther) — behavioral chain analysis as a core DBT skill for
//     understanding and preventing problem behaviors
//   - Ritschel et al. (2015, J Clin Psych) — chain analysis reduces emotion dysregulation
//   - Meta-analyses show moderate-large effects for DBT skills training on emotion regulation
//     and distress tolerance (Valentine et al., 2015, Clin Psych Rev)

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
    "chain analysis", "what happened", "why did i", "keep doing this", "pattern of behavior",
    "self-sabotage", "self sabotage", "keep making the same mistake",
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
    // ── Chain Analysis: a core DBT skill for understanding problem behaviors ──
    // Linehan (2015); Neacsiu et al. (2014, Behav Ther): chain analysis helps identify the sequence
    // of events, thoughts, emotions, and behaviors leading to a problem behavior, enabling targeted
    // intervention at each link in the chain.
    {
      id: "dbt-9",
      kind: "psychoed",
      title: "Chain Analysis — understanding what happened",
      prompt:
        "When something goes wrong — an outburst, an urge you acted on, a moment you regret — chain analysis " +
        "helps you understand HOW it happened, not just THAT it happened. Think of it as a map: " +
        "vulnerability factors (what made you fragile?) → prompting event (what triggered it?) → " +
        "thoughts and emotions (what went through your mind?) → the problem behavior itself → " +
        "consequences (what happened after?). Each link is a place where you can intervene next time. " +
        "Want to map one recent moment?",
    },
    {
      id: "dbt-10",
      kind: "reflect",
      title: "Map the chain",
      prompt:
        "Think of one recent moment you'd like to understand better. Walk through it step by step:\n" +
        "1. Vulnerability: What was already off? (Tired? Hungry? Stressed?)\n" +
        "2. Prompting event: What specifically happened?\n" +
        "3. Thoughts/feelings: What went through your mind? What did you feel?\n" +
        "4. The behavior: What did you actually do or avoid?\n" +
        "5. Consequences: What happened next — for you and others?\n\n" +
        "Now look at the chain: where's one link you could intervene at next time? " +
        "Maybe a skill at step 3 (Check the Facts) or step 4 (TIPP) could break the chain. " +
        "What's your intervention point?",
    },
  ],
};
