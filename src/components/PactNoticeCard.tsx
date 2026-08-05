// #30 (audit): the "pact" surfacing card. The pact EDITOR (PactScreen) was live, but activePactNotice — the
// trigger that gently surfaces the user's own letter + a tap-to-text handoff to their named person on a
// short-sleep run or mood deterioration — was never rendered anywhere, so the feature silently did nothing.
// This is that surface. Never autonomous, never restrictive, dismissible; §9 always takes precedence (the
// caller only shows this outside a crisis).
import { Heart, X } from "lucide-react";
import { reachOutSmsUri, type PactNotice } from "../services/pactNotice";

export default function PactNoticeCard({ notice, onDismiss }: { notice: PactNotice; onDismiss: () => void }) {
  const sms = reachOutSmsUri(notice.person);
  return (
    <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 space-y-2" id="pact-notice-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base text-amber-200/90 leading-relaxed">
          {notice.reason}. When you were steadier, you wrote this for a moment like this:
        </p>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          id="pact-notice-dismiss"
          className="shrink-0 text-amber-400/70 hover:text-amber-200 cursor-pointer p-1 -m-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-ink-2 italic whitespace-pre-wrap">&ldquo;{notice.letter}&rdquo;</p>
      {sms && (
        <a
          href={sms}
          onClick={onDismiss}
          id="pact-notice-reach-btn"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-100 text-sm font-medium hover:bg-amber-500/30 transition-colors cursor-pointer"
        >
          <Heart className="w-4 h-4" /> Text {notice.person.name}
        </a>
      )}
    </div>
  );
}
