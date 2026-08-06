import { secureLocal } from "../services/secureLocal";
import { useState, useEffect, useRef } from "react";
import { SafetyPlan } from "../types";
import { INITIAL_SAFETY_PLAN } from "../data";
import { parseSafetyPlan } from "../services/safetyPlan";
import { Heart, Wind, ShieldAlert, ArrowLeft } from "lucide-react";
import CrisisLines from "./CrisisLines";
import { offerPostCrisisCheckIn } from "../services/postCrisisCheckIn";
import RideTheWaveCard from "./RideTheWaveCard";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface CrisisOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToGrounding: () => void;
  onNavigateToBreathing: () => void;
  onBuildPlanLater?: () => void;
}

export default function CrisisOverlay({
  isOpen,
  onClose,
  onNavigateToGrounding,
  onNavigateToBreathing,
  onBuildPlanLater,
}: CrisisOverlayProps) {
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan>(INITIAL_SAFETY_PLAN);
  // 2026-07-12 Wave 3, Task 1.4: opt-in, unchecked-by-default post-crisis check-in toggle. Never scheduled
  // silently — offerPostCrisisCheckIn() only fires if this is explicitly checked before "I feel steadier now".
  const [wantsCheckIn, setWantsCheckIn] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = secureLocal.getItem("nilamind_safetyplan");
        if (saved) setSafetyPlan(parseSafetyPlan(saved));
      } catch {
        setSafetyPlan(INITIAL_SAFETY_PLAN);
      }
      setWantsCheckIn(false); // every fresh open starts unchecked, never carries a stale "yes" forward
      // preventScroll: focusing the heading must NOT scroll the overlay. The real cause of the surface
      // opening ~124px down (hiding its own "You're not alone" header behind the status bar — 2026-07-17 QA)
      // was useFocusTrap focusing the first BUTTON without preventScroll; that's fixed at the source. This
      // keeps the heading-focus here scroll-safe too.
      headingRef.current?.focus({ preventScroll: true });
      // Lock background scroll while crisis overlay is open — a person in crisis
      // should never accidentally scroll away from the safety surface.
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const hasContent = (v: string) => v.trim().length > 0;
  const anyContent =
    hasContent(safetyPlan.warningSigns) ||
    hasContent(safetyPlan.internalCoping) ||
    hasContent(safetyPlan.socialDistractors) ||
    hasContent(safetyPlan.trustedPeople) ||
    hasContent(safetyPlan.professionals) ||
    hasContent(safetyPlan.safeEnvironment);

  if (!isOpen) return null;

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-[70] bg-page text-ink-2 overflow-y-auto"
      id="crisis-overlay-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-overlay-heading"
      tabIndex={-1}
    >
      {/* Red safety top header. paddingTop clears the edge-to-edge status bar — WITHOUT it the §9 heading
          rendered under the clock/status icons on real devices (2026-07-17 emulator repro). */}
      <div className="bg-danger/10 border-b border-danger/25 pb-6 px-4 text-center" style={{ paddingTop: 'calc(var(--safe-top) + 1rem)' }}>
        <div className="flex justify-center mb-2">
          <ShieldAlert className="text-danger w-12 h-12 stroke-[2.5]" />
        </div>
        <h1 id="crisis-overlay-heading" ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-ink mb-1 outline-none">
          You're not alone right now. Let's find something that helps.
        </h1>
        <p className="text-ink-muted text-sm max-w-md mx-auto leading-relaxed">
          Reaching out is a strong thing to do, whatever brought you here. Ground yourself first, or reach a trained listener.
        </p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Quick solutions — grounding and breathing first */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Try these first
          </h2>

          <button
            onClick={() => {
              onClose();
              onNavigateToGrounding();
            }}
            className="flex items-center gap-3 bg-success/10 hover:bg-success/20 border border-success/30 text-success font-medium p-5 rounded-xl transition-all cursor-pointer w-full text-left shadow-lg shadow-emerald-500/5"
            id="grounding-shortcut-btn"
          >
            <Heart className="w-6 h-6" />
            <div>
              <div className="font-semibold text-ink">5-4-3-2-1 Grounding</div>
              <div className="text-xs text-ink-muted">Notice what's around you to settle into the present moment</div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateToBreathing();
            }}
            className="flex items-center gap-3 bg-success/10 hover:bg-success/20 border border-success/30 text-success font-medium p-5 rounded-xl transition-all cursor-pointer w-full text-left shadow-lg shadow-emerald-500/5"
            id="breathing-shortcut-btn"
          >
            <Wind className="w-6 h-6" />
            <div>
              <div className="font-semibold text-ink">Box Breathing (4-4-4-4)</div>
              <div className="text-xs text-ink-muted">Paced breathing to calm your nervous system</div>
            </div>
          </button>
        </div>

        {/* Ride out the next few minutes — the de-escalation content that was missing */}
        <RideTheWaveCard />

        {/* Crisis lines — secondary, always available */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Or speak with someone now
          </h2>

          <CrisisLines tone="rose" />
          <p className="text-xs text-ink-faint text-center">Free, confidential helplines for your region — change in Settings.</p>
        </div>

        {/* Your coping plan — decluttered: only sections with real content render */}
        {anyContent ? (
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Your coping plan
            </h2>

            {hasContent(safetyPlan.warningSigns) && (
              <div className="bg-card border border-line p-4 rounded-xl">
                <h3 className="text-ink font-semibold text-sm mb-1">
                  1. Warning signs I notice:
                </h3>
                <p className="text-ink-2 text-sm whitespace-pre-wrap">{safetyPlan.warningSigns}</p>
              </div>
            )}

            {hasContent(safetyPlan.internalCoping) && (
              <div className="bg-card border border-line p-4 rounded-xl">
                <h3 className="text-ink font-semibold text-sm mb-1">
                  2. Things I can do on my own to cope:
                </h3>
                <p className="text-ink-2 text-sm whitespace-pre-wrap">{safetyPlan.internalCoping}</p>
              </div>
            )}

            {hasContent(safetyPlan.socialDistractors) && (
              <div className="bg-card border border-line p-4 rounded-xl">
                <h3 className="text-ink font-semibold text-sm mb-1">
                  3. People and places that distract me:
                </h3>
                <p className="text-ink-2 text-sm whitespace-pre-wrap">{safetyPlan.socialDistractors}</p>
              </div>
            )}

            {hasContent(safetyPlan.trustedPeople) && (
              <div className="bg-card border border-line p-4 rounded-xl">
                <h3 className="text-ink font-semibold text-sm mb-1">
                  4. People I can reach out to for help:
                </h3>
                <p className="text-ink-2 text-sm whitespace-pre-wrap">{safetyPlan.trustedPeople}</p>
              </div>
            )}

            {hasContent(safetyPlan.professionals) && (
              <div className="bg-card border border-line p-4 rounded-xl">
                <h3 className="text-ink font-semibold text-sm mb-1">
                  5. Professionals and crisis lines:
                </h3>
                <p className="text-ink-2 text-sm whitespace-pre-wrap">{safetyPlan.professionals}</p>
              </div>
            )}

            {hasContent(safetyPlan.safeEnvironment) && (
              <div className="bg-card border border-line p-4 rounded-xl">
                <h3 className="text-ink font-semibold text-sm mb-1">
                  6. Making my space safer:
                </h3>
                <p className="text-ink-2 text-sm whitespace-pre-wrap">{safetyPlan.safeEnvironment}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border border-line p-4 rounded-xl text-center space-y-3">
            <p className="text-sm text-ink-2 leading-relaxed">
              You haven't built a coping plan yet — and this moment isn't the time to start one. Once this
              passes, I can help you put one together in a couple of minutes.
            </p>
            {onBuildPlanLater && (
              <button
                onClick={onBuildPlanLater}
                className="text-xs font-semibold text-rose-300 hover:text-rose-200 underline underline-offset-2 cursor-pointer"
                id="crisis-build-plan-later-btn"
              >
                Build it when I'm ready
              </button>
            )}
          </div>
        )}

        {/* Gentle non-abrupt Exit Footer */}
        <div className="pt-4 text-center space-y-3">
          {/* Opt-in, unchecked-by-default post-crisis check-in (2026-07-12 Wave 3, Task 1.4) — never scheduled
              unless explicitly checked here BEFORE tapping "I feel steadier now" (which still closes immediately
              either way, same single-tap dismiss as before). Content-free notification, no citation for the
              exact timing — see postCrisisCheckIn.ts. */}
          <label
            id="post-crisis-checkin-toggle"
            className="flex items-center justify-center gap-2 text-xs text-ink-muted cursor-pointer"
          >
            <input
              type="checkbox"
              checked={wantsCheckIn}
              onChange={(e) => setWantsCheckIn(e.target.checked)}
              className="accent-blue-500 cursor-pointer"
            />
            Want a gentle check-in from me in a few hours?
          </label>
          <button
            onClick={() => {
              if (wantsCheckIn) offerPostCrisisCheckIn();
              onClose();
            }}
            className="bg-card hover:bg-raised border border-line text-ink-2 font-medium px-8 py-3.5 rounded-full transition-all cursor-pointer w-full flex items-center justify-center gap-2"
            id="close-crisis-overlay-btn"
          >
            <ArrowLeft className="w-5 h-5 text-ink-faint" />
            I feel steadier now
          </button>
        </div>
      </div>
    </div>
  );
}
