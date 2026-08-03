import {
  Wind, NotebookPen, Activity, LifeBuoy, TrendingUp, Moon, MessageCircle,
  Pill, Lightbulb, Compass, Mountain, AlertTriangle, Smile, Clock3, Volume2, Sliders,
  type LucideIcon,
} from "lucide-react";
import { t } from "../services/i18n";

// Redesign §2 — the single source of truth for the "Tools" hub rows. ToolsScreen renders exactly what
// buildToolGroups() returns, so this file (and its test) guard the real, on-screen row set: focused
// right-now tools grouped by intent. "In the moment" = grounding/breathing, wind-down for sleep,
// episode support; "Log & track" = diary, screenings; "Patterns" = phone insights when enabled.
// Re-homed rows (skills, thought_record, self_compassion) now live under You → Resources; episode
// support is a Nila MODE reached via onEpisode(), not a route; the "behaviour" row only appears when
// phone features are enabled (PHONE_FEATURES_ENABLED).
// Wave 3 Group B (2026-07-12, see docs/superpowers/plans/2026-07-12-wave3-technical-specs.md §5):
// "values_work" (uncited duplicate) is retired from this hub — its data was migrated into values.ts,
// the actual VLQ-cited tool, and "values_to_action" now takes its place here. values_to_action does
// NOT go through nav.ts's generic aux-view system (KNOWN_AUX_VIEWS deliberately excludes it — see
// nav.test.ts, PLAN_OF_ACTION A6); App.tsx's go() special-cases the "unknown" resolution for this one
// target and opens its own sheet, same pattern as "caregiver"/"grounding".
// Kept as plain data (icon component refs, not JSX) so the row set stays unit-testable in a node env.

export interface ToolRow {
  id: string;
  label: string;
  sub: string;
  Icon: LucideIcon;
  iconClass: string;
  onTap: () => void;
  /** Brief inline help tip shown below the subtitle for unfamiliar clinical terms. */
  help?: string;
}

export interface ToolGroup {
  title: string;
  rows: ToolRow[];
  /** When true, the group is hidden behind a "Show more" toggle — niche tools with low self-directed
   *  engagement (exposure, crisis rehearsal, relapse prevention, etc.) are kept accessible but not
   *  surfaced by default, matching Woebot/Wysa's conversational-routing model. */
  more?: true;
}

export interface ToolRowDeps {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
}

export function buildToolGroups({ go, onEpisode, phoneEnabled }: ToolRowDeps): ToolGroup[] {
  return [
    {
      title: t("tool_group_moment"),
      rows: [
        { id: "plan", label: t("tool_plan_label"), sub: t("tool_plan_sub"), Icon: Wind, iconClass: "w-5 h-5 text-accent", onTap: () => go("plan") },
        { id: "winddown", label: t("tool_winddown_label"), sub: t("tool_winddown_sub"), Icon: Moon, iconClass: "w-5 h-5 text-accent", onTap: () => go("winddown") },
        { id: "sounds", label: "Ambient sounds", sub: "White/brown/pink noise for focus, sleep, or calm", Icon: Volume2, iconClass: "w-5 h-5 text-success", onTap: () => go("sounds") },
        { id: "reach_out", label: t("tool_reach_out_label"), sub: t("tool_reach_out_sub"), Icon: MessageCircle, iconClass: "w-5 h-5 text-success", onTap: () => go("reach_out") },
        { id: "episode", label: t("tool_episode_label"), sub: t("tool_episode_sub"), Icon: LifeBuoy, iconClass: "w-5 h-5 text-rose-400", onTap: onEpisode },
      ],
    },
    {
      title: t("tool_group_log"),
      rows: [
        { id: "ema_checkin", label: t("tool_ema_label"), sub: t("tool_ema_sub"), Icon: Smile, iconClass: "w-5 h-5 text-accent", onTap: () => go("ema_checkin") },
        { id: "diary", label: t("tool_diary_label"), sub: t("tool_diary_sub"), Icon: NotebookPen, iconClass: "w-5 h-5 text-accent", onTap: () => go("diary") },
        { id: "dbt_diary_card", label: "DBT diary card", sub: "Emotion ratings, skills checklist, today's intention", Icon: Sliders, iconClass: "w-5 h-5 text-accent", onTap: () => go("dbt_diary_card"), help: "DBT = Dialectical Behaviour Therapy — a skill-based approach." },
        { id: "medication", label: t("tool_medication_label"), sub: t("tool_medication_sub"), Icon: Pill, iconClass: "w-5 h-5 text-accent", onTap: () => go("medication") },
      ],
    },
    {
      title: t("tool_group_skills"),
      more: true,
      rows: [
        { id: "problem_solving", label: t("tool_problem_solving_label"), sub: t("tool_problem_solving_sub"), Icon: Lightbulb, iconClass: "w-5 h-5 text-warn", onTap: () => go("problem_solving"), help: "A structured way to work through a challenge." },
        { id: "values_to_action", label: t("tool_values_work_label"), sub: t("tool_values_work_sub"), Icon: Compass, iconClass: "w-5 h-5 text-accent", onTap: () => go("values_to_action") },
        { id: "assessment", label: t("tool_assessment_label"), sub: t("tool_assessment_sub"), Icon: Activity, iconClass: "w-5 h-5 text-accent", onTap: () => go("assessment") },
        { id: "social_rhythm", label: t("tool_social_rhythm_label"), sub: t("tool_social_rhythm_sub"), Icon: Clock3, iconClass: "w-5 h-5 text-accent", onTap: () => go("social_rhythm") },
        { id: "exposure", label: t("tool_exposure_label"), sub: t("tool_exposure_sub"), Icon: Mountain, iconClass: "w-5 h-5 text-orange-400", onTap: () => go("exposure"), help: "Gentle step-by-step practice, building at your pace." },
        { id: "relapse_plan", label: t("tool_relapse_label"), sub: t("tool_relapse_sub"), Icon: AlertTriangle, iconClass: "w-5 h-5 text-warn", onTap: () => go("relapse_plan") },
      ],
    },
    ...(phoneEnabled
      ? [{
          title: t("tool_group_patterns"),
          rows: [
            { id: "behaviour", label: t("tool_behaviour_label"), sub: t("tool_behaviour_sub"), Icon: TrendingUp, iconClass: "w-5 h-5 text-accent", onTap: () => go("behaviour") },
          ],
        }]
      : []),
  ];
}

