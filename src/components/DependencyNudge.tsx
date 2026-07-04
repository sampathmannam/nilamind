import { Users, X, ChevronRight } from "lucide-react";
import { dismissDependencyNudge } from "../services/dependencyGuard";

// Shown in the Nila home when use has been heavy + escalating — Nila gently widens the circle toward a
// person (the "success case is the harm case" guard). Dismissible for the week.
//
// TONE (copy red-panel): the earlier version rejected ("But I'm an AI, not a substitute for a person") and
// assumed the user already has someone to text ("someone real you could reach out to today"). For an
// isolated person that reads as a door closing. This version stays warm, drops the "but", makes no
// presumption of a support network, leaves the timing to the user ("whenever you're ready"), and — if they
// don't have someone — offers to help set a trusted person up (via the optional onReachOut route).
export default function DependencyNudge({ onDismiss, onReachOut }: { onDismiss: () => void; onReachOut?: () => void }) {
  const dismiss = () => { dismissDependencyNudge(); onDismiss(); };
  return (
    <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 space-y-2.5" id="dependency-nudge">
      <div className="flex items-start gap-2">
        <Users className="w-4 h-4 text-sky-300 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-200 leading-relaxed flex-1">
          We've talked a lot lately, and I'm really glad to be here with you. Something that can help alongside
          this: letting a person you trust in on a little of what you're carrying — whenever you're ready, no
          rush. If there isn't someone right now, that's okay too — I can help you think it through.
        </p>
        <button onClick={dismiss} aria-label="Dismiss" className="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
      </div>
      {onReachOut && (
        <button
          onClick={onReachOut}
          id="dependency-nudge-reachout"
          className="w-full flex items-center justify-between gap-2 glass hover:border-sky-500/40 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          Help me reach out to someone
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        </button>
      )}
    </div>
  );
}
