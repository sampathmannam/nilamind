/**
 * TodayWidgets — glanceable, glance-first widgets for the Today tab.
 * Each widget is self-contained, accessible, and animated.
 * Loaded lazily by TodayScreen (dynamic import) so its service deps stay out of the critical path.
 */

import { useEffect, useState } from "react";
import {
  Moon, Sun, Activity, Target, ChevronRight,
  Zap, Heart, Brain, Wind, Clock, TrendingUp
} from "lucide-react";
import { loadCheckins } from "../services/checkin";
import { loadInsights } from "../services/nilaInsights";
import { hasRhythmToday, loadTodayAnchors } from "../services/socialRhythm";
import { getActiveProgress } from "../services/protocolProgress";
import { getProtocol } from "../services/protocols";
import { computeCompassionateStreak } from "../services/streaks";
import { getTopAssessmentPrompt } from "../services/assessmentPrompts";
import { loadAssessments, INSTRUMENTS } from "../services/assessments";
import { isWellbeingDue, wellbeingCadence } from "../services/wellbeingTrack";
import { getSleepLog } from "../services/sleepLog";
import { selfReportedSleepNights } from "../services/sleepInsight";
import { cardStyle, raisedStyle, tapTargetStyle } from "../design";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Same presentation map as TodayScreen's hero mood — kept local so TodayWidgets never
// imports from its parent (that would create a module cycle).
const MOOD_EMOJI: Record<string, string> = {
  calm: "😌", good: "😊", okay: "😐", fine: "😊", anxious: "😰",
  low: "😢", sad: "😢", angry: "😤", overwhelmed: "😩", stressed: "😫",
};

const stripProvenance = (emotion: string | undefined): string =>
  (emotion || "").replace(/\s*\(Nila\)/g, "").toLowerCase().trim();

interface CheckinPoint {
  label: string;
  emotion: string;
  intensity: number;
}

function loadRecentCheckins(): CheckinPoint[] {
  try {
    return loadCheckins()
      .filter((c) => typeof c?.intensity === "number" && c.date)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(-7)
      .map((c) => ({
        label: WEEK_DAYS[new Date(c.date + "T00:00:00").getDay()],
        emotion: stripProvenance(c.emotion),
        intensity: c.intensity,
      }));
  } catch {
    return [];
  }
}

