// Skills Library (plan F5) — a research-grounded reference of evidence-based coping skills across
// DBT (Linehan), CBT (Beck), ACT (Hayes), and CFT (Gilbert/Neff). Every skill names a concrete
// how-to and cites its source. This is a *reference*, not advice — it never diagnoses or prescribes.
//
// Canonical sources:
//   DBT — Linehan, M. M. (2015). DBT Skills Training Manual (2nd ed.). Guilford.
//   CBT — Beck, A. T., Rush, A. J., Shaw, B. F., & Emery, G. (1979). Cognitive Therapy of Depression;
//         Beck, J. S. (2011). Cognitive Behavior Therapy (2nd ed.).
//   ACT — Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2011). Acceptance and Commitment Therapy.
//   CFT — Gilbert, P. (2009). The Compassionate Mind; Neff, K. (2011). Self-Compassion.

type Modality = "DBT" | "CBT" | "ACT" | "CFT";

interface SkillGroup {
  id: string;
  label: string;
  blurb: string;
  tone: "rose" | "sky" | "amber" | "blue" | "violet" | "emerald" | "purple";
}

export const SKILL_GROUPS: SkillGroup[] = [
  { id: "crisis", label: "Crisis & Distress Tolerance", tone: "rose", blurb: "Get through an intense moment without making it worse." },
  { id: "mindfulness", label: "Mindfulness", tone: "sky", blurb: "Come back to the present and out of the spiral." },
  { id: "emotion", label: "Emotion Regulation", tone: "amber", blurb: "Understand and shift emotions over time." },
  { id: "relationships", label: "Relationships", tone: "blue", blurb: "Ask, say no, and keep your self-respect." },
  { id: "thoughts", label: "Thoughts (CBT)", tone: "violet", blurb: "Work with the thoughts that fuel distress." },
  { id: "values", label: "Acceptance & Values (ACT)", tone: "emerald", blurb: "Make room for hard feelings; act on what matters." },
  { id: "compassion", label: "Self-Compassion (CFT)", tone: "purple", blurb: "Meet your pain with kindness, not attack." },
];

export interface Skill {
  id: string;
  name: string;
  acronym?: string;
  modality: Modality;
  group: string; // SkillGroup id
  purpose: string; // when/why to reach for it
  steps: string[];
  basis: string;
}

