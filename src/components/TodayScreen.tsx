import { useState } from "react";
import { Wind, MessageCircle, Moon, LayoutGrid, Sparkles, ChevronRight, HeartHandshake, Sparkle, Clock3, LineChart } from "lucide-react";
import { getTimeMode, getUserState, getGreeting } from "../services/modeEngine";
import { hasCheckinToday } from "../services/checkin";
import { secureLocal } from "../services/secureLocal";
import { buildToolGroups, type ToolGroup } from "./toolsRows";
import { useLanguage, t } from "../services/i18n";
import { loadInsights } from "../services/nilaInsights";
import { loadAssessments } from "../services/assessments";
import { isWellbeingDue } from "../services/wellbeingTrack";
import { getCapacityLevel } from "../services/capacitySignal";
import { hasRhythmToday, loadTodayAnchors, RHYTHM_ANCHORS } from "../services/socialRhythm";
import { getUserGoals } from "../services/chatSuggestions";
import type { TimeMode, UserState } from "../types/modes";

// Goal -> the tool row ids it should promote to the front of their group, when present in that group.
// Same personalization rationale/citation as chatSuggestions.ts's GOAL_CHIP_PRIORITY: customizable/relevant
// content is a named engagement facilitator, closing the onboarding goal picker's previously write-only
// loop (nilamind_user_goal), per Borghouts, Eikey, Mark et al. (2021), J Med Internet Res.
const GOAL_TOOL_PRIORITY: Record<string, string[]> = {
  "Feeling low": ["problem_solving", "values_work", "diary"],
  "Managing stress": ["plan", "winddown", "diary"],
  "Managing anxiety": ["plan", "exposure", "diary"],
  "Tracking moods": ["ema_checkin", "diary", "assessment", "social_rhythm"],
  "Building skills": ["problem_solving", "peer_support", "exposure"],
  "Just curious": [],
};

/** Reorders each group's rows so goal-relevant tools lead, without changing group titles, membership,
 *  or row count. A no-op (returns groups unchanged, same array reference) when goals is empty or maps
 *  to no known tools — safe default for "Just curious" / no onboarding selection made. */
export function personalizeToolOrder(groups: ToolGroup[], goals: string[]): ToolGroup[] {
  const priorityIds = new Set<string>();
  for (const goal of goals) {
    for (const id of GOAL_TOOL_PRIORITY[goal] ?? []) priorityIds.add(id);
  }
  if (priorityIds.size === 0) return groups;
  return groups.map((g) => ({
    ...g,
    rows: [...g.rows].sort((a, b) => {
      const aRank = priorityIds.has(a.id) ? 0 : 1;
      const bRank = priorityIds.has(b.id) ? 0 : 1;
      return aRank - bRank;
    }),
  }));
}

const MOOD_EMOJI: Record<string, string> = {
  calm: "😌", good: "😊", okay: "😐", fine: "😊", anxious: "😰",
  low: "😢", sad: "😢", angry: "😤", overwhelmed: "😩", stressed: "😫",
};

function getTodayMood(): { label: string; emoji: string } | null {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return null;
    const today = new Date().toISOString().split("T")[0];
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

function getHeroAction(timeMode: TimeMode, userState: UserState | null): HeroAction {
  const hour = new Date().getHours();
  if (hour >= 20 || hour < 5) {
    return { id: "winddown", label: "Wind down for sleep", sub: "A calm bedtime routine", icon: <Moon className="w-5 h-5" aria-hidden="true" />, color: "text-indigo-400", route: "winddown" };
  }
  if (userState === "anxious" || userState === "elevated") {
    return { id: "plan", label: "Grounding & breathing", sub: "Calm your body in a hard minute", icon: <Wind className="w-5 h-5" aria-hidden="true" />, color: "text-emerald-400", route: "plan" };
  }
  return { id: "checkin", label: "How are you feeling?", sub: "A quick check-in takes just a moment", icon: <Sparkles className="w-5 h-5" aria-hidden="true" />, color: "text-blue-400", route: "ema_checkin" };
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
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0];
}

