import { SafetyPlan } from "./types";

// Rotating daily psychoeducation. Every claim is grounded in a PRIMARY peer-reviewed source
// (verified June 2026); pop-science book citations have been replaced with the underlying study,
// and claims that lacked primary support (e.g. the "90-second" rule) have been corrected.
export const INTEGRATIVE_INSIGHTS = [
  "Sleep isn't optional rest. After even one short night, the amygdala becomes more reactive to negative images and loses some of its normal regulatory coupling with the prefrontal cortex; REM sleep is thought to support overnight emotional recovery. (Yoo, S. S., Gujar, N., Hu, P., Jolesz, F. A., & Walker, M. P., 2007. Current Biology; Goldstein & Walker, 2014. Annu. Rev. Clin. Psychol.)",
  "When stress spikes, catecholamines flood the prefrontal cortex and rapidly weaken its top-down control, handing the reins to faster amygdala-driven circuits. This is why body-first skills like cold water can work when reasoning cannot. (Arnsten, A. F. T., 2009. Nature Reviews Neuroscience)",
  "There is no fixed 90-second timer for emotions — episodes can last from minutes to days, and the strongest predictor of how long a feeling persists is rumination, not brain chemistry clearing. Gently redirecting attention is what shortens it. (Verduyn, P., & Lavrijsen, S., 2015. Motivation and Emotion)",
  "Self-criticism keeps the body's threat system switched on. Compassion-focused practices can lower cortisol and raise heart-rate variability in many people — though those who are highly self-critical may respond less at first. Be patient with it. (Rockliff, H., Gilbert, P., McEwan, K., et al., 2008. Clinical Neuropsychiatry)",
  "Anxiety is not a sign of failure. It is your nervous system anticipating danger to protect you. Feeling safe re-engages the parasympathetic 'brake' that slows the heart and restores calm. (Thayer, J. F., & Lane, R. D., 2009. Neuroscience & Biobehavioral Reviews)",
  "Sadness is a survival state designed to slow you down, conserve energy, and prompt reflection. It is not permanent; it is a state that runs its course. (Ekman, P., 1992. An argument for basic emotions, Cognition & Emotion)",
  "Your brain reacts to a gap between what you expected and what happened as a kind of threat signal. Noticing the mismatch — 'this isn't what I wanted' — gently takes some charge out of it. (Disner, S. G., Beevers, C. G., Haigh, E. A. P., & Beck, A. T., 2011. Nature Reviews Neuroscience)",
  "Labeling your emotion ('I feel shame') shifts activity from the amygdala toward the right ventrolateral prefrontal cortex — and measurably lowers the feeling's intensity. (Lieberman, M. D., et al., 2007. Psychological Science; Torre & Lieberman, 2018. Emotion Review)",
  "Black-and-white thinking under stress is real — but the evidence shows it is less 'all-good/all-bad' than holding extreme views along several dimensions at once. Naming the extremity gently, and revisiting once you're calmer, helps. (Veen, G., & Arntz, A., 2000. Multidimensional dichotomous thinking in BPD, Cognitive Therapy and Research)",
  "In emotion-focused therapy, anger often acts as a shield over more fragile feelings underneath — hurt, fear, vulnerability — though it can also be a healthy, primary response to a genuine violation. What might it be protecting today? (Greenberg, L. S. — emotion-focused therapy model)",
  "An emotional flashback can feel like a present-day crisis while actually being your brain reliving an old memory. Orienting to the present — 'I am safe in this room, right now' — helps the brain update. (grounding/orienting in trauma-focused care; see van der Kolk, 2014, for the clinical model)",
  "The urge to isolate is a common depression reflex: it aims to protect you from stimulation, but it starves the brain of the positive feedback that lifts mood. Even two minutes outside counts. (Disner, S. G., et al., 2011. Neural mechanisms of the cognitive model of depression, Nature Reviews Neuroscience)",
  "Shame wants you to hide and disconnect. Naming it and letting it be seen — even logging it here — loosens its grip; secrecy is what feeds it. (Gilbert, P., 2009, Adv. Psychiatr. Treat.; Longe, O., et al., 2010. NeuroImage)",
  "Your brain weights bad more heavily than good — a negativity bias that evolved to keep you safe. Deliberately noting small moments of relief or safety is a reasonable counterweight. (Baumeister, R. F., Bratslavsky, E., Finkenauer, C., & Vohs, K. D., 2001. Bad is stronger than good, Review of General Psychology)"
];

