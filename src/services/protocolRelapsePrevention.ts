// Structured relapse prevention protocol — distinct from crisis safety plan.
// This module addresses LIFESTYLE-FOCUSED relapse prevention, not crisis management.
//
// RESEARCH BASIS:
//   - Marlatt & Gordon (1985, Relapse Prevention) — foundational RP model: high-risk situations,
//     coping skills, lapse vs relapse distinction, abstinence violation effect
//   - Bowen et al. (2014, JAMA Psychiatry) — Mindfulness-Based Relapse Prevention (MBRP) outperformed
//     standard RP and 12-step programs at 12-month follow-up
//   - Larimer et al. (1999, J Consult Clin Psych) — RP meta-analysis showing moderate effect sizes
//   - For bipolar disorder specifically: Colom et al. (2003, 2008) — psychoeducation including relapse
//     prevention reduced relapse rates in BD (Barcelona program, two RCTs)
//   - Miklowitz (2010, Family-Focused Therapy) — includes relapse prevention as a core component
//
// SAFETY NOTE: This protocol does NOT replace the crisis safety plan (safetyPlan.ts). It focuses
// on EARLY WARNING SIGN recognition and lifestyle stabilization — catching shifts before they
// escalate to crisis level. The safety plan handles acute crisis; this protocol handles maintenance.

import { type Protocol } from "./protocols";

export const RELAPSE_PREVENTION: Protocol = {
  id: "relapse-prevention",
  title: "Relapse Prevention",
  basis:
    "Relapse Prevention (RP) is an evidence-based maintenance strategy that helps identify early " +
    "warning signs, high-risk situations, and coping strategies before a full episode develops. " +
    "Foundational model: Marlatt & Gordon (1985). For bipolar disorder, Colom et al. (2003, 2008) " +
    "demonstrated that psychoeducation including relapse prevention components reduced relapse rates " +
    "by approximately 50% in two RCTs. This protocol is DISTINCT from the crisis safety plan — " +
    "it addresses lifestyle-focused prevention, not acute crisis management.",
  forConcerns: [
    "relapse", "relapse prevention", "early warning signs", "warning signs",
    "prodrome", "episode prevention", "staying well", "maintaining recovery",
    "high risk situations", "triggers", "coping plan", "prevent episode",
    "before it gets bad", "catch it early", "slipping", "slipping away",
    "keeping stable", "stability", "wellness plan", "self-management",
  ],
  steps: [
    {
      id: "rp-1",
      kind: "psychoed",
      title: "Relapse vs. lapse",
      prompt:
        "A lapse is a slip — a brief return to old patterns. A relapse is when that slip becomes the " +
        "new pattern. The key insight from Relapse Prevention (Marlatt & Gordon, 1985) is that lapses " +
        "don't have to become relapses — if you catch them early and respond instead of spiraling. " +
        "This plan helps you catch shifts before they escalate. Want to build yours?",
    },
    {
      id: "rp-2",
      kind: "reflect",
      title: "Your early warning signs",
      prompt:
        "Everyone has personal early warning signs — things that shift before a full episode. " +
        "For bipolar, common ones include sleep changes, increased energy/racing, irritability, " +
        "withdrawal, or spending more than usual. What are YOUR specific warning signs? " +
        "Think back to the last time things started to shift — what did you notice first?",
    },
    {
      id: "rp-3",
      kind: "reflect",
      title: "High-risk situations",
      prompt:
        "Certain situations make you more vulnerable — not because they're bad, but because they " +
        "challenge your stability. Common ones: disrupted sleep (travel, new baby, work deadlines), " +
        "major life changes (positive or negative), substance use, social conflict, or isolation. " +
        "What situations tend to destabilize YOU? Be honest — there's no judgment here.",
    },
    {
      id: "rp-4",
      kind: "plan",
      title: "Your coping menu",
      prompt:
        "When you notice a warning sign, what are 3-5 specific things you can do? " +
        "Think: sleep hygiene (anchor wake time), medication adherence, social support (who to call), " +
        "skills (grounding, TIPP, check the facts), lifestyle (reduce commitments, avoid substances). " +
        "Write them as 'If [warning sign], then I will [specific action].' What goes on your menu?",
    },
    {
      id: "rp-5",
      kind: "plan",
      title: "Your support network",
      prompt:
        "Who in your life knows about your condition and can help you notice shifts? " +
        "This might be a family member, friend, therapist, or psychiatrist. " +
        "What's the specific thing you'd ask them to do? (e.g., 'If you notice me sleeping less " +
        "and talking faster, please tell me directly — I might not see it myself.') " +
        "Who's on your team, and what's their role?",
    },
    {
      id: "rp-6",
      kind: "plan",
      title: "The lapse response plan",
      prompt:
        "If you do slip — miss sleep, skip medication, notice mood shifting — what's your " +
        "immediate response? The key is: acknowledge it without shame, then act. " +
        "Try: 'I noticed [specific sign]. I'm going to [specific coping action] today " +
        "and [contact person] by [time].' This turns a lapse into information, not a verdict. " +
        "What's your lapse response?",
    },
    {
      id: "rp-7",
      kind: "reflect",
      title: "Review and strengthen",
      prompt:
        "Take a moment to look at what you've built: your warning signs, high-risk situations, " +
        "coping menu, support network, and lapse response. This is your personal wellness plan. " +
        "It's not about being perfect — it's about having a map when things get foggy. " +
        "What's one part of this plan you want to strengthen or practice first?",
    },
  ],
};
