import React, { useState, useEffect } from "react";
import { LifeBuoy, ChevronRight, ChevronLeft, Globe, HeartHandshake, MessageCircle, Check, Shield } from "lucide-react";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  completeOnboarding,
  getOnboardingRegion,
  setOnboardingRegion,
} from "../services/onboarding";
import { allRegions, type RegionCode, getCrisisLines } from "../services/crisisResources";
import { t } from "../services/i18n";
import { secureLocal } from "../services/secureLocal";
import { hapticLight, hapticCelebration } from "../hooks/useHaptics";
import ConfettiBurst from "./ConfettiBurst";
import { tryUnlockAchievement } from "../services/achievements";
import { setReminderPrefs } from "../services/reminders";
import { setEmaEnabled } from "../services/emaPrefs";

const MOOD_OPTIONS = [
  { value: 1, emoji: "😔", label: "Very low", color: "text-blue-400" },
  { value: 3, emoji: "😐", label: "A bit low", color: "text-ink-muted" },
  { value: 5, emoji: "🙂", label: "Okay", color: "text-amber-400" },
  { value: 7, emoji: "😊", label: "Good", color: "text-emerald-400" },
  { value: 9, emoji: "😄", label: "Great", color: "text-emerald-300" },
] as const;

// Soft Wellness register: same coarse 3-bucket valence mapping used for the Today mood display,
// applied to the onboarding baseline picker's SELECTED option only (ambience on the one chosen
// answer, not all five buttons at once). Fable review (2026-07-19) caught a mismatch: value 5 is
// labeled "Okay" here, and TodayScreen's moodBlobVariant maps the label "okay" to steady, not
// settling — fixed so the same word gets the same color across both surfaces.
function onboardingMoodBlobVariant(value: number): "steady" | "settling" | "tender" {
  if (value >= 5) return "steady";
  if (value === 3) return "settling";
  return "tender";
}

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
  const [showConfetti, setShowConfetti] = useState(false);

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
    // Default: one gentle daily nudge, no EMA pings.
    setReminderPrefs({ enabled: true });
    setEmaEnabled(false);
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
      <div className="flex items-center justify-end px-4 pb-3" style={{ paddingTop: 'var(--safe-top)' }}>
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
          <div className="p-4 rounded-2xl bg-fill/50 border border-line-strong/50">
            {slide.icon}
          </div>
        )}

        <div className="space-y-2">
          {/* Soft Wellness register: the poster-line device is reserved for exactly one moment in this
              9-slide sequence — the very first "meet Nila" slide, the single biggest first-impression
              beat in the whole app. Every other slide (including safety-net/region, which stay
              deliberately plain) keeps the shared plain heading, so the one poster-line stays rare. */}
          {slide.id === "nila_intro" ? (
            /* Fable review: text-2xl was dead weight here — .poster-line is unlayered CSS (like
               .glass/.editorial elsewhere in this file), so it always wins over a Tailwind utility
               on the same property regardless of the class order. Removed rather than kept as a
               no-op. */
            <h1 className="poster-line">{slide.title}<span className="poster-line__emoji" aria-hidden="true"> 👋</span></h1>
          ) : (
            <h1 className="text-xl font-semibold text-ink">{slide.title}</h1>
          )}
          <p className="text-sm text-ink-muted leading-relaxed">{slide.body}</p>
        </div>

        {/* Region selector */}
        {slide.id === "region" && (
          <div className="w-full space-y-2 text-left">
            <label htmlFor="region-select" className="text-[11px] uppercase tracking-wider text-ink-faint font-semibold">Crisis lines</label>
            <select
              id="region-select"
              value={region}
              onChange={(e) => handleRegionChange(e.target.value as RegionCode)}
              className="w-full bg-fill border border-line-strong rounded-xl px-3 py-2.5 text-sm text-ink-2 focus:outline-none focus:border-accent cursor-pointer"
            >
              {allRegions().map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-ink-faint">Preview: {preview}</p>
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
                      ? "bg-accent/15 border-accent/50 scale-110"
                      : "bg-fill/50 border-line-strong/50 hover:border-line-strong"
                  }`}
                >
                  {/* Fable review: fixed-size wrapper on every option (not just the selected one)
                      so tapping a mood doesn't reflow the row — the blob classes are what change,
                      the box size never does. */}
                  <span className={`w-10 h-10 grid place-items-center ${baselineMood === opt.value ? `blob-badge blob-badge--${onboardingMoodBlobVariant(opt.value)}` : ""}`}>
                    <span className={baselineMood === opt.value ? "blob-badge__value text-xl" : "text-2xl"} aria-hidden="true">{opt.emoji}</span>
                  </span>
                  <span className={`text-xs ${baselineMood === opt.value ? "text-accent-hi" : "text-ink-faint"}`}>{opt.label}</span>
                </button>
              ))}
            </div>
            {baselineMood != null && (
              <p className="text-[11px] text-ink-faint animate-fade-in">
                Thank you for sharing. This helps me understand where you're starting from.
              </p>
            )}
          </div>
        )}

        {/* Completion animation */}
        {slide.id === "ready" && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-4xl">🌱</div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
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
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-accent" : "w-1.5 bg-line-strong"}`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border border-line-strong text-ink-2 text-sm font-semibold hover:bg-fill transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> {t("back")}
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex-1 py-3 rounded-xl border border-line-strong text-ink-muted text-sm font-semibold hover:bg-fill transition-colors cursor-pointer"
            >
              {t("skip")}
            </button>
          )}

          {isLast ? (
            <button
              onClick={finish}
              className="flex-[2] py-3 rounded-xl bg-accent hover:opacity-90 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              {t("start")} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => { setStep((s) => s + 1); hapticLight(); }}
              className="flex-[2] py-3 rounded-xl bg-accent hover:opacity-90 text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              {t("next")} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Persistent escape hatch (design review 2026-07-18): setup must never feel forced. On step 0 the
            left button is already "Skip"; on every later step, offer a always-visible tertiary skip so a
            user can reach the app in one tap at any point. */}
        {step > 0 && !isLast && (
          <button
            onClick={finish}
            className="w-full text-center text-xs text-ink-faint hover:text-ink-2 py-1.5 transition-colors cursor-pointer"
          >
            {t("skip")}
          </button>
        )}
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
      body: "I'm here with you. Not a therapist, not a doctor — just a companion who listens.",
      icon: <HeartHandshake className="w-10 h-10 text-accent-hi" />,
    },
    {
      id: "privacy",
      title: "Your data stays on your phone",
      body: "Nila runs entirely on-device. No cloud. No analytics. No tracking. You can delete everything anytime in Settings.",
      icon: <Shield className="w-10 h-10 text-success" />,
    },
    {
      id: "mood_check",
      title: "How are you feeling right now?",
      body: "There's no wrong answer. Pick what fits — I'll use this to personalize your experience. You can change this anytime.",
      icon: <HeartHandshake className="w-10 h-10 text-warn" />,
    },
    {
      id: "region",
      title: "Choose your region",
      body: "This sets the crisis helplines shown if you ever need them. Pick your region, then we'll get you started.",
      icon: <Globe className="w-10 h-10 text-accent" />,
    },
    {
      id: "how_nila_helps",
      title: "How Nila helps",
      body: "I can listen, suggest tools, and help you notice patterns — all based on what you share. I'm not a therapist and I don't diagnose — I'm a companion, not a replacement for care.",
      icon: <MessageCircle className="w-10 h-10 text-accent-hi" />,
    },
    {
      id: "ready",
      title: "You're all set",
      body: "Let's begin, at your pace. A check-in can be as quick as a single tap — or as long as you like.",
      icon: <HeartHandshake className="w-10 h-10 text-success" />,
    },
  ];
}
