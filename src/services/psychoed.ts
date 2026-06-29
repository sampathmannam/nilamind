// On-device psychoeducation library — pure, deterministic content + lexical search. No model, no network,
// no persistence. Educational/invitation-framed, NEVER medical/diagnostic (see the §9 section of the
// Psychoed spec). The search box is §9-gated via checkPsychoedQuery; nothing here is ever persisted.
import { scanForCrisis } from "../safety";

export interface PsychoedTopic {
  id: string;
  title: string;
  summary: string;
  body: string;
  basis: string;
  tags: string[];
  /** When present, rendered ALWAYS-VISIBLE + FIRST on the card (never behind the expand toggle). */
  emergencyCaveat?: string;
}

// Shared, reused by every topic that reassures about PHYSICAL sensations, so a reader in an actual
// medical emergency is pointed to emergency care before any "this tends to pass" reassurance.
export const EMERGENCY_CAVEAT =
  "If you have chest pain, trouble breathing, or symptoms that feel new or different for you, treat it as a medical emergency and call your local emergency number — this page isn't for that.";

// 10 bite-sized, research-cited explainers. Invitation-framed ("many people find…"), plain language.
// Citations are real and correctly attributed (see spec; verified in the 3-critic review).
export const PSYCHOED_TOPICS: PsychoedTopic[] = [
  {
    id: "anxiety-alarm",
    title: "Why anxiety shows up in the body",
    summary:
      "A racing heart, tight chest or churning stomach are, for many people, the body's alarm system switching on — not a sign that something is wrong with them.",
    body:
      "When the brain senses a possible threat — even an uncertain one, like a worry — it can trigger the body's old fight-or-flight response: heart faster, breathing quicker, muscles tense, ready to act. Many people find it eases the fear to know these sensations are the alarm doing its job, rather than evidence of danger. The feelings are real and uncomfortable, and they tend to settle as the alarm winds down.",
    basis: "Barlow (false-alarm model of anxiety); Beck (cognitive model of anxiety).",
    tags: ["anxiety", "anxious", "body", "racing heart", "tight chest", "fight or flight", "nervous", "tense", "worried"],
    emergencyCaveat: EMERGENCY_CAVEAT,
  },
  {
    id: "panic-passes",
    title: "Panic feels terrifying — and it passes",
    summary: "Many people find that a wave of panic, however frightening, tends to peak within minutes and then ease.",
    body:
      "Panic can feel like something catastrophic is happening — a pounding heart, breathlessness, a sense of unreality. One way to understand it is that the body misreads its own alarm signals as danger, which winds the alarm up further. Many people find that quietly naming it ('this is panic — it tends to peak and pass') takes some of its grip away. It is exhausting and horrible — and it does subside.",
    basis: "Clark 1986, cognitive model of panic (catastrophic misreading of body sensations).",
    tags: ["panic", "panic attack", "heart racing", "can't breathe", "breathless", "terrified", "unreal", "scared"],
    emergencyCaveat: EMERGENCY_CAVEAT,
  },
  {
    id: "rumination-loop",
    title: "Why the mind loops on the past",
    summary:
      "Going over and over what happened can feel like sorting it out, but for many people it keeps the low mood turning rather than resolving anything.",
    body:
      "Replaying a mistake or a hurt can feel productive — as if enough thinking will finally fix it. In practice this kind of looping (rumination) tends to deepen low mood and rarely reaches an answer. Many people find it helps to notice 'I'm replaying again,' and gently move attention to something present and concrete — not to force the thoughts away, but to stop feeding the loop.",
    basis: "Nolen-Hoeksema (Response Styles Theory); Watkins (rumination as a learned habit).",
    tags: ["rumination", "ruminating", "overthinking", "overthink", "can't stop replaying", "replaying", "going over", "stuck in my head", "dwelling", "past", "stop"],
  },
  {
    id: "depression-action",
    title: "Why low mood drains motivation",
    summary:
      "Waiting to feel motivated before doing anything can keep low mood going; for many people, small actions come first and the motivation follows.",
    body:
      "Low mood often whispers 'do it once you feel up to it' — but that feeling may not arrive on its own. Many people find that taking one small, doable action first (a short walk, a single dish washed, a text sent) lifts mood a little, which makes the next action easier. It isn't about forcing positivity; it's that doing can gently prime feeling, rather than the other way around.",
    basis: "Behavioral activation — Martell, Addis & Jacobson; Dimidjian et al. (trial); building on Lewinsohn's reinforcement work.",
    tags: ["depression", "depressed", "low mood", "no motivation", "unmotivated", "can't get going", "stuck", "tired", "exhausted", "behavioral activation"],
  },
  {
    id: "window-of-tolerance",
    title: "Your window of tolerance",
    summary:
      "There's a zone where feelings are strong but still manageable; outside it, many people tip into overwhelm or into feeling shut down and numb.",
    body:
      "Inside the window, you can feel a lot and still think clearly. Pushed too far one way, the system can flip into overwhelm (panicky, flooded, can't settle); too far the other way, into shut-down (numb, flat, far away). Many people find that gentle, steadying things — slow breathing, grounding, movement, connection — widen the window over time, so more of life fits inside it.",
    basis: "Siegel (window of tolerance); hyper/hypo-arousal zones elaborated by Ogden & Minton (Sensorimotor Psychotherapy).",
    tags: ["overwhelm", "overwhelmed", "shut down", "numb", "flat", "too much", "flooded", "arousal", "window of tolerance", "dissociated"],
  },
  {
    id: "avoidance-grows-fear",
    title: "Why avoiding makes fear bigger",
    summary:
      "Stepping away from something frightening brings quick relief — and for many people that relief quietly trains the habit of avoiding it next time.",
    body:
      "Avoiding a feared thing works in the moment: the anxiety drops, which can feel like proof that avoiding was right. The catch is that it also takes away the chance to discover the thing is more manageable than predicted. Many people find that approaching it — gradually, while still anxious — lets a new expectation form: 'that went differently than I feared.' The aim isn't to feel calm first, but to learn by doing.",
    basis: "Craske et al., inhibitory-learning model of exposure (expectancy violation).",
    tags: ["avoidance", "avoiding", "avoid", "scared", "afraid", "fear", "facing fears", "exposure", "escape", "procrastinating", "anxiety"],
  },
  {
    id: "sleep-and-mood",
    title: "Sleep and mood lean on each other",
    summary:
      "Poor sleep can pull mood down, and low or anxious mood can disturb sleep; for many people, small changes to the routine help both.",
    body:
      "Sleep and mood run on a two-way street: a rough night can make the next day heavier, and a heavy day can make sleep harder — which is how a tough patch can snowball. Many people find that gentle, consistent habits help more than trying harder to sleep: a steady wake-time, winding down beforehand, and keeping the bed mainly for sleep. (The app's Wind-down tool walks through a calm version of this.)",
    basis: "Bootzin (stimulus control); Spielman (3P / sleep-restriction model); Harvey (bidirectional sleep–mood links).",
    tags: ["sleep", "insomnia", "can't sleep", "cant sleep", "sleepless", "tired", "exhausted", "mood", "bedtime", "wind down", "awake"],
  },
  {
    id: "self-criticism-threat",
    title: "Why being hard on yourself backfires",
    summary:
      "Harsh self-criticism tends to keep the body's threat system switched on; for many people, a warmer inner voice helps the system settle.",
    body:
      "When you attack yourself for struggling, the body can respond as if it's under threat — tense, braced, defensive — because the brain doesn't fully separate an inner critic from an outer one. That keeps distress high and rarely motivates the way we hope. Many people find that speaking to themselves as they would to a friend they care about — honest but kind — helps the soothing system come online, which makes change easier, not harder.",
    basis: "Gilbert, Compassion-Focused Therapy (threat / drive / soothing systems).",
    tags: ["self-criticism", "self critical", "self-critical", "harsh", "shame", "ashamed", "inner critic", "self-compassion", "hard on myself", "beat myself up", "guilt"],
  },
  {
    id: "emotions-as-signals",
    title: "Emotions are signals, not facts",
    summary:
      "An emotion carries information about what matters to you — without being a command you must obey or a fact you must believe.",
    body:
      "Feelings are messengers: fear flags possible threat, anger flags a crossed line, sadness flags a loss. That information is worth listening to — and it isn't always accurate to the situation, the way a smoke alarm can go off over toast. Many people find it steadying to ask, 'What is this feeling pointing at — and do the facts here match it?' You can take the message seriously without taking it as the final word.",
    basis: "Linehan, DBT (emotions as information; 'check the facts').",
    tags: ["emotions", "emotion", "feelings", "emotional", "signals", "anger", "sadness", "fear", "mood", "dbt"],
  },
  {
    id: "values-vs-goals",
    title: "Values point a direction",
    summary:
      "Goals are places you arrive at; values are the direction you keep choosing — and many people find 'what matters' steadier to lean on than 'what's wrong.'",
    body:
      "A goal can be reached or missed (run the race, get the job). A value is more like a compass heading — 'being caring,' 'being honest,' 'keep learning' — something you can move toward today, in small ways, whatever your mood. Many people find that when motivation is low, asking 'what kind of person do I want to be in this next hour?' gives a gentler, more reliable pull than chasing a distant goal or fixing every problem first.",
    basis: "Hayes, Acceptance & Commitment Therapy (values as chosen life directions).",
    tags: ["values", "meaning", "direction", "purpose", "what matters", "motivation", "goals", "acceptance", "act", "lost"],
  },
];

