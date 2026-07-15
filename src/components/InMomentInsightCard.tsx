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
}

export default function InMomentInsightCard({
  explainerTitle,
  explainerSummary,
  explainerBasis,
  skillEmoji,
  skillName,
  skillReason,
  onTrySkill,
}: InMomentInsightCardProps) {
  return (
    <div
      id="in-moment-insight"
      className="mt-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 space-y-2.5"
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

      {skillName && (
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
            {onTrySkill && (
              <button
                id="in-moment-try-skill"
                onClick={onTrySkill}
                className="mt-1.5 text-[12px] font-medium text-violet-200 hover:text-violet-100 underline underline-offset-2"
              >
                Try it
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