export const SKILLS: Skill[] = [
  // ── Crisis & Distress Tolerance (DBT) ──
  { id: "tipp", name: "TIPP", acronym: "Temperature · Intense exercise · Paced breathing · Paired muscle relaxation", modality: "DBT", group: "crisis",
    purpose: "Bring down extreme arousal fast (intensity 8–10) when the thinking brain is offline.",
    steps: ["Temperature: hold something cold / splash cold water on your face (triggers the dive reflex — lowers heart rate by ~10–15% within seconds).", "Intense exercise: ~20 jumping jacks or run in place for 1 minute to burn off adrenaline.", "Paced breathing: breathe out longer than you breathe in (e.g. in 4, out 6 — lengthening exhale activates vagal brake).", "Paired muscle relaxation: tense, then release muscle groups as you exhale."],
    basis: "Linehan 2015, DBT Skills Training Manual — crisis survival skills; cold/longer-exhale raise vagal tone (Thayer & Lane 2009, Neurosci. Biobehav. Rev.; mammalian dive reflex: Kinoshita et al. 2021, Front. Physiol.)." },
  { id: "temperature", name: "Temperature (TIPP)", modality: "DBT", group: "crisis",
    purpose: "Trigger the mammalian dive reflex to rapidly down-regulate physiological arousal.",
    steps: ["Fill a bowl with cold water (add ice if tolerable) or hold an ice pack to your face.", "Hold your breath and submerge your face for 10–15 seconds, or press the cold pack against your cheeks and forehead.", "The dive reflex slows your heart rate and increases parasympathetic tone within seconds.", "Repeat 2–3 times until you feel the physiological shift."],
    basis: "Mammalian dive reflex triggers bradycardia and peripheral vasoconstriction (Kinoshita et al. 2021, Front. Physiol.); cold face stimulation reduces sympathetic arousal (Heath & Gibbs 1992)." },
  { id: "stop", name: "STOP", acronym: "Stop · Take a step back · Observe · Proceed mindfully", modality: "DBT", group: "crisis",
    purpose: "Interrupt an impulsive urge before you act on it.",
    steps: ["Stop — freeze, don't move or react.", "Take a step back — physically or mentally; breathe.", "Observe — what's happening inside and around you, just the facts.", "Proceed mindfully — choose the action that fits your goals."],
    basis: "Linehan 2015, DBT Skills Training Manual (Distress Tolerance)." },
  { id: "accepts", name: "Distract with ACCEPTS", acronym: "Activities · Contributing · Comparisons · Emotions · Pushing away · Thoughts · Sensations", modality: "DBT", group: "crisis",
    purpose: "Buy time and lower intensity by shifting attention until the wave passes.",
    steps: ["Pick one: an Activity, Contributing to someone, a Comparison, a different Emotion (e.g. a funny clip), Pushing the problem away briefly, Thoughts (count, puzzle), or Sensations (ice, music).", "Do it fully for a few minutes — distraction is a bridge, not avoidance."],
    basis: "Linehan 2015, DBT Skills Training Manual (Distress Tolerance — distraction)." },
  { id: "self-soothe", name: "Self-Soothe (Five Senses)", modality: "DBT", group: "crisis",
    purpose: "Calm the body through the senses when you're overwhelmed.",
    steps: ["Choose a sense and give it something gentle: a warm drink (taste), soft texture (touch), calming sound, a pleasant smell, a soothing sight.", "Slow down and really notice it."],
    basis: "Linehan 2015, DBT Skills Training Manual (Distress Tolerance — self-soothe)." },
  { id: "improve", name: "IMPROVE the Moment", acronym: "Imagery · Meaning · Prayer · Relaxation · One thing · Vacation · Encouragement", modality: "DBT", group: "crisis",
    purpose: "Make a painful moment more bearable without changing the situation yet.",
    steps: ["Try one: calming Imagery, finding Meaning, Prayer, Relaxation, doing One thing in the moment, a brief Vacation (a short break), or self-Encouragement (\"I can stand this\")."],
    basis: "Linehan 2015, DBT Skills Training Manual (Distress Tolerance)." },
  { id: "radical-acceptance", name: "Radical Acceptance", modality: "DBT", group: "crisis",
    purpose: "Stop fighting a reality you can't change right now — fighting it adds suffering on top of pain.",
    steps: ["Name the fact you're rejecting: \"This is what's happening.\"", "Notice the fighting (\"it shouldn't be like this\").", "Allow the reality to be real, again and again — acceptance isn't approval.", "Acceptance lowers the second arrow of suffering, freeing energy to respond."],
    basis: "Linehan 2015, DBT Skills Training Manual (Distress Tolerance — reality acceptance)." },
  { id: "half-smile", name: "Half-Smile & Willing Hands", modality: "DBT", group: "crisis",
    purpose: "Use the body to soften resistance when the mind can't get there.",
    steps: ["Relax your face into a barely-there half-smile.", "Unclench and turn your hands palm-up (\"willing hands\").", "Notice how the body posture gently nudges acceptance."],
    basis: "Linehan 2015, DBT Skills Training Manual (Distress Tolerance)." },
  { id: "pros-cons", name: "Pros & Cons (of the urge)", modality: "DBT", group: "crisis",
    purpose: "Decide whether to act on a crisis urge by seeing the full picture.",
    steps: ["List the pros and cons of acting on the urge.", "Then the pros and cons of resisting it.", "Read both — the costs of acting are usually clearer when written down."],
    basis: "Linehan 2015, DBT Skills Training Manual (Distress Tolerance)." },
  { id: "willingness", name: "Willingness over Willfulness", modality: "DBT", group: "crisis",
    purpose: "Shift from refusing reality to participating effectively in it.",
    steps: ["Notice willfulness: refusing, giving up, \"I won't.\"", "Ask: what does this moment actually need from me?", "Choose willingness — do the next effective thing, even small."],
    basis: "Linehan 2015, DBT Skills Training Manual (Distress Tolerance)." },
  { id: "urge-surfing", name: "Urge Surfing", modality: "DBT", group: "crisis",
    purpose: "Ride an intense urge or craving without acting on it — it will peak and pass.",
    steps: ["Notice the urge as a physical sensation (tightness, heat, restlessness).", "Picture it as a wave: it rises, crests, and falls — you don't have to feed it.", "Breathe into the sensation and observe it without judgment.", "Urges typically peak within 15–30 minutes and fade if you don't act on them."],
    basis: "Urge-surfing is a core relapse-prevention skill (Marlatt & Gordon 1985, Relapse Prevention); supported by mindfulness-based relapse prevention (Bowen et al. 2014, JAMA Psychiatry)." },

  // ── Mindfulness (DBT + adjacent) ──
  { id: "wise-mind", name: "Wise Mind", modality: "DBT", group: "mindfulness",
    purpose: "Find the balance between raw emotion and cold logic. Honest expectation: brief mindfulness practices like this tend to help a little, with repetition — not a symptom treatment on their own.",
    steps: ["Notice if you're in Emotion Mind (driven by feeling) or Reasonable Mind (pure logic).", "Breathe into the space between them.", "Ask Wise Mind — the calm inner knowing — what fits both your values and the facts."],
    basis: "Linehan 2015, DBT Skills Training Manual (Mindfulness). Effect-size honesty: brief-mindfulness effects are small (g=0.21, dropping to g=0.04 after publication-bias adjustment) — Schumer, Lindsay & Creswell, 2018, J Consulting and Clinical Psychology." },
  { id: "what-skills", name: "Observe, Describe, Participate", modality: "DBT", group: "mindfulness",
    purpose: "The 'what' skills — how to pay attention.",
    steps: ["Observe: notice the experience without words.", "Describe: put just the facts into words (\"my chest is tight\").", "Participate: throw yourself fully into the present activity."],
    basis: "Linehan 2015, DBT Skills Training Manual (Mindfulness — 'what' skills)." },
  { id: "how-skills", name: "Nonjudgmentally · One-mindfully · Effectively", modality: "DBT", group: "mindfulness",
    purpose: "The 'how' skills — the stance to take while paying attention.",
    steps: ["Nonjudgmentally: drop \"good/bad\"; stick to facts and consequences.", "One-mindfully: do one thing at a time, fully.", "Effectively: do what works toward your goal, not what's \"right.\""],
    basis: "Linehan 2015, DBT Skills Training Manual (Mindfulness — 'how' skills)." },
  { id: "54321", name: "5-4-3-2-1 Senses Grounding", modality: "DBT", group: "mindfulness",
    purpose: "Pull yourself out of a thought spiral and into the room.",
    steps: ["Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.", "Go slowly — the point is to bring your attention back to this moment."],
    basis: "Grounding/orienting practice; consistent with MBCT (Segal et al. 2002)." },
  { id: "box-breathing", name: "Box / Paced Breathing", modality: "DBT", group: "mindfulness",
    purpose: "Down-regulate the nervous system in ~2 minutes.",
    steps: ["Breathe in 4, hold 4, out 4, hold 4 (box) — or simply make the out-breath longer than the in-breath.", "Repeat for a few cycles; a longer exhale raises vagal (parasympathetic) tone."],
    basis: "Slow-breathing raises vagal activity and signals safety (Thayer & Lane 2009, Neurosci. Biobehav. Rev.)." },
  { id: "name-it", name: "Name It to Tame It (Affect Labeling)", modality: "DBT", group: "mindfulness",
    purpose: "Lower a feeling's intensity by putting it into words.",
    steps: ["Say or write what you feel: \"I'm feeling ashamed / anxious.\"", "Naming shifts activity from the amygdala toward the prefrontal cortex and reduces intensity."],
    basis: "Lieberman et al. 2007, Psychological Science (affect labeling); Torre & Lieberman 2018, Curr. Dir. Psychol. Sci." },
  { id: "body-scan", name: "Body Scan", modality: "DBT", group: "mindfulness",
    purpose: "Safely bring attention to body sensations and release held tension.",
    steps: ["Sit or lie down and close your eyes gradually.", "Bring attention to your feet — just notice sensations without changing them.", "Slowly move attention up through legs, torso, arms, neck, and head.", "Spend 20–30 seconds on each area; if you encounter pain or numbness, breathe into it and stay curious.", "If your mind wanders, gently bring it back to the next body area."],
    basis: "Body scan is a core MBCT practice (Segal, Williams & Teasdale 2002, Mindfulness-Based Cognitive Therapy); reduces rumination and emotional reactivity (Farb et al. 2010, NeuroImage)." },
  { id: "rain", name: "RAIN", acronym: "Recognize · Allow · Investigate · Nurture", modality: "DBT", group: "mindfulness",
    purpose: "Meet a difficult emotional moment with mindful presence and self-compassion.",
    steps: ["Recognize what's happening — name the feeling or thought.", "Allow it to be there without fixing, judging, or pushing it away.", "Investigate with curiosity — where in your body do you feel this? What does it need?", "Nurture with kindness — put a hand on your heart and offer yourself warmth."],
    basis: "RAIN originated in Insight Meditation (Kornfield 2008, The Wise Heart); adapted for therapy by Brach (2019, Radical Compassion)." },
  { id: "loving-kindness", name: "Loving-Kindness (Metta)", modality: "CFT", group: "mindfulness",
    purpose: "Cultivate goodwill toward yourself and others, countering shame and isolation.",
    steps: ["Sit comfortably and bring to mind someone who naturally evokes warmth.", "Silently offer them phrases: \"May you be happy. May you be safe. May you be healthy. May you live with ease.\"", "After a few minutes, turn the same phrases toward yourself.", "Then extend to a neutral person, then to all beings."],
    basis: "Loving-kindness meditation increases daily positive emotions and life satisfaction (Fredrickson et al. 2008, J. Pers. Soc. Psychol.); reduces self-criticism in depression (Shahar et al. 2015, J. Consult. Clin. Psychol.)." },
  { id: "leaves-stream", name: "Leaves on a Stream", modality: "ACT", group: "mindfulness",
    purpose: "Create distance from thoughts by watching them come and go.",
    steps: ["Close your eyes and picture a gentle stream.", "Place each thought on a leaf floating past — don't jump on the leaf, just watch it drift.", "If a thought loops back, place it on a new leaf.", "You are the riverbank, not the stream — thoughts pass, you remain."],
    basis: "Leaves-on-a-stream is a defusion and observing-self practice (Hayes & Smith 2005, Get Out of Your Mind and Into Your Life)." },

  // ── Emotion Regulation (DBT) ──
  { id: "check-the-facts", name: "Check the Facts", modality: "DBT", group: "emotion",
    purpose: "See whether an emotion fits the facts or is amplified by interpretation.",
    steps: ["Name the emotion and its intensity.", "What event prompted it? What are you assuming/interpreting?", "What are the actual facts? Does the emotion (and its intensity) fit them?", "If not, the next step is often Opposite Action."],
    basis: "Linehan 2015, DBT Skills Training Manual (Emotion Regulation)." },
  { id: "opposite-action", name: "Opposite Action", modality: "DBT", group: "emotion",
    purpose: "Change an emotion that doesn't fit the facts by acting opposite to its urge.",
    steps: ["Identify the emotion's urge (e.g. fear → avoid; shame → hide).", "If the emotion doesn't fit the facts (or acting on it won't help), do the opposite — fully and repeatedly.", "Approach what fear says avoid; be visible when shame says hide."],
    basis: "Linehan 2015, DBT Skills Training Manual (Emotion Regulation)." },
  { id: "please", name: "PLEASE (reduce vulnerability)", acronym: "treat PhysicaL illness · balanced Eating · Avoid mood-altering substances · balanced Sleep · Exercise", modality: "DBT", group: "emotion",
    purpose: "Lower your baseline emotional vulnerability by caring for the body.",
    steps: ["Treat physical illness; eat in a balanced way; avoid non-prescribed mood-altering substances; protect sleep; move your body.", "These don't fix emotions directly — they shrink how easily emotions hijack you."],
    basis: "Linehan 2015, DBT Skills Training Manual (Emotion Regulation — ABC PLEASE)." },
  { id: "accumulate-positives", name: "Accumulate Positives & Build Mastery", modality: "DBT", group: "emotion",
    purpose: "Build a life with more positive emotion and a sense of competence.",
    steps: ["Short-term: do one pleasant activity today, and be present for it.", "Long-term: take small steps toward a life worth living.", "Build mastery: do one thing that gives a sense of accomplishment."],
    basis: "Linehan 2015, DBT Skills Training Manual (Emotion Regulation); overlaps Behavioural Activation." },
  { id: "cope-ahead", name: "Cope Ahead", modality: "DBT", group: "emotion",
    purpose: "Rehearse coping for a situation you know will be hard.",
    steps: ["Name the situation likely to trigger you.", "Decide which skills you'll use.", "In imagination, vividly rehearse coping well — including handling setbacks.", "You're pre-loading the response so it's available under stress."],
    basis: "Linehan 2015, DBT Skills Training Manual (Emotion Regulation)." },
  { id: "ride-the-wave", name: "Ride the Wave (Mindfulness of Emotion)", modality: "DBT", group: "emotion",
    purpose: "Let an emotion rise and fall without acting on it or suppressing it.",
    steps: ["Notice the emotion as a body sensation; locate it.", "Picture it as a wave — it rises, peaks, and falls if you don't feed it.", "Breathe and observe; don't push it away or amplify it.", "Emotions are time-limited when you stop fueling them with rumination."],
    basis: "Linehan 2015 (Emotion Regulation); urge/emotion surfing (Marlatt & Gordon, relapse-prevention)." },
  { id: "abc-please", name: "ABC PLEASE", acronym: "Accumulate positives · Build mastery · Cope ahead · treat PhysicaL illness · balanced Eating · Avoid mood-altering · balanced Sleep · Exercise", modality: "DBT", group: "emotion",
    purpose: "A comprehensive set of skills to reduce emotional vulnerability over time.",
    steps: ["Accumulate short-term positives (one pleasant activity today) and long-term positives (build a life worth living).", "Build Mastery — do one small thing daily that gives a sense of accomplishment.", "Cope Ahead — rehearse a plan for an upcoming difficult situation.", "PLEASE: treat Physical illness, balanced Eating, Avoid mood-altering substances, balanced Sleep, Exercise — these lower the baseline vulnerability that emotions hijack."],
    basis: "Linehan 2015, DBT Skills Training Manual (ABC PLEASE skill); emotion vulnerability model validated by Axelrod et al. 2013, Behav. Res. Ther." },
  { id: "emotion-exposure", name: "Emotion Exposure (Urge Reduction)", modality: "CBT", group: "emotion",
    purpose: "Reduce the intensity of a painful emotion by deliberately approaching it in safe doses.",
    steps: ["Start with a mild emotion (e.g. mild sadness or anxiety at 3/10).", "Bring it to mind through a memory or image, and stay with the body sensation for 30–60 seconds.", "Notice the urge to escape or suppress — allow it without acting.", "Over repeated practice, the emotional response habituates and loses intensity."],
    basis: "Emotion exposure therapy — emotional processing theory (Foa & Kozak 1986, Psychol. Bull.); inhibitory learning model (Craske et al. 2014, Behav. Res. Ther.)." },

  // ── Relationships (DBT Interpersonal Effectiveness) ──
  { id: "dearman", name: "DEAR MAN", acronym: "Describe · Express · Assert · Reinforce · (stay) Mindful · Appear confident · Negotiate", modality: "DBT", group: "relationships",
    purpose: "Ask for something or say no effectively (getting your objective).",
    steps: ["Describe the facts; Express your feelings with \"I\"; Assert your ask/no clearly; Reinforce (why it helps them too).", "Stay Mindful (broken-record, ignore attacks); Appear confident; Negotiate / offer alternatives."],
    basis: "Linehan 2015, DBT Skills Training Manual (Interpersonal Effectiveness)." },
  { id: "give", name: "GIVE (keep the relationship)", acronym: "Gentle · (act) Interested · Validate · Easy manner", modality: "DBT", group: "relationships",
    purpose: "Make a request or disagree while protecting the relationship.",
    steps: ["Be Gentle — no attacks, threats, or judging.", "Act Interested — listen, don't interrupt.", "Validate the other person's feelings/view.", "Easy manner — a little lightness and warmth."],
    basis: "Linehan 2015, DBT Skills Training Manual (Interpersonal Effectiveness)." },
  { id: "fast", name: "FAST (keep self-respect)", acronym: "(be) Fair · (no over-) Apologies · Stick to values · (be) Truthful", modality: "DBT", group: "relationships",
    purpose: "Interact in a way that leaves your self-respect intact.",
    steps: ["Be Fair to yourself and them.", "Don't over-apologise for existing or asking.", "Stick to your values — don't sell out to be liked.", "Be Truthful — no exaggerating or acting helpless."],
    basis: "Linehan 2015, DBT Skills Training Manual (Interpersonal Effectiveness)." },
  { id: "think", name: "THINK (before reacting)", acronym: "Thoughtful · Helpful · Inspiring · Necessary · Kind", modality: "DBT", group: "relationships",
    purpose: "Pause and reflect before sending a message or saying something you might regret.",
    steps: ["Is it Thoughtful — have I considered the other person's perspective?", "Is it Helpful — does this need to be said right now?", "Is it Inspiring — do I want the conversation to go in a good direction?", "Is it Necessary — would silence also work?", "Is it Kind — can I say this with gentleness?"],
    basis: "THINK is a popular interpersonal mindfulness tool with roots in DBT's interpersonal effectiveness and Buddhist Right Speech (skillful communication)." },
  { id: "validation", name: "Validation (levels 1–6)", modality: "DBT", group: "relationships",
    purpose: "Show the other person their feelings make sense, even if you disagree.",
    steps: ["Listen without interrupting.", "Reflect back what you heard (level 2 validation).", "Read their mind — guess what they might be feeling but haven't said (level 4).", "Validate in context — their reaction makes sense given their history (level 5).", "Radical genuineness — treat them as capable, not fragile (level 6)."],
    basis: "Linehan 2015, DBT Skills Training Manual (Interpersonal Effectiveness — validation); validation is a core mechanism of therapeutic alliance (Linehan 1997)." },

  // ── Thoughts (CBT) ──
  { id: "thought-record", name: "Thought Record", modality: "CBT", group: "thoughts",
    purpose: "Catch and re-balance an automatic thought driving a strong feeling.",
    steps: ["Situation → emotion (rate 0–100%) → the automatic thought.", "Evidence for the thought, and evidence against it.", "Write a more balanced, fact-based thought.", "Re-rate the emotion."],
    basis: "Beck et al. 1979; Beck 2011 — core cognitive restructuring tool." },
  { id: "spot-distortion", name: "Spot the Thinking Trap", modality: "CBT", group: "thoughts",
    purpose: "Name the cognitive distortion to loosen its grip.",
    steps: ["Catch the thought, then check it against common traps: all-or-nothing, catastrophizing, mind-reading, fortune-telling, should-statements, labeling, emotional reasoning.", "Naming the distortion creates distance from it."],
    basis: "Cognitive distortions: Beck 1979; Burns 1980 (Feeling Good)." },
  { id: "behavioural-experiment", name: "Behavioural Experiment", modality: "CBT", group: "thoughts",
    purpose: "Test a fearful belief in reality instead of arguing with it in your head.",
    steps: ["State the belief and how strongly you hold it (0–100%).", "Design a small real-world test with a clear prediction.", "Run it; record what actually happened.", "Update the belief based on the result."],
    basis: "Beck 2011; behavioural experiments are among CBT's most powerful change methods." },
  { id: "worry-time", name: "Scheduled Worry Time", modality: "CBT", group: "thoughts",
    purpose: "Contain rumination instead of letting it run all day.",
    steps: ["When a worry hits, jot it down and postpone it.", "Set a fixed 15-minute \"worry window\" later in the day.", "During the window, review the list; many worries have faded or are solvable."],
    basis: "Stimulus-control treatment for worry (Borkovec et al. 1983)." },
  { id: "problem-solving", name: "Structured Problem-Solving", modality: "CBT", group: "thoughts",
    purpose: "Turn a vague overwhelming problem into a concrete next step.",
    steps: ["Define the problem specifically.", "Brainstorm options without judging them.", "Weigh pros/cons; pick one.", "Plan the first small action; do it; review."],
    basis: "Problem-solving therapy (D'Zurilla & Nezu) — effective for depression." },
  { id: "graded-exposure", name: "Graded Exposure", modality: "CBT", group: "thoughts",
    purpose: "Shrink anxiety and avoidance by approaching fears step by step.",
    steps: ["Build a ladder of feared situations from easiest to hardest.", "Start near the bottom; stay until anxiety drops by about half.", "Repeat until it's easy, then climb one rung.", "Avoidance feeds anxiety; approach starves it."],
    basis: "Exposure is the most evidence-based treatment for anxiety disorders (Craske et al. 2014, Behav. Res. Ther.); meta-analysis g=0.89 (Carpenter et al. 2018, Am. J. Psychiatry)." },
  { id: "cognitive-continuum", name: "The Cognitive Continuum", modality: "CBT", group: "thoughts",
    purpose: "Break out of all-or-nothing thinking by placing a thought on a spectrum.",
    steps: ["Identify the black-and-white thought (\"I completely failed\", \"Nobody cares\").", "Ask: what's the middle ground? Has there been ANY evidence against the extreme?", "Rate the thought on a 0–100% continuum — where does the evidence actually fall?", "Revise to a more balanced statement that fits reality."],
    basis: "Cognitive continuum is a core CBT technique for polarization (Beck 2011, Cognitive Behavior Therapy); all-or-nothing thinking predicts depression severity (Eaves & Rush 1984, J. Abnorm. Psychol.)." },
  { id: "socratic-questioning", name: "Socratic Questioning (Guided Discovery)", modality: "CBT", group: "thoughts",
    purpose: "Question your automatic thoughts with evidence and logic, guided by curiosity.",
    steps: ["What is the evidence for and against this thought?", "What would I tell a close friend who had this same thought?", "What's an alternative way to see this situation?", "What's the most realistic outcome, not the worst or best?", "If my thought is true, what can I actually do about it?"],
    basis: "Socratic questioning is a foundational CBT method for cognitive restructuring (Beck et al. 1979; Padesky & Greenberger 1995, Mind Over Mood)." },
  { id: "three-cs", name: "Catch, Check, Change (The Three C's)", modality: "CBT", group: "thoughts",
    purpose: "A quick three-step way to reframe an automatic negative thought.",
    steps: ["Catch: notice the automatic negative thought — write it down if possible.", "Check: is this thought 100% true? What's the evidence? Is there a thinking trap here?", "Change: write a more balanced, realistic thought that fits the evidence better."],
    basis: "The Three C's are widely used in CBT psychoeducation (Beck 2011); similar to cognitive restructuring in cognitive therapy for depression (Hollon & Beck 2013, Annu. Rev. Clin. Psychol.)." },

  // ── Acceptance & Values (ACT) ──
  { id: "defusion", name: "Cognitive Defusion", modality: "ACT", group: "values",
    purpose: "Unhook from a sticky thought so it has less pull.",
    steps: ["Add a prefix: \"I'm having the thought that…\"", "Or picture the thought on a leaf floating down a stream / sung in a silly voice.", "You're not arguing with the thought — just seeing it as a thought, not a command."],
    basis: "Hayes et al. 2011, Acceptance and Commitment Therapy (defusion)." },
  { id: "acceptance-expansion", name: "Acceptance / Expansion", modality: "ACT", group: "values",
    purpose: "Make room for a hard feeling instead of fighting it.",
    steps: ["Locate the feeling in your body; breathe into it.", "Drop the struggle — let it be there without acting on it.", "Allowing a feeling costs far less energy than suppressing it."],
    basis: "Hayes et al. 2011, Acceptance and Commitment Therapy (acceptance)." },
  { id: "values-clarify", name: "Values Clarification", modality: "ACT", group: "values",
    purpose: "Reconnect with what actually matters when life feels pointless.",
    steps: ["Pick a life domain (relationships, work, health, growth…).", "Ask: what kind of person do I want to be here? What do I want to stand for?", "Values are directions, not goals you finish."],
    basis: "Hayes et al. 2011; see the in-app Values Compass." },
  { id: "committed-action", name: "Committed Action", modality: "ACT", group: "values",
    purpose: "Take one small step toward a value, regardless of mood.",
    steps: ["Choose a value you've drifted from.", "Pick the smallest real action that moves toward it.", "Do it now or schedule it — action first, motivation follows."],
    basis: "Hayes et al. 2011; overlaps Behavioural Activation (act before motivation)." },
  { id: "present-moment", name: "Contact with the Present", modality: "ACT", group: "values",
    purpose: "Step out of past/future churn and into now.",
    steps: ["Drop into the senses — feet on floor, breath, sounds.", "Notice you're the one noticing.", "The present is the only place you can actually act."],
    basis: "Hayes et al. 2011, Acceptance and Commitment Therapy (present-moment contact)." },
  { id: "observer-self", name: "Observer Self", modality: "ACT", group: "values",
    purpose: "Find the stable 'you' that all your feelings pass through.",
    steps: ["Notice: thoughts, feelings, and roles change — but the awareness watching them stays.", "Rest as the observer for a moment.", "You are the sky; feelings are the weather."],
    basis: "Hayes et al. 2011, Acceptance and Commitment Therapy (self-as-context)." },
  { id: "values-exposure", name: "Values-Based Exposure", modality: "ACT", group: "values",
    purpose: "Face a feared situation because it matters, not to prove anything.",
    steps: ["Identify a value (e.g. being a present parent, a brave friend).", "Find one feared action that would move you toward that value.", "Acknowledge the fear, then move toward it anyway — with the value as your reason.", "Afterward, notice: the value was real, the fear was temporary."],
    basis: "Values-based exposure integrates ACT with exposure therapy (Twohig & Hayes 2008, J. Contemp. Psychother.); values-consistent action reduces avoidance (Flynn & Wilson 2020, Behav. Anal. Pract.)." },

  // ── Self-Compassion (CFT) ──
  { id: "soothing-breath", name: "Soothing Rhythm Breathing", modality: "CFT", group: "compassion",
    purpose: "Activate the body's soothing system before compassion work.",
    steps: ["Slow your breath to a comfortable, even rhythm (slightly slower than usual).", "Let your body slow down with it for 30–60 seconds.", "This gently shifts you out of threat and into the soothing system."],
    basis: "Gilbert 2009, The Compassionate Mind (three-systems model)." },
  { id: "compassionate-self", name: "Compassionate Self Imagery", modality: "CFT", group: "compassion",
    purpose: "Step into a wiser, kinder version of yourself to meet your pain.",
    steps: ["Picture your most compassionate self: strong, warm, non-judging.", "From that self, look at your current struggle.", "What would this compassionate self say and do?"],
    basis: "Gilbert 2009, The Compassionate Mind (compassionate-self practice)." },
  { id: "self-compassion-break", name: "Self-Compassion Break", modality: "CFT", group: "compassion",
    purpose: "Three steps to meet a hard moment with kindness.",
    steps: ["Mindfulness: \"This is a moment of suffering.\"", "Common humanity: \"Suffering is part of being human — I'm not alone in this.\"", "Self-kindness: a hand on your heart — \"May I be kind to myself right now.\""],
    basis: "Neff 2011, Self-Compassion (the self-compassion break)." },
  { id: "compassionate-letter", name: "Compassionate Letter", modality: "CFT", group: "compassion",
    purpose: "Soften the inner critic by writing to yourself from a kind perspective.",
    steps: ["Write to yourself as you would to a dear friend in the same pain.", "Acknowledge the hurt; offer understanding, not fixes.", "Read it back slowly when the critic is loud."],
    basis: "Gilbert 2009; compassionate-mind training lowers self-criticism (Longe et al. 2010, NeuroImage)." },
  { id: "compassionate-body-scan", name: "Compassionate Body Scan", modality: "CFT", group: "compassion",
    purpose: "Bring a kind, attentive presence to each part of your body, especially places that hold tension.",
    steps: ["Settle into a comfortable position and place a hand over your heart.", "As you scan each body area, imagine breathing kindness into it.", "For tense areas, don't try to force relaxation — hold them with gentle awareness.", "End with hands on your chest and belly, breathing into warmth."],
    basis: "Compassionate body scan combines body awareness with affectionate attention (Gilbert 2009; Neff 2011); mindfully attending to the body reduces distress (Farb et al. 2010, NeuroImage)." },
  { id: "common-humanity", name: "Common Humanity Meditation", modality: "CFT", group: "compassion",
    purpose: "Counter shame and isolation by remembering you're not alone in your struggle.",
    steps: ["Bring to mind your current difficulty or imperfection.", "Silently say: \"This is part of being human. Others have felt this too.\"", "Picture others around the world who also struggle with this — you are not separate in your pain.", "Breathe with the sense of shared connection rather than isolation."],
    basis: "Common humanity is one of Neff's three pillars of self-compassion (Neff 2003, Self and Identity); reduces shame-linked cortisol and increases social connectedness (Breines & Chen 2012, J. Pers. Soc. Psychol.)." },
  { id: "affectionate-breathing", name: "Affectionate Breathing", modality: "CFT", group: "compassion",
    purpose: "Activate the soothing/affiliative system through slow, warm breathing directed toward the heart.",
    steps: ["Slow your breath to a comfortable rhythm — approximately 5–6 breaths per minute.", "As you breathe in, imagine the breath flowing into your heart area.", "As you breathe out, imagine the breath carrying warmth through your whole body.", "Keep a gentle half-smile on your lips; stay with the feeling of warmth for 2–3 minutes."],
    basis: "Affectionate breathing is a core CFT soothing-system practice (Gilbert 2009); slow breathing at ~5.5 breaths/min increases heart-rate variability and vagal tone (Thayer & Lane 2009, Neurosci. Biobehav. Rev.; Lehrer et al. 2003, Appl. Psychophysiol. Biofeedback)." },
  { id: "compassionate-reframing", name: "Compassionate Reframing", modality: "CFT", group: "compassion",
    purpose: "Catch the self-critical voice and offer a compassionate alternative. The inner critic usually wants to protect you — respond with wisdom, not more criticism.",
    steps: ["Notice the self-critical thought: \"I'm such a failure.\"", "Reframe with a compassionate perspective: \"I'm struggling right now — that's hard, not a character verdict.\"", "Offer what you'd say to a dear friend in this same situation.", "Write both the critic's voice and the compassionate reframe side by side."],
    basis: "CFT differentiates the self-critic's protective intent from its harmful effect (Gilbert 2009; Gilbert et al. 2004, Psychol. Psychother.); compassionate reframing reduces amygdala reactivity to self-criticism (Longe et al. 2010, NeuroImage)." },
];

