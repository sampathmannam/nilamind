// QuickActions — 6-button grid for instant tool access.
// No navigation needed — one tap to any tool.

import React from "react";
import {
  Wind, Cloud, Phone, Pill, Moon,
  AlertTriangle, Smile, Lightbulb, Compass, Shield
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

/** ActionDef with an `active` flag — true when the tool is appropriate for the current time/state. */
interface ActiveActionDef extends ActionDef {
  active: boolean;
}

export const ACTIONS: ActionDef[] = [
  { id: "grounding", label: "Grounding", icon: <Cloud className="w-5 h-5" />, color: "text-success", modes: ["day", "evening"] },
  { id: "breathing", label: "Breathing", icon: <Wind className="w-5 h-5" />, color: "text-accent", modes: ["day", "evening", "night"] },
  { id: "diary", label: "Log feeling", icon: <Smile className="w-5 h-5" />, color: "text-accent", modes: ["day", "evening"] },
  { id: "problem_solving", label: "Make a plan", icon: <Lightbulb className="w-5 h-5" />, color: "text-warn", modes: ["morning", "day", "evening"] },
  { id: "values_to_action", label: "What matters", icon: <Compass className="w-5 h-5" />, color: "text-rose-400", modes: ["morning", "day", "evening"] },
  { id: "safety_plan", label: "Safety plan", icon: <Shield className="w-5 h-5" />, color: "text-teal-400", modes: ["morning", "day", "evening", "night"] },
  { id: "reach_out", label: "Reach out", icon: <Phone className="w-5 h-5" />, color: "text-accent", modes: ["day", "evening"] },
  { id: "medication", label: "Medication", icon: <Pill className="w-5 h-5" />, color: "text-accent", modes: ["morning", "day"] },
  { id: "wind_down", label: "Wind down", icon: <Moon className="w-5 h-5" />, color: "text-accent", modes: ["evening", "night"] },
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
export function selectQuickActions(timeMode: TimeMode, userState?: UserState | null): ActiveActionDef[] {
  if (userState === "elevated") {
    return ACTIONS.filter((a) => CALMING_WHEN_ELEVATED.includes(a.id)).map((a) => ({ ...a, active: true }));
  }
  // C-3 fix: dim-not-hide — show all time-appropriate actions, dim the ones that don't match. "Dim, don't
  // hide" is an established accessibility/inclusive-design pattern precisely BECAUSE it keeps the element
  // reachable — that's what distinguishes it from "disable." The 2026-07-23 commit that introduced this
  // wrote that contract in this very comment ("user can still tap, but they're nudged") but simultaneously
  // added `pointer-events-none` to the button's className (see below), which makes a dimmed action
  // completely untappable with zero feedback — confirmed on-device: tapping a dimmed "Grounding" chip at
  // night did nothing at all, no toast, no explanation. Fixed 2026-08-04 by dropping pointer-events-none so
  // the implementation matches its own documented intent.
  const base = ACTIONS.filter((a) => a.modes.includes(timeMode) && a.id !== "crisis");
  const crisisVisible = userState === "low";
  const crisisAction = crisisVisible ? ACTIONS.find((a) => a.id === "crisis") : null;

  const result: ActiveActionDef[] = [
    ...base.map((a) => ({ ...a, active: true })),
  ];

  // Add time-inappropriate actions as dimmed (active: false) — user can still tap, but they're nudged
  const dimmed = ACTIONS.filter(
    (a) => a.id !== "crisis" && !base.some((b) => b.id === a.id) && a.modes.length > 0,
  );
  for (const a of dimmed) {
    result.push({ ...a, active: false });
  }

  if (crisisAction) {
    result.push({ ...crisisAction, active: true });
  }

  return result;
}

export default function QuickActions({ onAction, timeMode, userState }: QuickActionsProps) {
  const displayActions = selectQuickActions(timeMode, userState);

  return (
    <div className="w-full" id="quick-actions">
      <div className="grid grid-cols-2 gap-2.5">
        {displayActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-line hover:border-line-strong hover:bg-fill transition-all cursor-pointer active:scale-[0.97] group${action.active ? "" : " opacity-35"}`}
            aria-label={action.label}
          >
            <span className={`${action.color} transition-transform group-hover:scale-110`}>{action.icon}</span>
            <span className="text-[12px] text-ink-2 font-medium leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
