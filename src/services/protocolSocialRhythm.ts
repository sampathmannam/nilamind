import type { Protocol } from "./protocols";

export const SOCIAL_RHYTHM_PROTOCOL: Protocol = {
  id: "social-rhythm",
  title: "Social Rhythm Therapy",
  basis: "Interpersonal and Social Rhythm Therapy (IPSRT) reduces bipolar relapse by 2-3× vs treatment as usual by regularising daily routines — wake time, first contact, meals, and bedtime (Frank et al. 2005, Arch Gen Psychiatry; Frank et al. 2015, Am J Psychiatry). Circadian rhythm disruption is the single strongest prodrome for both manic and depressive episodes (Gold & Bunney 2018, Annu Rev Clin Psychol).",
  forConcerns: ["routine", "rhythm", "schedule", "sleep schedule", "daily routine", "stabilize", "stability", "regular", "anchor", "circadian", "social rhythm"],
  steps: [
    {
      id: "ipsrt-1",
      kind: "psychoed",
      title: "What are social rhythms?",
      prompt: "Our bodies run on daily rhythms — wake time, meals, social contact, bedtime. When these are irregular, mood follows. This program helps you find a steady daily anchor. Ready to start?",
    },
    {
      id: "ipsrt-2",
      kind: "plan",
      title: "Track your 5 anchors",
      prompt: "Let's note the 5 key moments in your day: wake time, first social contact, start of main activity, dinner, and bedtime. For the next few days, just observe and log them — no changes yet. Want to begin tracking?",
    },
    {
      id: "ipsrt-3",
      kind: "reflect",
      title: "Spot the disrupted anchors",
      prompt: "Looking at your logged anchors — which ones shift the most day to day? For many people, bedtime and wake time vary the most. Which anchor feels most unstable for you right now?",
    },
    {
      id: "ipsrt-4",
      kind: "plan",
      title: "Set a regular wake time",
      prompt: "A consistent wake time is the strongest anchor for the whole day's rhythm. What would be a realistic wake time you can aim for every day — even on weekends? Let's start there.",
    },
    {
      id: "ipsrt-5",
      kind: "plan",
      title: "Set a regular meal time",
      prompt: "Meal times — especially dinner — are powerful social cues for your body clock. What dinner time could you anchor to most days? It's okay if it's approximate, just aim for the same 30-minute window.",
    },
    {
      id: "ipsrt-6",
      kind: "plan",
      title: "Set a regular bedtime",
      prompt: "A steady bedtime bookends your day with the wake time. What time could you start winding down? Aim for within 30 minutes of your target most nights — and give yourself 20 minutes to settle beforehand.",
    },
    {
      id: "ipsrt-7",
      kind: "exercise",
      title: "Plan for disruptions",
      prompt: "Life happens — late nights, early mornings, travel. What's your plan when your routine breaks? Some ideas: keep wake time within 1 hour even after a late night; use a brief walk or morning light to reset after travel. What strategy fits your life?",
    },
    {
      id: "ipsrt-8",
      kind: "reflect",
      title: "Your rhythm maintenance plan",
      prompt: "You've built your anchor times. Write down your go-to wake time, meal window, and bedtime. What will remind you to protect them? Who can support you in keeping your rhythm steady? Keep this somewhere you'll see daily.",
    },
  ],
};