/** Filter by group and/or a free-text query (matches name, acronym, purpose, modality). */
export function filterSkills(query: string, groupId: string | null): Skill[] {
  const q = query.trim().toLowerCase();
  return SKILLS.filter((s) => {
    if (groupId && s.group !== groupId) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.acronym ?? "").toLowerCase().includes(q) ||
      s.purpose.toLowerCase().includes(q) ||
      s.modality.toLowerCase().includes(q) ||
      s.steps.some((st) => st.toLowerCase().includes(q))
    );
  });
}

export function groupMeta(id: string): SkillGroup {
  return SKILL_GROUPS.find((g) => g.id === id) ?? SKILL_GROUPS[0];
}

/** Look up a skill by id. */
export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

// Emotion → a sensible first skill to reach for. Distress/anxiety → fast distress-tolerance;
// anger → a pause skill; low mood → behavioural activation; numbness → grounding; shame →
// self-compassion. Best-effort and gentle, never prescriptive — the user can ignore it.
const EMOTION_TO_SKILL: { match: RegExp; skill: string }[] = [
  // Chronic/ordinary worry routes to a worry-specific tool, not TIPP (2026-07-12 wave-2 fix). TIPP is a
  // crisis-intensity (8–10/10) DBT distress-tolerance skill, an intensity mismatch for ordinary GAD-style
  // worry — per Borkovec, Wilkinson, Folensbee & Lerman (1983). Checked BEFORE the panic/tipp pattern below
  // so "worried"/"worrying" don't fall through to the acute-arousal skill.
  { match: /worr/i, skill: "worry-time" },
  { match: /anx|panic|overwhelm|stress|fear|scared|nervous/i, skill: "tipp" },
  { match: /ang|mad|irrit|frustrat|rage/i, skill: "stop" },
  { match: /numb|dissoc|disconnect|blank/i, skill: "54321" },
  { match: /sham|guilt|self-?crit|worthless/i, skill: "self-compassion-break" },
  { match: /lone|isolat/i, skill: "give" },
  { match: /low|sad|down|depress|empty|hopeless|blue|tired|exhaust/i, skill: "opposite-action" },
];

