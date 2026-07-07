import { secureLocal } from "./secureLocal";

const HIERARCHY_KEY = "nilamind_exposure_hierarchy";

export interface ExposureStep {
  id: string;
  description: string;
  suds: number; // Subjective Units of Distress 0-10
  completed: boolean;
  completedAt: string | null;
  preSuds: number | null;
  postSuds: number | null;
  learning: string;
}

export interface ExposureHierarchy {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  steps: ExposureStep[];
}

export function createHierarchy(title: string): ExposureHierarchy {
  return {
    id: "eh_" + Date.now(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [],
  };
}

let _stepCounter = 0;

export function addStep(hierarchy: ExposureHierarchy, description: string, suds: number): ExposureHierarchy {
  _stepCounter++;
  const step: ExposureStep = {
    id: "es_" + Date.now() + "_" + _stepCounter,
    description,
    suds: Math.max(0, Math.min(10, suds)),
    completed: false,
    completedAt: null,
    preSuds: null,
    postSuds: null,
    learning: "",
  };

  return {
    ...hierarchy,
    updatedAt: new Date().toISOString(),
    steps: [...hierarchy.steps, step].sort((a, b) => a.suds - b.suds),
  };
}

export function removeStep(hierarchy: ExposureHierarchy, stepId: string): ExposureHierarchy {
  return {
    ...hierarchy,
    updatedAt: new Date().toISOString(),
    steps: hierarchy.steps.filter((s) => s.id !== stepId),
  };
}

export function completeStep(
  hierarchy: ExposureHierarchy,
  stepId: string,
  preSuds: number,
  postSuds: number,
  learning: string,
): ExposureHierarchy {
  return {
    ...hierarchy,
    updatedAt: new Date().toISOString(),
    steps: hierarchy.steps.map((s) =>
      s.id === stepId
        ? { ...s, completed: true, completedAt: new Date().toISOString(), preSuds, postSuds, learning }
        : s,
    ),
  };
}

export function loadHierarchy(): ExposureHierarchy | null {
  try {
    const raw = secureLocal.getItem(HIERARCHY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveHierarchy(hierarchy: ExposureHierarchy): void {
  hierarchy.updatedAt = new Date().toISOString();
  secureLocal.setItem(HIERARCHY_KEY, JSON.stringify(hierarchy));
}

export function completionRate(hierarchy: ExposureHierarchy): number {
  if (hierarchy.steps.length === 0) return 0;
  return Math.round((hierarchy.steps.filter((s) => s.completed).length / hierarchy.steps.length) * 100);
}

export function averageSudReduction(hierarchy: ExposureHierarchy): number | null {
  const completed = hierarchy.steps.filter((s) => s.completed && s.preSuds !== null && s.postSuds !== null);
  if (completed.length === 0) return null;
  const reduction = completed.map((s) => (s.preSuds ?? 10) - (s.postSuds ?? 0));
  return Math.round((reduction.reduce((a, b) => a + b, 0) / completed.length) * 10) / 10;
}

export function nextStep(hierarchy: ExposureHierarchy): ExposureStep | null {
  return hierarchy.steps.find((s) => !s.completed) ?? null;
}

export function inhibitoryLearningPrompts(): string[] {
  return [
    "What did you learn from this exposure?",
    "Was the outcome as bad as you predicted?",
    "Did your anxiety peak and then fall?",
    "What does this tell you about your ability to handle discomfort?",
    "Were there any surprises — things that went better than expected?",
  ];
}