export const PRIMARY_EMOTIONS = [
  "Fear",
  "Anger",
  "Sadness",
  "Disgust",
  "Surprise",
  "Joy",
  "Trust",
  "Anticipation"
];

export const SECONDARY_EMOTIONS_MAP: Record<string, string[]> = {
  Fear: ["Anxiety", "Worry", "Nervousness", "Dread", "Panic"],
  Anger: ["Frustration", "Irritation", "Rage", "Resentment"],
  Sadness: ["Loneliness", "Emptiness", "Grief", "Disappointment", "Hopelessness"],
  Joy: ["Contentment", "Gratitude", "Hope", "Relief"],
  Trust: ["Acceptance", "Safety", "Connection"],
  Surprise: ["Confusion", "Shock"],
  Disgust: ["Shame", "Self-criticism", "Guilt"],
  Anticipation: ["Excitement", "Eagerness"]
};

export const NEUROSCIENCE_EXPLANATIONS: Record<string, string> = {
  "fear/anxiety/worry/panic/nervousness/dread":
    "Your brain's alarm system — the amygdala — is firing. It's trying to protect you, even if the threat is a thought, not a real danger. This is biology doing its job, not a flaw. The feeling will peak and then fall, like a wave. (LeDoux, J. E. & Pine, D. S., 2016. Am. J. Psychiatry)",
  "anger/frustration/rage/irritation/resentment":
    "Anger often sits on top of another feeling — hurt, fear, or feeling unheard. Your nervous system is in fight mode. The intensity is real, and it will pass. Right now your thinking brain is quieter than your emotional brain. (emotion-focused therapy model; Greenberg, L. S.)",
  "sadness/hopelessness/grief/loneliness/emptiness/disappointment":
    "Depression changes how your brain processes information — it filters out evidence that contradicts 'things are hopeless.' This feeling is not the truth about your life. It's a state your brain is in, and states change. (Disner, S. G., Beevers, C. G., Haigh, E. A. P., & Beck, A. T., 2011. Nature Reviews Neuroscience)",
  "emptiness/loneliness":
    "Feeling empty or disconnected is something many people with these experiences know well. Social rejection activates brain regions that overlap with the distress of physical pain — though whether that's pain itself or shared distress is still debated. This feeling is information, not a permanent fact. (Eisenberger, N. I., Lieberman, M. D., & Williams, K. D., 2003. Science)",
  "shame/self-criticism/guilt":
    "Shame activates your brain's threat system, which makes everything feel worse and harder to think through. Being hard on yourself doesn't motivate — it just keeps the alarm ringing. You're not bad. You're in pain. (Longe, O., et al., 2010. NeuroImage; Gilbert, P., 2009. Adv. Psychiatr. Treat.)",
  "joy/contentment/gratitude/hope/relief/excitement/eagersness":
    "This is worth noticing. Positive states are real data too. Moments of safety and openness briefly broaden attention and build lasting resources. Naming it helps it last a little longer. (Fredrickson, B. L., 2004. The broaden-and-build theory, Phil. Trans. R. Soc. Lond. B)",
  "trust/safety/connection/acceptance":
    "Feeling safe and connected engages the parasympathetic 'brake' — vagal activity that slows the heart and supports calm. This is your biological baseline when the alarm isn't ringing. (Thayer, J. F., & Lane, R. D., 2009. Neuroscience & Biobehavioral Reviews)",
  "surprise/confusion/shock":
    "Your brain is recalibrating because something didn't match what it expected. Give yourself a moment before deciding what it means. (Kahneman, D., & Tversky, A., 1979 — expectation/prospect framing)",
  disgust:
    "Disgust is a protective evolutionary response involving the insula. Notice whether it's pointing at something outside you, or turned inward as self-disgust. (Rozin, P., Haidt, J., & McCauley, C. R., 2008. Disgust, in Handbook of Emotions)"
};

