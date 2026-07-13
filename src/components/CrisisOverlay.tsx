import { secureLocal } from "../services/secureLocal";
import React, { useState, useEffect, useRef } from "react";
import { SafetyPlan } from "../types";
import { INITIAL_SAFETY_PLAN } from "../data";
import { parseSafetyPlan } from "../services/safetyPlan";
import { Heart, Wind, ShieldAlert, ArrowLeft } from "lucide-react";
import CrisisLines from "./CrisisLines";
import { t, useLanguage } from "../services/i18n";

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
  useLanguage();

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = secureLocal.getItem("nilamind_safetyplan");
        if (saved) setSafetyPlan(parseSafetyPlan(saved));
      } catch {
        setSafetyPlan(INITIAL_SAFETY_PLAN);
      }
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
      className="fixed inset-0 z-[70] bg-page text-slate-300 overflow-y-auto"
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
          {t("crisisHeading")}
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          {t("crisisSub")}
        </p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Quick solutions — grounding and breathing first */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t("crisisTryFirst")}
          </h2>

          <button
            onClick={() => {
              onClose();
              onNavigateToGrounding();
            }}
            className="flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium p-5 rounded-xl transition-all cursor-pointer w-full text-left shadow-lg shadow-emerald-500/5"
            id="grounding-shortcut-btn"
          >
            <Heart className="w-6 h-6" />
            <div>
              <div className="font-semibold text-slate-100">{t("crisisGroundingLabel")}</div>
              <div className="text-xs text-slate-400">{t("crisisGroundingSub")}</div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateToBreathing();
            }}
            className="flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium p-5 rounded-xl transition-all cursor-pointer w-full text-left shadow-lg shadow-emerald-500/5"
            id="breathing-shortcut-btn"
          >
            <Wind className="w-6 h-6" />
            <div>
              <div className="font-semibold text-slate-100">{t("crisisBreathingLabel")}</div>
              <div className="text-xs text-slate-400">{t("crisisBreathingSub")}</div>
            </div>
          </button>
        </div>

        {/* Crisis lines — secondary, always available */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t("crisisSpeakNow")}
          </h2>

          <CrisisLines tone="rose" />
          <p className="text-[10px] text-slate-500 text-center">{t("crisisHelplineNote")}</p>
        </div>

        {/* Your coping plan */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t("crisisCopingPlan")}
          </h2>

          {/* Section 1 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              {t("crisisWarnSigns")}
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.warningSigns || t("crisisWarnSignsBlank")}
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              {t("crisisInternalCoping")}
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.internalCoping || t("crisisInternalCopingBlank")}
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              {t("crisisSocial")}
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.socialDistractors || t("crisisSocialBlank")}
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              {t("crisisTrusted")}
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.trustedPeople || t("crisisTrustedBlank")}
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-card border border-slate-800 p-4 rounded-xl">
            <h3 className="text-slate-100 font-semibold text-sm mb-1">
              {t("crisisProf")}
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
              {t("crisisSafe")}
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {safetyPlan.safeEnvironment || t("crisisSafeBlank")}
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
            {t("crisisSteadier")}
          </button>
        </div>
      </div>
    </div>
  );
}
