import React, { useState, useEffect } from "react";
import { LifeBuoy, ChevronRight, ChevronLeft, Shield, Globe, HeartHandshake, MessageCircle, Check, Wind, Moon, Activity, Pill, Users, Target, Bell } from "lucide-react";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  completeOnboarding,
  getOnboardingRegion,
  setOnboardingRegion,
} from "../services/onboarding";
import { allRegions, type RegionCode, getCrisisLines } from "../services/crisisResources";
import { t } from "../services/i18n";
import { secureLocal } from "../services/secureLocal";
import { hapticLight, hapticSuccess, hapticCelebration } from "../hooks/useHaptics";
import ConfettiBurst from "./ConfettiBurst";
import { tryUnlockAchievement } from "../services/achievements";
import { setReminderPrefs } from "../services/reminders";
import { setEmaEnabled, setEmaFrequency } from "../services/emaPrefs";
import type { SafetyPlan } from "../types";
import { parseSafetyPlan } from "../services/safetyPlan";

type NudgeCadence = "regular" | "daily" | "minimal";

const NUDGE_OPTIONS: { id: NudgeCadence; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "regular", label: "A few times a day", desc: "Daily nudge + 2 quick check-ins", icon: <Bell className="w-4 h-4" /> },
  { id: "daily", label: "Once a day", desc: "Just a gentle morning nudge", icon: <Bell className="w-4 h-4" /> },
  { id: "minimal", label: "Leave me be", desc: "No nudges — I'll come when I'm ready", icon: <Bell className="w-4 h-4" /> },
];

const USER_GOALS = [
  { id: "sleep", label: "Sleep", icon: <Moon className="w-4 h-4" /> },
  { id: "mood", label: "Mood patterns", icon: <Activity className="w-4 h-4" /> },
  { id: "grounding", label: "Staying grounded", icon: <Wind className="w-4 h-4" /> },
  { id: "medication", label: "My medications", icon: <Pill className="w-4 h-4" /> },
  { id: "talking", label: "Talking to someone", icon: <Users className="w-4 h-4" /> },
] as const;

const MOOD_OPTIONS = [
  { value: 1, emoji: "😔", label: "Very low", color: "text-blue-400" },
  { value: 3, emoji: "😐", label: "A bit low", color: "text-slate-400" },
  { value: 5, emoji: "🙂", label: "Okay", color: "text-amber-400" },
  { value: 7, emoji: "😊", label: "Good", color: "text-emerald-400" },
  { value: 9, emoji: "😄", label: "Great", color: "text-emerald-300" },
] as const;

interface OnboardingGateProps {
  onComplete: () => void;
  onOpenCrisis: () => void;
}

/**
 * Emotional onboarding — 7-step guided journey.
 * Research: Finch's "adopt a pet" creates immediate emotional investment.
 * We can't do a pet, but we CAN make Nila introduce herself warmly,
 * ask how the user feels, and personalize from the first moment.
 */