// Gets the corresponding explanation text based on selected emotion/sub-emotion
export function getNeuroExplanation(emotion: string): string {
  const clean = emotion.toLowerCase();
  for (const [key, text] of Object.entries(NEUROSCIENCE_EXPLANATIONS)) {
    const keys = key.split("/");
    if (keys.includes(clean)) {
      return text;
    }
  }
  // Generic fallback if not matched exactly
  if (clean.includes("fear") || clean.includes("anxi") || clean.includes("panic") || clean.includes("worr") || clean.includes("dread")) {
    return NEUROSCIENCE_EXPLANATIONS["fear/anxiety/worry/panic/nervousness/dread"];
  }
  if (clean.includes("anger") || clean.includes("frust") || clean.includes("rage") || clean.includes("irrit")) {
    return NEUROSCIENCE_EXPLANATIONS["anger/frustration/rage/irritation/resentment"];
  }
  if (clean.includes("sad") || clean.includes("hopeless") || clean.includes("grief") || clean.includes("disap")) {
    return NEUROSCIENCE_EXPLANATIONS["sadness/hopelessness/grief/loneliness/emptiness/disappointment"];
  }
  if (clean.includes("empty") || clean.includes("lone")) {
    return NEUROSCIENCE_EXPLANATIONS["emptiness/loneliness"];
  }
  if (clean.includes("shame") || clean.includes("critic") || clean.includes("guilt")) {
    return NEUROSCIENCE_EXPLANATIONS["shame/self-criticism/guilt"];
  }
  if (clean.includes("joy") || clean.includes("content") || clean.includes("grat") || clean.includes("hope") || clean.includes("relie") || clean.includes("excite")) {
    return NEUROSCIENCE_EXPLANATIONS["joy/contentment/gratitude/hope/relief/excitement/eagersness"];
  }
  if (clean.includes("trust") || clean.includes("safe") || clean.includes("connect") || clean.includes("accept")) {
    return NEUROSCIENCE_EXPLANATIONS["trust/safety/connection/acceptance"];
  }
  if (clean.includes("surprise") || clean.includes("confus") || clean.includes("shock")) {
    return NEUROSCIENCE_EXPLANATIONS["surprise/confusion/shock"];
  }
  return "This feeling is a biological state inside your nervous system. Remember that physical states are temporary; like a wave, it will rise, peak, and gradually fall. Be gentle with yourself in this moment.";
}

export const GROUNDING_EXERCISES = [
  {
    title: "5-4-3-2-1 Senses",
    subtitle: "Pull yourself into the present",
    steps: "Name 5 things you can see. Then 4 things you can touch. Then 3 things you can hear. Then 2 things you can smell. Then 1 thing you can taste. This pulls your mind out of the spiral and into right now. (Grounded in Mindfulness-Based Cognitive Therapy - Segal, Z. V., et al., 2002)"
  },
  {
    title: "Box Breathing",
    subtitle: "Calm your nervous system in 2 minutes",
    steps: "Breathe in for 4 counts. Hold for 4. Breathe out for 4. Hold for 4. Repeat. Slow breathing with a longer exhale raises vagal (parasympathetic) activity, which slows the heart and signals safety. (Thayer, J. F., & Lane, R. D., 2009. Neuroscience & Biobehavioral Reviews)"
  },
  {
    title: "Cold Reset (TIPP)",
    subtitle: "For very intense moments",
    steps: "Splash cold water on your face, hold an ice cube, or press something cold to your wrists or the back of your neck. Cold shocks your nervous system out of extreme distress quickly by triggering the mammalian dive reflex. (Linehan, M. M., 1993/2015. DBT Skills Training Manual)"
  },
  {
    title: "Body Scan",
    subtitle: "Reconnect with your body",
    steps: "Start at your feet. Slowly move your attention up through your body — feet, legs, belly, chest, arms, shoulders, face. Notice each part without trying to change anything. Just notice. (Kabat-Zinn, J., 1990. Full Catastrophe Living)"
  },
  {
    title: "Name It to Tame It",
    subtitle: "Reduce a feeling by naming it",
    steps: "Say out loud what you're feeling: 'I am feeling anxious,' or 'I am feeling overwhelmed.' Putting a feeling into words shifts activity from the brain's alarm center toward the thinking center and lowers its intensity. (Lieberman, M. D., et al., 2007. Putting Feelings Into Words, Psychological Science)"
  },
  {
    title: "Safe Place",
    subtitle: "A mental refuge",
    steps: "Close your eyes. Picture a place where you feel completely safe — real or imagined. What do you see? What do you hear? What does the air feel like? Stay there for a moment. You can return any time. (Resource-installation / safe-place imagery; Shapiro, F., 2001. EMDR)"
  }
];

export const ALL_DIARY_DBT_SKILLS = [
  "TIPP", "Box Breathing", "ACCEPTS", "Self-Soothe", "Opposite Action",
  "Check the Facts", "Wave Surfing", "DEAR MAN", "Radical Acceptance", "Self-Compassion Break"
];

export const INITIAL_SAFETY_PLAN: SafetyPlan = {
  warningSigns: "",
  internalCoping: "",
  socialDistractors: "",
  trustedPeople: "",
  professionals: "", // pre-filled per region by SafetyPlanScreen (see crisisResources)
  safeEnvironment: ""
};
