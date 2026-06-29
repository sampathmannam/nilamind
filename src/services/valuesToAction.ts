// Values to Action — pure compose/split helper for the merged BA + Values screen.
//
// ZERO-MIGRATION composite: BA activities (nilamind_ba_activities) and committed value steps
// (nilamind_values_actions) stay in their own stores under their own services. This helper only
// FLATTENS the two record types into one "DO list" for display, and lets the screen split a DoItem
// back to the right service by its id prefix (ba_ / va_). It NEVER touches storage, has no React
// dependency, and uses type-only imports so it is unit-testable in the node test env.

import type { BAActivityLog } from "./behaviouralActivation";
import type { CommittedAction } from "./values";

export type DoItemKind = "activity" | "step";

export interface DoItem {
  id: string;
  kind: DoItemKind;
  title: string;
  date: string;
  done: boolean;
  skipped: boolean;
  // Exactly one of these is set, matching `kind`. The original record is carried through verbatim so
  // the screen can render category/mastery/pleasure (activity) or domain (step) and round-trip it
  // back to its own service unchanged.
  activity?: BAActivityLog;
  step?: CommittedAction;
}

export function isActivityId(id: string): boolean {
  return id.startsWith("ba_");
}

export function isStepId(id: string): boolean {
  return id.startsWith("va_");
}

function activityToDoItem(a: BAActivityLog): DoItem {
  return {
    id: a.id,
    kind: "activity",
    title: a.title,
    date: a.date,
    done: a.status === "done",
    skipped: a.status === "skipped",
    activity: a,
  };
}

function stepToDoItem(s: CommittedAction): DoItem {
  return {
    id: s.id,
    kind: "step",
    title: s.action,
    date: s.date,
    done: s.status === "done",
    skipped: false, // committed steps have no "skipped" state (status is "open" | "done")
    step: s,
  };
}

/**
 * Flatten the two record arrays into one DO list. Newest-first within each group (matching the
 * reverse() ordering both legacy screens used), activities before steps. Pure; no storage.
 */
export function toDoList(activities: BAActivityLog[], actions: CommittedAction[]): DoItem[] {
  const acts = [...activities].reverse().map(activityToDoItem);
  const steps = [...actions].reverse().map(stepToDoItem);
  return [...acts, ...steps];
}
