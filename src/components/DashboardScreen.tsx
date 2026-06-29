import React, { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Flame, TrendingUp as TrendUpIcon, TrendingDown, Minus, Activity, MessageSquare,
  CalendarCheck, ClipboardCheck, Database, Sparkles, ShieldAlert, Clock, BrainCircuit,
  Loader2, Tag,
} from "lucide-react";
import Markdown from "react-markdown";
import { loadMoodHistory } from "../services/moodHistory";
import { loadAssessments, latestFor, INSTRUMENTS, type InstrumentId } from "../services/assessments";
import { assessmentInsights } from "../services/patternInsights";
import { computeStreak } from "../services/streaks";
import { nilaStats } from "../services/nilaSessions";
import { secureLocal } from "../services/secureLocal";
import { runDeepAssessment as runDeepAssessmentRequest } from "../services/coachAssist";
import CrisisCard from "./CrisisCard";
import { stripProvenance } from "../services/emotionParse";
import {
  emotionDistribution, derivedObservations, episodePatterns, quickNoteTags,
  moodTrend, contextTrend,
} from "../services/dashboardInsights";
import type { CheckInEntry, DiaryCardEntry, EpisodeRecord } from "../types";

const DAY = 86400000;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function readArr<T>(key: string): T[] {
  try {
    const raw = secureLocal.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// The USER's own private analytics. Local sections never leave the device. The single off-device
// feature — Nila's Deep Evaluation — is user-initiated and explicitly disclosed.
export default function DashboardScreen({ onManageData, onOpenConsole }: { onManageData?: () => void; onOpenConsole?: () => void }) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("30d");
  const [chartTab, setChartTab] = useState<"emotion" | "context">("emotion");
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<string | null>(null);
  const [assessmentCrisis, setAssessmentCrisis] = useState(false);

  const data = useMemo(() => {
    const mood = loadMoodHistory().sort((a, b) => a.date.localeCompare(b.date));
    const assessments = loadAssessments();
    const streak = computeStreak();
    const nila = nilaStats();

    const checkins = readArr<CheckInEntry>("nilamind_checkins");
    let diaryEntries: DiaryCardEntry[] = [];
    try {
      const raw = secureLocal.getItem("nilamind_diary");
      if (raw) diaryEntries = Object.values(JSON.parse(raw) as Record<string, DiaryCardEntry>);
    } catch { /* ignore */ }
    const episodes = readArr<EpisodeRecord>("nilamind_episodes");

    // This-week vs last-week distress (unchanged)
    const today = new Date();
    const wk = (start: number, end: number) =>
      mood.filter((m) => {
        const t = new Date(m.date + "T00:00:00").getTime();
        const lo = today.getTime() - end * DAY, hi = today.getTime() - start * DAY;
        return t >= lo && t < hi && m.intensity != null;
      }).map((m) => m.intensity as number);
    const thisWk = wk(0, 7), lastWk = wk(7, 14);
    const thisAvg = avg(thisWk), lastAvg = avg(lastWk);

    const activeSet = new Set(mood.filter((m) => m.intensity != null || m.shame != null).map((m) => m.date));
    let freq14 = 0;
    for (let i = 0; i < 14; i++) if (activeSet.has(ymd(new Date(today.getTime() - i * DAY)))) freq14++;

    const trajectories = assessmentInsights(assessments, mood);

    return { mood, streak, nila, thisAvg, lastAvg, freq14, assessments, trajectories, checkins, diaryEntries, episodes };
  }, []);

  const { mood, streak, nila, thisAvg, lastAvg, freq14, assessments, trajectories, checkins, diaryEntries, episodes } = data;

  const emoBars = useMemo(() => emotionDistribution(checkins, stripProvenance), [checkins]);
  const observations = useMemo(() => derivedObservations(checkins, diaryEntries), [checkins, diaryEntries]);
  const epPatterns = useMemo(() => episodePatterns(episodes), [episodes]);
  const topTags = useMemo(() => quickNoteTags(diaryEntries), [diaryEntries]);
  const emotionTrend = useMemo(() => moodTrend(mood, timeRange), [mood, timeRange]);
  const ctxTrend = useMemo(() => contextTrend(mood, timeRange), [mood, timeRange]);
  const trendLength = chartTab === "emotion" ? emotionTrend.length : ctxTrend.length;

  const moodSummary = (() => {
    if (thisAvg == null) return "No check-ins yet this week — even a one-tap mood helps your trends grow.";
    const base = `This week your distress averaged ${r1(thisAvg)}/10`;
    if (lastAvg == null) return `${base}. Keep logging to compare week to week.`;
    const delta = thisAvg - lastAvg;
    if (Math.abs(delta) < 0.5) return `${base} — about the same as last week.`;
    return delta < 0
      ? `${base} — down ${r1(Math.abs(delta))} from last week. That's a real improvement. 💙`
      : `${base} — up ${r1(delta)} from last week. Be gentle with yourself; harder stretches happen.`;
  })();

  const runDeepAssessment = async () => {
    setIsAssessing(true);
    setAssessmentResult(null);
    setAssessmentCrisis(false);
    try {
      // §9-gated: the replayed logs include stored free text (diary notes, episode triggers); a past
      // crisis disclosure in them blocks the model call (see coachAssist.ts).
      const result = await runDeepAssessmentRequest({
        checkins: checkins.slice(-20),
        diaryEntries: diaryEntries.slice(-10),
        episodes: episodes.slice(-5),
      });
      if (result.crisis === false) {
        setAssessmentResult(result.reply);
      } else {
        setAssessmentCrisis(true);
      }
    } catch {
      setAssessmentResult("I couldn't reach Nila just now — your data is safe. Try again in a moment.");
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="dashboard-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" /> Your Dashboard
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">Your local sections stay only on your device. A picture of how you're doing over time.</p>
      </header>

      {/* This-week summary */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
        <div className="text-[10px] uppercase font-mono tracking-widest text-blue-400 mb-1">This week</div>
        <p className="text-sm text-slate-200 leading-relaxed">{moodSummary}</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Flame className="w-4 h-4 text-amber-400" />} value={String(streak.current)} label="day streak" />
        <Stat icon={<CalendarCheck className="w-4 h-4 text-emerald-400" />} value={`${freq14}/14`} label="days logged" />
        <Stat icon={<MessageSquare className="w-4 h-4 text-purple-400" />} value={String(nila.last7)} label="Nila chats (7d)" />
      </div>
      {streak.longest > 0 && (
        <p className="text-[11px] text-slate-500 -mt-2 text-center">Longest streak: {streak.longest} days · {streak.totalActiveDays} active days all-time</p>
      )}

      {/* ONE trend chart (7D/30D + Emotion/Context), fed by loadMoodHistory() */}
      {trendLength >= 2 ? (
        <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5"><TrendUpIcon className="w-3.5 h-3.5" /> Trend</h3>
              <div className="flex bg-page border border-slate-800 rounded-lg overflow-hidden p-0.5">
                {(["7d", "30d"] as const).map((r) => (
                  <button key={r} onClick={() => setTimeRange(r)}
                    className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${timeRange === r ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex bg-page border border-slate-800 rounded-lg overflow-hidden p-0.5 self-start">
              <button onClick={() => setChartTab("emotion")}
                className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${chartTab === "emotion" ? "bg-purple-500/20 text-purple-400" : "text-slate-500 hover:text-slate-300"}`}>Emotion</button>
              <button onClick={() => setChartTab("context")}
                className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${chartTab === "context" ? "bg-blue-500/20 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}>Context</button>
            </div>
          </div>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === "emotion" ? (
                <LineChart data={emotionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                  <XAxis dataKey="date" stroke="#948A7E" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#948A7E" fontSize={10} domain={[1, 10]} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px" }} labelStyle={{ color: "#ECE5DA" }} itemStyle={{ color: "#9479B0" }} />
                  <Line type="monotone" dataKey="intensity" name="Intensity" stroke="#9479B0" strokeWidth={3} activeDot={{ r: 6, fill: "#D8B4FE", stroke: "#9479B0" }} dot={{ r: 4, fill: "#211C17" }} />
                </LineChart>
              ) : (
                <LineChart data={ctxTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                  <XAxis dataKey="date" stroke="#948A7E" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#948A7E" fontSize={10} domain={[0, 14]} allowDecimals={false} tickLine={false} axisLine={false} orientation="left" />
                  <YAxis yAxisId="right" stroke="#948A7E" fontSize={10} domain={[1, 10]} allowDecimals={false} tickLine={false} axisLine={false} orientation="right" />
                  <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "#ECE5DA" }} />
                  <Legend wrapperStyle={{ fontSize: "10px", color: "#948A7E" }} verticalAlign="top" height={36} />
                  <Line yAxisId="left" type="monotone" dataKey="sleepHours" name="Sleep (hrs)" stroke="#46735C" strokeWidth={3} dot={{ r: 3, fill: "#211C17" }} />
                  <Line yAxisId="right" type="monotone" dataKey="social" name="Social Connect" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: "#211C17" }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-600">{chartTab === "emotion" ? "Lower is calmer. Per-day average of your check-ins." : "Sleep hours and felt-connection, per day."}</p>
        </div>
      ) : (
        <EmptyCard text="Your trend will appear here after a couple of check-ins." />
      )}

      {/* Emotion distribution (suffix-stripped counts) */}
      {emoBars.length > 0 && (
        <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Emotion log frequency</h3>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emoBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                <XAxis dataKey="name" stroke="#948A7E" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#948A7E" fontSize={9} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px" }} itemStyle={{ color: "#5AA483" }} />
                <Bar dataKey="value" fill="#5AA483" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Validated assessments (unchanged Dashboard section) */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Validated check-ins</div>
        {(["PHQ-9", "GAD-7"] as InstrumentId[]).some((id) => latestFor(id, assessments)) ? (
          (["PHQ-9", "GAD-7"] as InstrumentId[]).map((id) => {
            const last = latestFor(id, assessments);
            if (!last) return null;
            const inst = INSTRUMENTS[id];
            const traj = trajectories.find((t) => t.id === `assessment-${id}`);
            const dirIcon = traj?.direction === "protective" ? <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> : traj?.direction === "risk" ? <TrendUpIcon className="w-3.5 h-3.5 text-amber-400" /> : <Minus className="w-3.5 h-3.5 text-slate-500" />;
            return (
              <div key={id} className="bg-card border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">{inst.measures.split(" ")[0]} · {id}</span>
                  <span className="text-xs text-slate-300">{last.total}/{inst.maxScore} <span className="text-slate-500">{last.severity}</span></span>
                </div>
                {traj && <p className="text-[11px] text-slate-400 mt-1 flex items-start gap-1">{dirIcon}<span>{traj.finding.split(" — ").slice(1).join(" — ") || traj.finding}</span></p>}
              </div>
            );
          })
        ) : (
          <EmptyCard text="Take a PHQ-9 or GAD-7 (Validated Check-In) to track depression/anxiety over time." />
        )}
      </div>

      {/* Derived observations */}
      {observations.length > 0 && (
        <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Patterns from your data
          </h3>
          <ul className="space-y-3">
            {observations.map((ins, i) => (
              <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2 bg-page p-3 rounded-xl border border-slate-850">
                <span className="text-emerald-400 font-bold">●</span><span>{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick-note tag cloud */}
      {topTags.length > 0 && (
        <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-400" /> Frequent quick-note subjects
          </h3>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <div key={tag} className="flex items-center bg-page border border-blue-900/50 rounded-lg px-2.5 py-1.5 overflow-hidden">
                <span className="text-xs font-medium text-blue-300 mr-2">{tag}</span>
                <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 rounded">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Episode analytics (real stats only — NO fabricated correlations) */}
      {epPatterns && (
        <div className="bg-card border-y border-r border-slate-800 border-l-4 border-l-amber-500 p-5 rounded-r-2xl space-y-4">
          <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> Episode insights
          </h3>
          <div className="grid grid-cols-2 gap-3" id="episode-stat-cards">
            <div className="bg-page p-3 rounded-xl border border-slate-850 text-center space-y-1">
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500">Peak spikes</span>
              <p className="text-2xl font-bold text-amber-500 capitalize flex items-center justify-center gap-1 font-mono">
                <Clock className="w-4 h-4 text-slate-500" /> {epPatterns.mostCommonTime || "Night"}
              </p>
            </div>
            <div className="bg-page p-3 rounded-xl border border-slate-850 text-center space-y-1">
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500">Avg duration</span>
              <p className="text-2xl font-bold text-purple-400 font-mono">{epPatterns.avgDuration} min</p>
            </div>
            <div className="bg-page col-span-2 p-3.5 rounded-xl border border-slate-850 text-center space-y-1">
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500">Avg intensity drop per episode</span>
              <p className="text-base text-emerald-400 font-extrabold font-sans">{epPatterns.avgDrop} points</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Nila (unchanged Dashboard section) */}
      {nila.recent.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Recent Nila sessions</div>
          {nila.recent.slice(0, 5).map((t) => (
            <div key={t.id} className="bg-card border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2">
              <span className="text-[11px] text-slate-300 italic min-w-0">"{t.snippet}{t.snippet.length >= 80 ? "…" : ""}"</span>
              <span className="text-[10px] text-slate-600 shrink-0">{t.surface === "episode" ? "episode" : "coach"} · {t.date.slice(5)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Nila's Deep Evaluation — the ONLY off-device call, user-initiated + disclosed */}
      <div className="bg-card border border-purple-500/20 p-5 rounded-2xl space-y-4 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1.5 mb-1">
            <BrainCircuit className="w-4 h-4" /> Nila's Deep Evaluation ✨
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This sends your recent check-ins, diary cards (including any notes you've written), and episode records to Nila's AI for a deeper read — the only feature that sends anything off your device. Everything else stays on your device.
          </p>
        </div>
        <button onClick={runDeepAssessment} disabled={isAssessing}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isAssessing ? (<><Loader2 className="w-4 h-4 animate-spin" /> Nila is evaluating patterns...</>) : ("Ask Nila for Deep Evaluation ✨")}
        </button>
        {assessmentCrisis && (
          <CrisisCard id="dashboard-crisis" className="mt-4" heading="Something in your recent notes matters more than this evaluation" />
        )}
        {assessmentResult && !assessmentCrisis && (
          <div className="mt-4 p-4 bg-page border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-300 leading-relaxed space-y-2 markdown-body font-sans">
              <Markdown>{assessmentResult}</Markdown>
            </div>
          </div>
        )}
      </div>

      {onOpenConsole && (
        <button onClick={onOpenConsole} id="dashboard-open-console" className="w-full bg-card border border-purple-500/20 hover:bg-raised text-purple-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
          <BrainCircuit className="w-3.5 h-3.5" /> Agent Console — everything at a glance
        </button>
      )}
      {onManageData && (
        <button onClick={onManageData} id="dashboard-manage-data" className="w-full bg-card border border-slate-800 hover:bg-raised text-slate-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
          <Database className="w-3.5 h-3.5" /> Manage, export or delete your data
        </button>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-card border border-slate-800 rounded-2xl py-3 px-2 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-black text-slate-100 font-mono leading-none">{value}</div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="bg-card border border-slate-800 rounded-2xl p-4 text-center text-[11px] text-slate-500 leading-relaxed">{text}</div>;
}