function getWeekInsight(): { checkinCount: number; topEmotion: string | null } | null {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return null;
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
}: {
  go: (target: string) => void;
  phoneEnabled: boolean;
  onEpisode: () => void;
}) {
  const [showAllTools, setShowAllTools] = useState(false);
  useLanguage();
  const timeMode = getTimeMode();
  const userState = getUserState();
  const capacity = getCapacityLevel(userState);
  const greeting = getGreeting(timeMode);
  const checkedIn = hasCheckinToday(new Date().toISOString().split("T")[0]);
  const todayMood = getTodayMood();
  const hero = getHeroAction(timeMode, userState);
  const groups = personalizeToolOrder(buildToolGroups({ go, onEpisode, phoneEnabled }), getUserGoals());
  const weekInsight = getWeekInsight();
  const nilaReflection = getNilaReflection();
  const hasAnyCheckins = (() => {
    try {
      const raw = secureLocal.getItem("nilamind_checkins");
      if (!raw) return false;
      const list = JSON.parse(raw);
      return Array.isArray(list) && list.length > 0;
    } catch { return false; }
  })();
  const wellbeingDue = isWellbeingDue(loadAssessments());

  return (
    <div className="space-y-5 max-w-md mx-auto" id="today-hub">
      {/* Greeting — time-aware, serif voice, no emoji (screen-reader-safe) */}
      <header className="space-y-0.5">
        <h1 className="editorial text-3xl text-slate-100">{greeting}</h1>
        <p className="text-sm text-slate-400">{formatDate()}</p>
      </header>

      {/* Empty-state welcome — shown only on first launch when no check-ins exist yet */}
      {!hasAnyCheckins && (
        <div className="glass p-5 rounded-2xl space-y-2">
          <div className="flex items-center gap-3">
            <HeartHandshake className="w-6 h-6 text-blue-400 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-100">Welcome to NilaMind</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Everything here stays on your device. Start with a check-in — it takes two taps.
            Nila will suggest tools based on how you're feeling.
          </p>
        </div>
       )}

      {/* Longitudinal wellbeing — gentle fortnightly cadence prompt */}
      {wellbeingDue && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-emerald-400" />
            <p className="text-sm font-semibold text-slate-100">{t("wellbeing_due_title")}</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{t("wellbeing_due_sub")}</p>
          <button
            onClick={() => go("assessment")}
            id="today-wellbeing-due"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
          >
            {t("wellbeing_take")}
          </button>
        </div>
      )}

      {/* Mood card — prompt to log if not checked in, show reflection if done */}
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
              <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-100">How are you feeling right now?</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Two taps — no typing needed</p>
            </div>
          </div>
        )}
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0 ml-auto" aria-hidden="true" />
      </button>

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

      {/* Hero action — time-aware: wind-down at night, grounding when elevated, else check-in prompt */}
      <button
        onClick={() => go(hero.route)}
        className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className={`shrink-0 ${hero.color}`}>{hero.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-100">{hero.label}</span>
          <span className="block text-[11px] text-slate-400">{hero.sub}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
      </button>

      {/* Talk to Nila card — always present */}
      <button
        onClick={() => go("nila")}
        className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-white" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-100">Talk to Nila</span>
          <span className="block text-[11px] text-slate-400">Your companion — always here, always private</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
      </button>

      {/* Capacity-adaptive tools section (Phase 8: forgiving engagement) */}
      {capacity === "low" && (
        <p className="text-[11px] text-slate-500 text-center leading-relaxed italic">
          A quiet day? That's okay. The essentials are above — everything else can wait.
        </p>
      )}
      <button
        onClick={() => setShowAllTools(!showAllTools)}
        aria-expanded={showAllTools}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-300 text-sm font-medium transition-all cursor-pointer active:scale-[0.99]"
      >
        <LayoutGrid className="w-4 h-4" aria-hidden="true" />
        {showAllTools ? "Hide tools" : "All tools"}
      </button>

      {/* Expandable tools list */}
      {showAllTools && (
        <div className="space-y-5 animate-tab-fade">
          {groups.map((g) => (
            <section key={g.title} className="space-y-2">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">{g.title}</h2>
              <div className="space-y-2">
                {g.rows.map((r) => (
                  <button
                    key={r.id}
                    onClick={r.onTap}
                    id={`tools-${r.id}`}
                    className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
                  >
                    <span className="shrink-0"><r.Icon className={r.iconClass} aria-hidden="true" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-slate-100">{r.label}</span>
                      <span className="block text-[11px] text-slate-400">{r.sub}</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
