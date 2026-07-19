import { localDateKey } from "../services/storageUtils";
import { useRef, useState, useEffect, useReducer } from "react";
import { Wind, MessageCircle, Moon, Sparkles, ChevronRight, HeartHandshake, Sparkle, Clock3, Target, LineChart, Activity } from "lucide-react";
import { getTimeMode, getUserState } from "../services/modeEngine";
import { hasCheckinToday, loadCheckins } from "../services/checkin";
import { useLanguage, t } from "../services/i18n";
import { loadInsights } from "../services/nilaInsights";
import { loadAssessments, INSTRUMENTS } from "../services/assessments";
import { isWellbeingDue, wellbeingCadence } from "../services/wellbeingTrack";
import { hasRhythmToday, loadTodayAnchors, RHYTHM_ANCHORS } from "../services/socialRhythm";
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
import { getTopAssessmentPrompt } from "../services/assessmentPrompts";
import { selectProactiveNudge } from "../services/proactiveSurfaceRouter";
import { detectCompoundSignals } from "../services/compoundDetector";
import { getFeatureWindow } from "../services/signalStore";
import { getPassiveSensingEnabled } from "../services/passiveSensingPrefs";
import ProactiveNudgeRail from "./ProactiveNudgeRail";
import type { TimeMode, UserState } from "../types/modes";

const MOOD_EMOJI: Record<string, string> = {
  calm: "😌", good: "😊", okay: "😐", fine: "😊", anxious: "😰",
  low: "😢", sad: "😢", angry: "😤", overwhelmed: "😩", stressed: "😫",
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
    return { id: "winddown", label: "Wind down for sleep", sub: "A calm bedtime routine", icon: <Moon className="w-5 h-5" aria-hidden="true" />, color: "text-indigo-400", route: "winddown" };
  }
  if (userState === "anxious" || userState === "elevated") {
    return { id: "plan", label: "Grounding & breathing", sub: "Calm your body in a hard minute", icon: <Wind className="w-5 h-5" aria-hidden="true" />, color: "text-emerald-400", route: "plan" };
  }
if (!dailyIntentionSet) {
    return { id: "daily_intention", label: "Set today's intention", sub: "A 30-second if-then plan — research-backed", icon: <Target className="w-5 h-5" aria-hidden="true" />, color: "text-amber-400", route: "" };
  }
  // Intention already set → promote Talk to Nila (not a duplicate check-in prompt — the mood
  // card directly below already handles that, and stacking two check-in CTAs is confusing).
  return { id: "nila", label: "Talk to Nila", sub: "A conversation, a reflection, or just a listen", icon: <MessageCircle className="w-5 h-5" aria-hidden="true" />, color: "text-blue-400", route: "nila" };
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

