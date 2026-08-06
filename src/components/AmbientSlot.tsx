import { ShieldCheck, Moon } from "lucide-react";
import { useAmbientSignals } from "../hooks/useAmbientSignals";
import RatingPromptCard from "./RatingPromptCard";

// AmbientSlot — the ONLY place a prompt/nudge card may appear on Home, structurally capped at one
// (redesign §5.1: prompts can never stack again). Priority: safety-plan follow-up > review > sleep
// > rating. Card markup for the first three is moved from NudgeRail verbatim (ids/copy/44px targets
// preserved — the e2e harness keys on the ids). §9: the crisis-suppression latch blanks the slot.

export default function AmbientSlot({ go }: { go: (target: string) => void }) {
  const s = useAmbientSignals();

  if (s.suppressed) return null;

  if (s.safetyPlanCard === "followup") {
    return (
      <div className="w-full px-3 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent-hi text-xs" id="safety-plan-followup-card">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Safety plan — a first look back</p>
            <p className="text-accent-hi/70 mt-0.5">Coming back to your plan within a day or two is the part research shows helps most. No pressure — just a gentle nudge if now feels like a good time.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { s.hideSafetyPlanCard(); go("safety_plan"); }} className="px-3 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent-hi font-medium transition-colors cursor-pointer min-h-[44px] focus-ring">Review plan</button>
              <button onClick={s.completeFollowUp} className="px-3 py-2 rounded-lg hover:bg-accent/15 text-accent-hi/80 transition-colors cursor-pointer min-h-[44px] focus-ring">Done</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (s.safetyPlanCard === "review") {
    return (
      <div className="w-full px-3 py-2 rounded-xl bg-warn/10 border border-warn/30 text-warn text-xs" id="safety-plan-review-card">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-warn mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Your safety plan could use a quick look</p>
            <p className="text-warn/70 mt-0.5">No pressure — a fast review helps keep it useful.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { s.hideSafetyPlanCard(); go("safety_plan"); }} className="px-3 py-2 rounded-lg bg-warn/20 hover:bg-warn/30 text-warn font-medium transition-colors cursor-pointer min-h-[44px] focus-ring">Review plan</button>
              <button onClick={s.completeReview} className="px-3 py-2 rounded-lg hover:bg-warn/15 text-warn/80 transition-colors cursor-pointer min-h-[44px] focus-ring">Looks good</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (s.sleepNudge?.firing) {
    return (
      <div className="w-full px-3 py-2 rounded-xl bg-warn/10 border border-warn/30 text-warn text-xs" id="sleep-prodrome-card">
        <div className="flex items-start gap-2">
          <Moon className="w-4 h-4 text-warn mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Sleep has been short lately</p>
            <p className="text-warn/70 mt-0.5">{s.sleepNudge.detail}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { s.dismissSleep(); go("winddown"); }} className="px-3 py-2 rounded-lg bg-warn/20 hover:bg-warn/30 text-warn font-medium transition-colors cursor-pointer min-h-[44px] focus-ring">Wind down</button>
              <button onClick={s.dismissSleep} className="px-3 py-2 rounded-lg hover:bg-warn/15 text-warn/80 transition-colors cursor-pointer min-h-[44px] focus-ring">Not now</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <RatingPromptCard />;
}