// ── Sleep Widget ──────────────────────────────────────────────────────────────────────────────
export function SleepWidget({ className = "" }) {
  const [sleep, setSleep] = useState<{ hours: number; bedTime?: string; wakeTime?: string } | null>(null);

  useEffect(() => {
    try {
      const log = getSleepLog();
      const latest = log[log.length - 1];
      if (latest) {
        setSleep({ hours: latest.hours, bedTime: latest.bedTime, wakeTime: latest.wakeTime });
        return;
      }
      const nights = selfReportedSleepNights();
      const last = nights[nights.length - 1];
      if (last) setSleep({ hours: last.hours });
      else setSleep(null);
    } catch {
      setSleep(null);
    }
  }, []);

  if (!sleep) {
    return (
      <button
        className={`${cardStyle} ${className} w-full text-left animate-fade-up`}
        onClick={() => {}}
        aria-label="Sleep tracking — log last night's sleep to see it here"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Moon className="w-5 h-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">Sleep</p>
            <p className="text-[11px] text-ink-muted mt-0.5">Log last night's sleep to track it</p>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
        </div>
      </button>
    );
  }

  const quality = Math.min(100, Math.round((sleep.hours / 9) * 100));
  const qualityLabel = sleep.hours >= 7.5 ? "Great" : sleep.hours >= 6 ? "Fair" : "Low";
  const qualityColor = sleep.hours >= 7.5 ? "text-emerald-400" : sleep.hours >= 6 ? "text-amber-400" : "text-rose-400";

  return (
    <button className={`${cardStyle} ${className} w-full text-left hover:brightness-105 transition-colors active:scale-[0.99]`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Moon className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">Sleep</p>
            <span className={`text-[11px] font-medium ${qualityColor}`}>{qualityLabel}</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-2">
            <span>{sleep.hours.toFixed(1)}h</span>
            {sleep.bedTime && sleep.wakeTime && (
              <>
                <span aria-hidden="true">·</span>
                <span>{sleep.bedTime} – {sleep.wakeTime}</span>
              </>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-ink tabular-nums">{sleep.hours.toFixed(1)}</p>
          <p className="text-[10px] text-ink-muted">hours</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-line rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${quality}%`, backgroundColor: `var(--color-${sleep.hours >= 7.5 ? 'success' : sleep.hours >= 6 ? 'warn' : 'danger'})` }}
        />
      </div>
    </button>
  );
}

// ── Mood Trend Widget ──────────────────────────────────────────────────────────────────────────
export function MoodTrendWidget({ className = "" }) {
  const [moodData, setMoodData] = useState<CheckinPoint[]>([]);

  useEffect(() => {
    setMoodData(loadRecentCheckins());
  }, []);

  if (moodData.length < 2) {
    return (
      <button className={`${cardStyle} ${className} w-full text-left animate-fade-up`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Heart className="w-5 h-5 text-purple-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">Mood Trend</p>
            <p className="text-[11px] text-ink-muted mt-0.5">Check in 2+ days to see your trend</p>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
        </div>
      </button>
    );
  }

  const avgIntensity = moodData.reduce((sum, d) => sum + d.intensity, 0) / moodData.length;
  const latest = moodData[moodData.length - 1];

  return (
    <button className={`${cardStyle} ${className} w-full text-left hover:brightness-105 transition-colors active:scale-[0.99]`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center">
          <Heart className="w-5 h-5 text-purple-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">Mood Trend</p>
            <span className="text-[11px] text-ink-muted">{moodData.length} days</span>
          </div>
          <div className="mt-2 h-16 flex items-end justify-between gap-1" role="img" aria-label={`Mood trend over ${moodData.length} days, average intensity ${avgIntensity.toFixed(1)}`}>
            {moodData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ animationDelay: `${i * 40}ms` }}>
                <div
                  className="w-full rounded-t transition-all duration-300 ease-out"
                  style={{
                    height: `${Math.max(4, (d.intensity / 10) * 100)}%`,
                    backgroundColor: d.intensity >= 7 ? "var(--color-warn)" :
                                     d.intensity >= 4 ? "var(--color-accent)" : "var(--color-success)",
                  }}
                />
                <span className="text-[9px] text-ink-muted font-mono">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-ink tabular-nums">{avgIntensity.toFixed(1)}</p>
          <p className="text-[10px] text-ink-muted">avg</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-muted flex items-center gap-1">
        <span className="font-medium">{latest.emotion || latest.label}</span>
        <span aria-hidden="true">{MOOD_EMOJI[latest.emotion] || "😌"}</span>
        <span aria-hidden="true">·</span>
        <span>{latest.intensity}/10</span>
      </p>
    </button>
  );
}

// ── Next Protocol Step Widget ──────────────────────────────────────────────────────────────────
export function NextProtocolWidget({ className = "" }) {
  const [activeProtocol, setActiveProtocol] = useState<{ id: string; title: string; step: number; total: number; nextPrompt: string } | null>(null);

  useEffect(() => {
    try {
      const progress = getActiveProgress();
      if (progress) {
        const proto = getProtocol(progress.protocol.id);
        if (proto) {
          setActiveProtocol({
            id: progress.protocol.id,
            title: proto.title,
            step: progress.stepIndex + 1,
            total: progress.total,
            nextPrompt: progress.step.prompt,
          });
        }
      } else {
        setActiveProtocol(null);
      }
    } catch { setActiveProtocol(null); }
  }, []);

  if (!activeProtocol) {
    return (
      <button className={`${cardStyle} ${className} w-full text-left animate-fade-up`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Target className="w-5 h-5 text-amber-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">Guided Programs</p>
            <p className="text-[11px] text-ink-muted mt-0.5">No active program — start one in Guided Programs</p>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
        </div>
      </button>
    );
  }

  return (
    <button className={`${cardStyle} ${className} w-full text-left hover:brightness-105 transition-colors active:scale-[0.99]`}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <Target className="w-5 h-5 text-amber-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">{activeProtocol.title}</p>
            <span className="text-[10px] font-medium text-ink-muted px-2 py-0.5 rounded-full bg-fill">
              Step {activeProtocol.step} of {activeProtocol.total}
            </span>
          </div>
          <p className="text-[12px] text-ink-muted mt-1 line-clamp-2">{activeProtocol.nextPrompt}</p>
          <div className="mt-2 h-1.5 bg-line rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${(activeProtocol.step / activeProtocol.total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Quick Actions Widget ────────────────────────────────────────────────────────────────────────
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  badge?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "ema_checkin", label: "Check In", icon: <Heart className="w-5 h-5" />, color: "text-rose-400", route: "ema_checkin" },
  { id: "grounding", label: "Grounding", icon: <Wind className="w-5 h-5" />, color: "text-emerald-400", route: "grounding" },
  { id: "breathing", label: "Breathing", icon: <Zap className="w-5 h-5" />, color: "text-blue-400", route: "breathing" },
  { id: "wind_down", label: "Wind Down", icon: <Moon className="w-5 h-5" />, color: "text-indigo-400", route: "wind_down" },
];

export function QuickActionsWidget({ onAction, className = "" }: { onAction: (id: string) => void; className?: string }) {
  return (
    <div className={`${cardStyle} ${className} w-full animate-fade-up`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-ink">Quick Actions</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5" role="list">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={action.id}
            onClick={() => onAction(action.route)}
            className={`relative flex flex-col items-center gap-2 p-3.5 rounded-xl bg-fill border border-line hover:border-accent/30 transition-all cursor-pointer active:scale-[0.98] focus-ring ${tapTargetStyle} animate-fade-up`}
            style={{ animationDelay: `${i * 40}ms` }}
            role="listitem"
            aria-label={action.label}
          >
            <span className={`${action.color}`}>{action.icon}</span>
            <span className="text-[11px] font-medium text-ink text-center leading-tight">{action.label}</span>
            {action.badge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger flex items-center justify-center text-[9px] font-bold text-white">
                {action.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Weekly Insight Widget ───────────────────────────────────────────────────────────────────────
export function WeeklyInsightWidget({ className = "" }) {
  const [insight, setInsight] = useState<{ text: string; kind: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const insights = loadInsights();
      if (insights.length > 0) {
        const idx = Math.floor(Math.random() * insights.length);
        setInsight({ text: insights[idx].text, kind: insights[idx].kind });
      }
    } catch { /* no insights */ }
  }, []);

  if (!insight) {
    return (
      <button className={`${cardStyle} ${className} w-full text-left animate-fade-up`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">Weekly Insight</p>
            <p className="text-[11px] text-ink-muted mt-0.5">Complete more check-ins to unlock insights</p>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`${cardStyle} ${className} w-full text-left hover:brightness-105 transition-colors active:scale-[0.99]`}
      aria-expanded={expanded}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Brain className="w-5 h-5 text-purple-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Weekly Insight</p>
          <p className={`text-[12px] text-ink-2 leading-relaxed mt-1 ${expanded ? "" : "line-clamp-2"}`}>
            {insight.text}
          </p>
          {!expanded && <p className="text-[10px] text-ink-muted mt-1">Tap to expand</p>}
        </div>
        <ChevronRight className={`w-5 h-5 text-ink-faint shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
      </div>
    </button>
  );
}

// ── Social Rhythm Widget ────────────────────────────────────────────────────────────────────────
export function RhythmWidget({ className = "" }) {
  const [rhythm, setRhythm] = useState<{ wake?: string; bed?: string; anchors: number } | null>(null);

  useEffect(() => {
    try {
      if (hasRhythmToday()) {
        const anchors = loadTodayAnchors();
        if (anchors) {
          setRhythm({
            wake: anchors.wake,
            bed: anchors.bed,
            anchors: Object.keys(anchors).filter(k => k !== "wake" && k !== "bed").length,
          });
        }
      } else {
        setRhythm({ anchors: 0 });
      }
    } catch { setRhythm(null); }
  }, []);

  if (!rhythm) return null;

  if (!rhythm.wake && !rhythm.bed) {
    return (
      <button className={`${cardStyle} ${className} w-full text-left animate-fade-up`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">Daily Rhythm</p>
            <p className="text-[11px] text-ink-muted mt-0.5">Log wake, meals & bed to anchor your day</p>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
        </div>
      </button>
    );
  }

  return (
    <button className={`${cardStyle} ${className} w-full text-left hover:brightness-105 transition-colors active:scale-[0.99]`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Clock className="w-5 h-5 text-blue-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Daily Rhythm</p>
          <div className="flex items-center gap-3 mt-1 text-[12px]">
            {rhythm.wake && (
              <span className="flex items-center gap-1 text-ink-2 bg-fill px-2 py-0.5 rounded-lg">
                <Sun className="w-3 h-3 text-amber-400" aria-hidden="true" />
                {rhythm.wake}
              </span>
            )}
            {rhythm.bed && (
              <span className="flex items-center gap-1 text-ink-2 bg-fill px-2 py-0.5 rounded-lg">
                <Moon className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                {rhythm.bed}
              </span>
            )}
            {rhythm.anchors > 0 && (
              <span className="text-ink-muted">+{rhythm.anchors} more</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Streak Widget ───────────────────────────────────────────────────────────────────────────────
export function StreakWidget({ className = "" }) {
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);

  useEffect(() => {
    try {
      const s = computeCompassionateStreak();
      setStreak({ current: s.current, longest: s.longest });
    } catch { setStreak(null); }
  }, []);

  if (!streak || streak.current === 0) return null;

  return (
    <div className={`${raisedStyle} ${className} w-full text-center py-4 animate-fade-up`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-amber-400" aria-hidden="true" />
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Current Streak</span>
      </div>
      <p className="text-4xl font-bold text-ink tabular-nums leading-none">{streak.current}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">day{streak.current !== 1 ? "s" : ""} in a row · best: {streak.longest}</p>
    </div>
  );
}

// ── Upcoming Assessment Widget ──────────────────────────────────────────────────────────────────
export function AssessmentWidget({ className = "" }) {
  const [assessment, setAssessment] = useState<{ instrument: string; measures: string; due: boolean; firstTime: boolean } | null>(null);

  useEffect(() => {
    try {
      const assessments = loadAssessments();
      const wellbeingDue = isWellbeingDue(assessments);
      const prompt = getTopAssessmentPrompt();

      if (wellbeingDue) {
        const cadence = wellbeingCadence(assessments);
        setAssessment({
          instrument: "wellbeing",
          measures: "Wellbeing",
          due: true,
          firstTime: cadence.daysSinceLast === null,
        });
      } else if (prompt) {
        setAssessment({
          instrument: prompt.instrument,
          measures: INSTRUMENTS[prompt.instrument].measures,
          due: prompt.kind !== "contextual",
          firstTime: prompt.firstTime,
        });
      } else {
        setAssessment(null);
      }
    } catch { setAssessment(null); }
  }, []);

  if (!assessment) return null;

  return (
    <button className={`${cardStyle} ${className} w-full text-left hover:brightness-105 transition-colors active:scale-[0.99]`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Activity className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">{assessment.measures} Check</p>
            {assessment.due && (
              <span className="text-[10px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-400/15">Due</span>
            )}
            {assessment.firstTime && !assessment.due && (
              <span className="text-[10px] font-medium text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/15">Baseline</span>
            )}
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {assessment.firstTime ? "Establish your baseline" : assessment.due ? "Time for your regular check" : "Suggested for you"}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
      </div>
    </button>
  );
}

// ── Today Widgets Barrel Export ─────────────────────────────────────────────────────────────────
export const TodayWidgets = {
  Sleep: SleepWidget,
  MoodTrend: MoodTrendWidget,
  NextProtocol: NextProtocolWidget,
  QuickActions: QuickActionsWidget,
  WeeklyInsight: WeeklyInsightWidget,
  Rhythm: RhythmWidget,
  Streak: StreakWidget,
  Assessment: AssessmentWidget,
};