export default function OnboardingGate({ onComplete, onOpenCrisis }: OnboardingGateProps) {
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState<RegionCode>(getOnboardingRegion());
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    try {
      const raw = secureLocal.getItem("nilamind_user_goal");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [baselineMood, setBaselineMood] = useState<number | null>(null);
  const [nudgeCadence, setNudgeCadence] = useState<NudgeCadence | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [safetyNet, setSafetyNet] = useState({ warningSign: "", copingIdea: "", trustedPerson: "" });

  const slides = getSlides(baselineMood);
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  const handleRegionChange = (code: RegionCode) => {
    setRegion(code);
    setOnboardingRegion(code);
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) => {
      const next = prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId];
      try { secureLocal.setItem("nilamind_user_goal", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
    hapticLight();
  };

  const selectMood = (value: number) => {
    setBaselineMood(value);
    hapticLight();
  };

  const finish = () => {
    try { secureLocal.setItem("nilamind_user_goal", JSON.stringify(selectedGoals)); } catch { /* */ }
    if (baselineMood != null) {
      try { secureLocal.setItem("nilamind_onboarding_mood", String(baselineMood)); } catch { /* */ }
    }
    const { warningSign, copingIdea, trustedPerson } = safetyNet;
    if (warningSign.trim() || copingIdea.trim() || trustedPerson.trim()) {
      try {
        const existing = parseSafetyPlan(secureLocal.getItem("nilamind_safetyplan"));
        const updated: SafetyPlan = {
          ...existing,
          warningSigns: warningSign.trim() || existing.warningSigns,
          internalCoping: copingIdea.trim() || existing.internalCoping,
          trustedPeople: trustedPerson.trim() || existing.trustedPeople,
          lastUpdatedAt: Date.now(),
        };
        secureLocal.setItem("nilamind_safetyplan", JSON.stringify(updated));
      } catch {
        /* best effort — never block onboarding completion on this */
      }
    }
    // Apply the user's notification cadence preference (Fix 2: don't default to 3/day without asking)
    if (nudgeCadence === "daily") {
      setReminderPrefs({ enabled: true });
      setEmaEnabled(false);
    } else if (nudgeCadence === "minimal") {
      setReminderPrefs({ enabled: false });
      setEmaEnabled(false);
    } else {
      // "regular" or unset (skip case) — keep defaults
      setReminderPrefs({ enabled: true });
      setEmaEnabled(true);
      setEmaFrequency(2);
    }
    try { LocalNotifications.requestPermissions(); } catch { /* */ }
    completeOnboarding();
    hapticCelebration();
    setShowConfetti(true);
    tryUnlockAchievement("first_checkin");
    setTimeout(() => onComplete(), 1500);
  };

  const lines = getCrisisLines();
  const preview = lines.slice(0, 2).map((l) => l.name).join(", ");

  return (
    <div className="fixed inset-0 z-[60] bg-page flex flex-col" id="onboarding-gate">
      <ConfettiBurst active={showConfetti} count={25} duration={1500} />

      {/* Always-reachable crisis help */}
      <div className="flex items-center justify-end px-4 pb-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button
          onClick={onOpenCrisis}
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-full border border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LifeBuoy className="w-3.5 h-3.5" /> {t("needHelpNow")}
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center space-y-6">
        {/* Icon / Nila orb */}
        {slide.id === "nila_intro" ? (
          <NilaOrbIntro />
        ) : (
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            {slide.icon}
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-100">{slide.title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed">{slide.body}</p>
        </div>

        {/* Region selector */}
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

        {/* Mood baseline assessment */}
        {slide.id === "nudge_cadence" && (
          <div className="w-full space-y-2.5">
            {NUDGE_OPTIONS.map((opt) => {
              const selected = nudgeCadence === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => { setNudgeCadence(opt.id); hapticLight(); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? "bg-amber-500/15 border-amber-500/50"
                      : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selected ? "bg-amber-500/20 text-amber-300" : "bg-slate-700/50 text-slate-400"}`}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${selected ? "text-amber-200" : "text-slate-300"}`}>{opt.label}</div>
                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                  </div>
                  {selected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Mood baseline assessment */}
        {slide.id === "mood_check" && (
          <div className="w-full space-y-3">
            <div className="flex justify-center gap-3">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => selectMood(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    baselineMood === opt.value
                      ? "bg-blue-500/15 border-blue-500/50 scale-110"
                      : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className={`text-[10px] ${baselineMood === opt.value ? "text-blue-300" : "text-slate-500"}`}>{opt.label}</span>
                </button>
              ))}
            </div>
            {baselineMood != null && (
              <p className="text-[11px] text-slate-500 animate-fade-in">
                Thank you for sharing. This helps me understand where you're starting from.
              </p>
            )}
          </div>
        )}

        {/* Personalization — what matters to you */}
        {slide.id === "personalize" && (
          <div className="w-full flex flex-wrap justify-center gap-2">
            {USER_GOALS.map((goal) => {
              const selected = selectedGoals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
                    selected
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {goal.icon}
                  {goal.label}
                  {selected && <Check className="w-3.5 h-3.5 ml-1 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Safety net — first-run coping plan, optional, autosaved into the real safety plan */}
        {slide.id === "safety_net" && (
          <div className="w-full space-y-3 text-left">
            <div>
              <label htmlFor="sp-onboarding-warningsign-input" className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                A warning sign for you (optional)
              </label>
              <input
                id="sp-onboarding-warningsign-input"
                type="text"
                value={safetyNet.warningSign}
                onChange={(e) => setSafetyNet((p) => ({ ...p, warningSign: e.target.value }))}
                placeholder="e.g. not sleeping, going quiet"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>
            <div>
              <label htmlFor="sp-onboarding-copingidea-input" className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                One thing you can do alone to cope (optional)
              </label>
              <input
                id="sp-onboarding-copingidea-input"
                type="text"
                value={safetyNet.copingIdea}
                onChange={(e) => setSafetyNet((p) => ({ ...p, copingIdea: e.target.value }))}
                placeholder="e.g. cold water on my face, a walk"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>
            <div>
              <label htmlFor="sp-onboarding-trustedperson-input" className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Someone you could reach out to (optional, name only)
              </label>
              <input
                id="sp-onboarding-trustedperson-input"
                type="text"
                value={safetyNet.trustedPerson}
                onChange={(e) => setSafetyNet((p) => ({ ...p, trustedPerson: e.target.value }))}
                placeholder="e.g. Maya"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              You can skip this and fill it in anytime — even one line helps future-you.
            </p>
          </div>
        )}

        {/* Goals (original) */}
        {slide.id === "goals" && (
          <div className="w-full flex flex-wrap justify-center gap-2">
            {(["Feeling low", "Managing stress", "Managing anxiety", "Tracking moods", "Building skills", "Just curious"] as const).map((goal) => {
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

        {/* Completion animation */}
        {slide.id === "ready" && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-4xl">🌱</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your story starts now. Every check-in, every tool, every insight — it all builds from here.
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-8 pt-4 max-w-md mx-auto w-full space-y-3">
        <div className="flex justify-center gap-1.5">
          {slides.map((_, i) => (
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
              onClick={() => { setStep((s) => s + 1); hapticLight(); }}
              className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              {t("next")} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Animated Nila orb introduction — the emotional hook. */
function NilaOrbIntro() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`transition-all duration-1000 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-blue-400/10 blur-xl animate-pulse" style={{ width: 120, height: 120, margin: "auto" }} />
        {/* Orb */}
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/20 border border-blue-400/30 flex items-center justify-center nila-orb">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 opacity-60" />
        </div>
      </div>
    </div>
  );
}

/** Build slides dynamically based on state. */
function getSlides(baselineMood: number | null) {
  return [
    {
      id: "nila_intro",
      title: "Hi, I'm Nila",
      body: "I'm here with you. Not a therapist, not a doctor — a companion. I work entirely on your phone, and nothing you share ever leaves this device.",
      icon: <HeartHandshake className="w-10 h-10 text-blue-400" />,
    },
    {
      id: "privacy",
      title: "Your data stays with you",
      body: "All your history, chats, and insights are stored locally and encrypted on this device. No accounts, no cloud, no ads. Just you and me.",
      icon: <Shield className="w-10 h-10 text-emerald-400" />,
    },
    {
      id: "mood_check",
      title: "How are you feeling right now?",
      body: "There's no wrong answer. This helps me understand where you're starting from.",
      icon: <HeartHandshake className="w-10 h-10 text-amber-400" />,
    },
    {
      id: "personalize",
      title: "What matters to you most?",
      body: "Pick what fits — I'll suggest the most useful tools. You can change this anytime.",
      icon: <Target className="w-10 h-10 text-blue-400" />,
    },
    {
      id: "safety_net",
      title: "Let's set up your safety net",
      body: "A few optional notes now can help a lot on a harder day. Nothing here is required — you can always add to it later.",
      icon: <LifeBuoy className="w-10 h-10 text-rose-400" />,
    },
    {
      id: "region",
      title: "Choose your region",
      body: "This sets the crisis helplines shown if you ever need them. You can change it later in Settings.",
      icon: <Globe className="w-10 h-10 text-indigo-400" />,
    },
    {
      id: "nudge_cadence",
      title: "How often should I check in?",
      body: "Gentle reminders help you build a rhythm — but it's your call. You can change this anytime in Settings.",
      icon: <Bell className="w-10 h-10 text-amber-400" />,
    },
    {
      id: "how_nila_helps",
      title: "How Nila helps",
      body: "I can listen, suggest tools, and help you notice patterns — all based on what you share. Knowing what to expect from a tool and why it might help is itself linked to feeling better from it — so I'll always tell you the why, not just hand you an exercise. Every feature is grounded in research you can explore anytime. I'm not a therapist and I don't diagnose — I'm a companion, not a replacement for care.",
      icon: <MessageCircle className="w-10 h-10 text-blue-400" />,
    },
    {
      id: "ready",
      title: "You're all set",
      body: "Let's begin. Your first check-in takes 30 seconds.",
      icon: <HeartHandshake className="w-10 h-10 text-emerald-400" />,
    },
  ];
}
