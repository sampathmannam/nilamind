// PleaseAuditNudgeCard — gentle nudge to complete today's PLEASE vulnerability audit.
// 60-second self-care check (sleep/food/movement/substances/mastery).
// Pattern: SafetyPlanNudgeCard — self-contained show/dismiss, navigates on tap.

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { isPleaseAuditDue } from "../services/pleaseAudit";

interface Props {
  go: (target: string) => void;
}

export default function PleaseAuditNudgeCard({ go }: Props) {
  const [show, setShow] = useState(() => isPleaseAuditDue());
  if (!show) return null;

  return (
    <div className="glass rounded-2xl p-4 space-y-3 relative animate-fade-in border border-accent/20" id="please-audit-nudge">
      <button
        onClick={() => setShow(false)}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-fill transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-ink-faint" />
      </button>
      <div className="flex items-start gap-2.5 pr-8">
        <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm text-ink-2 leading-relaxed">
            Quick body check — 60 seconds on sleep, food, movement, and more. Helps you spot what's off before it builds.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setShow(false); go("please_audit"); }}
              className="px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent text-xs font-semibold transition-colors cursor-pointer"
            >
              Take it
            </button>
            <button
              onClick={() => setShow(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-ink-faint hover:text-ink-2 transition-colors cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
