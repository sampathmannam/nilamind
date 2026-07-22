import { useState } from "react";
import { ShieldCheck, Moon, Brain, ChevronDown, ChevronUp } from "lucide-react";
import type { JitaiDecision } from "../services/jitaiEngine";
import type { SafetyPlanCard } from "./nudgeSelection";

const JITAI_TOOL_LABELS: Record<string, string> = {
  winddown: "wind down",
  grounding: "grounding",
  breathing: "breathing",
  problem_solving: "problem-solving",
};

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
  totalNudges?: number;
  onOpenSafetyPlan: () => void;
  onCompleteReview: () => void;
  onCompleteFollowUp: () => void;
  onDismissCalm: () => void;
  onDismissSleep: () => void;
  onOpenWindDown?: () => void;
  onQuickAction: (action: string) => void;
}

export default function NudgeRail({
  visibleNudgeIds,
  safetyPlanCard,
  calmSafetyNudge,
  sleepProdromeNudge,
  jitaiNudge,
  totalNudges,
  onOpenSafetyPlan,
  onCompleteReview,
  onCompleteFollowUp,
  onDismissCalm,
  onDismissSleep,
  onOpenWindDown,
  onQuickAction,
}: NudgeRailProps) {
  const [expanded, setExpanded] = useState(false);
  const nudgeCap = 3;

  const items: { key: string; el: React.ReactNode }[] = [];

  if (visibleNudgeIds.has("safetyPlan") && safetyPlanCard === "review") {
    items.push({ key: "safetyPlan-review", el: (
      <div className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs" id="safety-plan-review-card">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Your safety plan could use a quick look</p>
            <p className="text-amber-200/70 mt-0.5">No pressure — a fast review helps keep it useful.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={onOpenSafetyPlan} className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring">Review plan</button>
              <button onClick={onCompleteReview} className="px-3 py-2 rounded-lg hover:bg-amber-500/15 text-amber-200/80 transition-colors cursor-pointer min-h-[44px] focus-ring">Looks good</button>
            </div>
          </div>
        </div>
      </div>
    )});
  }

  if (visibleNudgeIds.has("safetyPlan") && safetyPlanCard === "followup") {
    items.push({ key: "safetyPlan-followup", el: (
      <div className="w-full px-3 py-2 rounded-xl bg-blue-500/10 border border-accent/30 text-blue-200 text-xs" id="safety-plan-followup-card">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Safety plan — a first look back</p>
            <p className="text-blue-200/70 mt-0.5">Coming back to your plan within a day or two is the part research shows helps most. No pressure — just a gentle nudge if now feels like a good time.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={onOpenSafetyPlan} className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring">Review plan</button>
              <button onClick={onCompleteFollowUp} className="px-3 py-2 rounded-lg hover:bg-blue-500/15 text-blue-200/80 transition-colors cursor-pointer min-h-[44px] focus-ring">Done</button>
            </div>
          </div>
        </div>
      </div>
    )});
  }

  if (visibleNudgeIds.has("safetyPlan") && safetyPlanCard === "calm" && calmSafetyNudge?.show) {
    items.push({ key: "safetyPlan-calm", el: (
      <div key="calm-safety-plan-nudge" className="w-full px-3 py-2 rounded-xl bg-blue-500/10 border border-accent/30 text-blue-200 text-xs" id="calm-safety-plan-nudge-card">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{calmSafetyNudge.label}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={onOpenSafetyPlan} className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring">Fill it in</button>
              <button onClick={onDismissCalm} className="px-3 py-2 rounded-lg hover:bg-blue-500/15 text-blue-200/80 transition-colors cursor-pointer min-h-[44px] focus-ring">Not now</button>
            </div>
          </div>
        </div>
      </div>
    )});
  }

  if (visibleNudgeIds.has("sleep") && sleepProdromeNudge) {
    items.push({ key: "sleep", el: (
      <div key="sleep-prodrome" className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs" id="sleep-prodrome-card">
        <div className="flex items-start gap-2">
          <Moon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Sleep has been short lately</p>
            <p className="text-amber-200/70 mt-0.5">{sleepProdromeNudge.detail}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => onOpenWindDown?.()} className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring">Wind down</button>
              <button onClick={onDismissSleep} className="px-3 py-2 rounded-lg hover:bg-amber-500/15 text-amber-200/80 transition-colors cursor-pointer min-h-[44px] focus-ring">Not now</button>
            </div>
          </div>
        </div>
      </div>
    )});
  }

  if (visibleNudgeIds.has("jitai") && jitaiNudge?.shouldNudge) {
    items.push({ key: "jitai", el: (
      <div key="jitai-nudge" className="w-full px-3 py-2 rounded-xl glass text-ink-2 text-xs" id="jitai-nudge-card">
        <div className="flex items-start gap-2">
          <Brain className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Quick nudge</p>
            <p className="text-ink-2/70 mt-0.5">{jitaiNudge.nudgeText}</p>
            {jitaiNudge.suggestedTool && (
              <button
                onClick={() => { if (JITAI_ACTION_MAP[jitaiNudge.suggestedTool!]) onQuickAction(JITAI_ACTION_MAP[jitaiNudge.suggestedTool!]); }}
                className="px-3 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 font-medium transition-colors cursor-pointer mt-2 min-h-[44px] focus-ring"
              >
                Try {JITAI_TOOL_LABELS[jitaiNudge.suggestedTool] ?? jitaiNudge.suggestedTool}
              </button>
            )}
          </div>
        </div>
      </div>
    )});
  }

  const visibleItems = expanded ? items : items.slice(0, nudgeCap);
  const remaining = (totalNudges ?? items.length) - visibleItems.length;
  const shouldShowToggle = remaining > 0;

  return (
    <>
      {visibleItems.map((item) => <div key={item.key}>{item.el}</div>)}
      {shouldShowToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-fill/50 text-xs text-ink-muted hover:text-ink-2 transition-colors cursor-pointer min-h-[44px] focus-ring"
          aria-label={expanded ? "Show fewer nudges" : `Show ${remaining} more nudge${remaining > 1 ? "s" : ""}`}
        >
          <span>{expanded ? "Show fewer" : `+${remaining} more`}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </>
  );
}
