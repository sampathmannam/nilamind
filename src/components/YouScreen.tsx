import { localDateKey } from "../services/storageUtils";
import React, { useState, useMemo } from "react";
import { ChevronRight, Sparkles, Target, CheckCircle, X, Lightbulb, Heart, Wind } from "lucide-react";
import CrisisHeaderButton from "./CrisisHeaderButton";
import ConfettiBurst from "./ConfettiBurst";

import { useFocusTrap } from "../hooks/useFocusTrap";
import { buildYouGroups } from "./youRows";
import { useLanguage, t } from "../services/i18n";
import { computeCompassionateStreak } from "../services/streaks";
import { SkeletonCard } from "./Skeleton";
import { loadCheckins } from "../services/checkin";
import { getIntention, setIntention, completeIntention, clearIntention, INTENTION_OPTIONS, getCompletionAck, markAckShown } from "../services/weeklyIntention";
import { getCapacityLevel } from "../services/capacitySignal";
import { getUserState } from "../services/modeEngine";
import { useUserContext } from "../hooks/useUserContext";
import { secureLocal } from "../services/secureLocal";

const GROUP_ACCENTS = ["#C784B0"];

function getWeekSnapshot(): { checkinDays: number; topEmotion: string | null } | null {
  try {
    const list = loadCheckins();
    if (list.length === 0) return null;
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = localDateKey(new Date(d.getFullYear(), d.getMonth(), diff));
    const weekEntries = list.filter((e: any) => e?.date && e.date >= weekStart);
    if (weekEntries.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const e of weekEntries) {
      const em = (e.emotion || "").replace(/\s*\(Nila\)/g, "").toLowerCase().trim();
      if (em) counts[em] = (counts[em] || 0) + 1;
    }
    let topEmotion: string | null = null, topCount = 0;
    for (const [em, c] of Object.entries(counts)) {
      if (c > topCount) { topCount = c; topEmotion = em; }
    }
    return { checkinDays: weekEntries.length, topEmotion };
  } catch { return null; }
}

function StreakConstellation({ activeDays }: { activeDays: string[] }) {
  const dots: React.ReactNode[] = [];
  const today = new Date();
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + monOffset);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = localDateKey(d);
    const active = activeDays.includes(dateStr);
    dots.push(
      <div key={i} className="flex flex-col items-center gap-1" title={dateStr}>
        <div className={`w-4 h-4 rounded-full ${active ? "bg-emerald-400/70 shadow-sm shadow-emerald-400/30" : "bg-slate-700/50"}`} aria-hidden="true" />
        <span className="text-[10px] font-mono text-slate-600">{dayLabels[i]}</span>
      </div>
    );
  }
  return <div className="flex items-center justify-center gap-3 mt-2">{dots}</div>;
}

function getLast7Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + monOffset);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(localDateKey(d));
  }
  return dates;
}

function getActiveDaysInRange(): string[] {
  try {
    const list = loadCheckins();
    const weekDays = getLast7Days();
    const active = new Set<string>();
    for (const e of list) {
      if (e?.date && weekDays.includes(e.date)) active.add(e.date);
    }
    return [...active];
  } catch { return []; }
}

function greeting(timeMode: string): string {
  if (timeMode === "morning") return "Good morning";
  if (timeMode === "evening") return "Good evening";
  if (timeMode === "night") return "Hey";
  return "Hey";
}

interface Suggestion {
  hint: string;
  label: string;
  target: string;
}

function contextSuggestion(timeMode: string, state: string | null): Suggestion | null {
  if (state === "crisis") return null;
  if (state === "elevated") return { hint: "High energy — check your patterns or review your dashboard.", label: "Dashboard", target: "dashboard" };
  if (state === "anxious") return { hint: "Feeling anxious? Your insights or a thought record might help.", label: "Insights", target: "insights" };
  if (state === "low") return { hint: "Even a small step counts. Check your progress or dashboard.", label: "Progress", target: "progress" };
  if (timeMode === "night") return { hint: "Quiet time — review how your week went.", label: "Dashboard", target: "dashboard" };
  if (timeMode === "evening") return { hint: "Evening reflection — check your week's patterns.", label: "Dashboard", target: "dashboard" };
  return null;
}

