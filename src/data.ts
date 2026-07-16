import { SafetyPlan } from "./types";

export const GROUNDING_EXERCISES = [
  {
    title: "5-4-3-2-1 Senses",
    subtitle: "Pull yourself into the present",
    steps: "Name 5 things you can see. Then 4 things you can touch. Then 3 things you can hear. Then 2 things you can smell. Then 1 thing you can taste. This pulls your mind out of the spiral and into right now. (A widely-used grounding practice; not tied to a specific published trial.)"
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

// Default target-behavior urges tracked on the diary card — the standard DBT diary card's
// "life-threatening behaviors" tier (UW BRTC diary card; DBT Self Help). Rating an urge, even a
// high one, is purely self-report: it never triggers any live intervention on its own.
export const DEFAULT_DIARY_URGE_DEFS: { key: string; label: string }[] = [
  { key: "selfHarm", label: "Urge to self-harm" },
  { key: "suicidal", label: "Suicidal urge" },
  { key: "substanceUse", label: "Urge to use substances" },
];

export const INITIAL_SAFETY_PLAN: SafetyPlan = {
  warningSigns: "",
  internalCoping: "",
  socialDistractors: "",
  trustedPeople: "",
  professionals: "", // pre-filled per region by SafetyPlanScreen (see crisisResources)
  safeEnvironment: ""
};