// ── Lexical search (mirrors the S3 skillRetrieval idiom; body is indexed at weight 1 for recall) ──
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "am", "was", "were", "of", "to", "for", "and", "or", "but",
  "in", "on", "at", "it", "i", "im", "my", "me", "we", "you", "your", "so", "that", "this",
  "with", "just", "really", "feel", "feeling", "do", "does", "why", "how", "what",
]);

function tokenize(text: string): string[] {
  const matches: string[] = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return matches.filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

const FIELD_WEIGHTS: Array<{ get: (t: PsychoedTopic) => string; w: number }> = [
  { get: (t) => t.title, w: 4 },
  { get: (t) => t.summary, w: 2 },
  { get: (t) => t.tags.join(" "), w: 2 },
  { get: (t) => t.body, w: 1 },
];

const INDEX: Array<{ topic: PsychoedTopic; weights: Map<string, number> }> = PSYCHOED_TOPICS.map((topic) => {
  const weights = new Map<string, number>();
  for (const f of FIELD_WEIGHTS) {
    for (const t of tokenize(f.get(topic))) {
      weights.set(t, Math.max(weights.get(t) ?? 0, f.w)); // a term counts once, at its highest-weight field
    }
  }
  return { topic, weights };
});

/**
 * Rank the corpus by lexical relevance to a free-text query. Empty/blank query → the full corpus in
 * order (browse mode). A specific query drops zero-score (irrelevant) topics. Deterministic, offline.
 */
export function searchPsychoed(query: string): PsychoedTopic[] {
  if (!query.trim()) return [...PSYCHOED_TOPICS];
  const terms = new Set(tokenize(query));
  if (terms.size === 0) return [...PSYCHOED_TOPICS];
  const scored: Array<{ topic: PsychoedTopic; score: number }> = [];
  for (const { topic, weights } of INDEX) {
    let score = 0;
    for (const t of terms) score += weights.get(t) ?? 0;
    if (score >= 1) scored.push({ topic, score });
  }
  scored.sort((a, b) => b.score - a.score); // stable → equal scores keep corpus order
  return scored.map((s) => s.topic);
}

/** Deterministic §9 gate for the Understand search box — wraps scanForCrisis. The screen surfaces crisis
 *  help on `true` BEFORE any lexical search, and never persists the text. scanForCrisis is untouched. */
export function checkPsychoedQuery(text: string): boolean {
  return scanForCrisis(text);
}
