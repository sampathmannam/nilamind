import { useState } from "react";
import { LifeBuoy, X } from "lucide-react";
import { secureLocal } from "../services/secureLocal";
import { parseSafetyPlan } from "../services/safetyPlan";
import { shouldNudgeToCreateSafetyPlan, dismissCreateSafetyPlanNudge } from "../services/safetyPlanFollowUp";

interface SafetyPlanNudgeCardProps {
  go: (target: string) => void;
}

// The create-nudge that didn't exist before this redesign — safetyPlanFollowUp.ts already nudges to
// REVIEW an existing plan (48h/14-day), but nothing ever invited a user to make one in the first place.
// Same dismissible-card shape as RatingPromptCard, so it's visually familiar rather than a new pattern.
export default function SafetyPlanNudgeCard({ go }: SafetyPlanNudgeCardProps) {
  const [show, setShow] = useState(() =>
    shouldNudgeToCreateSafetyPlan(parseSafetyPlan(secureLocal.getItem("nilamind_safetyplan"))),
  );

  if (!show) return null;

  const handleDismiss = () => {
    dismissCreateSafetyPlanNudge();
    setShow(false);
  };

  const handleOpen = () => {
    setShow(false);
    go("safety_plan");
  };

  return (
    <div
      className="glass rounded-2xl p-4 space-y-3 relative animate-fade-in border border-danger/20"
      id="safety-plan-nudge-card"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-ink-faint hover:text-ink-2 hover:bg-fill/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-2.5 pr-8">
        <LifeBuoy className="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm text-ink-2 leading-relaxed">
            You haven't set up a coping plan yet. A couple of quick notes now can help a lot on a harder day.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleOpen}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-danger/20 hover:bg-danger/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
              id="safety-plan-nudge-open-btn"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              Set it up
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs text-ink-faint hover:text-ink-2 transition-colors cursor-pointer min-h-[44px]"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
