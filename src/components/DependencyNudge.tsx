import { Users, X } from "lucide-react";
import { dismissDependencyNudge } from "../services/dependencyGuard";

// Shown in the Nila home when use has been heavy + escalating — Nila names it and pushes the user OUTWARD
// toward a person (the "success case is the harm case" guard). Dismissible for the week.
export default function DependencyNudge({ onDismiss }: { onDismiss: () => void }) {
  const dismiss = () => { dismissDependencyNudge(); onDismiss(); };
  return (
    <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 space-y-2" id="dependency-nudge">
      <div className="flex items-start gap-2">
        <Users className="w-4 h-4 text-sky-300 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-200 leading-relaxed flex-1">
          We've talked a lot lately — and I'm really glad to be here. But I'm an AI, not a substitute for a
          person. Is there someone real you could reach out to today, even just to say hi?
        </p>
        <button onClick={dismiss} aria-label="Dismiss" className="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-[10px] text-slate-600">I'd rather point you toward people than keep you here.</p>
    </div>
  );
}
