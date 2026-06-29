import { useState } from "react";
import { Heart, X, ChevronRight } from "lucide-react";
import { reachOutSmsUri, dismissPactNoticeToday, type PactNotice } from "../services/pactNotice";

// Surfaced in the Nila home when a real shift is noticed AND a pact exists: shows the user THEIR OWN words
// and offers a user-tapped reach-out to their named person. Dismissible (and stays dismissed for the day).
// Never autonomous, never restrictive — Nila only ever offers.
export default function PactNoticeBanner({ notice, onDismiss, onOpenPact }: {
  notice: PactNotice;
  onDismiss: () => void;
  onOpenPact?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sms = reachOutSmsUri(notice.person);
  const dismiss = () => { dismissPactNoticeToday(); onDismiss(); };

  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 space-y-3" id="pact-notice">
      <div className="flex items-start gap-2">
        <Heart className="w-4 h-4 text-purple-300 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-200 leading-relaxed flex-1">
          I noticed {notice.reason}. A while back you left yourself a note for times like this.
        </p>
        <button onClick={dismiss} aria-label="Dismiss" className="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
      </div>

      {expanded ? (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-page rounded-xl p-3 border border-slate-800 italic">{notice.letter}</p>
      ) : (
        <button onClick={() => setExpanded(true)} className="text-[12px] font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-0.5 cursor-pointer">
          Read your words <ChevronRight className="w-3 h-3" />
        </button>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {sms ? (
          <a href={sms} className="text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg cursor-pointer no-underline">Text {notice.person.name}</a>
        ) : (
          <span className="text-[11px] text-slate-500">Reach out to {notice.person.name} when you're ready.</span>
        )}
        {onOpenPact && (
          <button onClick={onOpenPact} className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer">edit this note</button>
        )}
      </div>
      <p className="text-[10px] text-slate-600">Only you see this. Nila won't do anything on her own.</p>
    </div>
  );
}
