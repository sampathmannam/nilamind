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

export type Modality = "DBT" | "CBT" | "ACT" | "CFT";

export interface SkillGroup {
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
    steps: ["Temperature: hold something cold / splash cold water on your face (triggers the dive reflex).", "Intense exercise: ~20 jumping jacks or run in place for 1 minute to burn off adrenaline.", "Paced breathing: breathe out longer than you breathe in (e.g. in 4, out 6).", "Paired muscle relaxation: tense, then release muscle groups as you exhale."],
    basis: "Linehan 2015, DBT Skills Training Manual — crisis survival skills; cold/longer-exhale raise vagal tone (Thayer & Lane 2009)." },
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

  // ── Mindfulness (DBT + adjacent) ──
  { id: "wise-mind", name: "Wise Mind", modality: "DBT", group: "mindfulness",
    purpose: "Find the balance between raw emotion and cold logic.",
    steps: ["Notice if you're in Emotion Mind (driven by feeling) or Reasonable Mind (pure logic).", "Breathe into the space between them.", "Ask Wise Mind — the calm inner knowing — what fits both your values and the facts."],
    basis: "Linehan 2015, DBT Skills Training Manual (Mindfulness)." },
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
    basis: "Lieberman et al. 2007, Psychological Science (affect labeling)." },

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
    basis: "Exposure is the most evidence-based treatment for anxiety disorders (Craske et al. 2014)." },

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
  { match: /anx|panic|worr|overwhelm|stress|fear|scared|nervous/i, skill: "tipp" },
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
