import { localDateKey } from "../services/storageUtils";
import { useRef, useState, useEffect, useReducer, useMemo } from "react";
import { Wind, MessageCircle, Moon, Sparkles, ChevronRight, Sparkle, Target, LineChart, Activity, Loader2, LifeBuoy, Lock, ShieldCheck } from "lucide-react";
import { getTimeMode, getUserState } from "../services/modeEngine";
import { hasCheckinToday, loadCheckins } from "../services/checkin";
import { useLanguage, t } from "../services/i18n";
import { secureLocal } from "../services/secureLocal";
import { loadAssessments, INSTRUMENTS } from "../services/assessments";
import { isWellbeingDue, wellbeingCadence } from "../services/wellbeingTrack";
import { computeCompassionateStreak } from "../services/streaks";
import { getDailyIntention } from "../services/weeklyIntention";
import DailyIntentionCard, { type DailyIntentionCardHandle } from "./DailyIntentionCard";
import ConversationalCheckinCard from "./ConversationalCheckinCard";
import CrisisHeaderButton from "./CrisisHeaderButton";
import { getPendingCheckinDraft } from "../services/checkinDraft";
import DailyContentCard from "./DailyContentCard";
import SafetyPlanNudgeCard from "./SafetyPlanNudgeCard";
import LowFrictionReCheckIn from "./lowFrictionReCheckIn";
import { useTimeOfDay, heroGradient, contextualSummary } from "../hooks/useTimeOfDay";
import { buildNilaMessage } from "../services/nilaVoice";
import Sparkline from "./Sparkline";
import { getTopAssessmentPrompt } from "../services/assessmentPrompts";
import { selectProactiveNudge } from "../services/proactiveSurfaceRouter";
import { selectTopNudge } from "../services/nudgePrioritization";
import { detectCompoundSignals } from "../services/compoundDetector";
import { getFeatureWindow } from "../services/signalStore";
import { getPassiveSensingEnabled } from "../services/passiveSensingPrefs";
import ProactiveNudgeRail from "./ProactiveNudgeRail";
import IntentFlowBar, { suggestPhase, type IntentPhase } from "./IntentFlowBar";
import { SkeletonCard } from "./Skeleton";
import OnboardingMomentum from "./OnboardingMomentum";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefresh from "./PullToRefresh";
import ValuePropBanner from "./ValuePropBanner";
import ConfettiBurst from "./ConfettiBurst";
import type { TimeMode, UserState } from "../types/modes";

const MOOD_EMOJI: Record<string, string> = {
  calm: "😌", good: "😊", okay: "😐", fine: "😊", anxious: "😰",
  low: "😢", sad: "😢", angry: "😤", overwhelmed: "😩", stressed: "😫",
};

// U1.1 — Phase-based section visibility. Each IntentPhase maps to which content sections are
// visible on TodayScreen. Nudge cascade, crisis button, error banner, and first-time user content
// remain unconditional across all phases.
// Calm: mood + hero. Data: mood + hero + intention + patterns. Protocol: nudges + crisis only
// (the protocol card lives on the Nila tab; TodayScreen keeps its surface minimal in protocol phase).
const PHASE_VIS: Record<IntentPhase, { moodAndHero: boolean; intention: boolean; patterns: boolean }> = {
  calm:     { moodAndHero: true,  intention: false, patterns: false },
  data:     { moodAndHero: true,  intention: true,  patterns: true  },
  protocol: { moodAndHero: false, intention: false, patterns: false },
};

function getTodayMood(): { label: string; emoji: string } | null {
  try {
    const list = loadCheckins();
    if (list.length === 0) return null;
    const today = localDateKey();
    const todays = list.filter((e: any) => e?.date === today);
    if (todays.length === 0) return null;
    const latest = todays[todays.length - 1];
    const emotion = (latest.emotion || "").replace(/\s*\(Nila\)/g, "").toLowerCase().trim();
    return { label: emotion, emoji: MOOD_EMOJI[emotion] || "😌" };
  } catch {
    return null;
  }
}

// Soft Wellness register: a gentle valence mapping for .blob-badge behind today's mood emoji — purely
// decorative ambience, never a risk signal (the emoji + label text still carry all the actual meaning
// and contrast, per the blob-badge contract in index.css). Deliberately coarse (3 buckets) so it never
// reads as a clinical scale.
function moodBlobVariant(label: string): "steady" | "settling" | "tender" {
  if (["calm", "good", "okay", "fine"].includes(label)) return "steady";
  if (["anxious", "stressed"].includes(label)) return "settling";
  return "tender"; // low, sad, angry, overwhelmed — a quiet tint, not an alert
}

