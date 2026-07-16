import {
  Wind, NotebookPen, Activity, LifeBuoy, TrendingUp, Moon, MessageCircle,
  Pill, Lightbulb, Compass, Mountain, AlertTriangle, Smile, Clock3, Volume2, Users, Sliders,
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
        { id: "plan", label: t("tool_plan_label"), sub: t("tool_plan_sub"), Icon: Wind, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("plan") },
        { id: "winddown", label: t("tool_winddown_label"), sub: t("tool_winddown_sub"), Icon: Moon, iconClass: "w-5 h-5 text-indigo-400", onTap: () => go("winddown") },
        { id: "sounds", label: "Ambient sounds", sub: "White/brown/pink noise for focus, sleep, or calm", Icon: Volume2, iconClass: "w-5 h-5 text-emerald-400", onTap: () => go("sounds") },
        { id: "reach_out", label: t("tool_reach_out_label"), sub: t("tool_reach_out_sub"), Icon: MessageCircle, iconClass: "w-5 h-5 text-emerald-400", onTap: () => go("reach_out") },
        { id: "peer_support", label: "Peer Support", sub: "Quick messages to reach out to people you trust", Icon: Users, iconClass: "w-5 h-5 text-teal-400", onTap: () => go("peer_support") },
        { id: "episode", label: t("tool_episode_label"), sub: t("tool_episode_sub"), Icon: LifeBuoy, iconClass: "w-5 h-5 text-rose-400", onTap: onEpisode },
      ],
    },
    {
      title: t("tool_group_log"),
      rows: [
        { id: "ema_checkin", label: t("tool_ema_label"), sub: t("tool_ema_sub"), Icon: Smile, iconClass: "w-5 h-5 text-purple-400", onTap: () => go("ema_checkin") },
        { id: "diary", label: t("tool_diary_label"), sub: t("tool_diary_sub"), Icon: NotebookPen, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("diary") },
        { id: "dbt_diary_card", label: "DBT diary card", sub: "Emotion ratings, skills checklist, today's intention", Icon: Sliders, iconClass: "w-5 h-5 text-indigo-400", onTap: () => go("dbt_diary_card") },
        { id: "medication", label: t("tool_medication_label"), sub: t("tool_medication_sub"), Icon: Pill, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("medication") },
      ],
    },
    {
      title: t("tool_group_skills"),
      more: true,
      rows: [
        { id: "problem_solving", label: t("tool_problem_solving_label"), sub: t("tool_problem_solving_sub"), Icon: Lightbulb, iconClass: "w-5 h-5 text-amber-400", onTap: () => go("problem_solving") },
        { id: "values_to_action", label: t("tool_values_work_label"), sub: t("tool_values_work_sub"), Icon: Compass, iconClass: "w-5 h-5 text-violet-400", onTap: () => go("values_to_action") },
        { id: "assessment", label: t("tool_assessment_label"), sub: t("tool_assessment_sub"), Icon: Activity, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("assessment") },
        { id: "social_rhythm", label: t("tool_social_rhythm_label"), sub: t("tool_social_rhythm_sub"), Icon: Clock3, iconClass: "w-5 h-5 text-indigo-400", onTap: () => go("social_rhythm") },
        { id: "exposure", label: t("tool_exposure_label"), sub: t("tool_exposure_sub"), Icon: Mountain, iconClass: "w-5 h-5 text-orange-400", onTap: () => go("exposure") },
        { id: "relapse_plan", label: t("tool_relapse_label"), sub: t("tool_relapse_sub"), Icon: AlertTriangle, iconClass: "w-5 h-5 text-amber-400", onTap: () => go("relapse_plan") },
      ],
    },
    ...(phoneEnabled
      ? [{
          title: t("tool_group_patterns"),
          rows: [
            { id: "behaviour", label: t("tool_behaviour_label"), sub: t("tool_behaviour_sub"), Icon: TrendingUp, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("behaviour") },
          ],
        }]
      : []),
  ];
}
