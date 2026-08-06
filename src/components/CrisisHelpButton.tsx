import { useState } from "react";
import { LifeBuoy, X } from "lucide-react";
import CrisisLines from "./CrisisLines";
import { t } from "../services/i18n";

// Always-available crisis affordance for the PRE-APP gates (identity onboarding, PIN unlock, and the
// first-run model download). Those screens block the user before App's global CrisisOverlay exists, so a
// person in crisis during a 2.5 GB download or before they've created a space had NO way to reach help.
// This is deliberately self-contained: it needs no model, no identity, no decryption — CrisisLines reads
// the region registry (which guarantees a non-empty International fallback) and renders tappable tel:/URL
// links, so it works fully offline. A lightweight local useState toggles a small panel; nothing is stored.
//
// `variant="bar"` (default) is a full-width row for the gate footers; `variant="floating"` pins it to the
// bottom of a full-screen overlay (used on the download screen).
export default function CrisisHelpButton({ variant = "bar" }: { variant?: "bar" | "floating" }) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      id="gate-crisis-help"
      aria-haspopup="dialog"
      className="w-full flex items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/10 hover:bg-danger/20 px-4 py-3 min-h-[44px] text-[13px] font-semibold text-rose-200 transition-colors cursor-pointer"
    >
      <LifeBuoy className="w-4 h-4 shrink-0" />
      {t("crisisGate_cta")}
    </button>
  );

  return (
    <>
      {variant === "floating" ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[70] px-4 pt-3 bg-gradient-to-t from-page via-page to-transparent"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
        >
          <div className="max-w-[20rem] mx-auto">{trigger}</div>
        </div>
      ) : (
        trigger
      )}

      {open && (
        <div
          className="fixed inset-0 z-[80] bg-page/95 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={t("crisisGate_dialogLabel")}
          id="gate-crisis-panel"
        >
          <div className="max-w-md mx-auto px-5 py-8" style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-rose-200">
                <LifeBuoy className="w-5 h-5 shrink-0" />
                <h2 className="text-base font-semibold">{t("crisisGate_title")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("crisisGate_close")}
                className="text-ink-muted hover:text-ink-2 cursor-pointer shrink-0 p-1 -m-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-base text-ink-2 leading-relaxed mb-4">
              {t("crisisGate_bodyIntro")} {t("reach_crisis_body")}
            </p>
            <CrisisLines tone="rose" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full mt-5 rounded-full border border-line bg-card hover:bg-raised text-ink-2 font-medium px-8 py-3 min-h-[44px] transition-all cursor-pointer"
            >
              {t("crisisGate_dismiss")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
