import { ShieldAlert } from "lucide-react";
import CrisisLines from "./CrisisLines";

interface SoftCrisisCardProps {
  onEscalate: () => void;
  onDismiss: () => void;
}

/**
 * The SOFT tier of the two-tier crisis surface (2026-07-12 Wave 3) — shown inline, above the input bar,
 * for a CLASSIFIER-ONLY hit. The deterministic keyword floor always still gets the unchanged full-screen
 * CrisisOverlay (no modal, no scroll-lock, no red header here).
 *
 * Research grounding (docs/superpowers/plans/2026-07-12-wave3-technical-specs.md §4):
 *  - PLOS Medicine (2025) meta-analysis (53 studies): probabilistic crisis classifiers have in-sample PPV
 *    6-17%, collapsing to 0.06-0.10% at realistic population prevalence (91-95% specificity, 45-82%
 *    sensitivity) — not fit as a hard gate/screening tool.
 *  - Frontiers in Psychology (2023, Norwegian adolescents): false positives attempted suicide at
 *    2.96x-7.22x the rate of true negatives — a probabilistic flag must be SOFTENED, never SUPPRESSED.
 *  - CDS alert-fatigue literature: severity-tiered alerts (interruptive only for high-confidence).
 *  - BlueIce precedent (published adolescent self-harm app): low-friction direct routing to a crisis line
 *    without multi-tap escalation — basis for the live tappable CrisisLines right on this card.
 *
 * Copy is deliberately calibrated to the classifier's real uncertainty ("I'm not fully certain") rather
 * than overclaiming — matches the app's existing citation-honesty discipline.
 */
export default function SoftCrisisCard({ onEscalate, onDismiss }: SoftCrisisCardProps) {
  return (
    <div className="w-full px-4 py-3 rounded-xl bg-warn/10 border border-warn/30 text-amber-100 text-sm space-y-3" id="soft-crisis-card">
      <div className="flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-warn mt-0.5 shrink-0" />
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-amber-100">Can I pause here for a second?</p>
          <p className="text-amber-200/80 leading-relaxed">
            Something in what you just said sounds heavy. I'm not fully certain — so I don't want to jump
            to conclusions — but I also don't want to just move past it. How are you doing, really?
          </p>
        </div>
      </div>
      <CrisisLines tone="amber" compact />
      <div className="flex gap-2">
        <button onClick={onEscalate} className="flex-1 py-2.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 text-xs font-bold">
          I could use support right now
        </button>
        <button onClick={onDismiss} className="px-3 py-2.5 rounded-xl bg-fill hover:bg-line-strong text-ink-muted text-xs">
          I'm okay, keep going
        </button>
      </div>
    </div>
  );
}
