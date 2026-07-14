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

import { DBT_SKILLS_TRAINING } from "./protocolDBT";
import { ACT_TRAINING } from "./protocolACT";
import { ASSERTION_TRAINING } from "./protocolAssertion";
import { CBTI_SLEEP } from "./protocolCBTI";
import { SOCIAL_RHYTHM_PROTOCOL } from "./protocolSocialRhythm";

export const PROTOCOLS: Protocol[] = [
  {
    id: "behavioral-activation",
    title: "Behavioral Activation",
    basis:
      "Evidence-based for depression; internet-delivered BA reduces depressive symptoms with g ≈ −0.49 post-" +
      "treatment (apps specifically ≈ −0.39); unguided BA was not significant, and the effect was not sustained " +
      "at 6-month follow-up (Alber et al., 2023; Jia et al., 2025, JMIR). See docs/NILA_AGENT_RESEARCH_BASIS.md.",
    forConcerns: [
      "no energy", "low energy", "no motivation", "pointless", "nothing matters", "what's the point",
      "whats the point", "can't get out of bed", "cant get out of bed", "stopped doing", "don't enjoy",
      "dont enjoy", "no interest", "empty", "numb", "depressed", "depression", "low", "flat", "given up",
      "withdrawn", "isolating", "can't be bothered", "cant be bothered", "stuck in bed", "no joy",
    ],
    steps: [
      { id: "ba-1", kind: "psychoed", title: "How this works",
        prompt: "When we're low, we naturally pull back from things — and less activity means fewer good moments, which quietly pulls us lower. Behavioral activation gently reverses that: we act first, in small ways, and the motivation tends to follow rather than lead. Want to try it together?" },
      // TRAP→TRAC avoidance-pattern step, folded into ba-2 rather than a new step id (protocolProgress.test.ts /
      // activeProtocolContext.test.ts hardcode BA's 5-step sequencing) — Jacobson, Martell & Dimidjian (2001),
      // Depression in Context: naming the Trigger→Response→Avoidance-Pattern and choosing an Alternative Coping
      // response instead is a defining, named BA component.
      { id: "ba-2", kind: "reflect", title: "Notice the pattern",
        prompt: "No pressure — just curious: what's something you used to do, or enjoy, that you've been doing less of lately? Often there's a TRAP underneath: a Trigger (what set off the low feeling), a Response (the urge to avoid), and the Avoidance itself — which feels like relief but quietly keeps the low feeling going. The way out is TRAC: same Trigger and Response, but an Alternative Coping move instead of avoiding. What's the avoidance move you tend to make?" },
      { id: "ba-3", kind: "plan", title: "Pick something small",
        prompt: "Let's choose ONE small thing that used to matter or feel a little good — small enough that it's almost easy. What comes to mind?" },
      // If-then implementation intentions (Gollwitzer & Sheeran, 2006, Adv Exp Soc Psychol: d=0.65 general,
      // d+=0.99 in mental-health samples) + a one-line barrier plan — the cheapest evidence-backed win available.
      { id: "ba-4", kind: "exercise", title: "Schedule it",
        prompt: "Let's make it concrete — that's what makes plans actually happen. Try filling in: 'If [a time or place], then I will [the tiny action].' When could that be for you? And one more thing that helps: what might get in the way — and if it does, what's your backup move? If you'd like, I can gently check in with you after." },
      { id: "ba-5", kind: "reflect", title: "See how it went",
        prompt: "Whenever you've tried it: how did it go? Even a tiny bit counts — we're building momentum, not chasing perfection." },
    ],
  },
  {
    id: "worry-postponement",
    title: "Worry Postponement",
    basis:
      "Stimulus-control / worry-postponement, the specific isolated technique (not a full guided iCBT package): " +
      "meta-analytic effects are small, d ≈ 0.19–0.31 (Richards, Richardson, Timulak & McElvaney, 2015, Internet " +
      "Interventions; Dippel, Brosschot & Verkuil, 2024, Int'l J of Cognitive Therapy). See " +
      "docs/NILA_AGENT_RESEARCH_BASIS.md.",
    forConcerns: [
      "worry", "worrying", "worried", "worries", "can't stop thinking", "cant stop thinking", "overthinking",
      "over-thinking", "anxious", "anxiety", "racing thoughts", "mind won't stop", "mind wont stop", "what if",
      "what-ifs", "spiraling", "spiralling", "rumination", "ruminating", "on edge", "can't switch off",
      "cant switch off", "restless mind", "keep going over",
    ],
    steps: [
      // Real/solvable-vs-hypothetical-worry triage folded into wp-1 rather than a new step id
      // (activeProtocolContext.test.ts hardcodes worry-postponement's 5-step sequencing, incl. wp-2 as
      // literally the 2nd step) — Borkovec, Wilkinson, Folensbee & Lerman (1983): this triage is a
      // load-bearing part of the original, tested protocol, not an optional add-on.
      { id: "wp-1", kind: "psychoed", title: "How this works",
        prompt: "Worry feels like it's keeping you safe, so it shows up all day long. One quick check first: is this worry about something real and solvable right now — a decision you can actually act on? If so, tackling it directly (a quick problem-solving pass) often helps more than postponing it. But if it's the hypothetical, 'what if' kind — something you can't control or that hasn't happened — worry-postponement gives it a scheduled place instead, and having a set time often loosens its grip on the rest of your day. Want to set it up?" },
      { id: "wp-2", kind: "exercise", title: "Set a worry period",
        prompt: "Pick a daily 15-minute 'worry time' — same time and place each day, and not right before bed. When could that be for you?" },
      // Reframed as a metacognitive behavioral experiment (Krzikalla et al., 2024, Clinical Psychology in
      // Europe: d=0.82 for worry, larger than pure stimulus-control framing) rather than plain stimulus control.
      { id: "wp-3", kind: "plan", title: "Postpone in the moment",
        prompt: "Here's the shift: postponing isn't just delaying — it's a live test of the belief 'I can't control when I worry.' When a worry pops up during the day, jot it down and tell it, gently, 'not now — I'll get to you at worry time,' then return to what you were doing. Each time the worry actually waits, that's evidence against 'I can't control this worry.' Does that feel doable?" },
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
  {
    id: "sleep-wind-down",
    title: "Sleep Wind-Down",
    basis:
      "CBT-I is the first-line, guideline-recommended treatment for chronic insomnia, with durable effects. This " +
      "is its POPULATION-SAFE subset — stimulus control, a consistent wake-time, and a wind-down buffer. It " +
      "deliberately EXCLUDES sleep restriction: acute sleep loss is a documented mania trigger and this app's " +
      "population includes bipolar, so Nila never tells anyone to sleep less.",
    forConcerns: [
      "can't sleep", "cant sleep", "can't fall asleep", "cant fall asleep", "can't stay asleep", "cant stay asleep",
      "can't get to sleep", "cant get to sleep", "insomnia", "lie awake", "lying awake", "wide awake",
      "toss and turn", "tossing and turning", "no sleep", "not sleeping", "sleepless", "up all night",
      "wake up at night", "waking up at night", "trouble sleeping", "can't sleep at night", "cant sleep at night",
      "mind races at night", "racing mind at night", "keep waking up", "3am", "middle of the night",
    ],
    steps: [
      { id: "sw-1", kind: "psychoed", title: "How this works",
        prompt: "When sleep won't come, the harder we try, the more wired we get — and the bed slowly turns into a place we associate with lying awake. This gentle routine does the opposite: it rebuilds bed = sleep, and lets sleep arrive on its own instead of being chased. Want to set it up together? (We won't cut your sleep — just help it settle.)" },
      { id: "sw-2", kind: "plan", title: "Anchor your morning",
        prompt: "The most powerful lever is a steady WAKE-UP time — same time every day, even after a rough night. It quietly resets your body clock. What wake-up time could you keep, most days?" },
      { id: "sw-3", kind: "exercise", title: "A wind-down buffer",
        prompt: "Give yourself a 30–60 minute buffer before bed: lights low, screens down, something calm — a warm shower, a few pages, slow breathing. It's a runway, not a switch. What could your wind-down look like tonight?" },
      { id: "sw-4", kind: "exercise", title: "If sleep won't come",
        prompt: "If you're still awake after around 20 minutes and getting frustrated, don't lie there fighting it — get up, keep the lights dim, do something quiet and boring, and go back only when you feel sleepy. It feels backwards, but it's how the bed relearns sleep. Does that feel doable?" },
      { id: "sw-5", kind: "exercise", title: "Park the day",
        prompt: "If your mind races the moment your head hits the pillow, park it BEFORE bed: jot tomorrow's worries and to-dos on paper, so your brain knows they're held and doesn't have to keep rehearsing them. Want to try a two-minute brain-dump tonight?" },
    ],
  },
  {
    id: "social-confidence",
    title: "Social Confidence",
    basis:
      "Cognitive-behavioural models of social anxiety (Clark & Wells, 1995; Rapee & Heimberg, 1997) show the core trap is 'self-focused attention + assumed negative evaluation.' " +
      "Brief CBT protocols reduce social anxiety symptoms with moderate-to-large effects.",
    forConcerns: [
      "social anxiety", "social anxious", "shy", "shyness", "people judge me", "judged", "embarrassing", "embarrassed",
      "avoid people", "avoid social", "avoid parties", "avoid meetings", "nervous around people", "anxious around people",
      "what will they think", "think of me", "making a fool", "look stupid", "talk to people", "speaking up",
    ],
    steps: [
      { id: "soca-1", kind: "psychoed", title: "How social anxiety works",
        prompt: "Social anxiety often comes from a loud inner guess that other people are judging us negatively — and then we watch ourselves through that lens. The irony is that other people are usually far less focused on us than we fear. Want to look at this together?" },
      { id: "soca-2", kind: "reflect", title: "Spot the inner prediction",
        prompt: "When you think about a social situation, what do you imagine other people will think? Say it in one sentence — we're not agreeing with it, just naming it." },
      { id: "soca-3", kind: "reflect", title: "Shift attention outward",
        prompt: "One small move that helps is gently turning attention outward — to what you can see, hear, or ask — rather than monitoring yourself. In your next interaction, what's one tiny thing you could notice about the other person or the room?" },
      { id: "soca-4", kind: "plan", title: "Pick a small experiment",
        prompt: "Let's choose one small, low-stakes social step — small enough that it's almost doable even with the anxiety. What comes to mind?" },
      { id: "soca-5", kind: "reflect", title: "Check the prediction",
        prompt: "After you try it: what actually happened? Often the feared outcome doesn't show up, or if it does, we handle it. What did you notice?" },
    ],
  },
  {
    id: "panic-skills",
    title: "Panic Skills",
    basis:
      "Panic-specific CBT, including interoceptive exposure and cognitive re-interpretation of body sensations, has large effect sizes and durable results (Clark, 1986; Craske et al., 2014). " +
      "The key shift is interpreting alarm sensations as uncomfortable but not dangerous.",
    forConcerns: [
      "panic", "panic attack", "panicking", "heart racing", "racing heart", "can't breathe", "cant breathe",
      "breathless", "chest tight", "tight chest", "feels like i'm dying", "going to die", "unreal", "derealization",
      "losing control", "out of control", "overwhelming fear", "sudden terror", "adrenaline", "can't catch breath",
    ],
    steps: [
      { id: "pa-1", kind: "psychoed", title: "What panic is",
        prompt: "Panic is the body's alarm system firing hard — it feels dangerous, but it's not harmful. The peak usually passes in a few minutes. Naming it ('this is panic') can take some of its power away. Does that fit with what you've felt?" },
      { id: "pa-2", kind: "exercise", title: "Slow the exhale",
        prompt: "A longer out-breath gently tells the alarm it can stand down. Try breathing in for 4 and out for 6 — not forcing it, just leaning into the exhale. How does that feel after a few rounds?" },
      { id: "pa-3", kind: "reflect", title: "Name the feared catastrophe",
        prompt: "In a panic moment, what is your mind afraid is about to happen? ('I'll collapse,' 'I'll go crazy,' 'I'll die.') Say it out — we're going to hold it lightly." },
      { id: "pa-4", kind: "exercise", title: "Invite the sensation",
        prompt: "This sounds backwards: instead of fighting the racing heart or dizziness, try allowing it to be there for 30 seconds. Fighting the alarm keeps it loud; allowing it lets it pass. Are you willing to try that next time?" },
      { id: "pa-5", kind: "reflect", title: "Notice the drop",
        prompt: "After the wave passes: how long did it actually last? What did you do that helped, even a little? We're building a map of what works for you." },
    ],
  },
  {
    id: "cooling-anger",
    title: "Cooling Anger",
    basis:
      "Anger regulation interventions draw on cognitive-behavioural and dialectical-behavioural approaches (Deffenbacher, 1996; Linehan, DBT). " +
      "They focus on early warning signs, slowing the escalation, and choosing a response aligned with values rather than impulse.",
    forConcerns: [
      "angry", "anger", "rage", "furious", "snapping", "irritable", "irritated", "short fuse", "lose my temper",
      "blow up", "explode", "pissed off", "resentful", "frustrated", "can't stand them", "want to yell",
      "so mad", "seeing red", "agitated", "provoked",
    ],
    steps: [
      { id: "ag-1", kind: "psychoed", title: "Anger as a signal",
        prompt: "Anger is usually a signal that something matters to us — a boundary, a value, a need. The trouble is when the heat drives the response. We can learn to feel the signal and still choose the next move. Sound useful?" },
      { id: "ag-2", kind: "reflect", title: "Find the early warning",
        prompt: "Before you snap, what shows up first? Tight jaw, raised voice, fast breathing, clenched fists, a hot thought? Noticing earlier gives you more choice." },
      // Anti-rumination + reappraisal micro-step: rumination is the strongest anger amplifier (r=0.42) and
      // venting/ruminative time-outs increase anger and aggression, while reappraisal is the best-performing
      // in-the-moment anger strategy — Pop, Nechita, Miu & Szentágotai-Tătar (2025), Scientific Reports;
      // Szasz, Szentagotai & Hofmann (2011), Behaviour Research and Therapy.
      { id: "ag-3", kind: "exercise", title: "Cool the body first",
        prompt: "The body escalates before the words do. Try one cooling move: a slow exhale, cold water on wrists, or stepping away for 60 seconds — but stepping away only helps if you're cooling down, not replaying the moment in your head, which actually feeds the anger. While you cool down, try one reappraisal: is there another way to see what just happened — could there be a reason behind it that isn't about attacking you? Which cooling move feels doable right now?" },
      { id: "ag-4", kind: "reflect", title: "What do you actually want here?",
        prompt: "Under the anger, what's the outcome you actually want? To be heard? To protect someone? To be fair? Naming it helps pick a response that gets you closer instead of further away." },
      { id: "ag-5", kind: "plan", title: "Choose the next sentence",
        prompt: "If a similar moment comes again, what's one sentence you could say that matches what you want — instead of what the heat wants you to say? Keep it short and real." },
    ],
  },
  {
    id: "grounding-anchor",
    title: "Grounding & Anchor",
    basis:
      "Grounding techniques are a core component of trauma-focused CBT and DBT. They reduce dissociation and flashback intensity by orienting attention to the present moment (Najavits, 2002; Linehan, 1993). " +
      "They are a coping skill, not a standalone trauma treatment.",
    forConcerns: [
      "flashback", "flashbacks", "nightmare", "nightmares", "dissociated", "dissociation", "feel unreal", "not real",
      "far away", "zoned out", "numb and distant", "triggered", "back there", "reliving", "frozen", "shut down",
      "overwhelmed and frozen", "can't ground", "ground me", "anchor", "bring me back",
    ],
    steps: [
      { id: "gr-1", kind: "psychoed", title: "Grounding as a reset",
        prompt: "When the past barges in or things feel unreal, grounding is a way to remind the nervous system: right now, in this moment, you are here. It doesn't erase what happened; it just brings you back to now. Want to try it?" },
      { id: "gr-2", kind: "exercise", title: "5-4-3-2-1 senses",
        prompt: "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. Take your time. This isn't a distraction — it's an anchor to the present. How did that land?" },
      { id: "gr-3", kind: "exercise", title: "Find one anchor object",
        prompt: "Pick something near you — a stone, a key, fabric — and focus on its texture, weight, temperature. Let it be a physical reminder: 'I am here, right now.' What did you choose?" },
      { id: "gr-4", kind: "plan", title: "Make a grounding plan",
        prompt: "When you feel yourself drifting, what's the first grounding step you'll take? A breath? A touch? A phrase? Write it down so you don't have to decide in the moment." },
      { id: "gr-5", kind: "reflect", title: "Notice the shift",
        prompt: "After grounding: did anything shift, even slightly? More here? Less flooded? There's no wrong answer — noticing is the skill." },
    ],
  },
  {
    id: "sleep-rhythm",
    title: "Sleep Rhythm",
    basis:
      "Circadian rhythm disruption is a well-documented precursor to mood episodes in bipolar spectrum conditions (Harvey, 2008; Gold & Bunney, 2018). " +
      "Stabilising sleep-wake timing — without sleep restriction — is a core target of Interpersonal and Social Rhythm Therapy (IPSRT) and CBT-I.",
    forConcerns: [
      "sleep schedule", "irregular sleep", "sleep rhythm", "wake up at different times", "cant wake up same time",
      "can't wake up same time", "circadian", "sleep pattern", "sleep all over the place", "staying up late",
      "sleep timing", "bedtime varies", "wake time varies", "no sleep routine",
    ],
    steps: [
      { id: "sr-1", kind: "psychoed", title: "Why rhythm matters",
        prompt: "Sleep isn't just about hours — it's also about timing. A body clock that shifts a lot from day to day can leave us more vulnerable to mood shifts. The good news: small regularity changes help, and we won't cut your sleep to do it." },
      { id: "sr-2", kind: "plan", title: "Anchor one wake-up time",
        prompt: "The strongest anchor is the same wake-up time every day — yes, even after a rough night. What wake-up time feels realistic most days?" },
      { id: "sr-3", kind: "plan", title: "Get morning light",
        prompt: "Light soon after waking tells your brain it's day-time. Even a few minutes outside or near a bright window counts. Where could you get morning light after you wake?" },
      { id: "sr-4", kind: "plan", title: "Wind-down buffer",
        prompt: "A simple 30–60 minute wind-down — dim lights, quiet activity, one less scroll — helps the clock settle. What would a calm pre-bed routine look like for you?" },
      { id: "sr-5", kind: "reflect", title: "Notice the rhythm",
        prompt: "After a few days of anchoring wake-time and light: has anything shifted? Not forcing perfect sleep — just noticing whether your days feel a little steadier." },
    ],
  },
  {
    id: "social-connection",
    title: "Social Connection",
    basis:
      "Loneliness and perceived social isolation are associated with worse mood outcomes and slower recovery. " +
      "Brief, values-based social micro-actions — even low-stakes ones — can increase belonging without overwhelming introversion or social anxiety (Cacioppo & Cacioppo, 2018; Martino & Freda, 2016).",
    forConcerns: [
      "lonely", "loneliness", "alone", "isolated", "nobody understands", "no one understands", "no one cares",
      "i have no one", "i feel disconnected", "missing people", "miss my friends", "not talked to anyone",
      "isolation", "no social contact", "no one to talk to", "feeling cut off",
    ],
    steps: [
      { id: "soc-1", kind: "psychoed", title: "Connection isn't all-or-nothing",
        prompt: "Loneliness often lies to us: 'No one cares' or 'It's too much effort.' The antidote usually isn't a big confession — it's one tiny, low-stakes moment of contact." },
      { id: "soc-2", kind: "plan", title: "Pick a tiny bridge",
        prompt: "Think of one person or place where contact feels *least* effortful: a text, a voice note, a brief hello to a neighbour or shopkeeper. What's the smallest bridge you could cross today?" },
      { id: "soc-3", kind: "plan", title: "Ground it in a value",
        prompt: "Connection lands better when tied to something you care about — sharing a song, asking about someone's day, offering help. Which value could shape this small reach?" },
      { id: "soc-4", kind: "plan", title: "Try the micro-action",
        prompt: "You don't have to do it perfectly or get a warm reply. The win is choosing to reach out. If you feel ready, send that message or start that brief chat now." },
      { id: "soc-5", kind: "reflect", title: "Notice the residue",
        prompt: "After the micro-action, however it went: what was that like? Scary? Relief? Mixed? Noticing is part of rebuilding trust in connection." },
    ],
  },
  {
    id: "gratitude",
    title: "Gratitude Practice",
    basis:
      "Gratitude journaling and active appreciation exercises consistently improve subjective wellbeing " +
      "with moderate effect sizes (Emmons & McCullough, 2003; Wood et al., 2010). The key mechanism is " +
      "shifting attentional bias away from negative information, not toxic positivity — genuine noticing, not forced cheerfulness.",
    forConcerns: [
      "gratitude", "grateful", "good things", "notice the good", "only see the bad", "negative lens",
      "focus on bad", "what went well", "positive focus", "silver lining", "blessing", "blessed",
      "thankful", "appreciate", "appreciation", "counting blessings", "what I'm grateful for",
    ],
    steps: [
      { id: "gt-1", kind: "psychoed", title: "Why gratitude helps",
        prompt: "Gratitude isn't about pretending everything's fine. It's about training your brain to notice what's also here — a small kindness, a warm cup, a moment of quiet. Even one genuine notice per day shifts the lens. Want to try it together?" },
      { id: "gt-2", kind: "reflect", title: "Find one small thing",
        prompt: "Right now, in this moment — what's one thing you can genuinely appreciate? It doesn't need to be big. A roof, a text from someone, your favourite song. Just name it for yourself." },
      { id: "gt-3", kind: "plan", title: "Three good things tonight",
        prompt: "Before bed, can you try the 'three good things' exercise? Think of three things that went even slightly well today — and for each, notice why it happened or what your role was in it. Want to give it a go?" },
      { id: "gt-4", kind: "plan", title: "A gratitude letter (unsent)",
        prompt: "Think of someone you're grateful to — not someone you need to impress. Write a short note to them in your mind or on paper. You don't have to send it. The effect is in the writing." },
      { id: "gt-5", kind: "reflect", title: "Notice the shift",
        prompt: "After a few days of noticing small positives: has anything softened? Not forcing happiness — just noticing whether a little more light gets through." },
    ],
  },
  {
    // Micro-protocol (3 steps) — deliberately short, matching the "micro-action" evidence unit for ACT
    // values work (single values-congruent behaviours, not grand life-purpose goals).
    id: "values-action",
    title: "Values-Based Action",
    basis:
      "ACT (Acceptance & Commitment Therapy) treats clarification + pursuit of personal values as a core " +
      "change process: a meta-analysis of 39 ACT studies (Levin, Hildebrandt, Lillis & Hayes, 2012, " +
      "Behaviour Research and Therapy) found values-based action a key mediator of outcomes, and Dahl, Plumb, " +
      "Stewart & Lundgren (2009, ACBS) show clarifying and acting on values reduces experiential avoidance. " +
      "The evidence unit is the small, concrete value-congruent action — not a sweeping life-purpose goal.",
    forConcerns: [
      "lost my purpose", "no purpose", "sense of purpose", "what matters to me", "don't know what i care about",
      "dont know what i care about", "feel directionless", "no direction", "adrift", "hollow", "void inside",
      "meaningless", "unfulfilled", "what do i value", "my values", "nothing feels worth it", "why bother anymore",
      "what's worth doing", "whats worth doing", "empty inside", "no sense of meaning",
    ],
    steps: [
      { id: "vba-1", kind: "psychoed", title: "Values, not purpose",
        prompt: "Sometimes the hard part isn't energy — it's that nothing feels like it matters. In ACT, 'values' are the things you'd quietly care about even on an off day: kindness, making something, being there for someone, honesty. We're not chasing one big life-purpose — just one small thing that's genuinely you. Want to find one?" },
      { id: "vba-2", kind: "reflect", title: "Name a quiet value",
        prompt: "If you set the 'shoulds' aside for a second: what's one thing you've always quietly cared about — maybe helping, creating, being dependable, learning? You don't have to explain it. Just name it." },
      { id: "vba-3", kind: "plan", title: "One tiny value-action",
        prompt: "Pick the smallest action that fits that value — small enough it's almost easy: a message to someone you care about, five minutes on something you make, one honest thing said. What's the smallest version you could do today?" },
    ],
  },
  {
    id: "intolerance-of-uncertainty",
    title: "Making Peace with Uncertainty",
    basis:
      "Self-guided single-session 'Uncertainty-Mindset Training' (N=259 RCT vs. psychoeducation + no-training " +
      "controls): IU d=1.28 immediate post-training, d=0.86 at 1-month; anxiety (GAD-7) d=0.50 at 1-month; " +
      "depression (PHQ-8) d=0.60 at 1-month; IU reduction partially mediates the gains. Built on Schleider et " +
      "al.'s (2020) BEST framework and Yeager et al.'s (2022, Nature) synergistic-mindsets model. No " +
      "functional-impairment advantage over controls — a known single-session-intervention limitation, flagged " +
      "honestly. (Daniels, Hasan & Schweizer, 2025, Psychological Medicine 55, e377.) Classic intolerance-of-" +
      "uncertainty theory traces to Freeston et al. (1994), Ladouceur, Gosselin & Dugas (2000), Buhr & Dugas " +
      "(2002), and Dugas et al. (2005) — this module is the single-session mindset-training design, not a " +
      "compression of the 12-session Dugas et al. (2022) behavioral-experiments protocol, which is unrelated. " +
      "See docs/superpowers/plans/2026-07-12-wave3-technical-specs.md §2.",
    forConcerns: [
      "uncertain", "uncertainty", "don't know what's going to happen", "dont know what's going to happen",
      "hate not knowing", "can't stand not knowing", "cant stand not knowing", "no control over what happens",
      "everything feels uncertain", "future is uncertain", "unpredictable", "unknown", "ambiguous", "ambiguity",
      "need certainty", "what if it goes wrong", "fear of the unknown",
    ],
    steps: [
      { id: "iu-1", kind: "psychoed", title: "How this works",
        prompt: "This is a single sitting, about 15 minutes — no daily practice, no return visit needed. We're going to look at how you relate to uncertainty, because that relationship is learnable, not fixed — the way your mind handles not-knowing can genuinely shift, even in one conversation. Want to give it a try?" },
      { id: "iu-2", kind: "psychoed", title: "Uncertainty isn't the threat it feels like",
        prompt: "Uncertainty often gets treated like a warning sign — something dangerous that needs resolving right now. But most uncertainty is just the normal cost of anything new or meaningful: a relationship, a decision, a future you actually care about. People who've learned to hold uncertainty a little more loosely often find that it stops running the show, even though nothing about the situation itself changed. Does that distinction land for you at all?" },
      { id: "iu-3", kind: "reflect", title: "Your own evidence",
        prompt: "Think of a real time uncertainty led somewhere okay, or even somewhere good — a time you didn't know how something would turn out, and it turned out fine, or you handled it. What happened? And if a friend were facing that same kind of not-knowing today, what would you tell them?" },
      { id: "iu-4", kind: "psychoed", title: "Tolerance is a skill, not a trait",
        prompt: "Here's the other piece: your capacity to sit with uncertainty isn't fixed at some level you're stuck with — it's more like a muscle. It strengthens each time you practice staying present with not-knowing instead of rushing to resolve it. That's true even if right now it feels weak or untested." },
      // STAR acronym sourced from a press release quoting the study authors, not the peer-reviewed manuscript
      // text itself (per spec doc §2 iu-5) — verify literal wording against OSF supplementary materials
      // (https://osf.io/fztqr) before treating as verbatim. The underlying repetitive-negative-thinking
      // cessation rationale is solid regardless of the mnemonic's exact wording (Buhr & Dugas, 2002;
      // Ladouceur, Gosselin & Dugas, 2000; Dar, Iqbal & Mushtaq, 2017).
      { id: "iu-5", kind: "exercise", title: "Learn STAR",
        prompt: "Here's a small tool for when the spiral starts — STAR: STop (notice the spiral has started), Accept (let the uncertainty be there without fighting it), Re-think (swap the catastrophic 'what if' for a next thought you can actually work with). It's four small moves, not a fix — just a way to interrupt the loop. Want to walk through what each part might look like for you?" },
      { id: "iu-6", kind: "exercise", title: "Try STAR on something real",
        prompt: "Let's use it on something live rather than hypothetical — what's one uncertainty that's actually on your mind right now? Let's walk it through Stop, Accept, Re-think together, step by step." },
      { id: "iu-7", kind: "plan", title: "One line to carry with you",
        prompt: "Before we close — no follow-up, no homework, just this: if you had to compress what shifted for you today into one line you could carry with you, what would it be? That's the whole toolkit. Nothing else to schedule." },
    ],
  },
  DBT_SKILLS_TRAINING,
  ACT_TRAINING,
  ASSERTION_TRAINING,
  CBTI_SLEEP,
  SOCIAL_RHYTHM_PROTOCOL,
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
