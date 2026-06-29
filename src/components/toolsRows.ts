import {
  Wind, NotebookPen, Activity, LifeBuoy, TrendingUp, Moon, MessageCircle,
  type LucideIcon,
} from "lucide-react";

// Redesign §2 — the single source of truth for the "Tools" hub rows. ToolsScreen renders exactly what
// buildToolGroups() returns, so this file (and its test) guard the real, on-screen row set: focused
// right-now tools grouped by intent. "In the moment" = grounding/breathing, wind-down for sleep,
// episode support; "Log & track" = diary, screenings; "Patterns" = phone insights when enabled.
// Re-homed rows (skills, thought_record, self_compassion, values_to_action) now live under
// You → Resources; episode support is a Nila MODE reached via onEpisode(), not a route; the
// "behaviour" row only appears when phone features are enabled (PHONE_FEATURES_ENABLED).
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
}

export interface ToolRowDeps {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
}

export function buildToolGroups({ go, onEpisode, phoneEnabled }: ToolRowDeps): ToolGroup[] {
  return [
    {
      title: "In the moment",
      rows: [
        { id: "plan", label: "Grounding & breathing", sub: "Calm your body in a hard minute", Icon: Wind, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("plan") },
        { id: "winddown", label: "Wind down for sleep", sub: "A calm bedtime routine — park the day & settle", Icon: Moon, iconClass: "w-5 h-5 text-indigo-400", onTap: () => go("winddown") },
        { id: "reach_out", label: "Reach out to someone", sub: "A gentle, ready-to-send message to a person you trust", Icon: MessageCircle, iconClass: "w-5 h-5 text-emerald-400", onTap: () => go("reach_out") },
        { id: "episode", label: "I'm in an episode", sub: "Guided, step-by-step support right now", Icon: LifeBuoy, iconClass: "w-5 h-5 text-rose-400", onTap: onEpisode },
      ],
    },
    {
      title: "Log & track",
      rows: [
        { id: "diary", label: "Diary", sub: "A DBT diary card for today", Icon: NotebookPen, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("diary") },
        { id: "assessment", label: "Screenings", sub: "PHQ-9, GAD-7 & more over time", Icon: Activity, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("assessment") },
      ],
    },
    ...(phoneEnabled
      ? [{
          title: "Patterns",
          rows: [
            { id: "behaviour", label: "Phone patterns", sub: "Screen time & sleep vs. mood — on-device", Icon: TrendingUp, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("behaviour") },
          ],
        }]
      : []),
  ];
}
