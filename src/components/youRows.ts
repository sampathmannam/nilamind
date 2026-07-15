import {
  LayoutDashboard, ShieldCheck, Sparkles, Settings as SettingsIcon,
  Brain, BookOpen, Users, Info, TrendingUp, LineChart, Activity,
  type LucideIcon,
} from "lucide-react";
import { t } from "../services/i18n";

// Redesign §2 — the single source of truth for the "You" hub rows (review / manage / learn in calmer
// moments). YouScreen renders exactly what buildYouGroups() returns, so this file (and its test) guard
// the real, on-screen row set — they cannot drift. Mirrors ./toolsRows for the Tools hub.
// NOTE: 'why' is kept in Resources per binding override — the brief dropped it but WhyScreen must stay
// reachable from the You hub (it is in KNOWN_AUX_VIEWS and App.tsx's render branch is preserved).
// Kept as plain data (icon component refs, not JSX) so the row set stays unit-testable in a node env.

export interface YouRow {
  id: string;
  label: string;
  sub: string;
  Icon: LucideIcon;
  iconClass: string;
  /** When true, the row is hidden behind a "Show more" toggle — informational or niche screens
   *  (about_nila, nila_memory, thought_record, learn, episode_marker) are kept accessible but not
   *  surfaced by default. */
  more?: true;
}

export interface YouGroup {
  title: string;
  rows: YouRow[];
}

export function buildYouGroups(): YouGroup[] {
  return [
    {
      title: t("you_group_manage"),
      rows: [
        { id: "dashboard", label: t("you_dashboard_label"), sub: t("you_dashboard_sub"), Icon: LayoutDashboard, iconClass: "w-5 h-5 text-blue-400" },
        { id: "your_data", label: t("you_your_data_label"), sub: t("you_your_data_sub"), Icon: ShieldCheck, iconClass: "w-5 h-5 text-emerald-400" },
        { id: "settings", label: t("you_settings_label"), sub: t("you_settings_sub"), Icon: SettingsIcon, iconClass: "w-5 h-5 text-slate-300" },
        { id: "caregiver_settings", label: t("you_caregiver_settings_label"), sub: t("you_caregiver_settings_sub"), Icon: Users, iconClass: "w-5 h-5 text-emerald-400" },
      ],
    },
    {
      title: t("you_group_resources"),
      rows: [
        { id: "about_nila", label: t("you_about_nila_label"), sub: t("you_about_nila_sub"), Icon: Info, iconClass: "w-5 h-5 text-blue-400" },
        { id: "insights", label: t("you_insights_label"), sub: t("you_insights_sub"), Icon: TrendingUp, iconClass: "w-5 h-5 text-emerald-400" },
        { id: "wellbeing", label: t("you_wellbeing_label"), sub: t("you_wellbeing_sub"), Icon: LineChart, iconClass: "w-5 h-5 text-emerald-400" },
        { id: "nila_memory", label: t("you_nila_memory_label"), sub: t("you_nila_memory_sub"), Icon: Sparkles, iconClass: "w-5 h-5 text-fuchsia-400", more: true },
        { id: "thought_record", label: t("you_thought_record_label"), sub: t("you_thought_record_sub"), Icon: Brain, iconClass: "w-5 h-5 text-blue-400", more: true },
        { id: "learn", label: t("you_learn_label"), sub: t("you_learn_sub"), Icon: BookOpen, iconClass: "w-5 h-5 text-blue-400", more: true },
        { id: "episode_marker", label: t("you_episode_marker_label"), sub: t("you_episode_marker_sub"), Icon: Activity, iconClass: "w-5 h-5 text-amber-400", more: true },
      ],
    },
  ];
}

// Flattened id list (derived from buildYouGroups, so it can never drift from the rendered rows).
export const YOU_ROW_IDS: string[] = buildYouGroups().flatMap((g) => g.rows.map((r) => r.id));
export type YouRowId = string;
