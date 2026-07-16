// Structured mindfulness practice protocol — distinct from grounding (crisis-oriented) and
// DBT Wise Mind (brief skill). This is a guided mindfulness practice module.
//
// RESEARCH BASIS:
//   - Kuyken et al. (2016, Lancet) — MBCT vs antidepressants for depression relapse prevention:
//     MBCT was non-inferior to maintenance antidepressants in preventing depressive relapse
//     over 24 months (hazard ratio 1.04, 95% CI 0.77-1.40)
//   - Teasdale et al. (2000, J Consult Clin Psych) — MBCT reduced relapse risk by ~50% in
//     patients with 3+ prior episodes
//   - Segal, Williams & Teasdale (2013, MBCT 2nd ed.) — comprehensive MBCT manual
//   - Kabat-Zinn (1990, Full Catastrophe Living) — MBSR foundational text
//   - For bipolar disorder: Deckersbach et al. (2012, Bipolar Disorders) — MBCT adapted for BD
//     showed improvements in depressive symptoms and emotional regulation
//
// SAFETY NOTE: Mindfulness is generally safe for bipolar populations, but extended silent meditation
// may be destabilizing for some individuals with active psychosis or severe mania. This protocol
// keeps practices brief (5-10 minutes) and includes grounding elements for safety.

import { type Protocol } from "./protocols";

export const MINDFULNESS_PRACTICE: Protocol = {
  id: "mindfulness-practice",
  title: "Mindfulness Practice",
  basis:
    "Mindfulness-Based Cognitive Therapy (MBCT) combines mindfulness meditation with cognitive therapy " +
    "to prevent depressive relapse. Kuyken et al. (2016, Lancet) demonstrated MBCT was non-inferior " +
    "to maintenance antidepressants over 24 months. Teasdale et al. (2000) found MBCT reduced relapse " +
    "risk by ~50% in patients with 3+ prior episodes. For bipolar populations, Deckersbach et al. " +
    "(2012) showed MBCT adapted for BD improved depressive symptoms and emotional regulation. " +
    "This module offers brief, guided practices (5-10 minutes) rather than extended silent meditation.",
  forConcerns: [
    "mindful", "mindfulness", "meditation", "meditate", "body scan",
    "present moment", "be present", "awareness", "breathing exercise",
    "mind wandering", "can't focus", "racing mind", "mental clutter",
    "grounded", "calm practice", "relaxation", "inner peace",
  ],
  steps: [
    {
      id: "mfp-1",
      kind: "psychoed",
      title: "What mindfulness is (and isn't)",
      prompt:
        "Mindfulness isn't about clearing your mind or stopping thoughts — that's a common myth. " +
        "It's about noticing what's happening right now, without judging it as good or bad. " +
        "Your mind WILL wander — that's normal. The practice is noticing it wandered and gently " +
        "coming back. Each time you come back, you're building the skill. Want to try a short practice?",
    },
    {
      id: "mfp-2",
      kind: "exercise",
      title: "Three-minute breathing space",
      prompt:
        "Let's try a brief mindfulness practice — just 3 minutes:\n" +
        "1. STEP 1 — AWARENESS (1 min): Notice what's here right now. Thoughts, feelings, " +
        "body sensations. You don't need to change anything — just notice.\n" +
        "2. STEP 2 — GATHERING (1 min): Gently move your attention to your breath. " +
        "Feel the rise and fall of your chest or belly. When the mind wanders, gently guide it back.\n" +
        "3. STEP 3 — EXPANDING (1 min): Widen your attention to your whole body — " +
        "posture, expression, the space you're in. Carry this awareness into the next moment.\n\n" +
        "How was that for you?",
    },
    {
      id: "mfp-3",
      kind: "exercise",
      title: "Body scan (brief)",
      prompt:
        "A body scan helps you notice sensations you might usually ignore. Try this shortened version:\n" +
        "Start at the top of your head. Slowly move your attention down: forehead, jaw, neck, " +
        "shoulders, arms, hands, chest, belly, legs, feet. At each spot, just notice — " +
        "tightness, warmth, tingling, nothing at all. There's no wrong answer. " +
        "If you notice tension, you don't have to fix it — just acknowledge it. " +
        "Take about 5 minutes. What did you notice?",
    },
    {
      id: "mfp-4",
      kind: "reflect",
      title: "Mindful moments in daily life",
      prompt:
        "You don't need a meditation cushion to be mindful. Any routine moment can become practice: " +
        "brushing your teeth, drinking tea, walking to work. Pick ONE daily activity this week " +
        "and do it with full attention — notice the sensations, the movements, the sounds. " +
        "That's mindfulness in action. What activity could you make mindful?",
    },
    {
      id: "mfp-5",
      kind: "reflect",
      title: "What you noticed",
      prompt:
        "After a few days of practice — what have you noticed? Not whether you're 'good at it' " +
        "(there's no good or bad), but what the practice shows you about your own mind. " +
        "Sometimes the most useful thing is noticing how busy the mind usually is — " +
        "that awareness itself is the skill developing.",
    },
  ],
};
