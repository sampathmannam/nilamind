import React from "react";
import { Sparkles, Check, X } from "lucide-react";
import {
  getPendingCheckinDraft,
  confirmCheckinDraft,
  dismissCheckinDraftToday,
  clearPendingCheckinDraft,
  summarizeDraft,
} from "../services/checkinDraft";

// Conversational check-in capture (2026-07-18). When the on-device model has drafted today's check-in from
// what the person already told Nila in chat, this replaces the cold "How are you feeling?" form prompt with
// a warm, pre-filled confirm: six taps become one. The draft is never auto-saved — the user confirms,
// tweaks, or dismisses. Renders nothing when there's no pending draft (fail-open to the normal form).
export default function ConversationalCheckinCard({
  go,
  onResolved,
}: {
  go: (target: string) => void;
  onResolved: () => void;
}) {
  const draft = getPendingCheckinDraft();
  if (!draft) return null;

  const confirm = () => {
    confirmCheckinDraft(draft);
    onResolved();
  };

  const notQuite = () => {
    // Their state, their words — hand them the full form to log it themselves, and drop the draft.
    clearPendingCheckinDraft();
    go("ema_checkin");
    onResolved();
  };

  const dismiss = () => {
    dismissCheckinDraftToday();
    onResolved();
  };

  return (
    <div className="glass p-5 rounded-2xl space-y-3 border-l-4 border-l-blue-500 relative" id="today-conversational-checkin">
      <button
        onClick={dismiss}
        aria-label="Not now"
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 leading-snug">{summarizeDraft(draft)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            From what you shared with me — want me to log that as today's check-in? You can tweak it too.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={confirm}
          id="conv-checkin-confirm"
          className="flex-1 flex items-center justify-center gap-2 sun-cta text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-all active:scale-[0.99]"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
          Yes, log it
        </button>
        <button
          onClick={notQuite}
          id="conv-checkin-adjust"
          className="px-4 py-2.5 rounded-xl border border-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-slate-100 text-sm font-medium cursor-pointer transition-all active:scale-[0.99]"
        >
          Not quite
        </button>
      </div>
    </div>
  );
}
