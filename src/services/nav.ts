// src/services/nav.ts
// Pure navigation resolver shared by App.tsx go(). Centralises the tab/auxView allowlists so an
// unknown/typo'd target is a deliberate no-op (with a dev warning at the call site) instead of
// silently rendering a blank screen (redesign §4).

export type TabView = "diary" | "plan" | "nila" | "today" | "you";

export type AuxView =
  | "about_nila"
  | "insights"
  | "thought_record"
  | "settings"
  | "behaviour"
  | "assessment"
  | "dashboard"
  | "your_data"
  | "nila_memory"
  | "winddown"
  | "reach_out"
  | "learn"
  | "medication"
  | "problem_solving"
  | "values_work"
  | "exposure"
  | "relapse_plan"
  | "caregiver"
  | "episode"
  | "diary"
  | "dbt_diary_card"
  | "social_rhythm"
  | "ema_checkin"
  | "episode_marker"
  | "caregiver_settings"
  | "legal"
  | "sounds"
  | "safety_plan"
  | "values_to_action";

export const TAB_TARGETS: readonly TabView[] = [
  "diary", "plan", "nila", "today", "you",
];

export const KNOWN_AUX_VIEWS: readonly AuxView[] = [
   "about_nila", "insights", "thought_record", "settings", "behaviour", "reach_out", "assessment",
   "dashboard", "your_data", "nila_memory", "winddown",
   "learn", "medication", "problem_solving", "values_work", "exposure", "relapse_plan", "caregiver", "episode",
   "diary",
   "dbt_diary_card",
     "social_rhythm",
      "ema_checkin",
      "episode_marker",
   "caregiver_settings",
   "legal",
   "sounds",
   "safety_plan",
   "values_to_action",
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
 * - "grounding" → the grounding library (the crisis overlay depends on this mapping).
 * - "breathing" → falls through to the BreathingScreen sheet via navStore's unknown-branch (2026-07-18
 *   design review: was mapped to "plan" too, so "Quick breathe" opened the grounding list, never the
 *   dedicated breathing session — which was unreachable). The crisis overlay opens "grounding" directly.
 * - a known tab → that tab.
 * - a known auxView → that overlay.
 * - anything else → { kind: "unknown" } so the caller can no-op + console.warn.
 */
export function resolveNavTarget(target: string): NavResolution {
  if (target === "crisis") return { kind: "crisis" };
  if (target === "grounding") return { kind: "plan" };
  if ((TAB_TARGETS as readonly string[]).includes(target)) {
    return { kind: "tab", tab: target as TabView };
  }
  if ((KNOWN_AUX_VIEWS as readonly string[]).includes(target)) {
    return { kind: "aux", view: target as AuxView };
  }
  return { kind: "unknown", target };
}
