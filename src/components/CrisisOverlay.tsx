import { secureLocal } from "../services/secureLocal";
import React, { useState, useEffect, useRef } from "react";
import { SafetyPlan } from "../types";
import { INITIAL_SAFETY_PLAN } from "../data";
import { parseSafetyPlan } from "../services/safetyPlan";
import { Heart, Wind, ShieldAlert, ArrowLeft } from "lucide-react";
import CrisisLines from "./CrisisLines";

interface CrisisOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToGrounding: () => void;
  onNavigateToBreathing: () => void;
}

export default function CrisisOverlay({
  isOpen,
  onClose,
  onNavigateToGrounding,
  onNavigateToBreathing,
}: CrisisOverlayProps) {
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan>(INITIAL_SAFETY_PLAN);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = secureLocal.getItem("nilamind_safetyplan");
      if (saved) setSafetyPlan(parseSafetyPlan(saved));
      headingRef.current?.focus();
      // Lock background scroll while crisis overlay is open — a person in crisis
      // should never accidentally scroll away from the safety surface.
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-page text-slate-300 overflow-y-auto"
      id="crisis-overlay-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-overlay-heading"
    >
      {/* Red safety top header */}
      <div className="bg-rose-500/10 border-b border-rose-500/25 py-6 px-4 text-center">
        <div className="flex justify-center mb-2">
          <ShieldAlert className="text-rose-500 w-12 h-12 stroke-[2.5]" />
        </div>
        <h1 id="crisis-overlay-heading" ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-slate-100 mb-1 outline-none">
          You reached for this.
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          That is a strong thing to do. Take a breath. Your safety plan and immediate helps are right here.
        </p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Quick Help Tenders */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            If you need someone right now
          </h2>
          
          <CrisisLines tone="rose" />
          <p className="text-[10px] text-slate-500 text-center">Crisis lines for your region — change in Settings.</p>

          <button
            onClick={() => {
              onClose();
              onNavigateToGrounding();
            }}
            className="flex items-center gap-3 bg-card hover:bg-raised border border-slate-800 text-emerald-400 font-medium p-4 rounded-xl transition-all cursor-pointer w-full text-left"
            id="grounding-shortcut-btn"
          >
            <Heart className="w-5 h-5" />
            <div>
              <div className="font-semibold text-slate-200">Start 5-4-3-2-1 Grounding</div>
              <div className="text-xs text-slate-500">Tactile present-moment focus</div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateToBreathing();
            }}
            className="flex items-center gap-3 bg-card hover:bg-raised border border-slate-800 text-emerald-400 font-medium p-4 rounded-xl transition-all cursor-pointer w-full text-left"
            id="breathing-shortcut-btn"
          >
            <Wind className="w-5 h-5" />
            <div>
              <div className="font-semibold text-slate-200">Box Breathing (4-4-4-4)</div>
              <div className="text-xs text-slate-500">Paced nervous system regulation</div>
            </div>
          </button>
        </div>

        {/* Safety Plan Display */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your safety plan
          </h2>

          {/* Section 1 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              1. Warning signs I notice:
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.warningSigns || "This part is still blank — and that's okay. You're here now, and that counts."}
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              2. Things I can do on my own to cope:
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.internalCoping || "Nothing written here yet — that's okay."}
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              3. People and places that distract me:
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.socialDistractors || "Nothing here yet — that's okay."}
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              4. People I can reach out to for help:
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.trustedPeople || "No names here yet — reaching even one person right now can help."}
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              5. Professionals and crisis lines:
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.professionals}
            </p>
            <div className="mt-3">
              <CrisisLines tone="rose" compact />
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              6. Making my space safer:
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.safeEnvironment || "Nothing here yet — that's okay."}
            </p>
          </div>
        </div>

        {/* Gentle non-abrupt Exit Footer */}
        <div className="pt-4 text-center">
          <button
            onClick={onClose}
            className="bg-card hover:bg-raised border border-slate-800 text-slate-300 font-medium px-8 py-3.5 rounded-full transition-all cursor-pointer w-full flex items-center justify-center gap-2"
            id="close-crisis-overlay-btn"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
            I'm okay for now
          </button>
        </div>
      </div>
    </div>
  );
}
