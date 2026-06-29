// Pure step-state machine for Nila's 3-tap opening check-in (mood -> intensity -> context).
// No I/O here: the component (NilaCheckIn.tsx) owns rendering and calls checkin.ts to persist.
// Extracted so the redesign's gate-mapping and single-write-on-context-resolve are unit-tested
// in the node Vitest env (the .tsx itself is verified manually).

export type CheckinStep = "mood" | "intensity" | "context" | "done";

export interface CheckinDraft {
  step: CheckinStep;
  label: string | null;
  intensity: number | null;
}

export type CheckinAction =
  | { type: "pickMood"; label: string }
  | { type: "pickIntensity"; intensity: number }
  | { type: "pickContext"; tag: string | null };

export type CheckinResolved =
  | { label: string; intensity: number; contextTag: string | null }
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

export const INITIAL_DRAFT: CheckinDraft = { step: "mood", label: null, intensity: null };

export function checkinReducer(draft: CheckinDraft, action: CheckinAction): CheckinDraft {
  switch (action.type) {
    case "pickMood":
      if (draft.step !== "mood") return draft;
      return { step: "intensity", label: action.label, intensity: null };
    case "pickIntensity":
      if (draft.step !== "intensity" || draft.label === null) return draft;
      return { step: "context", label: draft.label, intensity: action.intensity };
    case "pickContext":
      if (draft.step !== "context" || draft.label === null || draft.intensity === null) return draft;
      return { step: "done", label: draft.label, intensity: draft.intensity };
    default:
      return draft;
  }
}

// Returns the finished payload exactly when a context action lands on a complete draft —
// the single point at which exactly one CheckInEntry should be written (spec §5).
export function resolveCheckin(draft: CheckinDraft, action: CheckinAction): CheckinResolved {
  if (action.type !== "pickContext") return null;
  if (draft.step !== "context" || draft.label === null || draft.intensity === null) return null;
  return { label: draft.label, intensity: draft.intensity, contextTag: action.tag };
}