interface HeroAction {
  id: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  route: string;
}

// Wave 3 Group I (2026-07-12, confirmed product decision) — the Today hub leads with a structured
// tool rather than "Talk to Nila" as the primary CTA. The night/wind-down and anxious-or-elevated/
// grounding branches are safety-adaptive and stay unconditionally on top (never displaced by an
// engagement nudge). Otherwise, when today's if-then intention hasn't been set yet, the hero
// promotes setting it — the DailyIntentionCard rendered further down the hub — instead of the
// generic check-in prompt, which duplicates the mood card above it. Once it's set, the hero falls
// back to the original check-in prompt.
export function getHeroAction(timeMode: TimeMode, userState: UserState | null, dailyIntentionSet: boolean): HeroAction {
  const hour = new Date().getHours();
  if (hour >= 20 || hour < 5) {
    return { id: "winddown", label: "Wind down for sleep", sub: "A calm bedtime routine", icon: <Moon className="w-5 h-5" aria-hidden="true" />, color: "text-accent", route: "winddown" };
  }
  if (userState === "anxious" || userState === "elevated") {
    return { id: "plan", label: "Grounding & breathing", sub: "Calm your body in a hard minute", icon: <Wind className="w-5 h-5" aria-hidden="true" />, color: "text-success", route: "plan" };
  }
if (!dailyIntentionSet) {
    return { id: "daily_intention", label: "Set today's intention", sub: "A 30-second if-then plan — research-backed", icon: <Target className="w-5 h-5" aria-hidden="true" />, color: "text-warn", route: "" };
  }
  // Intention already set → promote Talk to Nila (not a duplicate check-in prompt — the mood
  // card directly below already handles that, and stacking two check-in CTAs is confusing).
  return { id: "nila", label: "Talk to Nila", sub: "A conversation, a reflection, or just a listen", icon: <MessageCircle className="w-5 h-5" aria-hidden="true" />, color: "text-accent", route: "nila" };
}

function formatDate(): string {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return localDateKey(new Date(d.getFullYear(), d.getMonth(), diff));
}

function getWeekInsight(): { checkinCount: number; topEmotion: string | null } | null {
  try {
    const list = loadCheckins();
    if (list.length === 0) return null;
    const weekStart = getWeekStart();
    const weekEntries = list.filter((e: any) => e?.date && e.date >= weekStart);
    if (weekEntries.length === 0) return null;
    const emotionCounts: Record<string, number> = {};
    for (const e of weekEntries) {
      const em = (e.emotion || "").replace(/\s*\(Nila\)/g, "").toLowerCase().trim();
      if (em) emotionCounts[em] = (emotionCounts[em] || 0) + 1;
    }
    let topEmotion: string | null = null, topCount = 0;
    for (const [em, count] of Object.entries(emotionCounts)) {
      if (count > topCount) { topCount = count; topEmotion = em; }
    }
    return { checkinCount: weekEntries.length, topEmotion };
  } catch { return null; }
}

