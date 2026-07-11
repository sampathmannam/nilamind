// QuickActions — 6-button grid for instant tool access.
// No navigation needed — one tap to any tool.

import React from "react";
import {
  Wind, Cloud, BookOpen, Phone, Pill, Moon,
  AlertTriangle, Brain, Heart, Smile, Activity, Compass
} from "lucide-react";
import type { UserState, TimeMode } from "../types/modes";

interface QuickActionsProps {
  onAction: (action: string) => void;
  timeMode: TimeMode;
  userState?: UserState | null;
}

interface ActionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  modes: string[];
}

export const ACTIONS: ActionDef[] = [
  { id: "grounding", label: "Grounding", icon: <Cloud className="w-5 h-5" />, color: "text-emerald-400", modes: ["day", "evening"] },
  { id: "breathing", label: "Breathing", icon: <Wind className="w-5 h-5" />, color: "text-blue-400", modes: ["day", "evening", "night"] },
  { id: "diary", label: "Log feeling", icon: <Smile className="w-5 h-5" />, color: "text-violet-400", modes: ["day", "evening"] },
  { id: "reach_out", label: "Reach out", icon: <Phone className="w-5 h-5" />, color: "text-sky-400", modes: ["day", "evening"] },
  { id: "medication", label: "Medication", icon: <Pill className="w-5 h-5" />, color: "text-purple-400", modes: ["morning", "day"] },
  { id: "dashboard", label: "Dashboard", icon: <Activity className="w-5 h-5" />, color: "text-sky-400", modes: ["day", "evening"] },
  { id: "wind_down", label: "Wind down", icon: <Moon className="w-5 h-5" />, color: "text-indigo-400", modes: ["evening", "night"] },
  { id: "learn", label: "Learn", icon: <BookOpen className="w-5 h-5" />, color: "text-amber-400", modes: ["morning", "day", "evening", "night"] },
  { id: "thought_record", label: "Thought record", icon: <Brain className="w-5 h-5" />, color: "text-rose-400", modes: ["day", "evening"] },
  { id: "values_to_action", label: "Do one thing", icon: <Compass className="w-5 h-5" />, color: "text-violet-400", modes: ["morning", "day", "evening", "night"] },
  { id: "self_compassion", label: "Self-compassion", icon: <Heart className="w-5 h-5" />, color: "text-pink-400", modes: ["day", "evening", "night"] },
  { id: "crisis", label: "Need help now", icon: <AlertTriangle className="w-5 h-5" />, color: "text-rose-400", modes: ["morning", "day", "evening", "night"] },
];

// Down-regulating / co-regulating tools surfaced when the user is elevated. All four route to real
// handlers (grounding, box-breathing, wind-down, reach-out). Everything else stays reachable via the
// Tools tab — this only calms the HOME surface.
const CALMING_WHEN_ELEVATED = ["grounding", "breathing", "wind_down", "reach_out"];

/**
 * Choose the home quick-actions. Manic-first: when the user is elevated, quiet the home — surface only
 * the down-regulating / co-regulating tools and drop the activating / information-seeking / analytical
 * ones (learn, dashboard, thought record, "do one thing", log-feeling). Mirrors the settling orb + the
 * "let's slow things down" copy (Østergaard 2023 — don't feed an elevated state with more stimulation).
 * Otherwise: the existing time-of-day filter, capped at 9.
 */
export function selectQuickActions(timeMode: TimeMode, userState?: UserState | null): ActionDef[] {
  if (userState === "elevated") {
    return ACTIONS.filter((a) => CALMING_WHEN_ELEVATED.includes(a.id));
  }
  return ACTIONS.filter((a) => a.modes.includes(timeMode)).slice(0, 9);
}

export default function QuickActions({ onAction, timeMode, userState }: QuickActionsProps) {
  const displayActions = selectQuickActions(timeMode, userState);

  return (
    <div className="w-full" id="quick-actions">
      <div className="grid grid-cols-3 gap-2">
        {displayActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all cursor-pointer active:scale-95"
          >
            <span className={action.color}>{action.icon}</span>
            <span className="text-[11px] text-slate-300 font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
