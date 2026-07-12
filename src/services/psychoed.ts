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
  {
    id: "stress-hpa-axis",
    title: "Why stress builds in the body",
    summary:
      "When pressure keeps arriving without a real break, the body's stress system can stay switched on past when it is needed — and that has a cost.",
    body:
      "The body has a finely tuned stress response: the sympathetic system revs up to meet a challenge, then the parasympathetic system brings it back down. This works well for short, sharp demands. The difficulty comes when demands are constant — financial worry, relationship strain, long hours — because the 'off' switch gets less use. Over time, the system can stay in a state of low-grade activation (sometimes called allostatic load), which tends to drain energy, disturb sleep, and leave less buffer for the next hard thing. Many people find that even short daily practices that signal safety to the body — slow breathing, a warm bath, gentle movement — help reset the system bit by bit.",
    basis: "McEwen 2007, Physiol. Rev. (allostasis and allostatic load); Sapolsky 2004, Why Zebras Don't Get Ulcers; chronic stress dysregulates HPA-axis feedback (Herman et al. 2016, Compr. Physiol.).",
    tags: ["stress", "stressed", "burnout", "pressure", "overwhelmed", "hpa axis", "cortisol", "allostatic load", "chronic", "adrenal", "tense", "on edge", "can't relax"],
    emergencyCaveat: EMERGENCY_CAVEAT,
  },
  {
    id: "neuroplasticity",
    title: "The brain can change at any age",
    summary:
      "The brain keeps rewiring itself throughout life — every experience, and every new habit of attention, leaves a physical trace.",
    body:
      "For a long time, scientists thought the brain stopped changing after childhood. We now know that neurons build new connections and strengthen or prune existing ones every day (neuroplasticity). This means that repeatedly practising a new thought pattern or a coping skill literally builds a more well-worn neural path for it — and the old path grows fainter with disuse. Many people find it encouraging: the way you respond now is not fixed; every time you choose a different response, you are retraining the brain, even if it does not feel like it at first.",
    basis: "Davidson & McEwen 2012, Soc. Cogn. Affect. Neurosci. (experience-dependent plasticity in meditation); Merzenich et al. 2014, Soft-Wired (brain plasticity throughout the lifespan); Maguire et al. 2000, Proc. Natl. Acad. Sci. (hippocampal plasticity in taxi drivers).",
    tags: ["neuroplasticity", "brain", "change", "rewire", "habit", "practice", "learning", "pattern", "neurogenesis", "plasticity"],
  },
  {
    id: "negativity-bias",
    title: "Why bad sticks more than good",
    summary:
      "The brain naturally pays more attention to negative experiences than positive ones — it is a survival reflex, not a personality flaw.",
    body:
      "It is not just you. Evolution shaped the brain to prioritise threats over opportunities: missing a threat could be fatal, while missing a pleasant moment is merely a missed chance. This negativity bias means that one criticism can outweigh ten compliments, a single worry can crowd out a dozen calm moments. Many people find it freeing to know that this is how the brain is built, not a sign of something wrong. Deliberately savouring good moments (even small ones) for a few seconds longer has been shown to help the brain gradually learn to hold onto the positive, too.",
    basis: "Baumeister et al. 2001, Rev. Gen. Psychol. ('bad is stronger than good' — meta-analysis covering attention, memory, and emotion); Rozin & Royzman 2001, Perspect. Psychol. Sci. (four mechanisms of negativity dominance).",
    tags: ["negativity bias", "negative", "good", "bad", "pessimism", "pessimistic", "stuck", "can't see the positive", "optimism", "savouring", "rosenthal"],
  },
  {
    id: "gratitude-science",
    title: "Noticing what is going well",
    summary:
      "Deliberately tuning in to what is good, even briefly and even on hard days, has been shown to shift how people feel over time.",
    body:
      "It can feel artificial — or even invalidating — to 'think positive' when things are genuinely hard. What research suggests, however, is not forced positivity but a specific practice: taking a minute each day to note one or two things that went reasonably well, or that you are grateful for, even if small. (The coffee was hot, a friend replied, you made it to work.) This practice has been found in several studies to increase well-being and reduce depressive symptoms over a few weeks. It seems to work partly by retraining the brain's attention filter — after a while, you start automatically spotting more of what is going right, not because the bad has vanished, but because your brain has learned to hold both.",
    basis: "Emmons & McCullough 2003, J. Pers. Soc. Psychol. (weekly gratitude lists increased well-being vs hassles or neutral); Seligman et al. 2005, Am. Psychol. (gratitude visit as a positive intervention); Jackowska et al. 2016, J. Psychosom. Res. (gratitude journaling improves sleep).",
    tags: ["gratitude", "thankful", "grateful", "positive", "appreciation", "appreciate", "good things", "well-being", "happiness", "optimism", "positivity", "count blessings"],
  },
  {
    id: "motivation-action",
    title: "Motivation usually follows action, not the other way around",
    summary:
      "Waiting until you feel like doing something is one of the surest ways to stay stuck — for many people, a small step comes first and the motivation shows up along the way.",
    body:
      "It feels natural to think: first I need to feel motivated, then I will act. But low mood and anxiety weaken that 'felt sense' of wanting to do anything, and waiting for it often backfires — the longer you wait, the heavier the task feels. Behavioural activation theory suggests flipping the order: pick a small, concrete action (stand up, wash one dish, walk to the end of the road, open the email), do it without waiting to feel ready, and then pause to notice any shift. More often than not, the action itself nudges the engine. It isn't magic — it is about breaking the loop where avoidance drains motivation further.",
    basis: "Martell, Addis & Jacobson 2001, Depression in Context (behavioral activation for depression); Dimidjian et al. 2006, J. Consult. Clin. Psychol. (BA as effective as medication for major depression); Lejuez et al. 2011, BRAT (brief BA — 10–12 sessions, strong effect size).",
    tags: ["motivation", "motivated", "action", "do", "doing", "procrastination", "procrastinating", "start", "can't get going", "stuck", "inertia", "behavioural activation", "behavioral activation", "task", "small steps"],
  },
  {
    id: "circadian-bipolar",
    title: "Why daily rhythms matter for mood",
    summary:
      "When sleep, meals, and activity happen at roughly the same time each day, the brain's internal clock runs more smoothly — and that tends to steady mood.",
    body:
      "The body runs on a ~24-hour clock (the circadian rhythm) that regulates sleep, energy, appetite, and hormone release. When this clock is disrupted — through late nights, irregular meals, or schedule chaos — mood becomes more vulnerable to both low and high swings. This is especially true for people who experience bipolar-like mood shifts. Interpersonal and Social Rhythm Therapy (IPSRT), a well-studied treatment, focuses on stabilising daily routines (when you wake, eat, sleep) as a way to stabilise mood. Many people find that aiming for a consistent wake time (even on weekends) is the single most effective rhythm anchor.",
    basis: "Frank et al. 2000, Arch. Gen. Psychiatry (IPSRT prevents relapse in bipolar); Harvey et al. 2011, Dialogues Clin. Neurosci. (circadian rhythm disruption in mood disorders); Murray & Harvey 2010, Curr. Psychiatry Rep. (social rhythms and circadian timing).",
    tags: ["circadian", "rhythm", "routine", "daily", "sleep", "wake", "regular", "clock", "bipolar", "mood swings", "schedule", "routine", "stability"],
  },
  {
    id: "trauma-body",
    title: "How difficult experiences live in the body",
    summary:
      "Intense or overwhelming events can leave a physical trace — a lasting sense of alertness, tension, or numbness, even long after the event is over.",
    body:
      "When something overwhelming happens, the body's survival systems do what they were designed to do: mobilise for fight, flight, or freeze. If the threat passes fully, the system settles back down. When it doesn't — when the threat was inescapable, repeated, or too much for the system to process — the body can stay in a state of incomplete response. This can show up as unexplained tension, a low sense of threat in safe situations, or a feeling of being cut off from the body entirely. Many people find that inviting the body back into the conversation — through slow, safe, grounding practices — helps the system gradually complete the response it was stuck in. It is not about reliving the memory; it is about giving the body a chance to learn it is safe now.",
    basis: "van der Kolk 2014, The Body Keeps the Score (trauma as a physiological imprint); Ogden & Minton 2000, Sensorimotor Psychotherapy (window of tolerance and body-based intervention); Levine 1997, Waking the Tiger (somatic experiencing).",
    tags: ["trauma", "traumatic", "ptsd", "body", "tension", "numb", "triggers", "flashback", "hypervigilant", "on guard", "unsafe", "somatic", "nervous system", "grounding", "safe"],
    emergencyCaveat: EMERGENCY_CAVEAT,
  },
  {
    id: "attachment",
    title: "How we learn to relate",
    summary:
      "The way we connect with others is shaped by early relationships — and the brain can learn new, safer ways to relate at any stage of life.",
    body:
      "Attachment theory describes how the emotional bonds we formed with early caregivers tend to shape our expectations of relationships later: whether we feel safe depending on people, whether we push closeness away, or whether we worry about being abandoned. Our style is not destiny — it is a learned pattern, and like all learned patterns, it can be updated with new relational experiences. Many people find that simply understanding their attachment pattern (secure, anxious-preoccupied, dismissive-avoidant, or fearful-disorganised) shifts it from 'something wrong with me' to 'something my brain learned early, which can be relearned.'",
    basis: "Bowlby 1969, Attachment and Loss (attachment theory foundations); Ainsworth et al. 1978, Strange Situation procedure; Mikulincer & Shaver 2016, Attachment in Adulthood (meta-analytic evidence that attachment patterns are modifiable through new experiences).",
    tags: ["attachment", "relationships", "connection", "trust", "closeness", "abandonment", "rejection", "intimacy", "childhood", "relating", "anxious", "avoidant", "social", "secure"],
  },
  {
    id: "self-compassion-resilience",
    title: "How self-compassion builds resilience",
    summary:
      "Being kind to yourself when things go wrong — rather than harsh or critical — has been consistently linked to greater emotional strength, not softness.",
    body:
      "One of the strongest findings in modern psychology is that self-compassion (treating yourself with the same warmth and care you would offer a friend) predicts better mental health across many domains: lower anxiety and depression, less shame, greater motivation, and faster recovery after setbacks. It is not the same as self-esteem (which depends on feeling above average) — self-compassion is available even at your lowest. The three components — mindfulness (acknowledging the pain without over-identifying), common humanity (remembering struggle is universal), and self-kindness (active warmth) — together form a skill that can be trained. Multiple meta-analyses show that even brief self-compassion interventions reduce distress with medium-to-large effect sizes.",
    basis: "Neff 2003, Self and Identity (self-compassion construct and measurement); Gilbert 2009, The Compassionate Mind (compassion-focused therapy); meta-analyses: Zessin et al. 2015, PLoS One (self-compassion → well-being, r=0.47); MacBeth & Gumley 2012, Clin. Psychol. Rev. (self-compassion → lower psychopathology, large effect); Ferrari et al. 2019, Mindfulness (self-compassion interventions reduce depression and anxiety, g=0.68).",
      tags: ["self-compassion", "self compassion", "self care", "self-care", "kindness", "kind to myself", "resilience", "resilient", "bounce back", "inner critic", "shame", "hard on myself", "struggle", "neff", "gilbert", "cft", "strength", "vulnerability"],
  },

  {
    id: "social-connection-and-mood",
    title: "Why connection buffers low mood",
    summary:
      "Feeling close to people — even briefly — is one of the strongest protective factors for mood. Isolation reliably makes low periods worse; reaching out is not a luxury but part of recovery.",
    body:
      "A large body of research ties social connection to mental and physical health. Holt-Lunstad and colleagues' meta-analyses found that larger social networks and lower loneliness are associated with markedly lower mortality risk, and loneliness itself predicts worse health outcomes independently of objective isolation. For mood specifically, supportive contact reduces the body's stress response (lower cortisol and blood pressure during conflict tasks) and buffers against depressive relapse. This is why a single short, genuine connection — a reply, a call, a shared laugh — can shift a hard day more than another hour of analysis. Connection is not a reward you earn after you feel better; it is one of the things that helps you get there.",
    basis:
      "Holt-Lunstad, Smith & Layton 2010, PLoS Medicine (social relationships & mortality — 148 studies, ~300k participants); Holt-Lunstad 2015, Perspectives on Psychological Science (loneliness & social isolation as mortality risk factors); meta-analysis: Hackett et al. 2019, Heart (social isolation & incident CVD); Cohen 2004, Ann. NY Acad. Sci. (social ties buffer stress reactivity).",
    tags: ["connection", "connected", "connect", "lonely", "loneliness", "isolated", "isolation", "reach out", "reach out to", "belong", "belonging", "friend", "friends", "support"],
  },
  {
    id: "behavioral-activation-basics",
    title: "Why action can come before motivation",
    summary:
      "When you wait to feel like doing things, low periods can stretch on. Behavioral activation works the other way: small, planned actions first — and the lift in mood often follows the action, not the other way round.",
    body:
      "Depression reliably narrows activity and pulls people toward withdrawal, which then confirms the 'nothing matters / I can't' story. Behavioral activation (BA) reverses the order: rather than waiting for motivation to arrive, you schedule small, concrete, rewarding actions and let mood catch up. A consistent finding across trials is that increasing engagement with valued, pleasant, or mastery activities reduces depressive symptoms — and that action predicts later mood better than mood predicts later action. The bar is deliberately low: one tiny step (a shower, a message, a walk to the corner) counts. The point is not productivity; it is re-opening the loop between doing and feeling.",
    basis:
      "Martell, Addis & Jacobson 2001, Behavioral Activation for Depression (Guilford) — activation as the core change mechanism; Lejuez et al. 2006/2011, Behavior Therapy / Behavior Research and Therapy (Brief BA, multiple RCTs); meta-analysis: Cuijpers et al. 2007, J. Affect. Disord. (BA effective for depression, d≈0.7).",
    tags: ["motivation", "no motivation", "no energy", "can't get started", "cant get up", "stuck", "withdraw", "withdrawal", "do nothing", "action", "do things", "get going", "behavioral activation", "ba", "small steps", "momentum"],
  },
  {
    id: "sleep-debt-and-anxiety",
    title: "Why poor sleep amplifies anxiety",
    summary:
      "After short or broken sleep, the brain's threat system runs hotter and the calming brake is weaker — so ordinary worries feel sharper and harder to settle. This is chemistry, not weakness.",
    body:
      "Sleep is not passive recovery; it resets the emotional brain. Studies using brain imaging show that after a night of lost sleep, the amygdala (threat centre) reacts more strongly to negative signals while the prefrontal regions that put feelings in context go quiet — so the same stressor feels bigger and harder to regulate. Across people, shorter and more fragmented sleep tracks with higher next-day anxiety, and a single bad night can lift state anxiety the following evening. This is why 'I'm fine when I've slept' is not you being dramatic — it is a real, measurable shift in how the brain handles threat. The lever is unglamorous: protecting sleep is one of the highest-yield things for steady mood.",
    basis:
      "Yoo et al. 2007, Current Biology ('A deficit in the ability to form new human memories without sleep' — next-day amygdala reactivity to negative images after sleep deprivation); Walker & van der Helm 2009, Trends Cogn. Sci. (overnight therapy / memory reprocessing); Walker 2017, Why We Sleep (consolidated account of sleep, affect regulation & psychiatric risk).",
    tags: ["sleep", "slept", "tired", "exhausted", "wired", "worn out", "edge", "edgy", "anxious", "anxiety", "irritable", "short fuse", "mood", "reactive"],
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
