import React, { useState } from "react";
import { LifeBuoy, ChevronRight, ChevronLeft, Shield, Globe, HeartHandshake } from "lucide-react";
import {
  completeOnboarding,
  getOnboardingRegion,
  setOnboardingRegion,
} from "../services/onboarding";
import { allRegions, type RegionCode, getCrisisLines } from "../services/crisisResources";
import { t } from "../services/i18n";

interface OnboardingGateProps {
  onComplete: () => void;
  onOpenCrisis: () => void;
}

const SLIDES = [
  {
    id: "welcome",
    title: "Hi, I'm Nila",
    body: "I'm a private, on-device AI companion for the harder moments. Nothing you share leaves your phone. I'm not a therapist or a doctor, and not a crisis service — I'm here alongside you, never a replacement for real support.",
    icon: <HeartHandshake className="w-10 h-10 text-blue-400" />,
  },
  {
    id: "privacy",
    title: "Your data stays with you",
    body: "All your history, chats, and notes are stored locally and encrypted on this device. No accounts, no cloud, no ads.",
    icon: <Shield className="w-10 h-10 text-emerald-400" />,
  },
  {
    id: "region",
    title: "Choose your region",
    body: "This sets the crisis helplines shown if you ever need them. You can change it later in Settings.",
    icon: <Globe className="w-10 h-10 text-indigo-400" />,
  },
];

export default function OnboardingGate({ onComplete, onOpenCrisis }: OnboardingGateProps) {
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState<RegionCode>(getOnboardingRegion());

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const handleRegionChange = (code: RegionCode) => {
    setRegion(code);
    setOnboardingRegion(code);
  };

  const finish = () => {
    completeOnboarding();
    onComplete();
  };

  const lines = getCrisisLines();
  const preview = lines.slice(0, 2).map((l) => l.name).join(", ");

  return (
    <div className="fixed inset-0 z-[60] bg-page flex flex-col" id="onboarding-gate">
      {/* Always-reachable crisis help */}
      <div className="flex items-center justify-end px-4 py-3">
        <button
          onClick={onOpenCrisis}
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-full border border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LifeBuoy className="w-3.5 h-3.5" /> {t("needHelpNow")}
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center space-y-6">
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          {slide.icon}
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-100">{slide.title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed">{slide.body}</p>
        </div>

        {slide.id === "region" && (
          <div className="w-full space-y-2 text-left">
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Crisis lines</label>
            <select
              value={region}
              onChange={(e) => handleRegionChange(e.target.value as RegionCode)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {allRegions().map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">Preview: {preview}</p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-8 pt-4 max-w-md mx-auto w-full space-y-3">
        <div className="flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-blue-500" : "w-1.5 bg-slate-700"}`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> {t("back")}
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t("skip")}
            </button>
          )}

          {isLast ? (
            <button
              onClick={finish}
              className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              {t("start")} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-[2] py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              {t("next")} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
