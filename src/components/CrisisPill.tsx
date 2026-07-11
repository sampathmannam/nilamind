import { LifeBuoy } from "lucide-react";
import { t } from "../services/i18n";

// Persistent, in-app crisis affordance. Lives in the App shell (above the tab bar, outside every tab
// branch) so one-tap crisis access is present on ALL tabs — previously it existed only on the Nila tab
// (ModeScreen's icon-only header LifeBuoy), leaving Tools and You with no crisis entry (§9 "crisis always
// reachable"). onActivate routes to the App-level CrisisOverlay via activateCrisis(), which also latches
// the 24h no-nudge window and yanks queued EMA pings — you never push a check-in to someone mid-crisis.
//
// Design (ui-ux-pro-max): labelled, NOT icon-only (nav-label-icon → discoverability); warm terracotta
// (rose = #B5614E), never bright red (non-alarming); 44px touch target; visually distinct from the 3 nav
// tabs so it never reads as a routine destination. Mirrors CrisisHelpButton's bar styling for coherence.
export default function CrisisPill({ onActivate }: { onActivate: () => void }) {
  return (
    <button
      type="button"
      onClick={onActivate}
      id="shell-crisis-pill"
      aria-haspopup="dialog"
      aria-label={t("crisisButton")}
      className="w-full flex items-center justify-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] px-4 min-h-[44px] text-[12px] font-semibold text-rose-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
    >
      <LifeBuoy className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{t("crisisButton")}</span>
    </button>
  );
}
