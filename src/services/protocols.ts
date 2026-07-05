// Structured, evidence-based therapeutic PROTOCOLS + lightweight formulation-for-ROUTING (Phase 1).
//
// Research basis (docs/NILA_AGENT_RESEARCH_BASIS.md): STRUCTURE beats open-ended chat — every strong efficacy
// result is a structured, sequenced, multi-week protocol; open supportive chat has ~no controlled evidence as a
// standalone treatment. AND: personalized case-formulation does NOT reliably beat generic protocols — the one
// personalization that wins is *modular MATCHING* (route the presenting concern to the right module). So this is
// deliberately a LIGHTWEIGHT router over vetted protocols, NOT a heavy idiographic self-model. We lead with the
// two best-evidenced cards: Behavioral Activation (depression) and Worry-Postponement (GAD/worry).
//
// Nila DELIVERS these as her warm self — the protocol supplies the structure + sequence; her voice + memory
// personalize the framing/examples. Safety unchanged: §9 + the Phase-0 anti-sycophancy gate wrap every turn.

export type ProtocolStepKind = "psychoed" | "reflect" | "plan" | "exercise";

export interface ProtocolStep {
  id: string;
  title: string;
  kind: ProtocolStepKind;
  /** What Nila says/asks at this step, in her voice — an invitation, never a lecture. */
  prompt: string;
}

export interface Protocol {
  id: string;
  title: string;
  /** The evidence grounding (mandatory — every protocol traces to research). */
  basis: string;
  /** Lexical cues for modular routing — presenting-concern phrases this protocol fits. */
  forConcerns: string[];
  steps: ProtocolStep[];
}

