// QuickActions — 6-button grid for instant tool access.
// No navigation needed — one tap to any tool.

import React from "react";
import {
  Wind, Cloud, BookOpen, Phone, Pill, Moon,
  Smile, AlertTriangle, Brain, Heart
} from "lucide-react";

interface QuickActionsProps {
  onAction: (action: string) => void;
  timeMode: "morning" | "day" | "evening" | "night";
}

interface ActionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  modes: string[];
}

const ACTIONS: ActionDef[] = [
  { id: "grounding", label: "Grounding", icon: <Cloud className="w-5 h-5" />, color: "text-emerald-400", modes: ["day", "evening"] },
  { id: "breathing", label: "Breathing", icon: <Wind className="w-5 h-5" />, color: "text-blue-400", modes: ["day", "evening", "night"] },
  { id: "diary", label: "Log feeling", icon: <Smile className="w-5 h-5" />, color: "text-violet-400", modes: ["day", "evening"] },
  { id: "reach_out", label: "Reach out", icon: <Phone className="w-5 h-5" />, color: "text-sky-400", modes: ["day", "evening"] },
  { id: "medication", label: "Medication", icon: <Pill className="w-5 h-5" />, color: "text-purple-400", modes: ["morning", "day"] },
  { id: "wind_down", label: "Wind down", icon: <Moon className="w-5 h-5" />, color: "text-indigo-400", modes: ["evening", "night"] },
  { id: "skill", label: "Quick skill", icon: <BookOpen className="w-5 h-5" />, color: "text-amber-400", modes: ["day", "evening"] },
  { id: "thought_record", label: "Thought record", icon: <Brain className="w-5 h-5" />, color: "text-rose-400", modes: ["day", "evening"] },
  { id: "self_compassion", label: "Self-compassion", icon: <Heart className="w-5 h-5" />, color: "text-pink-400", modes: ["day", "evening", "night"] },
  { id: "crisis", label: "Need help now", icon: <AlertTriangle className="w-5 h-5" />, color: "text-rose-400", modes: ["morning", "day", "evening", "night"] },
];

export default function QuickActions({ onAction, timeMode }: QuickActionsProps) {
  // Filter actions relevant to current time mode
  const relevantActions = ACTIONS.filter((a) => a.modes.includes(timeMode));

  // Show max 6 actions (2 rows of 3)
  const displayActions = relevantActions.slice(0, 6);

  return (
    <div className="w-full" id="quick-actions">
      <div className="grid grid-cols-3 gap-2">
        {displayActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all cursor-pointer active:scale-95`}
          >
            <span className={action.color}>{action.icon}</span>
            <span className="text-[11px] text-slate-300 font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
