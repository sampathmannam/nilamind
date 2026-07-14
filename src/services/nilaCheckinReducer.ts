// Pure step-state machine for Nila's opening check-in (mood -> intensity -> energy -> context).
// No I/O here: the component (NilaCheckIn.tsx) owns rendering and calls checkin.ts to persist.
// Extracted so the redesign's gate-mapping and single-write-on-context-resolve are unit-tested
// in the node Vitest env (the .tsx itself is verified manually).

export type CheckinStep = "mood" | "intensity" | "sleep" | "energy" | "context" | "granularity" | "done";

export interface CheckinDraft {
  step: CheckinStep;
  label: string | null;
  intensity: number | null;
  sleepHours: number | null;
  energy: number | null;
  contextTag: string | null;
  granularEmotion: string | null;
}

export type CheckinAction =
  | { type: "pickMood"; label: string }
  | { type: "pickIntensity"; intensity: number }
  | { type: "pickSleep"; sleepHours: number | null }
  | { type: "pickEnergy"; energy: number }
  | { type: "pickContext"; tag: string | null }
  | { type: "pickGranular"; emotion: string }
  | { type: "skipGranular" };

export type CheckinResolved =
  | { label: string; intensity: number; sleepHours: number | null; energy: number | null; contextTag: string | null; granularEmotion: string | null }
  | null;

// Contract: the 7 redesign moods, in order.
export const MOOD_CHIPS: readonly string[] = [
  "Calm",
  "Okay",
  "Low",
  "Anxious",
  "Angry",
  "Numb",
  "Overwhelmed",
];

// Contract gate mapping: only Strong(7) and Intense(9) cross the >=7 escalation gate (spec §6).
export const INTENSITY_CHIPS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "Gentle", value: 3 },
  { label: "Noticeable", value: 5 },
  { label: "Strong", value: 7 },
  { label: "Intense", value: 9 },
];

// Energy dimension: 4 levels between intensity and context per Phase 1.
export const ENERGY_CHIPS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "Very low", value: 1 },
  { label: "Low", value: 2 },
  { label: "Moderate", value: 3 },
  { label: "High", value: 4 },
];

// Sleep chips: quick-tap sleep duration (research: sleep is the #1 bipolar prodrome signal).
export const SLEEP_CHIPS: ReadonlyArray<{ label: string; value: number | null }> = [
  { label: "Under 5h", value: 4 },
  { label: "5–6h", value: 5.5 },
  { label: "7–8h", value: 7.5 },
  { label: "Over 8h", value: 9 },
  { label: "Not sure", value: null },
];

// The 7 existing context tags (verbatim from CheckInScreen).
export const CONTEXT_TAGS: readonly string[] = [
  "Sleep",
  "Relationships",
  "Work",
  "Body/Health",
  "Thoughts",
  "A specific event",
  "Not sure",
];

export const INITIAL_DRAFT: CheckinDraft = { step: "mood", label: null, intensity: null, sleepHours: null, energy: null, contextTag: null, granularEmotion: null };

export function checkinReducer(draft: CheckinDraft, action: CheckinAction): CheckinDraft {
  switch (action.type) {
    case "pickMood":
      if (draft.step !== "mood") return draft;
      return { step: "intensity", label: action.label, intensity: null, sleepHours: null, energy: null, contextTag: null, granularEmotion: null };
    case "pickIntensity":
      if (draft.step !== "intensity" || draft.label === null) return draft;
      return { step: "sleep", label: draft.label, intensity: action.intensity, sleepHours: null, energy: null, contextTag: null, granularEmotion: null };
    case "pickSleep":
      if (draft.step !== "sleep" || draft.label === null || draft.intensity === null) return draft;
      return { step: "energy", label: draft.label, intensity: draft.intensity, sleepHours: action.sleepHours, energy: null, contextTag: null, granularEmotion: null };
    case "pickEnergy":
      if (draft.step !== "energy" || draft.label === null || draft.intensity === null) return draft;
      return { step: "context", label: draft.label, intensity: draft.intensity, sleepHours: draft.sleepHours, energy: action.energy, contextTag: null, granularEmotion: null };
    case "pickContext":
      if (draft.step !== "context" || draft.label === null || draft.intensity === null) return draft;
      return { step: "granularity", label: draft.label, intensity: draft.intensity, sleepHours: draft.sleepHours, energy: draft.energy, contextTag: action.tag, granularEmotion: null };
    case "pickGranular":
      if (draft.step !== "granularity" || draft.label === null || draft.intensity === null) return draft;
      return { step: "done", label: draft.label, intensity: draft.intensity, sleepHours: draft.sleepHours, energy: draft.energy, contextTag: draft.contextTag, granularEmotion: action.emotion };
    case "skipGranular":
      if (draft.step !== "granularity" || draft.label === null || draft.intensity === null) return draft;
      return { step: "done", label: draft.label, intensity: draft.intensity, sleepHours: draft.sleepHours, energy: draft.energy, contextTag: draft.contextTag, granularEmotion: null };
    default:
      return draft;
  }
}

// Returns the finished payload when a granularity action (pick or skip) lands on a complete draft.
export function resolveCheckin(draft: CheckinDraft, action: CheckinAction): CheckinResolved {
  if (draft.step !== "granularity" || draft.label === null || draft.intensity === null) return null;
  if (action.type === "pickGranular") {
    return { label: draft.label, intensity: draft.intensity, sleepHours: draft.sleepHours, energy: draft.energy, contextTag: draft.contextTag, granularEmotion: action.emotion };
  }
  if (action.type === "skipGranular") {
    return { label: draft.label, intensity: draft.intensity, sleepHours: draft.sleepHours, energy: draft.energy, contextTag: draft.contextTag, granularEmotion: null };
  }
  return null;
}
