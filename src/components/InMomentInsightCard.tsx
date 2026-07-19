// InMomentInsightCard — surfaced under Nila's reply: a brief, research-cited
// "why you might feel this way" explainer + a relevant skill/tool suggestion.
// Pure presentational; the data comes from deriveInMomentInsight (on-device, deterministic).
import React from "react";
import { Lightbulb, Sparkles } from "lucide-react";

interface InMomentInsightCardProps {
  explainerTitle: string;
  explainerSummary: string;
  explainerBasis: string;
  skillEmoji: string;
  skillName: string;
  skillReason: string;
  onTrySkill?: () => void;
  onDismissSkill?: () => void;
  skillDismissed?: boolean;
}

export default function InMomentInsightCard({
  explainerTitle,
  explainerSummary,
  explainerBasis,
  skillEmoji,
  skillName,
  skillReason,
  onTrySkill,
  onDismissSkill,
  skillDismissed,
}: InMomentInsightCardProps) {
  const showSkill = !!skillName && !skillDismissed;
  if (!explainerTitle && !showSkill) return null;

  return (
    <div
      id="in-moment-insight"
      className="mt-2 glass rounded-xl p-3 space-y-2.5"
    >
      {explainerTitle && (
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/90">
              Why you might feel this way
            </p>
            <p className="text-[13px] text-slate-200 leading-snug mt-0.5">{explainerTitle}</p>
            <p className="text-[12px] text-slate-400 leading-snug mt-1">{explainerSummary}</p>
            <p className="text-xs text-slate-500 mt-1 italic">Research: {explainerBasis}</p>
          </div>
        </div>
      )}

      {showSkill && (
        <div className={`flex items-start gap-2 ${explainerTitle ? "pt-2 border-t border-slate-700/50" : ""}`}>
          <Sparkles className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/90">
              A skill that may help
            </p>
            <p className="text-[12px] text-slate-200 leading-snug mt-0.5">
              <span className="mr-1">{skillEmoji}</span>
              <span className="font-medium">{skillName}</span>
              <span className="text-slate-400"> — {skillReason}</span>
            </p>
            <div className="flex gap-2 mt-2">
              {onTrySkill && (
                <button
                  id="in-moment-try-skill"
                  onClick={onTrySkill}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Sparkles className="w-3 h-3" /> Try this skill
                </button>
              )}
              {onDismissSkill && (
                <button
                  id="in-moment-dismiss-skill"
                  onClick={onDismissSkill}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[12px] transition-colors cursor-pointer min-h-[44px]"
                >
                  Not now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
