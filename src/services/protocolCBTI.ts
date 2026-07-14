// CBT-I sleep protocol: 4-session structured insomnia intervention
//
// Edinger & Carney (2008), "Overcoming Insomnia: A Cognitive-Behavioral Therapy
// Approach, Therapist Guide" (Oxford). Edinger et al. (2021) AASM clinical
// practice guideline: CBT-I is the first-line treatment for chronic insomnia in
// adults, with large effect sizes (g ≈ 0.7–1.2) across sleep onset latency,
// wake after sleep onset, and sleep efficiency.
//
// SAFETY NOTE: Sleep restriction therapy (SRT) — the most potent single CBT-I
// component — is deliberately OMITTED here. Acute sleep loss is a documented
// mania trigger, and this app's population includes bipolar users. Nila never
// tells anyone to sleep less. The protocol substitutes a gentle sleep-
// consolidation approach that tightens the window only when time-in-bed
// exceeds 9 hours, without reducing total sleep time below 7 hours.
//
// Adapted from: Edinger & Carney 2008, Espie 2006 (attention-intention model),
// Ong et al. 2012 (mindfulness-based CBT-I).

import { type Protocol } from "./protocols";

export const CBTI_SLEEP: Protocol = {
  id: "cbti-sleep",
  title: "Sleep Better (CBT-I)",
  basis:
    "Cognitive Behavioral Therapy for Insomnia (CBT-I) is the first-line treatment " +
    "for chronic insomnia (Edinger et al., 2021, AASM guideline; meta-analytic g ≈ 0.7–1.2). " +
    "It targets the three drivers of persistent insomnia: conditioned arousal (the bed becomes a " +
    "trigger for wakefulness), unhelpful beliefs about sleep (catastrophising about missed rest), " +
    "and behaviours that accidentally worsen the problem (long irregular hours in bed). " +
    "This protocol delivers the core CBT-I modules — psychoeducation, stimulus control, cognitive " +
    "restructuring, and sleep consolidation — without the sleep restriction component that could " +
    "trigger mania. Adapted from Edinger & Carney 2008 and Ong et al. 2012.",
  forConcerns: [
    "can't sleep", "cant sleep", "can't fall asleep", "cant fall asleep", "can't stay asleep", "cant stay asleep",
    "can't get to sleep", "cant get to sleep", "insomnia", "insomniac",
    "lie awake", "lying awake", "wide awake", "toss and turn", "tossing and turning",
    "no sleep", "not sleeping", "sleepless", "up all night",
    "wake up at night", "waking up at night", "trouble sleeping",
    "can't sleep at night", "cant sleep at night", "can't sleep through", "cant sleep through",
    "sleep anxiety", "afraid to sleep", "dread bedtime", "racing mind at night",
    "brain won't shut off", "can't shut my brain off", "cant shut my brain off",
    "wake up too early", "waking up too early",
  ],
  steps: [
    {
      id: "cbti-1",
      kind: "psychoed",
      title: "How sleep really works",
      prompt:
        "Insomnia often feels like a mystery — but it actually follows a clear pattern. " +
        "There are two systems that regulate sleep: the *sleep drive* (builds the longer you're awake, " +
        "like a hunger for rest) and the *body clock* (your circadian rhythm, which tells you when to " +
        "feel alert or sleepy). Insomnia happens when these systems get cross-wired by worry — the more " +
        "you try to force sleep, the more alert you become. Understanding this takes the pressure off. " +
        "Shall we look at what's keeping your system from settling naturally?",
    },
    {
      id: "cbti-2",
      kind: "exercise",
      title: "Stimulus control — bed = sleep",
      prompt:
        "Over time, the bed can become a place where you practise being awake — checking the clock, " +
        "worrying about not sleeping, scrolling your phone. Stimulus control does the opposite: it " +
        "rebuilds the connection between bed and sleep. The key rule: if you're lying awake for more " +
        "than about 20 minutes and starting to feel frustrated, get up gently, go somewhere dim and quiet, " +
        "do something boring, and return only when you feel sleepy. No clock-watching. No trying harder. " +
        "It feels counterintuitive, but this one change, done consistently, is the strongest single " +
        "non-medical insomnia intervention we have. How does that sound — could you try it this week?",
    },
    {
      id: "cbti-3",
      kind: "reflect",
      title: "Catch the sleep thoughts",
      prompt:
        "What we *think* about sleep shapes how sleep behaves. Common unhelpful beliefs include: " +
        "'If I don't sleep well tonight I'll fall apart tomorrow,' 'I'll never get back to normal sleep,' " +
        "or 'I need to catch up on missed sleep.' None of these are actually true — one bad night rarely " +
        "impacts performance as much as we fear, and sleep pressure naturally builds after a short night. " +
        "What thoughts come up for you when you're lying awake? Noticing them is the first step — we can " +
        "gently question them together next time.",
    },
    {
      id: "cbti-4",
      kind: "plan",
      title: "Sleep-friendly habits",
      prompt:
        "Here's the consolidation plan — no strict limits, just gentle guidance for this week:\n" +
        "1. Same wake time every day (yes, even weekends) — this anchors your body clock.\n" +
        "2. Wind-down routine 30-60 min before bed (dim lights, no screens, quiet activity).\n" +
        "3. No clock-watching during the night — turn the clock away or cover it.\n" +
        "4. If your time in bed is over 9 hours, try gradually trimming to 8.5, then 8.\n" +
        "5. No caffeine after 2 pm, no alcohol within 3 hours of bed.\n" +
        "Pick *one* of these to try tonight — just one. What feels doable?",
    },
    {
      id: "cbti-5",
      kind: "reflect",
      title: "How it went",
      prompt:
        "How did this week go with the step you picked? No pressure — any experience is useful, " +
        "whether it helped or not. Sleep change is gradual, and noticing what doesn't work is just as " +
        "valuable as noticing what does. Want to try a different focus for next week, or keep going with the same one?",
    },
  ],
};