function WelcomeCard({
  greet, onCheckin, onIntention, onDashboard,
}: {
  greet: string; onCheckin: () => void; onIntention: () => void; onDashboard: () => void;
}) {
  const steps = [
    { icon: Heart, label: "First check-in", sub: "Tell Nila how you're feeling right now", action: onCheckin },
    { icon: Target, label: "Set an intention", sub: "One small thing you'd like to try this week", action: onIntention },
    { icon: Sparkles, label: "Explore your dashboard", sub: "See your progress take shape", action: onDashboard },
  ] as const;
  return (
    <div className="bg-fill/80 rounded-2xl border border-line/30 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#C784B0]/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-[#C784B0]" aria-hidden="true" />
        </div>
        <div>
          <h1 className="editorial text-2xl text-ink">{greet}</h1>
          <p className="text-xs text-ink-muted mt-0.5">Welcome to NilaMind</p>
        </div>
      </div>
      <p className="text-xs text-ink-muted leading-relaxed mb-4">
        Your private wellness companion. Everything stays on your device — nothing leaves your phone.
      </p>
      <div className="space-y-2">
        {steps.map((s) => (
          <button
            key={s.label}
            onClick={s.action}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-line/20 bg-fill/50 hover:border-line-strong transition-all active:scale-[0.99] cursor-pointer text-left"
          >
            <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-[#C784B0]/10">
              <s.icon className="w-5 h-5 text-[#C784B0]" aria-hidden="true" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-ink">{s.label}</span>
              <span className="block text-[11px] text-ink-muted">{s.sub}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function YouScreen({ go, onOpenCrisis }: { go: (target: string) => void; onOpenCrisis: () => void }) {
  useLanguage();
  const { timeMode, state } = useUserContext();
  const groups = useMemo(() => {
    const all = buildYouGroups();
    if (state !== "anxious") return all;
    // U6.4 — When anxious: hide dashboard row + entire resources group
    return all
      .map((g) => ({
        ...g,
        rows: g.rows.filter((r) => r.id !== "dashboard"),
      }))
      .filter((g) => g.title !== t("you_group_resources") && g.rows.length > 0);
  }, [state]);
  const [showMoreResources, setShowMoreResources] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const weekSnapshot = getWeekSnapshot();
  const [intention, setIntentionState] = React.useState(getIntention());
  const [showPicker, setShowPicker] = React.useState(false);
  const pickerRef = useFocusTrap<HTMLDivElement>(showPicker, () => setShowPicker(false));
  let streak = { current: 0, totalActiveDays: 0, message: "Welcome" };
  let capacity = "high" as "low" | "medium" | "high";
  try {
    const s = computeCompassionateStreak();
    streak = { current: s.current, totalActiveDays: s.totalActiveDays, message: s.message };
    capacity = getCapacityLevel(getUserState());
  } catch {
    /* ignore */
  }
  const activeDays = getActiveDaysInRange();
  const greet = greeting(timeMode);
  const suggest = contextSuggestion(timeMode, state);
  const isFirstRun = streak.totalActiveDays === 0;
  const isEarlyUser = !isFirstRun && streak.totalActiveDays < 3;
  // U5.5 — Loading skeleton for async data boundaries
  const [youLoading] = useState(false);
  // U5.2 — Storage corruption check
  const dataErrors = useMemo(() => {
    const badKeys: string[] = [];
    for (const key of ["nilamind_checkins", "nilamind_episodes", "nilamind_diary", "nilamind_insights"]) {
      try {
        const raw = secureLocal.getItem(key);
        if (raw) { JSON.parse(raw); }
      } catch {
        badKeys.push(key);
      }
    }
    return badKeys;
  }, []);

  const handleSetIntention = (text: string) => {
    const i = setIntention(text);
    setIntentionState(i);
    setShowPicker(false);
  };

  const handleComplete = () => {
    completeIntention();
    setIntentionState(getIntention());
    setConfettiActive(true);
  };

  const handleClear = () => {
    clearIntention();
    setIntentionState(null);
  };

  const ack = getCompletionAck();
  if (ack) {
    setTimeout(() => markAckShown(), 0);
  }

  return (
    <div className="space-y-5 max-w-md mx-auto animate-fade-in" id="you-hub">
      {/* U5.2 — Error banner for corrupted storage */}
      {dataErrors.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-ink-muted flex items-center gap-2" role="alert">
          <span className="shrink-0">⚠️</span>
          <span>Some data couldn&apos;t load. Pull down to refresh.</span>
        </div>
      )}

      {/* First-run: welcome card with guided first steps */}
      {youLoading ? (
        <SkeletonCard />
      ) : isFirstRun ? (
        <WelcomeCard
          greet={greet}
          onCheckin={() => go("ema_checkin")}
          onIntention={() => setShowPicker(true)}
          onDashboard={() => go("dashboard")}
        />
      ) : (
        /* Profile card — personalized + inline progress */
        <div className="bg-fill/80 rounded-2xl border border-line/30 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C784B0]/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#C784B0]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="editorial text-2xl text-ink">{greet}</h1>
              <p className="text-xs text-ink-muted mt-0.5">{streak.message}</p>
              {/* U9.1 + U9.2 — Privacy + crisis-awareness badges */}
              <p className="text-[10px] text-emerald-500/60 mt-1 flex items-center gap-2">
                <span className="flex items-center gap-1"><span aria-hidden="true">🔒</span> On-device</span>
                <span className="flex items-center gap-1 text-rose-400/60"><span aria-hidden="true">🛡</span> Crisis support always here</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line">
            <StreakConstellation activeDays={activeDays} />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <span className="text-xs text-ink-faint">
              {activeDays.length} day{activeDays.length !== 1 ? "s" : ""} this week
            </span>
            {weekSnapshot && weekSnapshot.checkinDays > 0 && (
              <>
                <span className="text-xs text-ink-faint">·</span>
                <span className="text-xs text-ink-faint">
                  mostly <span className="text-ink-2 font-medium capitalize">{weekSnapshot.topEmotion || "checking in"}</span>
                </span>
              </>
            )}
          </div>
          {capacity === "low" && (
            <p className="text-xs text-ink-faint mt-2 text-center italic">
              Today might feel heavy — that's okay. Just being here is enough.
            </p>
          )}
        </div>
      )}

      {/* Contextual suggestion strip — shown after the first check-in, not on first run */}
      {!isFirstRun && suggest && (
        <button
          onClick={() => go(suggest.target)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#C784B0]/8 border border-[#C784B0]/20 text-sm text-ink-2 hover:bg-[#C784B0]/15 transition-colors cursor-pointer min-h-[44px] focus-ring"
        >
          <Heart className="w-4 h-4 text-[#C784B0] shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">{suggest.hint}</span>
          <span className="text-xs font-medium text-[#C784B0] shrink-0">{suggest.label} →</span>
        </button>
      )}

      {/* Weekly intention — gentle micro-commitment */}
      {ack && (
        <div className="bg-fill/80 rounded-2xl border border-line/30 shadow-sm p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs text-ink-2 leading-relaxed">{ack}</p>
          </div>
        </div>
      )}
      {intention && !intention.completed && (
        <div className="bg-fill/80 rounded-2xl border border-line/30 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-muted">This week's intention</p>
              <p className="text-sm text-ink-2 font-medium mt-0.5">{intention.text}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleComplete}
                  className="px-4 min-h-[44px] inline-flex items-center rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Mark done
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 min-h-[44px] inline-flex items-center rounded-lg hover:bg-fill/50 text-ink-faint text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {!isFirstRun && (!intention || intention.completed) && !ack && (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full bg-fill/80 hover:bg-fill p-4 rounded-2xl border border-line/30 shadow-sm transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
        >
          <span className="w-10 h-10 rounded-full bg-[#C784B0]/10 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-[#C784B0]" aria-hidden="true" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-ink">Set a gentle intention</span>
            <span className="block text-[11px] text-ink-muted">One small thing you'd like to try this week</span>
          </span>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" />
        </button>
      )}

      {/* Intention picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowPicker(false)}>
          <div
            ref={pickerRef}
            tabIndex={-1}
            className="w-full bg-page rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto outline-none"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="intention-picker-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="intention-picker-title" className="text-lg font-semibold text-ink">Set an intention</h2>
              <button onClick={() => setShowPicker(false)} aria-label="Close" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-muted hover:text-ink-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-ink-muted mb-4">Pick one, or write your own. No pressure — just a gentle nudge.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {INTENTION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { handleSetIntention(opt); }}
                  className="w-full text-left bg-fill/80 border border-line/20 hover:border-line-strong p-3 rounded-xl transition-all cursor-pointer"
                >
                  <span className="text-sm text-ink-2">{opt}</span>
                </button>
              ))}
              <div className="pt-2 border-t border-line">
                <input
                  type="text"
                  placeholder="Or write your own…"
                  className="w-full bg-fill/80 border border-line/20 rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-[#C784B0]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      handleSetIntention(e.currentTarget.value.trim());
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Early-user nudge — habit-building prompt for < 3 check-in days */}
      {isEarlyUser && (
        <div className="bg-[#C784B0]/8 border border-[#C784B0]/20 rounded-2xl p-4">
          <p className="text-xs text-ink-muted mb-3">Building a habit? Try another:</p>
          <div className="flex gap-2">
            <button
              onClick={() => go("ema_checkin")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-fill/60 border border-line/20 hover:border-line-strong text-xs font-medium text-ink-2 transition-all cursor-pointer min-h-[44px]"
            >
              <Heart className="w-3.5 h-3.5" aria-hidden="true" />
              Check-in
            </button>
            <button
              onClick={() => go("diary")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-fill/60 border border-line/20 hover:border-line-strong text-xs font-medium text-ink-2 transition-all cursor-pointer min-h-[44px]"
            >
              <Wind className="w-3.5 h-3.5" aria-hidden="true" />
              Diary
            </button>
          </div>
        </div>
      )}

      {groups.map((g) => {
        const visible = showMoreResources ? g.rows : g.rows.filter((r) => !r.more);
        if (visible.length === 0) return null;
        return (
          <section key={g.title} className="space-y-2">
            <div className="flex items-center gap-2 pl-3 border-l-2 border-[#C784B0] py-0.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{g.title}</h2>
            </div>
            <div className="space-y-2">
              {visible.map((r, ri) => (
                <button
                  key={r.id}
                  onClick={() => go(r.id)}
                  id={`you-${r.id}`}
                  className={`w-full flex items-center gap-3 transition-all active:scale-[0.99] cursor-pointer text-left focus-ring ${
                    r.more
                      ? "bg-fill/50 px-3.5 py-3 rounded-xl border border-line/30 hover:border-line-strong"
                      : "bg-fill/50 px-4 py-3 rounded-2xl border border-line/20 hover:border-line-strong"
                  }`}
                >
                  <span className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-xl ${
                    r.more ? "" : "bg-fill/50"
                  }`}>
                    <r.Icon className={r.more ? "w-4 h-4" : "w-5 h-5"} aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block font-semibold text-ink ${r.more ? "text-xs" : "text-sm"}`}>{r.label}</span>
                    <span className={`block text-ink-muted ${r.more ? "text-[11px]" : "text-[11px]"}`}>{r.sub}</span>
                    {"help" in r && r.help && (
                      <span className="block text-[10px] text-ink-faint mt-0.5 leading-tight">{r.help}</span>
                    )}
                  </span>
                  <ChevronRight className="shrink-0 w-4 h-4 text-ink-faint" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {groups.some((g) => g.rows.some((r) => r.more)) && (
        <button
          onClick={() => setShowMoreResources(!showMoreResources)}
          aria-expanded={showMoreResources}
          className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-fill/30 border border-dashed border-line/50 hover:border-line-strong text-ink-muted hover:text-ink text-xs font-medium transition-all cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400/70" aria-hidden="true" />
          {showMoreResources ? "Show fewer resources" : `${groups.flatMap((g) => g.rows).filter((r) => r.more).length} more resources`}
          <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${showMoreResources ? "rotate-90" : ""}`} aria-hidden="true" />
        </button>
      )}

      <p className="text-[11px] text-ink-faint text-center leading-relaxed px-4">
        NilaMind is a support alongside — not a substitute for — professional care.
      </p>

      <ConfettiBurst
        active={confettiActive}
        onComplete={() => setConfettiActive(false)}
        duration={1800}
        count={24}
      />

      {/* Crisis button — bottom thumb zone, always reachable */}
      <div className="flex justify-center pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        <CrisisHeaderButton onClick={onOpenCrisis} />
      </div>
    </div>
  );
}
