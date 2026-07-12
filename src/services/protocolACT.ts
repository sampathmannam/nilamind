// Structured ACT (Acceptance and Commitment Therapy) protocol: a 7-step path through the six core
// ACT processes (acceptance, defusion, present-moment contact, self-as-context, values, and
// committed action), building on the in-app Values Compass and Skills Library.
//
// Evidence base:
//   • Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2011). Acceptance and Commitment Therapy (2nd ed.).
//   • A-Tjak, J. G. L., et al. (2015). Meta-analysis of ACT efficacy — moderate-to-large effects for
//     anxiety, depression, and transdiagnostic outcomes. Psychotherapy and Psychosomatics, 84(1), 30–36.
//   • Twohig, M. P., & Levin, M. E. (2017). ACT as a transdiagnostic treatment. J. Contextual Behav. Sci.
//   • In-app VLQ-aligned values work (Wilson et al. 2010): values are directions, not goals —
//     the committed-action step pairs with the existing values.ts action-tracking infrastructure.

import { type Protocol } from "./protocols";

export const ACT_TRAINING: Protocol = {
  id: "act-training",
  title: "ACT Skills Training",
  basis:
    "Acceptance and Commitment Therapy (ACT) is a transdiagnostic, evidence-based approach that " +
    "uses acceptance, mindfulness, and values-based action to increase psychological flexibility. " +
    "Meta-analyses show moderate-to-large effects for anxiety, depression, and chronic pain " +
    "(A-Tjak et al. 2015, Psychother. Psychosom.). This protocol walks through all six core ACT " +
    "processes, building on the in-app Values Compass and Skills Library.",
  forConcerns: [
    "stuck in my head", "stuck in my own head",
    "can't stop thinking", "cant stop thinking", "overthinking", "over-thinking",
    "avoiding my feelings", "avoiding feelings", "numb", "suppressing",
    "don't know what matters", "dont know what matters", "lost my purpose",
    "feelings are too much", "emotions are too much",
    "fighting my emotions", "fighting my feelings",
    "feelings overwhelm", "emotions overwhelm",
    "can't accept", "cant accept", "not good enough", "never enough",
    "avoidance", "running away", "distracting myself",
  ],
  steps: [
    {
      id: "act-1",
      kind: "psychoed",
      title: "How ACT works",
      prompt:
        "ACT stands for Acceptance and Commitment Therapy — and the core idea is simple: instead of fighting " +
        "your thoughts and feelings, you learn to make room for them while moving toward what matters. " +
        "It has six processes, but we'll focus on three: making space (acceptance), unhooking (defusion), " +
        "and acting on what matters (values + committed action). Ready to give it a try?",
    },
    {
      id: "act-2",
      kind: "exercise",
      title: "Acceptance — Making room",
      prompt:
        "Think of something you've been trying to push away — a worry, sadness, or frustration. " +
        "Now try this: instead of pushing, see if you can breathe into it, making a little space around it. " +
        "You don't have to like it — just let it be there without fighting. " +
        "What happens when you stop trying to get rid of it?",
    },
    {
      id: "act-3",
      kind: "exercise",
      title: "Defusion — Unhooking from thoughts",
      prompt:
        "Here's a simple defusion exercise. Take a sticky thought — something like 'I'm not good enough' or 'it won't work.' " +
        "Now add a prefix: 'I notice I'm having the thought that I'm not good enough.' " +
        "Notice the distance that creates — you're not the thought; you're the one noticing it. " +
        "Try it with a thought that's been looping recently.",
    },
    {
      id: "act-4",
      kind: "reflect",
      title: "The present moment",
      prompt:
        "Before moving on: drop into right now. Feet on the floor, breath moving in and out, the sounds around you. " +
        "Thoughts may pull you away — that's normal. Just gently come back. " +
        "What do you notice when you're fully here?",
    },
    {
      id: "act-5",
      kind: "exercise",
      title: "Values — What matters",
      prompt:
        "Values are directions, not destinations — you can never finish them, but you can move toward them in any moment. " +
        "In the app's Values Compass you can rate different life areas (relationships, work, growth, etc.). " +
        "Think of one area where you feel a gap between how important it is and how you're actually living it. " +
        "What would a small 'toward move' look like in that area?",
    },
    {
      id: "act-6",
      kind: "plan",
      title: "Committed action — First step",
      prompt:
        "Let's make it concrete. Based on the value you just thought of: what's the smallest action you could take in " +
        "the next 24 hours that moves toward it — not waiting until you feel ready? " +
        "In ACT we call this a committed action: it's not about the outcome, it's about the direction. " +
        "Write it down or tell it to me — naming it makes it more real. You can also save it in the app's Values Tracker.",
    },
    {
      id: "act-7",
      kind: "reflect",
      title: "Notice the shift",
      prompt:
        "You've just touched three core ACT skills: making room for hard feelings, unhooking from thoughts, " +
        "and taking a small step toward what matters. After a few days of practicing: did anything shift — " +
        "even a little? Did the thought have less pull, or did the small action feel different than you expected?",
    },
  ],
};
