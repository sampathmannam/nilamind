import {
  Wind, NotebookPen, Activity, LifeBuoy, TrendingUp, Moon, MessageCircle,
  Shield, Users, Pill, Lightbulb, Compass, Mountain, AlertTriangle, Smile,
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
        { id: "crisis_rehearsal", label: "Crisis rehearsal", sub: "Practice your plan before you need it", Icon: Shield, iconClass: "w-5 h-5 text-rose-400", onTap: () => go("crisis_rehearsal") },
        { id: "relapse_plan", label: "Relapse prevention plan", sub: "Plan ahead for each phase — green, orange, red", Icon: AlertTriangle, iconClass: "w-5 h-5 text-amber-400", onTap: () => go("relapse_plan") },
        { id: "episode", label: "I'm in an episode", sub: "Guided, step-by-step support right now", Icon: LifeBuoy, iconClass: "w-5 h-5 text-rose-400", onTap: onEpisode },
      ],
    },
    {
      title: "Log & track",
      rows: [
        { id: "ema_checkin", label: "Quick check-in", sub: "A 10-second mood check, right now", Icon: Smile, iconClass: "w-5 h-5 text-purple-400", onTap: () => go("ema_checkin") },
        { id: "diary", label: "Diary", sub: "A DBT diary card for today", Icon: NotebookPen, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("diary") },
        { id: "assessment", label: "Screenings", sub: "PHQ-9, GAD-7 & more over time", Icon: Activity, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("assessment") },
        { id: "medication", label: "Medications", sub: "Track doses and adherence", Icon: Pill, iconClass: "w-5 h-5 text-blue-400", onTap: () => go("medication") },
      ],
    },
    {
      title: "Skills & practice",
      rows: [
        { id: "problem_solving", label: "Problem-solving", sub: "Break a problem into steps and try a solution", Icon: Lightbulb, iconClass: "w-5 h-5 text-amber-400", onTap: () => go("problem_solving") },
        { id: "values_work", label: "Values work", sub: "Clarify what matters and notice where you align", Icon: Compass, iconClass: "w-5 h-5 text-violet-400", onTap: () => go("values_work") },
        { id: "exposure", label: "Exposure hierarchy", sub: "Build a fear ladder — work from the bottom up", Icon: Mountain, iconClass: "w-5 h-5 text-orange-400", onTap: () => go("exposure") },
        { id: "peer_support", label: "Peer support", sub: "Practice reaching out to people who get it", Icon: Users, iconClass: "w-5 h-5 text-emerald-400", onTap: () => go("peer_support") },
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
