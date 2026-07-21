import { secureLocal } from "./secureLocal";
import { reportError } from "./errorReporter";

const VALUES_KEY = "nilamind_values_work";

export interface ValueDomain {
  id: string;
  name: string;
  description: string;
  importance: number; // 0-10 how much this matters to you
  currentAlignment: number; // 0-10 how aligned your actions are right now
  committedAction: string; // one small step toward this value this week
  completed: boolean;
  completedAt: string | null;
}

export const VALUE_DOMAINS: Omit<ValueDomain, "importance" | "currentAlignment" | "committedAction" | "completed" | "completedAt">[] = [
  { id: "relationships", name: "Close relationships", description: "Being present and caring with the people who matter most." },
  { id: "family", name: "Family", description: "Nurturing connections with family — however you define family." },
  { id: "health", name: "Physical health", description: "Taking care of your body — movement, food, rest, medical care." },
  { id: "growth", name: "Learning & growth", description: "Developing skills, knowledge, or creativity — for its own sake." },
  { id: "work", name: "Work & contribution", description: "Doing meaningful work — paid or unpaid — that uses your strengths." },
  { id: "spirituality", name: "Spirituality & meaning", description: "Connecting with something larger — nature, faith, purpose, awe." },
  { id: "community", name: "Community & belonging", description: "Being part of something bigger than yourself — a group, a cause, a place." },
  { id: "play", name: "Play & joy", description: "Doing things just because they're fun — no productivity required." },
  { id: "self_care", name: "Self-compassion", description: "Treating yourself with the kindness you'd offer a dear friend." },
  { id: "autonomy", name: "Independence & choice", description: "Living by your own values, making your own decisions." },
];

export function createValuesWork(): ValueDomain[] {
  return VALUE_DOMAINS.map((d) => ({
    ...d,
    importance: 0,
    currentAlignment: 0,
    committedAction: "",
    completed: false,
    completedAt: null,
  }));
}

export function loadValuesWork(): ValueDomain[] {
  try {
    const raw = secureLocal.getItem(VALUES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ValueDomain[];
  } catch (e) {
    reportError(e, "valuesWork.loadValuesWork");
    return [];
  }
}

export function saveValuesWork(domains: ValueDomain[]): void {
  secureLocal.setItem(VALUES_KEY, JSON.stringify(domains));
}

export function setValueImportance(domains: ValueDomain[], id: string, importance: number): ValueDomain[] {
  return domains.map((d) => (d.id === id ? { ...d, importance: Math.max(0, Math.min(10, importance)) } : d));
}

export function setValueAlignment(domains: ValueDomain[], id: string, alignment: number): ValueDomain[] {
  return domains.map((d) => (d.id === id ? { ...d, currentAlignment: Math.max(0, Math.min(10, alignment)) } : d));
}

export function setCommittedAction(domains: ValueDomain[], id: string, action: string): ValueDomain[] {
  return domains.map((d) => (d.id === id ? { ...d, committedAction: action } : d));
}

export function completeAction(domains: ValueDomain[], id: string): ValueDomain[] {
  return domains.map((d) =>
    d.id === id ? { ...d, completed: true, completedAt: new Date().toISOString() } : d,
  );
}

export function resetActions(domains: ValueDomain[]): ValueDomain[] {
  return domains.map((d) => ({ ...d, completed: false, completedAt: null, committedAction: "" }));
}

export function topValues(domains: ValueDomain[], count = 3): ValueDomain[] {
  return [...domains].sort((a, b) => b.importance - a.importance).slice(0, count);
}

export function alignmentGap(domains: ValueDomain[]): { domain: ValueDomain; gap: number }[] {
  return domains
    .filter((d) => d.importance > 0)
    .map((d) => ({ domain: d, gap: d.importance - d.currentAlignment }))
    .sort((a, b) => b.gap - a.gap);
}

export function weeklyAlignmentScore(domains: ValueDomain[]): number | null {
  const rated = domains.filter((d) => d.importance > 0);
  if (rated.length === 0) return null;
  return Math.round((rated.reduce((s, d) => s + d.currentAlignment, 0) / rated.length) * 10) / 10;
}
