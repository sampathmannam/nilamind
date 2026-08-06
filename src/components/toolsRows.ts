import { type LucideIcon } from "lucide-react";
import { t } from "../services/i18n";
import { TOOL_META } from "./toolMeta";

// Redesign §5.3 (2026-08-06) — the single source of truth for the "Tools" hub rows. ToolsScreen
// renders exactly what buildToolGroups() returns (the old SECTIONS whitelist that silently dropped
// built rows is gone), so this file (and its test) guard the real, on-screen row set.
//
// Shape: 14 flat rows → 9 rows under 4 headers. "In the moment" comes FIRST (episode support +
// safety plan — when someone opens Tools in distress, the top row is the right one; Stanley & Brown
// 2012: the plan should be built/reviewed calm-time, before it's needed). Calm and Skills fan out
// through hub launchers (CalmHubScreen/SkillsHubScreen — Hick–Hyman: fewer simultaneous choices;
// progressive disclosure keeps the full catalog reachable, including the previously-orphaned
// Guided Programs library). The dashboard row moved to You ("Patterns").
//
// Labels/subs/icons resolve through TOOL_META (./toolMeta) — the same registry Recently/Pinned and
// the hubs render from, so recency surfaces can never drift from the catalog again.
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
  /** Legacy collapse flag — no redesigned group uses it (all 9 rows are always visible). */
  more?: true;
}

export interface ToolRowDeps {
  go: (target: string) => void;
  onEpisode: () => void;
  /** Kept for call-site compatibility; the phone-gated dashboard row moved to the You tab. */
  phoneEnabled: boolean;
}

function metaRow(id: string, onTap: () => void): ToolRow {
  const m = TOOL_META[id];
  return { id, label: m.label(), sub: m.sub(), Icon: m.Icon, iconClass: m.iconClass, onTap };
}

export function buildToolGroups({ go, onEpisode }: ToolRowDeps): ToolGroup[] {
  return [
    {
      title: t("tool_group_moment"),
      rows: [
        metaRow("episode", onEpisode),
        metaRow("safety_plan", () => go("safety_plan")),
      ],
    },
    {
      title: t("tool_group_calm"),
      rows: [
        metaRow("calm_hub", () => go("calm_hub")),
        metaRow("reach_out", () => go("reach_out")),
      ],
    },
    {
      title: t("tool_group_log"),
      rows: [
        metaRow("ema_checkin", () => go("ema_checkin")),
        metaRow("diary", () => go("diary")),
        metaRow("medication", () => go("medication")),
      ],
    },
    {
      title: t("tool_group_skills"),
      rows: [
        metaRow("assessment", () => go("assessment")),
        metaRow("skills_hub", () => go("skills_hub")),
      ],
    },
  ];
}

// Goal -> the tool row ids it should promote to the front of their group, when present in that group.
// Same personalization rationale/citation as chatSuggestions.ts's GOAL_CHIP_PRIORITY: customizable/relevant
// content is a named engagement facilitator, per Borghouts, Eikey, Mark et al. (2021), J Med Internet Res.
// Keyed by the onboarding goal IDs actually stored in nilamind_user_goal (OnboardingGate USER_GOALS).
// Redesign 2026-08-06: hub children can no longer be promoted directly — promote their hub instead
// (e.g. sleep's wind-down lives inside calm_hub); ids absent from a group are a no-op by design.
const GOAL_TOOL_PRIORITY: Record<string, string[]> = {
  sleep: ["calm_hub", "diary", "skills_hub"],
  mood: ["ema_checkin", "diary", "assessment", "skills_hub"],
  grounding: ["calm_hub", "skills_hub"],
  medication: ["medication", "diary"],
  talking: ["skills_hub"],
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
// Evening/night lead with the Calm hub (wind-down/settle lives inside it); anxious/elevated lead with
// Calm; crisis additionally leads with direct crisis support (episode) then Calm.
const TIME_TOOL_PRIORITY: Record<"morning" | "day" | "evening" | "night", string[]> = {
  morning: [],
  day: [],
  evening: ["calm_hub"],
  night: ["calm_hub"],
};

const STATE_TOOL_PRIORITY: Partial<Record<string, string[]>> = {
  anxious: ["calm_hub"],
  elevated: ["calm_hub"],
  crisis: ["episode", "calm_hub"],
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
