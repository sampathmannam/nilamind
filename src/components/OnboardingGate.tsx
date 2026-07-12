import React, { useState } from "react";
import { LifeBuoy, ChevronRight, ChevronLeft, Shield, Globe, HeartHandshake, MessageCircle, Check } from "lucide-react";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  completeOnboarding,
  getOnboardingRegion,
  setOnboardingRegion,
} from "../services/onboarding";
import { allRegions, type RegionCode, getCrisisLines } from "../services/crisisResources";
import { t } from "../services/i18n";
import { secureLocal } from "../services/secureLocal";

const USER_GOALS = [
  "Feeling low", "Managing stress", "Managing anxiety",
  "Tracking moods", "Building skills", "Just curious",
] as const;

interface OnboardingGateProps {
  onComplete: () => void;
  onOpenCrisis: () => void;
}

const SLIDES = [
  {
    id: "welcome",
    title: "Hi, I'm Nila",
    body: "I'm a private, on-device AI companion for the harder moments. Nothing you share leaves your phone, and I work fully offline. I'm not a therapist or a doctor — I'm here alongside you, never a replacement for real support.",
    icon: <HeartHandshake className="w-10 h-10 text-blue-400" />,
  },
  {
    id: "privacy",
    title: "Your data stays with you",
    body: "All your history, chats, and insights are stored locally and encrypted on this device. No accounts, no cloud, no ads.",
    icon: <Shield className="w-10 h-10 text-emerald-400" />,
  },
  {
    id: "region",
    title: "Choose your region",
    body: "This sets the crisis helplines shown if you ever need them. You can change it later in Settings.",
    icon: <Globe className="w-10 h-10 text-indigo-400" />,
  },
  {
    id: "how_nila_helps",
    title: "How Nila helps",
    // Expectancy/rationale sentence: knowing what to expect from a tool and why it's offered is linked to
    // how people do afterward, not just whether they keep opening the app — credibility/expectancy are
    // validated constructs that predict subsequent SYMPTOM outcome (Devilly & Borkovec 2000, J Behavior
    // Therapy and Experimental Psychiatry), with effect-size grounding from Abd-Alrazaq et al. (2020, JMIR)
    // and Sohn, Ha, Park et al. (2026, npj Digital Medicine). Deliberately NOT an adherence-correlation
    // claim — an earlier "~0.35 adherence correlation" figure was found unsupported by the synthesis and
    // removed; keep this hedged ("may help", "linked to") and free of any specific number.
    body: "I can listen, suggest tools, and help you notice patterns — all based on what you share. Every feature is grounded in research you can explore anytime. Knowing what to expect from a tool and why it might help is itself linked to feeling better from it — so I'll always tell you the why, not just hand you an exercise. I'm not a therapist and I don't diagnose — I'm a companion, not a replacement for care.",
    icon: <MessageCircle className="w-10 h-10 text-blue-400" />,
  },
  {
    id: "goals",
    title: "What brings you here?",
    body: "This helps me suggest the most useful things. Pick what fits — you can change it anytime.",
    icon: <HeartHandshake className="w-10 h-10 text-amber-400" />,
  },
];

export default function OnboardingGate({ onComplete, onOpenCrisis }: OnboardingGateProps) {
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState<RegionCode>(getOnboardingRegion());
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    try {
      const raw = secureLocal.getItem("nilamind_user_goal");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const handleRegionChange = (code: RegionCode) => {
    setRegion(code);
    setOnboardingRegion(code);
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) => {
      const next = prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal];
      try { secureLocal.setItem("nilamind_user_goal", JSON.stringify(next)); } catch { /* best-effort */ }
      return next;
    });
  };

  const finish = () => {
    try { secureLocal.setItem("nilamind_user_goal", JSON.stringify(selectedGoals)); } catch { /* best-effort */ }
    try { LocalNotifications.requestPermissions(); } catch { /* best-effort — user can deny */ }
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
            <label htmlFor="region-select" className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Crisis lines</label>
            <select
              id="region-select"
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

        {slide.id === "goals" && (
          <div className="w-full flex flex-wrap justify-center gap-2">
            {USER_GOALS.map((goal) => {
              const selected = selectedGoals.includes(goal);
              return (
                <button
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
                    selected
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {selected && <Check className="w-4 h-4 stroke-[2.5]" />}
                  {goal}
                </button>
              );
            })}
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
