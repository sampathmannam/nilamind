import { useState } from "react";
import { Star, X } from "lucide-react";
import { shouldPromptRating, dismissRatingPrompt, onUserRated } from "../services/ratingPrompt";

export default function RatingPromptCard() {
  const [show, setShow] = useState(() => shouldPromptRating());

  if (!show) return null;

  const handleRate = () => {
    onUserRated();
    setShow(false);
    try {
      window.open("https://play.google.com/store/apps/details?id=com.nilamind.app", "_blank");
    } catch {
      // Cannot open Play Store in this context — still counted as rated
    }
  };

  const handleDismiss = () => {
    dismissRatingPrompt();
    setShow(false);
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3 relative animate-fade-in border border-amber-500/20" id="rating-prompt-card">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-2.5 pr-8">
        <Star className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm text-slate-200 leading-relaxed">
            Enjoying NilaMind? A quick rating helps others find a private, on-device companion.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              Rate on Play Store
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer min-h-[44px]"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
