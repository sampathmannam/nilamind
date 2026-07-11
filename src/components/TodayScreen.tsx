import { useState } from "react";
import { Wind, MessageCircle, Moon, Sun, LayoutGrid, Sparkles, ChevronRight, Clock } from "lucide-react";
import { getTimeMode, getUserState, getGreeting } from "../services/modeEngine";
import { hasCheckinToday } from "../services/checkin";
import { secureLocal } from "../services/secureLocal";
import { buildToolGroups } from "./toolsRows";
import { t } from "../services/i18n";
import type { TimeMode, UserState } from "../types/modes";

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
    return { id: "winddown", label: "Wind down for sleep", sub: "A calm bedtime routine", icon: <Moon className="w-5 h-5" />, color: "text-indigo-400", route: "winddown" };
  }
  if (userState === "anxious" || userState === "elevated") {
    return { id: "plan", label: "Grounding & breathing", sub: "Calm your body in a hard minute", icon: <Wind className="w-5 h-5" />, color: "text-emerald-400", route: "plan" };
  }
  return { id: "nila", label: "Talk to Nila", sub: "She's here when you are", icon: <MessageCircle className="w-5 h-5" />, color: "text-blue-400", route: "nila" };
}

function formatDate(): string {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
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
  const timeMode = getTimeMode();
  const userState = getUserState();
  const greeting = getGreeting(timeMode);
  const checkedIn = hasCheckinToday(new Date().toISOString().split("T")[0]);
  const todayMood = getTodayMood();
  const hero = getHeroAction(timeMode, userState);
  const groups = buildToolGroups({ go, onEpisode, phoneEnabled });

  return (
    <div className="space-y-5 max-w-md mx-auto" id="today-hub">
      {/* Greeting */}
      <header className="space-y-0.5">
        <h1 className="editorial text-3xl text-slate-100">
          {greeting}
          {timeMode === "morning" ? " ☀️" : timeMode === "night" ? " 🌙" : " ✨"}
        </h1>
        <p className="text-sm text-slate-400">{formatDate()}</p>
      </header>

      {/* Mood card */}
      <button
        onClick={() => checkedIn ? go("diary") : go("nila")}
        className="w-full glass hover:brightness-125 p-5 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
      >
        {checkedIn && todayMood ? (
          <div className="flex items-center gap-4">
            <span className="text-3xl">{todayMood.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-slate-100">Feeling {todayMood.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tap to see details in your diary</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-sm font-semibold text-slate-100">How are you feeling?</p>
              <p className="text-[11px] text-slate-400 mt-0.5">A quick check-in with Nila takes just a moment</p>
            </div>
          </div>
        )}
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0 ml-auto" />
      </button>

      {/* Hero action */}
      <button
        onClick={() => go(hero.route)}
        className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className={`shrink-0 ${hero.color}`}>{hero.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-100">{hero.label}</span>
          <span className="block text-[11px] text-slate-400">{hero.sub}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
      </button>

      {/* Talk to Nila card */}
      <button
        onClick={() => go("nila")}
        className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-100">Talk to Nila</span>
          <span className="block text-[11px] text-slate-400">Your companion — always here, always private</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
      </button>

      {/* All tools toggle */}
      <button
        onClick={() => setShowAllTools(!showAllTools)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-300 text-sm font-medium transition-all cursor-pointer active:scale-[0.99]"
      >
        <LayoutGrid className="w-4 h-4" />
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
                    <span className="shrink-0"><r.Icon className={r.iconClass} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-slate-100">{r.label}</span>
                      <span className="block text-[11px] text-slate-400">{r.sub}</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
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
