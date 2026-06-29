// src/services/nav.ts
// Pure navigation resolver shared by App.tsx go(). Centralises the tab/auxView allowlists so an
// unknown/typo'd target is a deliberate no-op (with a dev warning at the call site) instead of
// silently rendering a blank screen (redesign §4).

export type TabView = "checkin" | "diary" | "plan" | "nila" | "tools" | "you";

export type AuxView =
  | "thought_record"
  | "self_compassion"
  | "settings"
  | "behaviour"
  | "assessment"
  | "values_to_action"
  | "skills"
  | "dashboard"
  | "your_data"
  | "why"
  | "nila_memory"
  | "winddown"
  | "understand"
  | "reach_out"
  | "console"
  | "pact";

export const TAB_TARGETS: readonly TabView[] = [
  "checkin", "diary", "plan", "nila", "tools", "you",
];

export const KNOWN_AUX_VIEWS: readonly AuxView[] = [
  "thought_record", "self_compassion", "settings", "behaviour", "assessment",
  "values_to_action", "skills", "dashboard", "your_data", "why", "nila_memory", "winddown", "understand", "reach_out", "console", "pact",
];

export type NavResolution =
  | { kind: "crisis" }
  | { kind: "plan" }
  | { kind: "tab"; tab: TabView }
  | { kind: "aux"; view: AuxView }
  | { kind: "unknown"; target: string };

/**
 * Resolve a navigation target into a typed action. Pure — no side effects.
 * - "crisis" → open the crisis overlay.
 * - "grounding" | "breathing" → the Plan tab (the crisis overlay depends on this mapping).
 * - a known tab → that tab.
 * - a known auxView → that overlay.
 * - anything else → { kind: "unknown" } so the caller can no-op + console.warn.
 */
export function resolveNavTarget(target: string): NavResolution {
  if (target === "crisis") return { kind: "crisis" };
  if (target === "grounding" || target === "breathing") return { kind: "plan" };
  if ((TAB_TARGETS as readonly string[]).includes(target)) {
    return { kind: "tab", tab: target as TabView };
  }
  if ((KNOWN_AUX_VIEWS as readonly string[]).includes(target)) {
    return { kind: "aux", view: target as AuxView };
  }
  return { kind: "unknown", target };
}
