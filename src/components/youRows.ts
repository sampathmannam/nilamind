import {
  LayoutDashboard, ShieldCheck, Sparkles, Settings as SettingsIcon,
  Brain, Heart, Compass, BookOpen, Lightbulb, HelpCircle,
  type LucideIcon,
} from "lucide-react";

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
}

export interface YouGroup {
  title: string;
  rows: YouRow[];
}

export function buildYouGroups(): YouGroup[] {
  return [
    {
      title: "Manage",
      rows: [
        { id: "dashboard", label: "Your dashboard", sub: "Streak, mood & score trends, recent Nila", Icon: LayoutDashboard, iconClass: "w-5 h-5 text-blue-400" },
        { id: "your_data", label: "Your data", sub: "Export everything, or delete it — your call", Icon: ShieldCheck, iconClass: "w-5 h-5 text-emerald-400" },
        { id: "nila_memory", label: "What Nila remembers", sub: "See, edit, or delete what she knows", Icon: Sparkles, iconClass: "w-5 h-5 text-fuchsia-400" },
        { id: "settings", label: "Settings", sub: "Voice, reminders, recovery phrase", Icon: SettingsIcon, iconClass: "w-5 h-5 text-slate-300" },
      ],
    },
    {
      title: "Resources",
      rows: [
        { id: "thought_record", label: "Thought record", sub: "CBT reframing workbook", Icon: Brain, iconClass: "w-5 h-5 text-blue-400" },
        { id: "self_compassion", label: "Self-compassion", sub: "CFT inner-critic work", Icon: Heart, iconClass: "w-5 h-5 text-purple-400" },
        { id: "values_to_action", label: "Values to action", sub: "What matters → small steps you take", Icon: Compass, iconClass: "w-5 h-5 text-blue-400" },
        { id: "skills", label: "Skills library", sub: "DBT, CBT, ACT & CFT — what & why", Icon: BookOpen, iconClass: "w-5 h-5 text-blue-400" },
        { id: "understand", label: "Understand what's happening", sub: "Plain explainers for the mind & body — the research", Icon: Lightbulb, iconClass: "w-5 h-5 text-indigo-400" },
        { id: "why", label: "Why we built this", sub: "The research behind every feature", Icon: HelpCircle, iconClass: "w-5 h-5 text-slate-400" },
      ],
    },
  ];
}

// Flattened id list (derived from buildYouGroups, so it can never drift from the rendered rows).
export const YOU_ROW_IDS: string[] = buildYouGroups().flatMap((g) => g.rows.map((r) => r.id));
export type YouRowId = string;
