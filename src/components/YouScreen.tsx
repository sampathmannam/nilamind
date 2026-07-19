import { localDateKey } from "../services/storageUtils";
import React, { useState } from "react";
import { ChevronRight, Sparkles, TrendingUp, Target, CheckCircle, X, Circle, Lightbulb } from "lucide-react";
import CrisisHeaderButton from "./CrisisHeaderButton";
import RatingPromptCard from "./RatingPromptCard";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { buildYouGroups } from "./youRows";
import { useLanguage } from "../services/i18n";
import { computeCompassionateStreak } from "../services/streaks";
import { loadCheckins } from "../services/checkin";
import { getIntention, setIntention, completeIntention, clearIntention, INTENTION_OPTIONS, isIntentionCompleted, getCompletionAck, markAckShown } from "../services/weeklyIntention";
import { getCapacityLevel } from "../services/capacitySignal";
import { getUserState } from "../services/modeEngine";

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

/** A 7-dot constellation showing the last 7 days. Filled dots for active days, empty for missed. */
function StreakConstellation({ activeDays }: { activeDays: string[] }) {
  const dots: React.ReactNode[] = [];
  const today = new Date();
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  // Start from Monday of current week
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
        <Circle
          className={`w-3.5 h-3.5 ${active ? "text-emerald-400 fill-emerald-400/50" : "text-slate-600"}`}
          aria-hidden="true"
        />
        <span className="text-xs font-mono text-slate-600">{dayLabels[i]}</span>
      </div>
    );
  }
  return <div className="flex items-center justify-center gap-2.5 mt-2">{dots}</div>;
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

export default function YouScreen({ go, onOpenCrisis }: { go: (target: string) => void; onOpenCrisis: () => void }) {
  useLanguage();
  const groups = buildYouGroups();
  const [showMoreResources, setShowMoreResources] = useState(false);
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

  const handleSetIntention = (text: string) => {
    const i = setIntention(text);
    setIntentionState(i);
    setShowPicker(false);
  };

  const handleComplete = () => {
    completeIntention();
    setIntentionState(getIntention());
  };

  const handleClear = () => {
    clearIntention();
    setIntentionState(null);
  };

  const ack = getCompletionAck();
  if (ack) {
    // auto-mark shown after a tick
    setTimeout(() => markAckShown(), 0);
  }

  return (
    <div className="space-y-6 max-w-md mx-auto" id="you-hub">
      {/* Profile card — constellation metaphor (Phase 8: forgiving engagement).
          No streak numbers — a visual constellation of the week instead. */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="editorial text-xl text-ink">You</h1>
            <p className="text-xs text-ink-muted mt-0.5">{streak.message}</p>
          </div>
          <CrisisHeaderButton onClick={onOpenCrisis} />
        </div>
        {streak.totalActiveDays > 0 && (
          <>
            <div className="mt-3 pt-3 border-t border-slate-800">
              <StreakConstellation activeDays={activeDays} />
            </div>
              <p className="text-xs text-ink-faint text-center mt-1.5">
              {/* Bug fix: this previously read streak.totalActiveDays, which computeCompassionateStreak
                  (services/streaks.ts) defines as an ALL-TIME count of distinct active dates - so a
                  long-time user saw e.g. "30 days this week" under a 7-dot week. activeDays is already
                  computed above (via getActiveDaysInRange, last 7 days) for the StreakConstellation -
                  reusing it here makes the label match what's actually being counted. */}
              {activeDays.length} day{activeDays.length !== 1 ? "s" : ""} this week
            </p>
          </>
        )}
        {capacity === "low" && (
          <p className="text-xs text-ink-faint mt-2 text-center italic">
            Today might feel heavy — that's okay. Just being here is enough.
          </p>
        )}
      </div>

      {/* Weekly snapshot — visible when the user has check-in data this week */}
      {weekSnapshot && weekSnapshot.checkinDays > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
            <div className="text-xs text-slate-400">
              <span className="text-slate-200 font-semibold">{weekSnapshot.checkinDays} day{weekSnapshot.checkinDays > 1 ? "s" : ""}</span> checked in this week
              {weekSnapshot.topEmotion && (
                <> · mostly <span className="text-slate-200 font-semibold capitalize">{weekSnapshot.topEmotion}</span></>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly intention — gentle micro-commitment */}
      {ack && (
        <div className="glass rounded-2xl p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">{ack}</p>
          </div>
        </div>
      )}
      {intention && !intention.completed && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">This week's intention</p>
              <p className="text-sm text-slate-200 font-medium mt-0.5">{intention.text}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleComplete}
                  className="px-4 min-h-[44px] inline-flex items-center rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Mark done
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 min-h-[44px] inline-flex items-center rounded-lg hover:bg-slate-800/50 text-slate-500 text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {(!intention || intention.completed) && !ack && (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
        >
          <span className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-ink">Set a gentle intention</span>
            <span className="block text-[11px] text-slate-400">One small thing you'd like to try this week</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
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
              <button onClick={() => setShowPicker(false)} aria-label="Close" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Pick one, or write your own. No pressure — just a gentle nudge.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {INTENTION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { handleSetIntention(opt); }}
                  className="w-full text-left glass hover:brightness-125 p-3 rounded-xl transition-all cursor-pointer"
                >
                  <span className="text-sm text-slate-200">{opt}</span>
                </button>
              ))}
              <div className="pt-2 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Or write your own…"
                  className="w-full glass rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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

      {groups.map((g) => {
        const visible = showMoreResources ? g.rows : g.rows.filter((r) => !r.more);
        if (visible.length === 0) return null;
        return (
        <section key={g.title} className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint px-1">{g.title}</h2>
          <div className="space-y-2">
            {visible.map((r) => (
              <button
                key={r.id}
                onClick={() => go(r.id)}
                id={`you-${r.id}`}
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
        );
      })}

      {!showMoreResources && groups.some((g) => g.rows.some((r) => r.more)) && (
        <button
          onClick={() => setShowMoreResources(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-300 text-sm font-medium transition-all cursor-pointer active:scale-[0.99]"
        >
          <Lightbulb className="w-4 h-4 text-amber-400" aria-hidden="true" />
          More resources
        </button>
      )}

      {/* Play-Store rating prompt lives here (moved off the Today home 2026-07-18 design review — the
          MH home should not solicit ratings). Self-gates via shouldPromptRating(). */}
      <RatingPromptCard />

      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-4">
        NilaMind is a support alongside — not a substitute for — professional care.
      </p>
    </div>
  );
}
