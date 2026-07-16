// Behavioral experiments protocol — a core CBT technique for testing maladaptive beliefs.
//
// RESEARCH BASIS:
//   - Bennett-Levy et al. (2004, Oxford Guide to Behavioral Experiments in CBT) — comprehensive
//     manual for designing and evaluating behavioral experiments
//   - Clark (1986, Cognitive Therapy and Cognitive-Behavioral Therapy) — foundational CBT model
//   - Craske et al. (2014, Anxiety and Related Disorders) — behavioral experiments as evidence-based
//     intervention for anxiety disorders
//   - Jacobson et al. (1996, JCCP) — behavioral experiments contributed to CBT's efficacy in depression
//   - McManus et al. (2008, Behav Cogn Psychother) — behavioral experiments produce cognitive change
//     through experience, not just intellectual understanding
//
// Behavioral experiments are the "active ingredient" of CBT — they test predictions made by
// maladaptive beliefs through direct experience. Unlike thought records (which work at the
// cognitive level), behavioral experiments work at the experiential level.

import { type Protocol } from "./protocols";

export const BEHAVIORAL_EXPERIMENTS: Protocol = {
  id: "behavioral-experiments",
  title: "Testing Your Predictions",
  basis:
    "Behavioral experiments are a core CBT technique where you test your beliefs through direct " +
    "experience rather than just thinking about them. Bennett-Levy et al. (2004) showed that " +
    "experiments produce cognitive change through experience, not just intellectual understanding. " +
    "McManus et al. (2008) demonstrated that behavioral experiments produce cognitive change " +
    "more effectively than thought records alone. The key is: your predictions are hypotheses, " +
    "not facts — and experiments let you test them.",
  forConcerns: [
    "prediction", "afraid to try", "what if i fail", "everyone will judge",
    "it won't work", "i can't do that", "bound to go wrong", "doom",
    "catastrophize", "catastrophizing", "worst case scenario", "worst case",
    "avoid", "avoiding", "can't face", "too scared to", "fear of",
    "negative prediction", "assuming the worst",
  ],
  steps: [
    {
      id: "be-1",
      kind: "psychoed",
      title: "What a behavioral experiment is",
      prompt:
        "We all carry predictions — 'If I speak up, they'll laugh,' 'If I try, I'll fail,' 'If I go out, " +
        "I'll feel worse.' These feel like facts, but they're actually hypotheses. A behavioral experiment " +
        "is a structured way to test one. You make the prediction explicit, design a small test, do it, " +
        "and then compare what you predicted with what actually happened. The goal isn't to prove yourself " +
        "wrong — it's to gather real evidence. Want to try one?",
    },
    {
      id: "be-2",
      kind: "reflect",
      title: "Name the prediction",
      prompt:
        "Think of a situation you've been avoiding or dreading. What's the specific prediction your mind " +
        "makes about it? Write it as a clear statement: 'If I [action], then [predicted outcome].' " +
        "Be honest — what does your mind actually expect to happen?",
    },
    {
      id: "be-3",
      kind: "plan",
      title: "Design the experiment",
      prompt:
        "Now let's design a small, safe test. The key principles:\n" +
        "1. Make it SMALL enough that you can actually do it (not a grand leap).\n" +
        "2. Make it SPECIFIC — what exactly will you do, and when?\n" +
        "3. Make it MEASURABLE — what will you observe to see if your prediction was right?\n" +
        "4. Make it SAFE — this isn't about putting yourself in danger.\n" +
        "What's your experiment?",
    },
    {
      id: "be-4",
      kind: "exercise",
      title: "Run the experiment",
      prompt:
        "When you're ready, do the experiment. While you're doing it, try to notice:\n" +
        "• What you predicted would happen\n" +
        "• What actually happened\n" +
        "• How you felt before, during, and after\n" +
        "• What you learned\n" +
        "It's okay if it doesn't go perfectly — even a partial test gives you data. " +
        "Take your time with this one.",
    },
    {
      id: "be-5",
      kind: "reflect",
      title: "Review the results",
      prompt:
        "After the experiment: what actually happened? Compare it to your prediction.\n" +
        "• Was your prediction fully correct? Partially? Not at all?\n" +
        "• What surprised you?\n" +
        "• What does this tell you about the belief behind the prediction?\n" +
        "Remember: one experiment doesn't destroy a belief — but it plants a seed of doubt. " +
        "Each experiment adds evidence. What did you learn?",
    },
  ],
};
