import { secureLocal } from "./secureLocal";

const PLAN_KEY = "nilamind_relapse_plan";

export type PlanPhase = "green" | "orange" | "red";

export interface PhaseSignals {
  thoughts: string;
  feelings: string;
  behaviors: string;
  physical: string;
}

export interface PhaseActions {
  selfCare: string[];
  copingSkills: string[];
  reachOut: string[];
  crisisHelp: string[];
}

export interface RelapsePlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  green: {
    signals: PhaseSignals;
    actions: PhaseActions;
  };
  orange: {
    signals: PhaseSignals;
    actions: PhaseActions;
  };
  red: {
    signals: PhaseSignals;
    actions: PhaseActions;
    crisisLines: string[];
    emergencyContacts: string[];
  };
}

export const EMPTY_SIGNALS: PhaseSignals = {
  thoughts: "",
  feelings: "",
  behaviors: "",
  physical: "",
};

export const EMPTY_ACTIONS: PhaseActions = {
  selfCare: [],
  copingSkills: [],
  reachOut: [],
  crisisHelp: [],
};

export function createEmptyPlan(): RelapsePlan {
  const now = new Date().toISOString();
  return {
    id: "rp_" + Date.now(),
    createdAt: now,
    updatedAt: now,
    green: { signals: { ...EMPTY_SIGNALS }, actions: { ...EMPTY_ACTIONS } },
    orange: { signals: { ...EMPTY_SIGNALS }, actions: { ...EMPTY_ACTIONS } },
    red: { signals: { ...EMPTY_SIGNALS }, actions: { ...EMPTY_ACTIONS }, crisisLines: [], emergencyContacts: [] },
  };
}

export function loadRelapsePlan(): RelapsePlan | null {
  try {
    const raw = secureLocal.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RelapsePlan;
  } catch {
    return null;
  }
}

export function saveRelapsePlan(plan: RelapsePlan): void {
  plan.updatedAt = new Date().toISOString();
  secureLocal.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function currentPhase(plan: RelapsePlan | null): PlanPhase {
  if (!plan) return "green";
  if (plan.red.signals.thoughts || plan.red.actions.crisisHelp.length > 0) return "red";
  if (plan.orange.signals.thoughts || plan.orange.actions.reachOut.length > 0) return "orange";
  return "green";
}

export function phaseLabel(phase: PlanPhase): string {
  switch (phase) {
    case "green": return "Green — I'm steady";
    case "orange": return "Orange — Things are shifting";
    case "red": return "Red — I need help now";
  }
}

export function phaseDescription(phase: PlanPhase): string {
  switch (phase) {
    case "green": return "This is your baseline. You're managing well. The goal here is to notice what keeps you steady and protect it.";
    case "orange": return "Warning signs are showing. Your thoughts, feelings, or behaviors are shifting. The goal here is to act early — before things escalate.";
    case "red": return "You're in crisis or close to it. The goal here is to stay safe, reach out, and use your crisis resources. You don't have to handle this alone.";
  }
}

export function signalFields(): { key: keyof PhaseSignals; label: string; placeholder: string }[] {
  return [
    { key: "thoughts", label: "Thoughts", placeholder: "What thoughts tell you you're in this phase? (e.g. I can't cope, racing mind)" },
    { key: "feelings", label: "Feelings", placeholder: "What do you feel emotionally? (e.g. anxious, numb, irritable)" },
    { key: "behaviors", label: "Behaviors", placeholder: "What do you do differently? (e.g. stay in bed, snap at people)" },
    { key: "physical", label: "Physical", placeholder: "What does your body feel? (e.g. tight chest, can't sleep, racing heart)" },
  ];
}

export function actionFields(): { key: keyof PhaseActions; label: string; placeholder: string }[] {
  return [
    { key: "selfCare", label: "Self-care", placeholder: "What self-care helps? (e.g. sleep, eat, shower, go outside)" },
    { key: "copingSkills", label: "Coping skills", placeholder: "Which skills help here? (e.g. box breathing, grounding, journaling)" },
    { key: "reachOut", label: "Reach out", placeholder: "Who could you contact? (e.g. a friend, family member, therapist)" },
    { key: "crisisHelp", label: "Crisis help", placeholder: "What crisis resources apply here? (e.g. helpline, ER, trusted contact)" },
  ];
}
