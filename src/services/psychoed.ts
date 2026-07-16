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
  {
    id: "grief-dual-process",
    title: "Grief isn't a straight line",
    summary:
      "Grieving naturally swings between facing the loss head-on and taking a break to keep living — both sides of that back-and-forth are healthy, not a sign of doing it wrong.",
    body:
      "It's common to expect grief to move through fixed stages toward 'closure.' In practice, many people find themselves oscillating: some moments confronting the loss directly — the memories, the missing — and other moments turning toward ordinary life — work, plans, small distractions — and back again. Both are part of coping, not a failure to grieve 'properly.' The oscillation itself, not arriving at some final stage, is what research suggests helps people adapt over time.",
    basis: "Stroebe & Schut 1999, Death Studies (dual-process model: oscillation between loss-oriented and restoration-oriented coping).",
    tags: ["grief", "loss", "grieving", "bereavement", "mourning", "died", "death", "miss them", "missing"],
  },
  {
    id: "anger-appraisal",
    title: "What's actually behind anger",
    summary:
      "Anger usually follows a quick mental read that something is unfair, threatening, or blocking what you want — understanding that read is what makes anger something to examine, not just react to.",
    body:
      "Anger can feel like it comes out of nowhere, but it typically follows an appraisal — a fast, often unconscious judgment that a rule's been broken, a boundary crossed, or a goal blocked — paired with physical arousal and an urge to act. Many people find it useful to pause and ask 'what did I just decide was unfair or threatening?' rather than only the anger itself. That question doesn't make the anger wrong; it opens up whether the read was accurate and what response actually fits.",
    basis: "Novaco 1975, Anger Control (cognitive-arousal-behavioral model of anger); DiGiuseppe & Tafrate 2007, Understanding Anger Disorders, Oxford University Press.",
    tags: ["anger", "angry", "rage", "furious", "irritated", "frustrated", "snap", "resentful", "mad"],
  },
  {
    id: "guilt-vs-shame",
    title: "Guilt and shame aren't the same feeling",
    summary:
      "Guilt says 'what I did was wrong' and points at an action; shame says 'I am wrong' and points at your whole self — the difference matters for what helps.",
    body:
      "The two feel related but pull in different directions. Guilt targets a specific behavior ('I shouldn't have said that') and tends to motivate repair — an apology, a fix, doing better next time. Shame targets the self as a whole ('I'm a bad person') and tends to motivate hiding, withdrawing, or attacking back — none of which actually repairs anything. Many people find it steadying to ask, when something feels bad, 'is this about something I did, or about who I think I am?' — because only one of those has a clear next step.",
    basis: "Tangney & Dearing 2002, Shame and Guilt, Guilford Press.",
    tags: ["guilt", "shame", "ashamed", "embarrassed", "bad person", "did something wrong", "self-blame"],
  },
  {
    id: "boredom-attention",
    title: "Why boredom feels so uncomfortable",
    summary:
      "Boredom isn't just 'nothing to do' — it's attention failing to lock onto anything, and many people find naming it eases the restless discomfort that comes with it.",
    body:
      "Boredom can feel surprisingly heavy — restless, irritable, hard to sit with — even when nothing is actually wrong. One way to understand it: boredom shows up when attention can't engage with an activity, your surroundings, or your own thoughts, and you notice and dislike that stuck feeling. It isn't only about lacking stimulation; plenty of understimulating moments don't feel boring. Many people find that naming it ('this is boredom, not something worse') and gently redirecting attention — rather than reaching for the nearest distraction — helps it pass without escalating.",
    basis: "Eastwood, Frischen, Fenske & Smilek 2012, Perspectives on Psychological Science (boredom as attention-engagement failure).",
    tags: ["bored", "boredom", "empty", "nothing to do", "restless", "numb", "understimulated"],
  },
  {
    id: "relationship-conflict-patterns",
    title: "Four patterns that make conflict worse",
    summary:
      "Certain ways of arguing — attacking the person, contempt, defensiveness, shutting down — tend to deepen conflict rather than resolve it. Naming them gives you something specific to notice and interrupt.",
    body:
      "Not all conflict is equally corrosive. Research observing couples in conflict identified four recurring patterns: criticizing the person rather than the specific behavior ('you always...' vs. 'when you did X...'), contempt (eye-rolling, mockery, sarcasm), defensiveness (deflecting instead of hearing the point), and stonewalling (shutting down and withdrawing). None of these are unusual — most people do at least one under stress. Many people find it helps simply to notice which pattern just showed up ('that was contempt, not just frustration') as a first step toward a different response, rather than treating conflict itself as the problem.",
    basis: "Gottman 1994, Why Marriages Succeed or Fail; Gottman & Levenson 1992, Journal of Personality and Social Psychology (patterns of criticism, contempt, defensiveness, and stonewalling in conflict).",
    tags: ["conflict", "argument", "fight", "relationship", "criticism", "contempt", "defensive", "stonewalling", "shut down", "partner"],
  },
  {
    id: "boundaries-dearman",
    title: "A structure for saying no clearly",
    summary:
      "Asking for what you need or saying no doesn't have to come out as a blunt refusal or an over-explained apology — a simple structure can help it land clearly and stay calm.",
    body:
      "Boundary conversations often go one of two ways: swallowed entirely (resentment builds) or blurted out sharply (guilt builds). A structured alternative: describe the situation factually, express how you feel about it without accusation, ask clearly for what you want, and reinforce why it matters — while staying calm and open to a response, not just delivering a verdict. Many people find that having a structure to lean on makes the moment feel less like a confrontation and more like a request, which is often exactly what it is.",
    basis: "Linehan 1993, Skills Training Manual for Treating Borderline Personality Disorder, Guilford Press (DEAR MAN — DBT interpersonal effectiveness skill).",
    tags: ["boundary", "boundaries", "say no", "people pleaser", "standing up", "assertive", "dearman"],
  },
  {
    id: "fawn-response-appeasement",
    title: "When the body's response to threat is to appease",
    summary:
      "Fight and flight are well known; many clinicians also describe a pattern of appeasing or pleasing in response to threat — a learned way of staying safe, not a character flaw.",
    body:
      "The nervous system has more than one way of responding to feeling unsafe. Alongside fighting back or fleeing, the body can shift into a state oriented toward connection and appeasement — going quiet, agreeing, smoothing things over — even when that isn't what you actually want. Some clinicians describe this pattern as 'fawning': a learned survival strategy, often from environments where conflict felt dangerous and keeping the peace felt safer. It is not formally established the same way fight-or-flight is, but many people recognise the pattern in themselves and find it clarifying: the instinct to please wasn't weakness, it was a nervous system doing what once kept things safe.",
    basis: "Porges 1995, Psychophysiology (Polyvagal Theory — autonomic nervous system states, including social engagement); 'fawning' itself is a clinical concept (Walker) describing appeasement as a trauma response, not yet formally peer-reviewed.",
    tags: ["people pleasing", "fawn", "appease", "can't say no", "conflict avoidant", "keep the peace", "freeze"],
  },
  {
    id: "heartbreak-rejection",
    title: "Why heartbreak can feel like withdrawal",
    summary:
      "Brain imaging of people recently rejected by a partner shows activity in reward and craving circuitry similar to what's seen in addiction research — which may be part of why heartbreak can feel like withdrawal, not just sadness.",
    body:
      "Romantic rejection can produce a specific, almost physical kind of longing that ordinary sadness doesn't quite capture. One study scanned the brains of recently-rejected people who still reported being in love while they viewed a photo of their ex, and found activation in reward, motivation, and craving regions — circuitry associated with addiction, though not identical to it. That may be part of why heartbreak can feel less like plain grief and more like a pull you're fighting. Many people find it reassuring to know the intensity has a real basis — it isn't 'just' being dramatic, and like other cravings, it does ease with time and distance.",
    basis: "Fisher, Brown, Aron, Strong & Mashek 2010, Journal of Neurophysiology, 104:51-60.",
    tags: ["heartbreak", "breakup", "broke up", "ex", "rejection", "romantic rejection", "can't stop thinking about them", "withdrawal"],
  },
  {
    id: "perfectionism-clinical",
    title: "Why perfectionism rarely feels like enough",
    summary:
      "When self-worth depends entirely on meeting impossibly high standards, even success rarely feels satisfying — and any shortfall reads as total failure rather than a normal miss.",
    body:
      "Wanting to do good work is not the problem. Clinical perfectionism is more specific: pursuing relentlessly high, self-imposed standards while measuring your entire self-worth by whether you hit them, then judging any shortfall in all-or-nothing terms. That combination is what keeps the payoff out of reach — meeting the standard barely registers ('I should have done even better'), while missing it feels like proof of failure. Many people find that separating self-worth from performance, even slightly, is what starts to loosen the cycle — not lowering standards, but no longer letting them set your value.",
    basis: "Shafran, Cooper & Fairburn 2002, Behaviour Research and Therapy, 40:773-791 (clinical perfectionism model).",
    tags: ["perfectionism", "perfectionist", "never good enough", "high standards", "all or nothing", "self-worth", "not enough"],
  },
  {
    id: "imposter-phenomenon",
    title: "Feeling like a fraud despite the evidence",
    summary:
      "Attributing your own success to luck, timing, or charm rather than ability — even with clear evidence of competence — is a well-documented pattern, not proof that you actually don't belong.",
    body:
      "The imposter phenomenon describes a specific gap: real, visible competence on one side, and a persistent inner conviction of being a fraud on the other — along with a fear that you'll eventually be 'found out.' Success gets explained away (luck, good timing, other people's generosity) rather than absorbed as evidence. It was first documented in high-achieving women and has since been found much more broadly. Many people find it steadies things simply to name the gap: the discomfort is a known pattern, not an accurate read of your actual ability.",
    basis: "Clance & Imes 1978, Psychotherapy: Theory, Research & Practice, 15:241-247.",
    tags: ["imposter", "impostor", "fraud", "found out", "don't belong", "not qualified", "fake it"],
  },
  {
    id: "catastrophizing",
    title: "Why the mind jumps to the worst case",
    summary:
      "Catastrophizing means automatically treating the worst possible outcome as the likely one — a common thinking pattern, and one that can be noticed and questioned rather than simply believed.",
    body:
      "Under stress, the mind often skips past the range of likely outcomes and lands straight on the worst one — a headache becomes something serious, a delayed reply becomes anger, a mistake becomes a disaster. This pattern, catastrophizing, tends to fuel anxiety because the worst case gets treated as fact rather than one low-probability possibility among many. Many people find it helps to ask two questions when they catch it happening: 'what's the most likely outcome, not just the worst one?' and 'if the worst case did happen, what would I actually do?' Both tend to shrink the catastrophe back down to size.",
    basis: "Ellis 1962, Reason and Emotion in Psychotherapy (coined the term); Beck, Rush, Shaw & Emery 1979, Cognitive Therapy of Depression (catastrophizing as a core cognitive distortion).",
    tags: ["catastrophizing", "worst case", "what if", "worst thing", "spiraling thoughts", "overthinking", "panic thoughts"],
  },
  {
    id: "all-or-nothing-thinking",
    title: "The trap of total success or total failure",
    summary:
      "Seeing a situation as either a complete win or a complete loss, with no middle ground, is a recognised thinking pattern that tends to deepen low mood — and it usually isn't the most accurate read.",
    body:
      "All-or-nothing thinking collapses a wide range of outcomes into two: perfect or ruined, good or bad, success or failure. A project that's 80% solid becomes 'a mess.' A mostly good day gets written off because of one bad hour. This pattern was identified as one of the recurring distortions that keep depression and anxiety going, because it discards almost all the actual information in favor of the two most extreme readings. Many people find it useful to look for the missing middle: not 'was it perfect,' but 'where does this actually fall.'",
    basis: "Beck, Rush, Shaw & Emery 1979, Cognitive Therapy of Depression (dichotomous / all-or-nothing thinking).",
    tags: ["all or nothing", "black and white", "perfect or nothing", "failure", "ruined", "messed up", "extreme thinking"],
  },
  {
    id: "decision-fatigue",
    title: "Why choices get harder as the day goes on",
    summary:
      "Some research suggests that making many decisions in a row can leave less in the tank for the next one — though later studies have found the effect smaller and less consistent than first thought.",
    body:
      "It's a familiar feeling: deciding what to eat, wear, or say can feel unexpectedly harder after a day full of smaller decisions, even trivial ones. Early research proposed that self-control and decision-making draw on a shared, limited resource that depletes with use. That idea has held up only partially — a large multi-lab replication years later found the effect much weaker and less consistent than the original studies suggested. What seems most durable is the everyday experience many people report: reducing the number of small decisions (routines, defaults, fewer choices for low-stakes things) can free up energy for the ones that actually matter, whatever the underlying mechanism turns out to be.",
    basis: "Vohs et al. 2008, Journal of Personality and Social Psychology, 94(5):883-898; replication concerns: Hagger et al. 2016, Perspectives on Psychological Science (multi-lab registered replication found a much smaller effect).",
    tags: ["decision fatigue", "too many choices", "can't decide", "overwhelmed by choices", "exhausted", "willpower"],
  },
  {
    id: "social-comparison",
    title: "Why comparing yourself to others feels automatic",
    summary:
      "People seem to have a built-in drive to measure themselves against others, especially without a clearer yardstick — and time spent on image-heavy social media has been linked to more of it.",
    body:
      "Comparing yourself to other people isn't a personal failing — it's been described as a basic drive, especially strong when there's no objective way to judge how you're doing (is this a good salary? a normal amount of anxiety? a good enough life?). In the absence of a ruler, other people become the ruler. Research on social media specifically has found that more time spent on image-focused platforms tracks with more appearance comparison and body-image concern, likely because the comparison points are curated and constant. Many people find it helps to notice when comparison has started ('I'm using them as my yardstick right now') rather than trying to stop comparing altogether, which is a much harder ask.",
    basis: "Festinger 1954, Human Relations, 7:117-140 (social comparison theory); Fardouly & Vartanian 2015, Body Image, 13:38-45 (social media use and appearance comparison).",
    tags: ["comparison", "comparing myself", "social media", "instagram", "jealous", "envy", "not measuring up", "everyone else"],
  },
  {
    id: "health-anxiety",
    title: "How ordinary body sensations become alarming",
    summary:
      "Health anxiety often builds when normal body sensations get read as signs of serious illness, and the very habits meant to feel safer — checking, searching, reassurance — end up keeping the worry alive.",
    body:
      "Bodies produce a constant stream of ordinary sensations — a twinge, a flutter, a bit of fatigue — that mean nothing most of the time. Health anxiety develops when some of those sensations get interpreted as signs of serious illness, which understandably triggers checking (the body, search engines, reassurance from others). The relief from checking is real but brief, which trains the checking habit further rather than resolving the worry — the mind learns 'checking is what makes this bearable' instead of learning the sensation was safe all along. Many people find that gradually reducing checking, uncomfortable as it feels at first, is what actually lets the alarm settle rather than what risks missing something important.",
    basis: "Warwick & Salkovskis 1990, Behaviour Research and Therapy, 28(2):105-117.",
    tags: ["health anxiety", "hypochondria", "googling symptoms", "checking my body", "scared it's serious", "symptom checking"],
    emergencyCaveat: EMERGENCY_CAVEAT,
  },
  {
    id: "burnout-mismatch",
    title: "Burnout is a mismatch, not a personal failing",
    summary:
      "Burnout is described as a growing mismatch between a person and their job — chronic exhaustion, detachment, and feeling less effective — rather than evidence that you simply aren't resilient enough.",
    body:
      "Burnout isn't just being very tired. It's described across three dimensions: exhaustion that doesn't lift with normal rest, growing cynicism or emotional distance from work you used to care about, and a creeping sense that you're not accomplishing much even when working hard. The framing that's held up best treats burnout as a mismatch — between demands and resources, values and reality, effort and reward — rather than a personal deficiency in resilience or toughness. Many people find that framing useful precisely because it points at the situation, not just the person, as something that may need to change.",
    basis: "Maslach & Leiter 1997, The Truth About Burnout; Maslach, Schaufeli & Leiter 2001, Annual Review of Psychology (exhaustion, cynicism, reduced professional efficacy).",
    tags: ["burnout", "burnt out", "exhausted", "work stress", "cynical", "detached", "can't keep going", "drained"],
  },
  {
    id: "chronic-pain-mood",
    title: "Why chronic pain and mood feed each other",
    summary:
      "Persistent pain isn't purely physical — biological, psychological, and social factors interact and reinforce each other, which is part of why chronic pain and low mood so often travel together.",
    body:
      "Short-term pain is mostly a straightforward biological signal. Chronic pain works differently: the biological injury or condition interacts with psychological factors (fear of movement, catastrophizing, mood) and social factors (isolation, work strain, how others respond to your pain) in a loop that can outlast — or exist independently of — the original physical cause. That's not a claim that chronic pain is 'in your head'; it's that all three layers genuinely shape how much pain is experienced and how disabling it is. Many people find that treatment addressing mood and behavior alongside the physical side (rather than physical treatment alone) makes more headway than either approach on its own.",
    basis: "Gatchel, Peng, Peters, Fuchs & Turk 2007, Psychological Bulletin, 133(4):581-624 (biopsychosocial model of chronic pain).",
    tags: ["chronic pain", "pain", "hurts", "exhausted from pain", "pain and mood", "persistent pain"],
    emergencyCaveat: EMERGENCY_CAVEAT,
  },
  {
    id: "work-demand-control",
    title: "What actually makes a job stressful",
    summary:
      "It isn't just how much is on your plate — the combination of high demands and low control over how you meet them is what tends to make work genuinely stressful.",
    body:
      "Two jobs can have identical workloads and feel completely different: one grinding, one merely busy. A model built from studying job stress found that the key variable isn't demand alone — it's demand combined with control. High demands paired with real autonomy over how, when, and in what order the work gets done are far less taxing than the same demands with no say at all. Many people find this reframes a stuck feeling at work: the problem may not be 'too much to do' so much as 'no control over how I do it' — which points at a different, more specific thing to try to change.",
    basis: "Karasek 1979, Administrative Science Quarterly, 24(2):285-308 (job demand-control model).",
    tags: ["work stress", "job stress", "overworked", "no control", "overloaded", "workload", "burnout"],
  },
  {
    id: "procrastination-mood-repair",
    title: "Procrastination is often about mood, not laziness",
    summary:
      "Putting something off is frequently an attempt to escape the bad feeling attached to the task right now — which brings quick relief, at the cost of a bigger, more anxious task later.",
    body:
      "Procrastination is usually framed as a time-management problem, but the pattern more often looks like emotion regulation: a task carries some unpleasant feeling (boredom, anxiety, self-doubt), and avoiding it makes that feeling go away immediately. The relief is real, which is exactly why the pattern repeats — present-moment mood wins over future consequences, even when you know it will cost more later. Many people find it helps to name what feeling the task is triggering, rather than treating procrastination as a discipline failure — because the fix for 'I'm avoiding a feeling' is different from the fix for 'I'm lazy.'",
    basis: "Sirois & Pychyl 2013, Social and Personality Psychology Compass, 7(2):115-127.",
    tags: ["procrastination", "procrastinating", "avoiding", "putting off", "can't start", "last minute"],
  },
  {
    id: "life-transitions",
    title: "Why change feels harder than the event itself",
    summary:
      "A widely used model describes any life change as having its own internal process — letting go of the old situation, a disorienting middle, and a new normal — separate from the external event.",
    body:
      "A new job, a move, a relationship ending, even a change you chose and wanted — the practical event is often only part of what's hard. A well-known practitioner model describes an internal transition process that runs alongside the external change: an ending (letting go of the old role, routine, or identity), a neutral zone (disoriented, in-between, not fully anywhere), and a new beginning (a new normal starting to feel real). It's not an empirically tested theory, but many people find it clarifying, because the disorientation of the 'neutral zone' often gets mistaken for something going wrong, when it's just the middle of an ordinary process.",
    basis: "Bridges, Transitions: Making Sense of Life's Changes, 1979 — a widely used practitioner model, not an empirically validated theory.",
    tags: ["transition", "change", "new job", "moving", "big change", "adjusting", "in between", "new normal"],
  },
  {
    id: "ambivalence-seeking-help",
    title: "Feeling unsure about getting help is normal",
    summary:
      "People move through predictable stages when facing a change — including not yet being sure they want it — and ambivalence about seeking help is a well-documented stage, not a sign something is wrong with you or that you're not trying.",
    body:
      "Deciding to see a therapist, start medication, or make any real change rarely happens as a single clean decision. A widely used model describes several stages: not yet considering the change, weighing it while still unsure, actively preparing, taking action, and maintaining it afterward. Feeling mixed — wanting things to be different but not fully ready to act, or taking a step (like booking an appointment) while still doubting it — fits squarely inside this normal process, not outside it. Many people find it eases the pressure to know that ambivalence isn't a stall or a failure; it's an expected stage on the way, not evidence you're not really trying.",
    basis: "Prochaska & DiClemente 1983, Journal of Consulting and Clinical Psychology, 51(3):390-395 (Transtheoretical Model / Stages of Change).",
    tags: ["seeking help", "therapy", "psychiatrist", "psychologist", "not sure", "ambivalent", "should I go", "appointment"],
  },
  {
    id: "post-traumatic-growth",
    title: "Some people report growth after hard things — not instead of pain, alongside it",
    summary:
      "Some people describe positive changes after very difficult experiences — alongside their distress, not as a replacement for it. This isn't a promise, a timeline, or a reason the hard thing happened.",
    body:
      "It can feel almost offensive to hear 'this will make you stronger' in the middle of something genuinely hard. What research on this describes is more specific and more modest: some people, after difficult or traumatic experiences, report changes like a clearer sense of what matters, closer relationships, or a felt appreciation for life — reported alongside ongoing pain, not after it resolves. This is not universal, not guaranteed, and not evidence that suffering is worth it or 'happens for a reason' — some researchers note self-reported growth may partly reflect how people make sense of hard events rather than a verified change. Many people find it more useful as a 'this can genuinely coexist' idea than as an expectation to live up to.",
    basis: "Tedeschi & Calhoun 1996, Journal of Traumatic Stress, 9(3):455-471 (Posttraumatic Growth Inventory); active debate on measurement, e.g. Boals et al. 2022 meta-analysis.",
    tags: ["growth", "meaning", "after trauma", "stronger", "silver lining", "made sense of it", "perspective"],
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

/** How many distinct query terms matched a given topic's own tags/title/summary/body. Used by
 *  callers that need a precision floor beyond "matched something" — a message that only hits one
 *  generic, broadly-tagged word (e.g. "good") scores identically under `searchPsychoed` to a
 *  message that hits two specific, meaningful tags, so raw score alone can't separate a real
 *  signal from a coincidence. Returns 0 for an empty query or an unknown topic id. */
export function termCoverageForTopic(query: string, topicId: string): number {
  const terms = new Set(tokenize(query));
  if (terms.size === 0) return 0;
  const entry = INDEX.find((e) => e.topic.id === topicId);
  if (!entry) return 0;
  let coverage = 0;
  for (const t of terms) if (entry.weights.has(t)) coverage++;
  return coverage;
}

/** Deterministic §9 gate for the Understand search box — wraps scanForCrisis. The screen surfaces crisis
 *  help on `true` BEFORE any lexical search, and never persists the text. scanForCrisis is untouched. */
export function checkPsychoedQuery(text: string): boolean {
  return scanForCrisis(text);
}