// Goal -> the tool row ids it should promote to the front of their group, when present in that group.
// Same personalization rationale/citation as chatSuggestions.ts's GOAL_CHIP_PRIORITY: customizable/relevant
// content is a named engagement facilitator, closing the onboarding goal picker's previously write-only
// loop (nilamind_user_goal), per Borghouts, Eikey, Mark et al. (2021), J Med Internet Res.
// Keyed by the onboarding goal IDs actually stored in nilamind_user_goal (OnboardingGate USER_GOALS).
// Design review 2026-07-18: these were keyed on retired labels ("Feeling low", …) that no key ever
// matched, so goal personalization was a permanent no-op — the app asked what mattered and threw it away.
const GOAL_TOOL_PRIORITY: Record<string, string[]> = {
  sleep: ["winddown", "social_rhythm", "diary"],
  mood: ["ema_checkin", "diary", "assessment", "social_rhythm"],
  grounding: ["plan", "exposure"],
  medication: ["medication", "diary"],
  talking: ["problem_solving", "values_to_action"],
};

/** Reorders each group's rows so goal-relevant tools lead, without changing group titles, membership,
 *  or row count. A no-op (returns groups unchanged, same array reference) when goals is empty or maps
 *  to no known tools — safe default for "Just curious" / no onboarding selection made. */
export function personalizeToolOrder(groups: ToolGroup[], goals: string[]): ToolGroup[] {
  const priorityIds = new Set<string>();
  for (const goal of goals) {
    for (const id of GOAL_TOOL_PRIORITY[goal] ?? []) priorityIds.add(id);
  }
  if (priorityIds.size === 0) return groups;
  return groups.map((g) => ({
    ...g,
    rows: [...g.rows].sort((a, b) => {
      const aRank = priorityIds.has(a.id) ? 0 : 1;
      const bRank = priorityIds.has(b.id) ? 0 : 1;
      return aRank - bRank;
    }),
  }));
}

// Time/state -> the tool row ids it should promote to the front of their group, IN ORDER, when present.
// Mirrors the research behind personalizeToolOrder: surface the right tool for the moment, not a
// flat list. Evening/night lead with wind-down then grounding (sleep/settle); anxious/elevated lead with
// grounding (plan); crisis additionally leads with direct crisis support (episode) then grounding.
const TIME_TOOL_PRIORITY: Record<"morning" | "day" | "evening" | "night", string[]> = {
  morning: [],
  day: [],
  evening: ["winddown", "plan"],
  night: ["winddown", "plan"],
};

const STATE_TOOL_PRIORITY: Partial<Record<string, string[]>> = {
  anxious: ["plan"],
  elevated: ["plan"],
  crisis: ["episode", "plan"],
};

/** Reorders each group's rows so time- and state-relevant tools lead (in the declared order), without
 *  changing group titles, membership, or row count. Priority tools sort ahead of the rest by their index
 *  in the merged priority list; non-priority rows keep their original relative order. A no-op (same array
 *  reference) when there is nothing to promote. (UX-3: Adaptive Home Screen.) */
export function personalizeToolByContext(
  groups: ToolGroup[],
  ctx: { timeMode: "morning" | "day" | "evening" | "night"; state: string | null },
): ToolGroup[] {
  const priority: string[] = [
    ...(TIME_TOOL_PRIORITY[ctx.timeMode] ?? []),
    ...(ctx.state ? (STATE_TOOL_PRIORITY[ctx.state] ?? []) : []),
  ];
  if (priority.length === 0) return groups;
  const rank = new Map(priority.map((id, i) => [id, i]));
  return groups.map((g) => ({
    ...g,
    rows: [...g.rows].sort((a, b) => {
      const ar = rank.has(a.id) ? (rank.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
      const br = rank.has(b.id) ? (rank.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
      return ar - br;
    }),
  }));
}