/** Suggest one skill for a recent check-in emotion, or null when it isn't a distress emotion we map. */
export function skillForEmotion(emotion: string): Skill | null {
  const e = (emotion || "").toLowerCase();
  for (const m of EMOTION_TO_SKILL) if (m.match.test(e)) return getSkill(m.skill) ?? null;
  return null;
}

/**
 * Find the one in-app skill Nila named in a reply, so the chat can offer to open it inline (the
 * Wysa "deliver the skill in the conversation" pattern). Nila is prompted to use EXACT skill names.
 * All-caps acronym names (TIPP, STOP, PLEASE, ACCEPTS, DEAR MAN…) are matched case-SENSITIVELY so we
 * don't mistake the ordinary lowercase word ("stop", "please") for the skill. Longest name wins, so
 * "DEAR MAN" beats a shorter sub-match. Returns null when no skill is mentioned.
 */
export function findSkillInText(text: string): Skill | null {
  if (!text) return null;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byLongest = [...SKILLS].sort((a, b) => b.name.length - a.name.length);
  for (const s of byLongest) {
    if (s.name.length < 3) continue; // too short to match safely
    const isAcronym = s.name === s.name.toUpperCase() && /[A-Z]/.test(s.name);
    const re = new RegExp(`\\b${esc(s.name)}\\b`, isAcronym ? "" : "i");
    if (re.test(text)) return s;
  }
  return null;
}

/** Compact summary of the library for Nila's system prompt, so the coach recommends skills that
 *  actually exist in the app (by exact name) and the user can open them to follow the steps. */
export function skillsPromptBlock(): string {
  const byGroup = SKILL_GROUPS.map((g) => {
    const names = SKILLS.filter((s) => s.group === g.id).map((s) => s.name).join(", ");
    return `- ${g.label}: ${names}`;
  }).join("\n");
  return `IN-APP SKILLS LIBRARY — when you suggest a coping skill, prefer ONE of these EXACT names so the user can open it in the app's Skills Library and follow the steps. Pick the single best-matched skill for the moment; never list several.\n${byGroup}`;
}
