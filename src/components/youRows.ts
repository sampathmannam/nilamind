import {
  LayoutDashboard, ShieldCheck, Sparkles, Settings as SettingsIcon,
  BookOpen, Users,
  type LucideIcon,
} from "lucide-react";
import { t } from "../services/i18n";

// Redesign §5.4 (2026-08-06) — the single source of truth for the "You" hub rows, and the ONLY
// definition (YouScreen renders exactly what buildYouGroups() returns; the previous hardcoded
// divergence orphaned 4 destinations). Six curated rows, one visible group, nothing collapsed:
//   Patterns (dashboard — absorbs the old Insights screen, which rendered the same data) ·
//   Your data · Nila memory · Learn · Caregiver · Settings.
// about_nila moved to a Settings row; thought_record lives in the Journal hub; progress duplicated
// the streak card and was deleted; episode_marker's screen was unreachable and is retired.
// Kept as plain data (icon component refs, not JSX) so the row set stays unit-testable in a node env.

export interface YouRow {
  id: string;
  label: string;
  sub: string;
  Icon: LucideIcon;
  iconClass: string;
  /** Legacy collapse flag — no redesigned row uses it. */
  more?: true;
  /** Brief inline help tip shown below the subtitle for unfamiliar clinical terms. */
  help?: string;
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
        { id: "dashboard", label: t("you_dashboard_label"), sub: t("you_dashboard_sub"), Icon: LayoutDashboard, iconClass: "w-5 h-5 text-accent" },
        { id: "your_data", label: t("you_your_data_label"), sub: t("you_your_data_sub"), Icon: ShieldCheck, iconClass: "w-5 h-5 text-success" },
        { id: "nila_memory", label: t("you_nila_memory_label"), sub: t("you_nila_memory_sub"), Icon: Sparkles, iconClass: "w-5 h-5 text-accent-hi" },
        { id: "learn", label: t("you_learn_label"), sub: t("you_learn_sub"), Icon: BookOpen, iconClass: "w-5 h-5 text-accent" },
        { id: "caregiver_settings", label: t("you_caregiver_settings_label"), sub: t("you_caregiver_settings_sub"), Icon: Users, iconClass: "w-5 h-5 text-success" },
        { id: "settings", label: t("you_settings_label"), sub: t("you_settings_sub"), Icon: SettingsIcon, iconClass: "w-5 h-5 text-ink-2" },
      ],
    },
  ];
}

// Flattened id list (derived from buildYouGroups, so it can never drift from the rendered rows).
export const YOU_ROW_IDS: string[] = buildYouGroups().flatMap((g) => g.rows.map((r) => r.id));
export type YouRowId = string;
