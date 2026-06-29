import { secureLocal } from "./secureLocal";
// Values Compass — the "engagement" side of Acceptance and Commitment Therapy (ACT): clarifying
// what matters to you, noticing where your life has drifted from it, and taking small "toward" steps.
//
// Why values (not goals): in ACT, values are chosen life *directions* (like "west"), not finish
// lines. You can move toward them in any moment, regardless of mood — which is exactly why this
// pairs with Behavioural Activation. Depression and anxiety narrow life down to "away moves"
// (avoidance); re-contacting values widens it back out.
//
// Structure follows the Valued Living Questionnaire (VLQ): for each life domain you rate how
// IMPORTANT it is and how CONSISTENTLY you've lived in line with it recently. The clinically useful
// signal is the GAP between the two — high importance + low consistency = where committed action
// will matter most.
//
// Evidence base (primary sources):
//   • Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (1999/2011). Acceptance and Commitment Therapy.
//   • Wilson, K. G., Sandoz, E. K., Kitchens, J., & Roberts, M. (2010). The Valued Living
//     Questionnaire. The Psychological Record, 60(2), 249–272. — importance × consistency structure.
//   • Hayes, S. C., Luoma, J. B., Bond, F. W., Masuda, A., & Lillis, J. (2006). ACT: model, processes
//     and outcomes. Behaviour Research and Therapy, 44(1), 1–25.
//   • A-Tjak, J. G. L., et al. (2015). A meta-analysis of the efficacy of ACT. Psychotherapy and
//     Psychosomatics, 84(1), 30–36.

export interface ValueDomain {
  id: string;
  label: string;
  examples: string; // gentle, inclusive prompts — not prescriptions
}

// Adapted from the VLQ domains, worded inclusively (no assumption of partner/children/religion).
export const VALUE_DOMAINS: ValueDomain[] = [
  { id: "family", label: "Family", examples: "the kind of relative you want to be — present, patient, honest" },
  { id: "close", label: "Close relationships", examples: "intimacy, partnership, the people closest to you" },
  { id: "friends", label: "Friends & social", examples: "connection, showing up, belonging" },
  { id: "work", label: "Work & purpose", examples: "doing work that means something, however small" },
  { id: "growth", label: "Learning & growth", examples: "curiosity, skills, becoming who you want to be" },
  { id: "play", label: "Play & recreation", examples: "fun, rest, creativity, things you do just because" },
  { id: "health", label: "Health & body", examples: "movement, sleep, eating, caring for the body you live in" },
  { id: "meaning", label: "Spirituality or meaning", examples: "faith, nature, awe, a sense of something larger — whatever that is for you" },
  { id: "community", label: "Community & contribution", examples: "helping, citizenship, leaving things better" },
  { id: "nature", label: "Nature & environment", examples: "time outdoors, your relationship with the living world" },
];

export interface DomainRating {
  importance: number; // 0–10
  consistency: number; // 0–10 (how consistently lived recently)
}

export interface ValuesSnapshot {
  date: string; // YYYY-MM-DD
  timestamp: string;
  ratings: Record<string, DomainRating>; // domainId → rating
}

export interface CommittedAction {
  id: string;
  date: string;
  domainId: string;
  action: string;
  status: "open" | "done";
  doneDate?: string;
}

const SNAPSHOT_KEY = "nilamind_values";
const ACTIONS_KEY = "nilamind_values_actions";

export function loadValues(): ValuesSnapshot | null {
  try {
    const raw = secureLocal.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.ratings ? (parsed as ValuesSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveValues(snapshot: ValuesSnapshot): void {
  try {
    secureLocal.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.error("Failed to persist values snapshot:", e);
  }
}

export function loadActions(): CommittedAction[] {
  try {
    const raw = secureLocal.getItem(ACTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CommittedAction[]) : [];
  } catch {
    return [];
  }
}

export function saveActions(all: CommittedAction[]): void {
  try {
    secureLocal.setItem(ACTIONS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to persist committed actions:", e);
  }
}

export function upsertAction(entry: CommittedAction): CommittedAction[] {
  const all = loadActions();
  const idx = all.findIndex((a) => a.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  saveActions(all);
  return all;
}

export function domainLabel(id: string): string {
  return VALUE_DOMAINS.find((d) => d.id === id)?.label ?? id;
}

export interface ValueGap {
  domainId: string;
  label: string;
  importance: number;
  consistency: number;
  gap: number; // importance - consistency, clamped at 0
}

/**
 * Compute the importance–consistency gaps. We only surface domains the person actually cares about
 * (importance ≥ `minImportance`), because a gap only matters where the value matters. Sorted by the
 * widest gap first — that's where a small committed action has the most leverage (VLQ rationale).
 */
export function computeGaps(snapshot: ValuesSnapshot | null, minImportance = 6): ValueGap[] {
  if (!snapshot) return [];
  const gaps: ValueGap[] = [];
  for (const [domainId, r] of Object.entries(snapshot.ratings)) {
    if (r.importance < minImportance) continue;
    gaps.push({
      domainId,
      label: domainLabel(domainId),
      importance: r.importance,
      consistency: r.consistency,
      gap: Math.max(0, r.importance - r.consistency),
    });
  }
  return gaps.sort((a, b) => b.gap - a.gap || b.importance - a.importance);
}
