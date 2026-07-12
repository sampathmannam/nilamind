// Structured assertion training protocol — value-aligned communication scripts built on existing
// DBT interpersonal effectiveness skills (DEAR MAN, GIVE, FAST from skillsLibrary.ts).
//
// Evidence base:
//   • RESiLIENT trial: assertion training module showed +35% improvement vs passive control
//     (personalized treatment selection outperformed generic);
//   • Linehan 2015, DBT Skills Training Manual (Interpersonal Effectiveness module);
//   • Assertion training is a well-established component of CBT for social anxiety, depression,
//     and relationship distress (meta-analyses show moderate-large effects).

import { type Protocol } from "./protocols";

export const ASSERTION_TRAINING: Protocol = {
  id: "assertion-training",
  title: "Assertion Training",
  basis:
    "Assertion training teaches value-aligned communication — asking for what you need, saying no " +
    "without guilt, and maintaining self-respect in relationships. The RESiLIENT personalised-treatment " +
    "trial found its assertion module produced +35% improvement vs control, and DBT's interpersonal " +
    "effectiveness skills (DEAR MAN, GIVE, FAST) are among the most broadly useful skills in the " +
    "repertoire (Linehan 2015).",
  forConcerns: [
    "can't say no", "cant say no", "people pleasing", "people-pleasing",
    "afraid to speak up", "scared to speak up",
    "setting boundaries", "boundaries", "too passive",
    "walked all over", "pushover", "doormat",
    "can't speak my mind", "cant speak my mind",
    "afraid of conflict", "scared of conflict",
    "avoid confrontation", "can't confront", "cant confront",
    "don't know how to ask", "dont know how to ask",
    "resentment", "resentful",
    "say yes when I mean no",
  ],
  steps: [
    {
      id: "as-1",
      kind: "psychoed",
      title: "How assertion works",
      prompt:
        "Assertion is not aggression — it's asking for what you need while respecting the other person. " +
        "It's also not passivity — it's telling the truth about your limits. " +
        "The middle path between fight and flight. The DBT framework gives us three skill sets for this: " +
        "DEAR MAN (getting your objective), GIVE (keeping the relationship), and FAST (keeping your self-respect). " +
        "Want to explore what's hardest for you right now?",
    },
    {
      id: "as-2",
      kind: "reflect",
      title: "Where do you get stuck?",
      prompt:
        "Take a moment — where do you most often get stuck? Saying no? Asking for something? " +
        "Speaking up when you disagree? Or feeling resentful after saying yes again? " +
        "There's no wrong answer — just noticing the pattern is the first step toward shifting it.",
    },
    {
      id: "as-3",
      kind: "exercise",
      title: "DEAR MAN — your script",
      prompt:
        "DEAR MAN is DBT's core skill for getting what you need. Let's build a script for a real situation. " +
        "Describe the situation factually. Express your feelings with 'I' statements. " +
        "Assert what you need clearly. Reinforce by saying why it helps. " +
        "Stay Mindful (repeat your point if needed). Appear Confident. Negotiate if there's room. " +
        "Try writing one DEAR MAN for something you need to ask for — the words matter less than the structure.",
    },
    {
      id: "as-4",
      kind: "exercise",
      title: "Saying no with FAST",
      prompt:
        "Saying no can feel harder than asking. FAST keeps your self-respect intact while doing it. " +
        "Be Fair to yourself and them. Don't over-Apologise for existing or having limits. " +
        "Stick to your values — don't explain excessively. Be Truthful. " +
        "Practice saying no to one small thing this week: 'I appreciate the ask, but I can't right now.' " +
        "No explanation needed — 'no' is a complete sentence.",
    },
    {
      id: "as-5",
      kind: "exercise",
      title: "GIVE — keeping connection",
      prompt:
        "Sometimes the hard part isn't what to say — it's how to say it so the relationship stays intact. " +
        "GIVE helps: be Gentle (no attacks, no threats), act Interested (listen fully), Validate their perspective, " +
        "and keep an Easy manner (a little warmth goes a long way). " +
        "Think of a recent conversation that went sideways — would GIVE have changed the tone?",
    },
    {
      id: "as-6",
      kind: "plan",
      title: "Your practice plan",
      prompt:
        "Pick one skill to practice this week: a DEAR MAN for something you need to ask, a FAST 'no' to a request you'd usually accept, " +
        "or GIVE for a conversation where the relationship matters more than being right. " +
        "Start small — a low-stakes situation. You can track it in the app's diary card. Which one will you try?",
    },
    {
      id: "as-7",
      kind: "reflect",
      title: "How did it go?",
      prompt:
        "If you tried it: how did it feel? Even a small attempt counts — assertion is a skill, not a personality trait. " +
        "What felt natural and what felt awkward? Each time you practice, the gap between what you want to say and what you actually say gets a little smaller.",
    },
  ],
};
