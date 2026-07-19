import { useEffect, useState } from "react";
import { Quote, X } from "lucide-react";
import { getDailyContent, isDailyDismissed, dismissDailyContent } from "../services/dailyContent";

export default function DailyContentCard() {
  const [content, setContent] = useState<ReturnType<typeof getDailyContent> | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setContent(getDailyContent());
    setDismissed(isDailyDismissed());
  }, []);

  const handleDismiss = () => {
    dismissDailyContent();
    setDismissed(true);
  };

  if (!content || dismissed) return null;

  return (
    <div className="glass rounded-2xl p-4 space-y-3 relative animate-fade-in" id="daily-content-card">
      {/* Matching the established ghost-dismiss convention (ConversationalCheckinCard's "Not now"
          button): text-color-only hover, no raw-slate hover:bg - this button sits on a .glass card,
          and a flat hover-bg reads as an ad-hoc addition next to that sibling pattern. */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-2 pr-8">
        <Quote className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-slate-200 italic leading-relaxed">"{content.quote}"</p>
          <p className="text-xs text-slate-500 mt-0.5">— {content.attribution}</p>
        </div>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
        <p className="text-[11px] text-slate-300 leading-relaxed">{content.tip}</p>
      </div>
    </div>
  );
}
