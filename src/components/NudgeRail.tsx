import { ShieldCheck, Moon, Brain } from "lucide-react";
import type { JitaiDecision } from "../services/jitaiEngine";
import type { SafetyPlanCard } from "./nudgeSelection";

// NudgeRail — the ambient footer nudge cards (safety-plan review/follow-up/calm, sleep prodrome, JITAI),
// extracted VERBATIM from ModeScreen's footer (Phase 4 slice 2c). Presentational only: visibility + the
// MAX_NUDGES cap are decided upstream by selectVisibleNudges (2a); the nudge state + effects live in
// useNudges (2b). This component just renders props → JSX.
//
// MUST return a Fragment (not a wrapping <div>): the cards are direct children of ModeScreen's
// `space-y-2` footer container, so a wrapper would collapse inter-card spacing and add a phantom node.
// softCrisisCard, protocolCard, WelcomeBackCard and PactNoticeCard stay in ModeScreen (softCrisis is
// §9/crisis flow; the others are interleaved around protocolCard and already thin) — do not move them here.
// JSX, ids, copy and card ORDER are byte-identical to the originals; order mirrors the selector's priority.

// Friendly labels for the JITAI suggestedTool id — never render the raw id ("Try problem_solving").
const JITAI_TOOL_LABELS: Record<string, string> = {
  winddown: "wind down",
  grounding: "grounding",
  breathing: "breathing",
  problem_solving: "problem-solving",
};

// suggestedTool id → ModeScreen quick-action id. Shares its key set with JITAI_TOOL_LABELS (one row per
// tool: what to call it + what tapping it does). The resolved id is passed to ModeScreen's handleQuickAction
// unchanged (see its switch); an unknown tool stays a rendered button whose click is a no-op.
const JITAI_ACTION_MAP: Record<string, string> = {
  winddown: "wind_down",
  grounding: "grounding",
  breathing: "breathing",
  problem_solving: "problem_solving",
};

export interface NudgeRailProps {
  visibleNudgeIds: ReadonlySet<string>;
  safetyPlanCard: SafetyPlanCard;
  calmSafetyNudge: { show: boolean; label: string } | null;
  sleepProdromeNudge: { firing: boolean; detail: string } | null;
  jitaiNudge: JitaiDecision | null;
  onOpenSafetyPlan: () => void;
  onCompleteReview: () => void;
  onCompleteFollowUp: () => void;
  onDismissCalm: () => void;
  onDismissSleep: () => void;
  onOpenWindDown?: () => void;
  /** Receives an already-resolved ModeScreen quick-action id (e.g. "wind_down"). */
  onQuickAction: (action: string) => void;
}

export default function NudgeRail({
  visibleNudgeIds,
  safetyPlanCard,
  calmSafetyNudge,
  sleepProdromeNudge,
  jitaiNudge,
  onOpenSafetyPlan,
  onCompleteReview,
  onCompleteFollowUp,
  onDismissCalm,
  onDismissSleep,
  onOpenWindDown,
  onQuickAction,
}: NudgeRailProps) {
  return (
    <>
      {visibleNudgeIds.has("safetyPlan") && safetyPlanCard === "review" && (
        <div
          className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs"
          id="safety-plan-review-card"
        >
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Your safety plan could use a quick look</p>
              <p className="text-amber-200/70 mt-0.5">No pressure — a fast review helps keep it useful.</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onOpenSafetyPlan}
                  className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  Review plan
                </button>
                <button
                  onClick={onCompleteReview}
                  className="px-3 py-2 rounded-lg hover:bg-amber-500/15 text-amber-200/80 transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  Looks good
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 48h Safety Plan First Follow-Up (Stanley-Brown) */}
      {visibleNudgeIds.has("safetyPlan") && safetyPlanCard === "followup" && (
        <div
          className="w-full px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs"
          id="safety-plan-followup-card"
        >
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Safety plan — a first look back</p>
              <p className="text-blue-200/70 mt-0.5">Coming back to your plan within a day or two is the part research shows helps most. No pressure — just a gentle nudge if now feels like a good time.</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onOpenSafetyPlan}
                  className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  Review plan
                </button>
                <button
                  onClick={onCompleteFollowUp}
                  className="px-3 py-2 rounded-lg hover:bg-blue-500/15 text-blue-200/80 transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calm-moment safety-plan nudge (Task 1.5, 2026-07-12 Wave 3) — only when mood is calm, no recent
          crisis, and a section is still blank. Never shown crisis-adjacent (cleared in openCrisis). */}
      {/* Calm safety nudge — capped by priority system; only when no higher-priority safety-plan card */}
      {visibleNudgeIds.has("safetyPlan") && safetyPlanCard === "calm" && calmSafetyNudge?.show && (
        <div
          key="calm-safety-plan-nudge"
          className="w-full px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs"
          id="calm-safety-plan-nudge-card"
        >
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{calmSafetyNudge.label}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onOpenSafetyPlan}
                  className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  Fill it in
                </button>
                <button
                  onClick={onDismissCalm}
                  className="px-3 py-2 rounded-lg hover:bg-blue-500/15 text-blue-200/80 transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sleep prodrome nudge (C1 — soft signal, never alarm) */}
      {/* Sleep prodrome nudge — capped by priority system */}
      {visibleNudgeIds.has("sleep") && sleepProdromeNudge && (
        <div
          key="sleep-prodrome"
          className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs"
          id="sleep-prodrome-card"
        >
          <div className="flex items-start gap-2">
            <Moon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Sleep has been short lately</p>
              <p className="text-amber-200/70 mt-0.5">{sleepProdromeNudge.detail}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onOpenWindDown?.()}
                  className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  Wind down
                </button>
                <button
                  onClick={onDismissSleep}
                  className="px-3 py-2 rounded-lg hover:bg-amber-500/15 text-amber-200/80 transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JITAI nudge */}
      {/* JITAI nudge — capped by priority system */}
      {visibleNudgeIds.has("jitai") && jitaiNudge?.shouldNudge && (
        <div
          key="jitai-nudge"
          className="w-full px-3 py-2 rounded-xl glass text-slate-200 text-xs"
          id="jitai-nudge-card"
        >
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Quick nudge</p>
              <p className="text-slate-200/70 mt-0.5">{jitaiNudge.nudgeText}</p>
              {jitaiNudge.suggestedTool && (
                <button
                  onClick={() => {
                    if (JITAI_ACTION_MAP[jitaiNudge.suggestedTool!]) {
                      onQuickAction(JITAI_ACTION_MAP[jitaiNudge.suggestedTool!]);
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 font-medium transition-colors cursor-pointer mt-2 min-h-[44px] focus-ring"
                >
                  {/* Friendly label, never the raw tool id (2026-07-18 design review: "Try problem_solving"). */}
                  Try {JITAI_TOOL_LABELS[jitaiNudge.suggestedTool] ?? jitaiNudge.suggestedTool}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
