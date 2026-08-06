// src/services/nav.ts
// Pure navigation resolver shared by App.tsx go(). Centralises the tab/auxView allowlists so an
// unknown/typo'd target is a deliberate no-op (with a dev warning at the call site) instead of
// silently rendering a blank screen (redesign §4).

// The real bottom-nav tabs. Was "diary"|"plan"|"nila"|"today"|"you" — a legacy set that diverged from the
// actual 4-tab IA (navStore's AppTab, which now aliases this). "diary" is an aux overlay (in KNOWN_AUX_VIEWS)
// and "plan" is a legacy alias for the grounding sheet — neither is a tab, so both resolve to their real
// surface below instead of a phantom tab that go() had to re-interpret.
export type TabView = "nila" | "today" | "tools" | "you";

export type AuxView =
  | "about_nila"
  | "settings"
  | "assessment"
  | "dashboard"
  | "your_data"
  | "nila_memory"
  | "winddown"
  | "reach_out"
  | "learn"
  | "medication"
  | "problem_solving"
  | "exposure"
  | "relapse_plan"
  | "caregiver"
  | "episode"
  | "diary"
  | "social_rhythm"
  | "ema_checkin"
  | "episode_marker"
  | "caregiver_settings"
  | "legal"
  | "sounds"
  | "safety_plan"
  | "values_to_action"
  | "guided_programs"
  | "chain_analysis"
  | "calm_hub"
  | "skills_hub";

export const TAB_TARGETS: readonly TabView[] = [
  "nila", "today", "tools", "you",
];

export const KNOWN_AUX_VIEWS: readonly AuxView[] = [
   "about_nila", "settings", "reach_out", "assessment",
   "dashboard", "your_data", "nila_memory", "winddown",
   "learn", "medication", "problem_solving", "exposure", "relapse_plan", "caregiver", "episode",
   "diary",
     "social_rhythm",
      "ema_checkin",
      "episode_marker",
   "caregiver_settings",
   "legal",
   "sounds",
   "safety_plan",
   "values_to_action",
    "guided_programs",
    "chain_analysis",
    "calm_hub",
    "skills_hub",
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
 * - "grounding", "breathing", and the legacy "plan" alias all open the unified Breathing & Grounding
 *   sheet (NavResolution "plan"). The crisis overlay and tools hub both depend on this mapping.
 * - a known tab → that tab.
 * - a known auxView → that overlay.
 * - anything else → { kind: "unknown" } so the caller can no-op + console.warn.
 */
export function resolveNavTarget(target: string): NavResolution {
  if (target === "crisis") return { kind: "crisis" };
  // "grounding", "breathing", and the legacy "plan" alias all open the unified Breathing & Grounding
  // sheet (NavResolution "plan"); none is a tab. Checked before the tab/aux allowlists so they never
  // fall through to unknown.
  if (target === "grounding" || target === "breathing" || target === "plan") return { kind: "plan" };
  if ((TAB_TARGETS as readonly string[]).includes(target)) {
    return { kind: "tab", tab: target as TabView };
  }
  if ((KNOWN_AUX_VIEWS as readonly string[]).includes(target)) {
    return { kind: "aux", view: target as AuxView };
  }
  return { kind: "unknown", target };
}