export default function TodayScreen({
  go,
  phoneEnabled,
  onEpisode,
  onOpenCrisis,
}: {
  go: (target: string) => void;
  phoneEnabled: boolean;
  onEpisode: () => void;
  onOpenCrisis: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false); // U3.5
  const [isSaving, setIsSaving] = useState(false); // U2.1/U2.2
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null); // U2.3
  useEffect(() => {
    if (!lastRefreshed) return;
    const id = setTimeout(() => setLastRefreshed(null), 3000);
    return () => clearTimeout(id);
  }, [lastRefreshed]);
  const [proactiveNudge, setProactiveNudge] = useState<{ text: string; route: string; icon: string } | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const STORAGE_KEYS = ["nilamind_checkins", "nilamind_episodes", "nilamind_diary", "nilamind_insights"];
  const dataErrors = useMemo(() => {
    const badKeys: string[] = [];
    for (const key of STORAGE_KEYS) {
      try {
        const raw = secureLocal.getItem(key);
        if (raw) { JSON.parse(raw); }
      } catch {
        badKeys.push(key);
      }
    }
    return badKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLanguage();
  const [todayWidgets, setTodayWidgets] = useState<typeof import("./TodayWidgets").TodayWidgets | null>(null);

  // Lazy-load TodayWidgets to avoid circular deps in tests
  useEffect(() => {
    let cancelled = false;
    import("./TodayWidgets").then((mod) => {
      if (!cancelled) setTodayWidgets(mod.TodayWidgets);
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);
  const { timeOfDay } = useTimeOfDay();
  const timeMode = getTimeMode();
  const userState = getUserState();
  const suggestedPhase = useMemo(() => suggestPhase(userState, timeMode), [userState, timeMode]);
  const [selectedIntentPhase, setSelectedIntentPhase] = useState<IntentPhase>(suggestedPhase);

  // U1.5 — Phase tooltip: shows on first phase tap, persists dismissed state.
  const [phaseTooltipDismissed, setPhaseTooltipDismissed] = useState(() => {
    try { return secureLocal.getItem("nilamind_phase_tooltip_dismissed") === "true"; }
    catch { return false; }
  });
  const [phaseTooltipActive, setPhaseTooltipActive] = useState(false);
  const dismissPhaseTooltip = () => {
    setPhaseTooltipActive(false);
    setPhaseTooltipDismissed(true);
    try { secureLocal.setItem("nilamind_phase_tooltip_dismissed", "true"); } catch {}
  };
  const onPhaseChange = (newPhase: IntentPhase) => {
    setSelectedIntentPhase(newPhase);
    if (!phaseTooltipDismissed) setPhaseTooltipActive(true);
  };

  // Load proactive nudge from compound signals
  useEffect(() => {
    if (!getPassiveSensingEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const window = getFeatureWindow(30);
        const signals = detectCompoundSignals(window);
        const nudge = selectProactiveNudge(signals);
        if (!cancelled) setProactiveNudge(nudge);
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, []);
  // Same greeting source as the Nila tab's header (t("greeting_*")) so the two tabs agree on wording
  // and both stay localized — this previously called modeEngine's English-only getGreeting() directly,
  // so a non-English user saw a translated greeting on Nila but untranslated English here.
  const greetingMap: Record<TimeMode, string> = {
    morning: t("greeting_morning"),
    day: t("greeting_day"),
    evening: t("greeting_evening"),
    night: t("greeting_night"),
  };
  const greeting = greetingMap[timeMode];
  const refreshKey = useRef(0);
  const refreshAfterCheckinResolve = () => {
    setIsSaving(false);
    refreshKey.current += 1;
  };
  const [, forceRerender] = useReducer((n: number) => n + 1, 0);
  const [reCheckinSkipped, setReCheckinSkipped] = useState(false);
  const [weekInsightExpanded, setWeekInsightExpanded] = useState(false); // U1.2 — collapsible week insight
  const checkedIn = hasCheckinToday(localDateKey());
  const prevCheckedIn = useRef(checkedIn);
  useEffect(() => {
    if (checkedIn && !prevCheckedIn.current) {
      // U2.4 — Confetti gating: skip if intensity>6, negative emotion, or elevated state
      const mood = getTodayMood();
      const shouldConfetti = (() => {
        if (userState === "elevated") return false; // don't celebrate when elevated
        const NEGATIVE_EMOTIONS = ["low", "sad", "angry", "overwhelmed", "stressed", "anxious"];
        if (mood && NEGATIVE_EMOTIONS.includes(mood.label.toLowerCase())) return false;
        try {
          const list = loadCheckins();
          const last = list[list.length - 1];
          if (last?.intensity != null && last.intensity > 6) return false;
        } catch { /* no check-ins */ }
        return true;
      })();
      if (shouldConfetti) setConfettiActive(true);
    }
    prevCheckedIn.current = checkedIn;
  }, [checkedIn, userState]);
  // A model-drafted check-in waiting to be confirmed (conversational capture). When present and not yet
  // checked in, it replaces the cold "How are you feeling?" prompt with a warm, pre-filled confirm.
  const pendingCheckinDraft = !checkedIn ? getPendingCheckinDraft() : null;
  const todayMood = getTodayMood();
  const dailyIntentionSet = !!getDailyIntention();
  const hero = getHeroAction(timeMode, userState, dailyIntentionSet);
  const intentionCardRef = useRef<DailyIntentionCardHandle>(null);
  const weekInsight = getWeekInsight();
  // UX-6: a tiny 7-day mood sparkline for the "This week" card — show, don't tell (charts > text).
  const weekMoodSpark = useMemo(() => {
    try {
      const recent = loadCheckins()
        .filter((c) => typeof c?.intensity === "number" && c.date)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(-7)
        .map((c) => c.intensity as number);
      return recent.length >= 2 ? recent : [];
    } catch { return []; }
  }, [checkedIn]);
  const hasAnyCheckins = (() => {
    try {
      const list = loadCheckins();
      return list.length > 0;
    } catch { return false; }
  })();
  // Don't push clinical baseline questionnaires (wellbeing/PHQ/GAD) onto a brand-new user's first minutes —
  // let the daily loop take root first (2026-07-18 design review: day-1 Today stacked ~3 "do a screening"
  // asks). Earned once the person has shown up on 3+ distinct days.
  const activeDayCount = (() => {
    try {
      const list = loadCheckins();
      return new Set(list.map((e: any) => e?.date).filter(Boolean)).size;
    } catch { return 0; }
  })();
  const earnedBaselinePrompts = activeDayCount >= 3;
  const wellbeingAssessments = loadAssessments();
  const wellbeingDue = isWellbeingDue(wellbeingAssessments);
  // U2 (2026-07-17 QA): nothing is "due" on a fresh install — there's no prior check to be overdue against.
  // Frame the very first prompt as establishing a baseline, not chasing a missed cadence.
  const wellbeingFirstTime = wellbeingCadence(wellbeingAssessments).daysSinceLast === null;

  // Contextual summary — a warm one-liner based on recent check-ins and time of day
  const recentAvg = (() => {
    try {
      const list = loadCheckins();
      const recent = list.slice(-3).filter((e: any) => e?.intensity != null);
      if (recent.length === 0) return null;
      return recent.reduce((s: number, e: any) => s + e.intensity, 0) / recent.length;
    } catch { return null; }
  })();
  const contextLine = contextualSummary(timeOfDay, checkedIn, recentAvg, 0);

  // U1.3 — Loading skeleton for async data boundaries. Currently all data loads synchronously from
  // secureLocal; set to true when wiring async sources (Healthy Connect, passive sensing, etc.).
  const [loading] = useState(false);

  const vis = (() => {
    const base = PHASE_VIS[selectedIntentPhase];
    // U4.1 — State-aware simplification: when anxious or elevated, reduce to minimal surface
    if (userState === "anxious" || userState === "elevated") {
      return { moodAndHero: true, intention: false, patterns: false };
    }
    return base;
  })();

  // Nila's warm companion message based on current state
  const nilaMsg = buildNilaMessage({
    timeOfDay,
    recentMoodAvg: recentAvg,
    checkedInToday: checkedIn,
    streakDays: 0, // simplified — streak is in DashboardScreen
    sleepHours: null,
    isCrisis: false,
    hasRecentEpisode: false,
    isReturning: hasAnyCheckins && !checkedIn,
  });

  // Proactive assessment suggestion based on signals
  const assessmentPrompt = getTopAssessmentPrompt();

  // Nudge prioritization — max 1 visible at a time, safety-first cascade
  const reCheckinVisible = hasAnyCheckins && !checkedIn && !reCheckinSkipped && (() => {
    try {
      const list = loadCheckins();
      if (list.length === 0) return false;
      const last = list[list.length - 1];
      if (!last?.date) return false;
      const lastDate = new Date(last.date + "T00:00:00");
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86_400_000);
      return daysSince >= 2;
    } catch { return false; }
  })();
  const nudgeCandidates = {
    hasSafetyPlanNudge: true, // SafetyPlanNudgeCard handles its own visibility internally
    hasReCheckIn: reCheckinVisible,
    hasPendingDraft: !!pendingCheckinDraft,
    hasWellbeingDue: wellbeingDue && earnedBaselinePrompts,
    // U4.2 — When anxious, skip assessment and proactive nudges (only crisis + safety plan pass through)
    hasAssessmentPrompt: userState !== "anxious" && !!assessmentPrompt && earnedBaselinePrompts && !wellbeingDue,
    hasProactiveNudge: userState !== "anxious" && !!proactiveNudge,
  };
  const topNudge = selectTopNudge(nudgeCandidates);
  const totalNudges = (Object.values(nudgeCandidates) as boolean[]).filter(Boolean).length;
  const [nudgeCascadeExpanded, setNudgeCascadeExpanded] = useState(false); // U1.4

  // U3.4 — Pathway label: compute streak day + next due item.
  const pathwayDay = useMemo(() => {
    try { return computeCompassionateStreak().current; }
    catch { return undefined; }
  }, []);
  const pathwayNextDue = useMemo(() => {
    if (wellbeingDue && earnedBaselinePrompts) return "Wellbeing check";
    if (assessmentPrompt && earnedBaselinePrompts) return `${INSTRUMENTS[assessmentPrompt.instrument].measures} check`;
    return undefined;
  }, [wellbeingDue, earnedBaselinePrompts, assessmentPrompt]);

  const ptr = usePullToRefresh(async () => {
    await new Promise((r) => setTimeout(r, 500));
    window.dispatchEvent(new CustomEvent("nila-refresh-today"));
    setLastRefreshed(Date.now());
  });

  return (
    <PullToRefresh
      pullDistance={ptr.pullDistance}
      pulling={ptr.pulling}
      refreshing={ptr.refreshing}
      onTouchStart={ptr.onTouchStart}
      onTouchMove={ptr.onTouchMove}
      onTouchEnd={ptr.onTouchEnd}
    >
    <div className="space-y-4 max-w-md mx-auto animate-fade-in px-4" id="today-hub">
      {/* Greeting — time-aware, serif voice, refined */}
       <header className="relative pt-2 pb-1">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h1 className="editorial text-[28px] text-ink leading-tight">{greeting}</h1>
              <button
                onClick={() => setShowHelp((v) => !v)}
                className="w-8 h-8 rounded-xl bg-fill border border-line flex items-center justify-center text-ink-faint hover:text-ink-2 hover:border-line-strong transition-colors cursor-pointer shrink-0"
                aria-label="Help — what am I looking at?"
              >
                <span className="text-xs font-semibold">?</span>
              </button>
            </div>
            <p className="text-[13px] text-ink-muted">{formatDate()}</p>
            {/* U2.3 — Staleness indicator shown briefly after pull-to-refresh completes */}
            {lastRefreshed && (
              <p className="text-[11px] text-success mt-0.5 animate-fade-in" aria-live="polite">
                Updated just now
              </p>
            )}
           {contextLine && (
             <p className="text-[12px] text-ink-muted leading-relaxed mt-1">{contextLine}</p>
           )}
{!contextLine && nilaMsg.message && (
              <p className="text-[12px] text-ink-muted leading-relaxed mt-1 italic">"{nilaMsg.message}"</p>
            )}
            {/* U9.1 + U9.2 — Privacy + crisis-awareness badges */}
            {/* 2026-08-05 UI/UX audit: replaced emoji-as-icon (🔒/🛡) with themed Lucide SVGs — emoji glyphs
                are font/platform-dependent (rendering varies by Android version and OEM emoji font) and
                can't take `currentColor`, so they never quite matched this row's palette. Every other icon
                in the app is a Lucide SVG; this was the one exception. */}
            <p className="text-[10px] text-ink-faint mt-1.5 flex items-center gap-3">
              <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" aria-hidden="true" /> On-device</span>
              <span className="flex items-center gap-1 text-rose-400/70"><ShieldCheck className="w-2.5 h-2.5" aria-hidden="true" /> Crisis support always here</span>
            </p>
          </div>

        {/* Intent phase navigation (Phase 2: Adaptive UI) */}
        <div className="mt-3">
          <IntentFlowBar
            currentPhase={selectedIntentPhase || suggestPhase(userState, timeOfDay)}
            onPhaseChange={onPhaseChange}
            className="bg-card/80 backdrop-blur-xl border border-line/40 rounded-xl"
            tooltipDismissed={!phaseTooltipActive}
            onDismissTooltip={dismissPhaseTooltip}
            day={pathwayDay}
            nextDue={pathwayNextDue}
          />
        </div>

       </header>

      {/* U9.4 — Proactive elevation check on mount */}
      {userState === "elevated" && (
        <button
          onClick={onOpenCrisis}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-danger/8 border border-danger/20 text-xs text-ink-2 hover:bg-danger/12 transition-colors cursor-pointer text-left"
          role="status"
        >
          <LifeBuoy className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
          <span className="flex-1">You seem energized — crisis resources are here if needed.</span>
          <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" aria-hidden="true" />
        </button>
      )}

      {/* U3.5 — Help FAQ sheet */}
      {showHelp && (
        <div className="relative z-10">
          <div className="absolute right-0 top-0 w-72 bg-card border border-line-strong rounded-2xl shadow-xl p-5 space-y-4 text-xs animate-fade-in" role="dialog" aria-label="Help">
            <div className="space-y-2">
              <p className="font-semibold text-ink">What am I looking at?</p>
              <p className="text-ink-muted leading-relaxed">Today shows what matters most based on your current phase — Calm (grounding), Data (review), or Protocol (skills).</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-ink">What is a nudge?</p>
              <p className="text-ink-muted leading-relaxed">Gentle reminders — a check-in you missed, a wellbeing check that's due, or an insight from your data. They appear one at a time to keep things calm.</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-ink">How do I change what appears?</p>
              <p className="text-ink-muted leading-relaxed">Tap Calm / Data / Protocol above to switch what's shown. The app suggests a phase based on your state and time of day — you can always override.</p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full text-center py-2.5 rounded-xl bg-fill text-ink-muted hover:text-ink-2 transition-colors cursor-pointer min-h-[44px] font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Data load error feedback — visible when storage errors occur */}
      {dataErrors.length > 0 && (
        <div className="bg-warn/10 border border-warn/30 rounded-2xl p-3 text-xs text-ink-muted flex items-center gap-2" role="alert">
          <span className="shrink-0">⚠️</span>
          <span>Some data couldn&apos;t load. Pull down to refresh.</span>
        </div>
      )}

      {/* Daily inspiration — quote + tip. 2026-08-05 declutter: was gated behind a "Your week" toggle
          fold, but that fold's OTHER contents (a duplicate rhythm card, a hardcoded-fake progress card,
          a duplicate insight card) have all been removed — this was the only thing left inside it, and
          it already self-manages its own visibility (once-per-day content, dismissible via its own X
          button, backed by isDailyDismissed()/dismissDailyContent()). A toggle whose sole job was to
          reveal one already-self-dismissing card added a tap with no remaining purpose. */}
      <DailyContentCard />

      {/* Proactive nudge rail — surfaced from compound signal analysis */}
      {proactiveNudge && (nudgeCascadeExpanded || topNudge === "proactive") && (
        <ProactiveNudgeRail
          text={proactiveNudge.text}
          icon={proactiveNudge.icon}
          onTap={() => go(proactiveNudge.route)}
          onDismiss={() => setProactiveNudge(null)}
        />
      )}

      {/* First-time user: value proposition + momentum builder */}
      {!hasAnyCheckins && (
        <>
          <ValuePropBanner />
          <OnboardingMomentum onComplete={refreshAfterCheckinResolve} />
        </>
      )}

      {/* (Play-Store rating prompt moved off the mental-health home to the You tab — 2026-07-18 design
          review: a store-rating ask does not belong on the daily support surface.) */}

      {/* U1.4 — Nudge cascade: shows only the top nudge by default; when expanded shows all. */}
      {hasAnyCheckins && nudgeCascadeExpanded && !wellbeingDue && !assessmentPrompt && !pendingCheckinDraft && (
        <p className="text-[10px] text-ink-faint text-center">No nudges right now</p>
      )}
      {topNudge === "safety_plan" && (nudgeCascadeExpanded || topNudge === "safety_plan") && <SafetyPlanNudgeCard go={go} />}
      {reCheckinVisible && (nudgeCascadeExpanded || topNudge === "re_checkin") && (
        <LowFrictionReCheckIn
          onMoodSelect={() => refreshAfterCheckinResolve()}
          onSkip={() => setReCheckinSkipped(true)}
        />
      )}
      {wellbeingDue && earnedBaselinePrompts && (nudgeCascadeExpanded || topNudge === "wellbeing_due") && (
        <div className="bg-success/8 border border-success/20 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-success" />
            <p className="text-sm font-semibold text-ink">{t(wellbeingFirstTime ? "wellbeing_baseline_title" : "wellbeing_due_title")}</p>
          </div>
          <p className="text-base text-ink-muted leading-relaxed">{t(wellbeingFirstTime ? "wellbeing_baseline_sub" : "wellbeing_due_sub")}</p>
          <button
            onClick={() => go("assessment")}
            id="today-wellbeing-due"
            className="w-full bg-success hover:opacity-90 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
          >
            {t("wellbeing_take")}
          </button>
        </div>
      )}
      {assessmentPrompt && earnedBaselinePrompts && !wellbeingDue && (nudgeCascadeExpanded || topNudge === "assessment_prompt") && (
        <button
          onClick={() => go("assessment")}
          className="w-full bg-card hover:bg-fill border border-line hover:border-line-strong shadow-sm p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
        >
          <span className="shrink-0 text-accent"><Activity className="w-5 h-5" aria-hidden="true" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-ink">
              {INSTRUMENTS[assessmentPrompt.instrument].measures} check {assessmentPrompt.firstTime ? "— set your baseline" : assessmentPrompt.kind === "contextual" ? "suggested" : "due"}
              <span className="text-ink-faint font-normal"> ({assessmentPrompt.instrument})</span>
            </span>
            <span className="block text-[11px] text-ink-muted mt-0.5">{assessmentPrompt.reason}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
        </button>
      )}
      {pendingCheckinDraft && (nudgeCascadeExpanded || topNudge === "pending_draft") && (
        <ConversationalCheckinCard go={go} onResolved={refreshAfterCheckinResolve} />
      )}

      {/* "+N more" toggle when collapsed and more nudges are available */}
      {!nudgeCascadeExpanded && totalNudges > 1 && (
        <button
          onClick={() => setNudgeCascadeExpanded(true)}
          className="w-full text-center py-2 text-xs text-ink-faint hover:text-ink-2 transition-colors cursor-pointer min-h-[44px]"
        >
          +{totalNudges - 1} more
        </button>
      )}

      {/* "Dismiss all" when expanded */}
      {nudgeCascadeExpanded && totalNudges > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setNudgeCascadeExpanded(false)}
            className="text-xs text-ink-faint hover:text-ink-2 transition-colors cursor-pointer min-h-[44px]"
          >
            Show fewer
          </button>
          <button
            onClick={() => {
              setReCheckinSkipped(true);
              setProactiveNudge(null);
              setNudgeCascadeExpanded(false);
            }}
            className="text-xs text-ink-faint hover:text-rose-400 transition-colors cursor-pointer min-h-[44px]"
          >
            Dismiss all
          </button>
        </div>
      )}

      {/* U1.2 — Merged section: mood card + hero action + daily intention as a single stacked pair.
          Phase-gated by vis.moodAndHero. Intention renders only in data phase (vis.intention).
          Calm and Data phases show this block; Protocol hides it for a minimal surface. */}
      {vis.moodAndHero && (
        <div className="space-y-3">
      {/* U1.3 — Loading skeleton replaces mood+hero+intention while data resolves. */}
      {loading ? <SkeletonCard lines={4} /> : <>
      {/* Mood card — prompt to log if not checked in, show reflection if done with week
          insight merged inline, collapsible (U1.2). The cold "how are you feeling?" prompt
          is suppressed while a drafted check-in is offered above (they'd be redundant). */}
      {!(pendingCheckinDraft && !checkedIn) && (
      <div
        onClick={() => {
          if (isSaving) return; // U2.1 double-tap guard
          if (!checkedIn) setIsSaving(true);
          checkedIn ? go("diary") : go("ema_checkin");
        }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!isSaving) { if (!checkedIn) setIsSaving(true); checkedIn ? go("diary") : go("ema_checkin"); } } }}
        role="button"
        tabIndex={0}
        aria-disabled={isSaving}
        className={`w-full bg-card border border-line hover:border-line-strong shadow-sm p-5 rounded-2xl transition-all cursor-pointer text-left ${isSaving ? "opacity-60" : "active:scale-[0.99]"}`}
      >
        {/* U2.2 — Save-state spinner when check-in is saving */}
        {isSaving ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-10 h-10 text-accent animate-spin shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-ink">Saving your check-in…</p>
              <p className="text-[11px] text-ink-muted mt-0.5">Almost done</p>
            </div>
          </div>
        ) : checkedIn && todayMood ? (
          <div className="flex items-start gap-4">
            <span className={`blob-badge blob-badge--${moodBlobVariant(todayMood.label)} w-12 h-12 shrink-0`}>
              <span className="blob-badge__value text-2xl" aria-hidden="true">{todayMood.emoji}</span>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">Feeling {todayMood.label}</p>
              <p className="text-[11px] text-ink-muted mt-0.5">Tap to see your diary</p>
              {/* U1.2 — Week insight merged inline into mood card, collapsible (expandable trend) */}
              {weekInsight && weekInsight.checkinCount > 0 && (
                <div className="mt-3 pt-3 border-t border-line/30">
                  <button
                    onClick={(e) => { e.stopPropagation(); setWeekInsightExpanded(!weekInsightExpanded); }}
                    className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-ink-faint hover:text-ink-2 transition-colors cursor-pointer min-h-[22px]"
                    aria-expanded={weekInsightExpanded}
                  >
                    <span>This week: {weekInsight.checkinCount} check-in{weekInsight.checkinCount !== 1 ? "s" : ""}
                    {weekInsight.topEmotion && ` · mostly ${weekInsight.topEmotion}`}</span>
                    <span className="text-[8px]">{weekInsightExpanded ? "▲" : "▼"}</span>
                  </button>
                  {weekInsightExpanded && weekMoodSpark.length >= 2 && (
                    <Sparkline
                      data={weekMoodSpark}
                      width={160}
                      height={28}
                      min={0}
                      max={10}
                      color="var(--color-accent)"
                      label="Your mood over the last 7 check-ins"
                      className="mt-2"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">How are you feeling right now?</p>
              <p className="text-[11px] text-ink-muted mt-0.5">Two taps — no typing needed</p>
            </div>
          </div>
        )}
        <ChevronRight className="w-5 h-5 text-ink-faint shrink-0 ml-auto" aria-hidden="true" />
      </div>
      )}

      {/* Hero action — time-aware: wind-down at night, grounding when elevated, else the structured
          daily-intention prompt (until set) or the check-in prompt. (2026-07-18 QA: hoisted ABOVE the
          "Your week" fold — the time-aware hero is a LEAD element, not something buried below a
          show-more toggle. The daily-intention branch opens the card inline.) */}
      <button
        onClick={() => {
          if (hero.id === "daily_intention") {
            intentionCardRef.current?.open();
            document.getElementById("today-daily-intention")?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          go(hero.route);
        }}
        className="w-full bg-accent/8 border border-accent/20 shadow-sm hover:bg-accent/12 p-5 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3.5"
      >
        <span className="shrink-0 w-11 h-11 rounded-2xl bg-accent/15 flex items-center justify-center text-accent">{hero.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-bold text-ink">{hero.label}</span>
          <span className="block text-xs text-ink-muted mt-0.5">{hero.sub}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-ink-faint shrink-0 ml-auto" aria-hidden="true" />
      </button>

      {/* U1.2 — Daily intention stacked right below hero. Phase-gated (data only). */}
      {vis.intention && (
        <DailyIntentionCard ref={intentionCardRef} promptWhenClosed={hero.id !== "daily_intention"} />
      )}

      {/* Guided Programs — direct entry to the protocol hub (Task 6). */}
      <button
        onClick={() => go("guided_programs")}
        className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className="shrink-0 text-accent"><Sparkle className="w-5 h-5" aria-hidden="true" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-ink">Guided Programs</span>
          <span className="block text-[11px] text-ink-muted">Real, evidence-based programs you can start any time</span>
        </span>
        <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
      </button>
      </>}
      </div>
      )}

      {/* TodayWidgets — glanceable data cards (sleep, mood, protocol, rhythm, streak, insight) */}
      {vis.patterns && todayWidgets && (() => {
        const {
          Sleep: SleepWidget, MoodTrend: MoodTrendWidget, NextProtocol: NextProtocolWidget,
          QuickActions: QuickActionsWidget, Rhythm: RhythmWidget, WeeklyInsight: WeeklyInsightWidget,
          Streak: StreakWidget, Assessment: AssessmentWidget,
        } = todayWidgets;
        return (
          <div className="space-y-3 animate-fade-in stagger-children">
            <SleepWidget />
            <MoodTrendWidget go={go} />
            <NextProtocolWidget go={go} />
            <QuickActionsWidget onAction={go} />
            <RhythmWidget go={go} />
            <WeeklyInsightWidget />
            <StreakWidget />
            <AssessmentWidget go={go} />
          </div>
        );
      })()}

      {/* Celebration confetti on check-in completion */}
      <ConfettiBurst
        active={confettiActive}
        onComplete={() => setConfettiActive(false)}
        duration={1800}
        count={24}
      />

      {/* U9.8 — Inline "See all tools" link */}
      <button
        onClick={() => go("tools")}
        className="w-full text-center text-xs text-ink-faint hover:text-ink-muted py-2 transition-colors cursor-pointer focus-ring"
      >
        See all tools →
      </button>

      {/* Crisis button — bottom thumb zone, always reachable */}
      <div className="flex justify-center pt-2 pb-4">
        <CrisisHeaderButton onClick={onOpenCrisis} />
      </div>
    </div>
    </PullToRefresh>
  );
}