function getNilaReflection(): string | null {
  try {
    const insights = loadInsights();
    if (!insights.length) return null;
    // Pick a random insight (rotates on each render, but stable within session is fine)
    const idx = Math.floor(Math.random() * insights.length);
    return insights[idx].text;
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
  const [showExtraCards, setShowExtraCards] = useState(false);
  const [proactiveNudge, setProactiveNudge] = useState<{ text: string; route: string; icon: string } | null>(null);
  useLanguage();
  const { timeOfDay } = useTimeOfDay();
  const timeMode = getTimeMode();
  const userState = getUserState();

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
  const [, refreshAfterCheckinResolve] = useReducer((n: number) => n + 1, 0);
  const [reCheckinSkipped, setReCheckinSkipped] = useState(false);
  const checkedIn = hasCheckinToday(localDateKey());
  // A model-drafted check-in waiting to be confirmed (conversational capture). When present and not yet
  // checked in, it replaces the cold "How are you feeling?" prompt with a warm, pre-filled confirm.
  const pendingCheckinDraft = !checkedIn ? getPendingCheckinDraft() : null;
  const todayMood = getTodayMood();
  const dailyIntentionSet = !!getDailyIntention();
  const hero = getHeroAction(timeMode, userState, dailyIntentionSet);
  const intentionCardRef = useRef<DailyIntentionCardHandle>(null);
  const weekInsight = getWeekInsight();
  const nilaReflection = getNilaReflection();
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

  return (
    <div className="space-y-5 max-w-md mx-auto" id="today-hub">
      {/* Greeting — time-aware, serif voice, with subtle gradient backdrop */}
      <header className={`relative rounded-2xl p-4 -mx-1 bg-gradient-to-br ${heroGradient(timeOfDay)}`}>
        <CrisisHeaderButton onClick={onOpenCrisis} className="absolute top-3 right-3" />
        <div className="space-y-0.5">
          <h1 className="editorial text-3xl text-slate-100">{greeting}</h1>
          <p className="text-sm text-slate-400">{formatDate()}</p>
          {contextLine && (
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{contextLine}</p>
          )}
          {!contextLine && nilaMsg.message && (
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1 italic">"{nilaMsg.message}"</p>
          )}
        </div>
      </header>

      {/* Empty-state welcome — shown only on first launch when no check-ins exist yet */}
      {!hasAnyCheckins && (
        <div className="glass p-5 rounded-2xl space-y-2">
          <div className="flex items-center gap-3">
            <HeartHandshake className="w-6 h-6 text-blue-400 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-100">Welcome to NilaMind</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Everything here stays on your device. Nila will suggest tools based on how you're feeling —
            just tap "How are you feeling right now?" below to get started.
          </p>
        </div>
      )}

      {/* Daily inspiration — quote + tip. Informational, not a primary action → behind the "Your patterns"
          fold so the home leads with one clear thing (2026-07-18 QA, per docs/UX_RESEARCH.md "~4 elements"). */}
      {showExtraCards && <DailyContentCard />}

      {/* Proactive nudge rail — surfaced from compound signal analysis */}
      {proactiveNudge && (
        <ProactiveNudgeRail
          text={proactiveNudge.text}
          icon={proactiveNudge.icon}
          onTap={() => go(proactiveNudge.route)}
          onDismiss={() => setProactiveNudge(null)}
        />
      )}

      {/* (Play-Store rating prompt moved off the mental-health home to the You tab — 2026-07-18 design
          review: a store-rating ask does not belong on the daily support surface.) */}

      {/* Nudge to set up a coping plan — the create-nudge that didn't exist before this redesign */}
      <SafetyPlanNudgeCard go={go} />

      {/* Low-friction re-check-in — one-tap mood log for returning users after a gap */}
      {hasAnyCheckins && !checkedIn && !reCheckinSkipped && (() => {
        try {
          const list = loadCheckins();
          if (list.length === 0) return false;
          const last = list[list.length - 1];
          if (!last?.date) return false;
          const lastDate = new Date(last.date + "T00:00:00");
          const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86_400_000);
          return daysSince >= 2;
        } catch { return false; }
      })() && (
        <LowFrictionReCheckIn
          onMoodSelect={() => refreshAfterCheckinResolve() /* entry already written — just re-render so the mood card updates */}
          onSkip={() => setReCheckinSkipped(true) /* dismiss for the session; don't open the form the user just skipped */}
        />
      )}

      {/* Morning focus — a this-week mini-stat. Informational → behind the "Your patterns" fold. */}
      {showExtraCards && timeOfDay === "morning" && checkedIn && weekInsight && (
        <div className="glass p-3 rounded-2xl space-y-1">
          <p className="text-xs uppercase font-mono tracking-widest text-slate-500">This week</p>
          <p className="text-[11px] text-slate-300">
            {weekInsight.checkinCount} check-in{weekInsight.checkinCount !== 1 ? "s" : ""}
            {weekInsight.topEmotion ? ` · mostly feeling ${weekInsight.topEmotion}` : ""}
          </p>
        </div>
      )}

      {/* Longitudinal wellbeing — gentle fortnightly cadence prompt (Phase 17) */}
      {wellbeingDue && earnedBaselinePrompts && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-emerald-400" />
            <p className="text-sm font-semibold text-slate-100">{t(wellbeingFirstTime ? "wellbeing_baseline_title" : "wellbeing_due_title")}</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{t(wellbeingFirstTime ? "wellbeing_baseline_sub" : "wellbeing_due_sub")}</p>
          <button
            onClick={() => go("assessment")}
            id="today-wellbeing-due"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
          >
            {t("wellbeing_take")}
          </button>
        </div>
      )}

      {/* Proactive assessment suggestion — contextual or routine. Uses the instrument's plain-language
          `measures` field (not the raw clinical acronym) as the headline, with the acronym kept as a
          small secondary label so it still matches what the user sees once they open the screening.
          Styled like every other suggestion card here (no amber "warning" tint) — this is a supportive
          nudge, not an alert, and shouldn't read as one. */}
      {assessmentPrompt && earnedBaselinePrompts && !wellbeingDue && (
        <button
          onClick={() => go("assessment")}
          className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
        >
          <span className="shrink-0 text-blue-400"><Activity className="w-5 h-5" aria-hidden="true" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100">
              {INSTRUMENTS[assessmentPrompt.instrument].measures} check {assessmentPrompt.firstTime ? "— set your baseline" : assessmentPrompt.kind === "contextual" ? "suggested" : "due"}
              <span className="text-slate-500 font-normal"> ({assessmentPrompt.instrument})</span>
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">{assessmentPrompt.reason}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
        </button>
      )}

      {/* Quick breathe — a breathing-tool shortcut. Tools live in the grounding library / Tools; behind
          the fold here so the home isn't a tool list (2026-07-18 QA, per docs/UX_RESEARCH.md). */}
      {showExtraCards && (
      <button
        onClick={() => go("breathing")}
        className="w-full glass hover:brightness-110 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-blue-500/10">
          <Wind className="w-5 h-5 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-200">Quick breathe</p>
          <p className="text-[11px] text-slate-500">A 5-minute breathing session to settle your body</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
      </button>
      )}

      {/* Conversational check-in capture — a one-tap confirm of the check-in Nila drafted from the chat,
          instead of the cold form. Self-renders only when a draft is pending (and not yet checked in). */}
      {pendingCheckinDraft && (
        <ConversationalCheckinCard go={go} onResolved={refreshAfterCheckinResolve} />
      )}

      {/* Mood card — prompt to log if not checked in, show reflection if done. The cold "how are you
          feeling?" prompt is suppressed while a drafted check-in is offered above (they'd be redundant). */}
      {!(pendingCheckinDraft && !checkedIn) && (
      <button
        onClick={() => checkedIn ? go("diary") : go("ema_checkin")}
        className="w-full glass hover:brightness-125 p-5 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
      >
        {checkedIn && todayMood ? (
          <div className="flex items-center gap-4">
            <span className="text-3xl" aria-hidden="true">{todayMood.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-slate-100">Feeling {todayMood.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tap to see your diary</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-100">How are you feeling right now?</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Two taps — no typing needed</p>
            </div>
          </div>
        )}
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0 ml-auto" aria-hidden="true" />
      </button>
      )}

      {/* Hero action — time-aware: wind-down at night, grounding when elevated, else the structured
          daily-intention prompt (until set) or the check-in prompt. (2026-07-18 QA: hoisted ABOVE the
          "Your patterns" fold — per docs/UX_RESEARCH.md the time-aware hero is a LEAD element, not
          something buried below a show-more toggle. The daily-intention branch opens the card inline.) */}
      {/* Distinct HERO treatment (2026-07-18 design review): the lead action was byte-identical to every
          other glass card, so nothing read as primary. Give it an elevated, accented surface (gradient +
          accent border + a filled icon chip + larger label) so the eye lands here first. */}
      <button
        onClick={() => {
          if (hero.id === "daily_intention") {
            intentionCardRef.current?.open();
            document.getElementById("today-daily-intention")?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          go(hero.route);
        }}
        className="w-full bg-gradient-to-br from-blue-500/12 to-blue-500/[0.02] border border-blue-500/30 shadow-sm hover:brightness-110 p-5 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3.5"
      >
        <span className={`shrink-0 w-11 h-11 rounded-full bg-blue-500/15 flex items-center justify-center ${hero.color}`}>{hero.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-bold text-slate-100">{hero.label}</span>
          <span className="block text-xs text-slate-400 mt-0.5">{hero.sub}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
      </button>

      {/* Daily intention — the structured if-then picker (Wave 3 Group I). Rendered unconditionally so
          it's also where you review/edit today's plan; the SAME canonical store DiaryCardScreen Part 3
          uses. Collapsed by default; the hero above reveals it (promptWhenClosed=false while promoting). */}
      <DailyIntentionCard ref={intentionCardRef} promptWhenClosed={hero.id !== "daily_intention"} />

      {/* Talk to Nila card — one tap away. Rendered only when the time-aware hero above ISN'T already
          "Talk to Nila" (getHeroAction's default branch), so the two identical CTAs never both show
          (2026-07-18 design review: duplicate "Talk to Nila" cards on a normal day). */}
      {hero.id !== "nila" && (
      <button
        onClick={() => go("nila")}
        className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-100">Talk to Nila</span>
          <span className="block text-[11px] text-slate-400">Your companion — always here, always private</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
      </button>
      )}

      <button
        onClick={() => go("guided_programs")}
        className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className="shrink-0 text-violet-400"><Sparkle className="w-5 h-5" aria-hidden="true" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-100">Guided Programs</span>
          <span className="block text-[11px] text-slate-400">Real, evidence-based programs you can start any time</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
      </button>

      {/* Show more toggle — hides informational cards by default */}
      <button
        onClick={() => setShowExtraCards(!showExtraCards)}
        aria-expanded={showExtraCards}
        className="w-full flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-400 text-[11px] font-medium transition-all cursor-pointer"
      >
        <Sparkles className="w-3 h-3" />
        {showExtraCards ? "Less" : "Your patterns"}
      </button>

      {showExtraCards && (
        <div className="space-y-4 animate-fade-in">
          {/* Social rhythm card — anchor tracking alongside mood (Phase 10) */}
      {(() => {
        const rhythmLogged = hasRhythmToday();
        const anchors = rhythmLogged ? loadTodayAnchors() : null;
        const aWake = anchors?.wake;
        const aBed = anchors?.bed;
        const extraCount = anchors ? Object.keys(anchors).length - (aWake ? 1 : 0) - (aBed ? 1 : 0) : 0;
        return (
          <button onClick={() => go("social_rhythm")} className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3">
            <span className="shrink-0 text-blue-400"><Clock3 className="w-5 h-5" aria-hidden="true" /></span>
            <span className="flex-1 min-w-0">
              {rhythmLogged ? (
                <>
                  <span className="block text-sm font-semibold text-slate-100">
                    {aWake ? `Wake ${aWake}` : ""}{aWake && aBed ? " · " : ""}{aBed ? `Bed ${aBed}` : ""}{extraCount > 0 ? ` · +${extraCount}` : ""}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">Tap to see all anchors</span>
                </>
              ) : (
                <>
                  <span className="block text-sm font-semibold text-slate-100">Log your daily rhythm</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">Track wake, meals &amp; bed — anchor your routine</span>
                </>
              )}
            </span>
            <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
          </button>
        );
      })()}

      {/* Weekly insight card — contextual data summary when there's check-in data */}
      {weekInsight && weekInsight.checkinCount > 0 && (
        <div className="glass p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0" aria-hidden="true" />
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-200 font-semibold">{weekInsight.checkinCount} check-in{weekInsight.checkinCount > 1 ? "s" : ""}</span>
              {weekInsight.topEmotion ? (
                <> this week · mostly <span className="text-slate-200 font-semibold capitalize">{weekInsight.topEmotion}</span></>
              ) : (
                <> this week</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Nila's reflection — a durable insight from your history */}
      {nilaReflection && (
        <div className="glass p-4 rounded-2xl border-l-4 border-l-blue-500">
          <div className="flex items-start gap-3">
            <Sparkle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="text-slate-100 font-semibold">Nila noticed:</span> {nilaReflection}
            </p>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