export const PROTOCOLS: Protocol[] = [
  {
    id: "behavioral-activation",
    title: "Behavioral Activation",
    basis:
      "Evidence-based for depression; app-delivered BA reduces depressive symptoms (SMD ≈ −0.51, larger in " +
      "moderate–severe). See docs/NILA_AGENT_RESEARCH_BASIS.md.",
    forConcerns: [
      "no energy", "low energy", "no motivation", "pointless", "nothing matters", "what's the point",
      "whats the point", "can't get out of bed", "cant get out of bed", "stopped doing", "don't enjoy",
      "dont enjoy", "no interest", "empty", "numb", "depressed", "depression", "low", "flat", "given up",
      "withdrawn", "isolating", "can't be bothered", "cant be bothered", "stuck in bed", "no joy",
    ],
    steps: [
      { id: "ba-1", kind: "psychoed", title: "How this works",
        prompt: "When we're low, we naturally pull back from things — and less activity means fewer good moments, which quietly pulls us lower. Behavioral activation gently reverses that: we act first, in small ways, and the motivation tends to follow rather than lead. Want to try it together?" },
      { id: "ba-2", kind: "reflect", title: "Notice the pattern",
        prompt: "No pressure — just curious: what's something you used to do, or enjoy, that you've been doing less of lately?" },
      { id: "ba-3", kind: "plan", title: "Pick something small",
        prompt: "Let's choose ONE small thing that used to matter or feel a little good — small enough that it's almost easy. What comes to mind?" },
      { id: "ba-4", kind: "exercise", title: "Schedule it",
        prompt: "When could you do it — even for five minutes? A rough time is plenty. If you'd like, I can gently check in with you after." },
      { id: "ba-5", kind: "reflect", title: "See how it went",
        prompt: "Whenever you've tried it: how did it go? Even a tiny bit counts — we're building momentum, not chasing perfection." },
    ],
  },
  {
    id: "worry-postponement",
    title: "Worry Postponement",
    basis:
      "Stimulus-control / worry-postponement for GAD; internet CBT for GAD shows large effects (d ≈ −0.9, " +
      "face-to-face-equivalent). See docs/NILA_AGENT_RESEARCH_BASIS.md.",
    forConcerns: [
      "worry", "worrying", "worried", "worries", "can't stop thinking", "cant stop thinking", "overthinking",
      "over-thinking", "anxious", "anxiety", "racing thoughts", "mind won't stop", "mind wont stop", "what if",
      "what-ifs", "spiraling", "spiralling", "rumination", "ruminating", "on edge", "can't switch off",
      "cant switch off", "restless mind", "keep going over",
    ],
    steps: [
      { id: "wp-1", kind: "psychoed", title: "How this works",
        prompt: "Worry feels like it's keeping you safe, so it shows up all day long. Worry-postponement gives it a scheduled place instead — and having a set time often loosens its grip on the rest of your day. Want to set it up?" },
      { id: "wp-2", kind: "exercise", title: "Set a worry period",
        prompt: "Pick a daily 15-minute 'worry time' — same time and place each day, and not right before bed. When could that be for you?" },
      { id: "wp-3", kind: "plan", title: "Postpone in the moment",
        prompt: "When a worry pops up during the day, you jot it down and tell it, gently, 'not now — I'll get to you at worry time,' then return to what you were doing. Does that feel doable?" },
      { id: "wp-4", kind: "exercise", title: "Use the worry period",
        prompt: "At worry time, look at your list and let yourself worry on purpose for those 15 minutes. Often the worries feel smaller by then — and some won't feel worth the time at all." },
      { id: "wp-5", kind: "reflect", title: "Notice what shifts",
        prompt: "After a few days: did any worries lose their urgency by the time worry-time came around? What did you notice?" },
    ],
  },
  {
    id: "self-compassion",
    title: "Self-Compassion",
    basis:
      "Self-compassion (CFT / Mindful Self-Compassion) reduces self-criticism and boosts self-compassion in " +
      "clinical + non-clinical samples (meta-analyses of ~20–27 RCTs; evidence real but quality-limited). See " +
      "docs/NILA_AGENT_RESEARCH_BASIS.md.",
    forConcerns: [
      "hate myself", "harsh on myself", "self-critical", "self critical", "inner critic", "beat myself up",
      "beating myself up", "not good enough", "never good enough", "i'm a failure", "im a failure", "ashamed",
      "shame", "so guilty", "self-hatred", "self hatred", "too hard on myself", "i'm useless", "im useless",
      "i suck", "such an idiot", "hate the way i", "disgusted with myself", "let everyone down",
    ],
    steps: [
      { id: "sc-1", kind: "psychoed", title: "How this works",
        prompt: "Self-compassion isn't self-pity or letting yourself off the hook — it's treating yourself with the same kindness you'd give a good friend. It has three parts: kindness instead of harshness, remembering you're not alone in struggling, and holding your feelings with a bit of space. Want to try a little of it together?" },
      { id: "sc-2", kind: "reflect", title: "Hear the critic",
        prompt: "When you're hard on yourself, what does that inner voice actually say? You can tell me its words — we're just noticing it, not agreeing with it." },
      { id: "sc-3", kind: "exercise", title: "The friend reframe",
        prompt: "Here's the shift: if a close friend were in your exact situation, feeling exactly this, what would you say to them? Try saying it — out loud or here." },
      { id: "sc-4", kind: "exercise", title: "A kinder line",
        prompt: "Let's try a self-compassion phrase, in your own words — something like: 'This is a really hard moment. Hard moments are part of being human. Can I be a little gentle with myself right now?' What would yours sound like?" },
      { id: "sc-5", kind: "reflect", title: "Notice what shifts",
        prompt: "How did that land — even slightly? Speaking to yourself the way you'd speak to someone you love takes practice; noticing the difference is the start." },
    ],
  },
];

/**
 * Lightweight formulation-for-routing: match a presenting concern to the best-fit evidence-based protocol.
 * Deterministic lexical scoring over each protocol's `forConcerns` cues (aligned with skillRetrieval). Returns
 * the highest-scoring protocol, or null when nothing clinical is matched — we NEVER force a protocol onto a
 * benign message (that would be the opposite of warm, and the research says only *matched* routing helps).
 */
export function routeToProtocol(concern: string): Protocol | null {
  if (!concern) return null;
  const text = concern.toLowerCase();
  let best: Protocol | null = null;
  let bestScore = 0;
  for (const p of PROTOCOLS) {
    let score = 0;
    for (const cue of p.forConcerns) if (text.includes(cue)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 1 ? best : null;
}

/** Look up a protocol by id (for resuming a program the user is mid-way through). */
export function getProtocol(id: string): Protocol | null {
  return PROTOCOLS.find((p) => p.id === id) ?? null;
}
