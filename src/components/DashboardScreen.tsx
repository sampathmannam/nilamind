import React, { useMemo, useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
  Scatter, ComposedChart,
} from "recharts";
import { loadEmaEntries } from "../services/ema";
import {
  Flame, TrendingUp as TrendUpIcon, TrendingDown, Minus, Activity, MessageSquare,
  CalendarCheck, ClipboardCheck, Database, Sparkles, ShieldAlert, Clock, BrainCircuit,
  Loader2, Tag, Lightbulb, Pill, Moon, Mic, Download, FileText, Clock3,
} from "lucide-react";
import Markdown from "react-markdown";
import { loadMoodHistory } from "../services/moodHistory";
import { t } from "../services/i18n";
import { loadAssessments, latestFor, INSTRUMENTS, type InstrumentId } from "../services/assessments";
import { assessmentInsights, generateInsights, daysOfData, type Insight } from "../services/patternInsights";
import { computeStreak, computeCompassionateStreak } from "../services/streaks";
import { nilaStats } from "../services/nilaSessions";
import { adherenceSummary } from "../services/medicationAdherence";
import { getRecentMetrics, detectMoodSignal } from "../services/typingPatterns";
import { voiceMoodSignal } from "../services/voicePatterns";
import { computeCircadianInsight } from "../services/circadian";
import { computeCircadianFeedback } from "../services/circadianFeedback";
import { computeRhythmRegularity } from "../services/socialRhythm";
import { computeNof1Ranking } from "../services/nOf1";
import { PROTOCOLS } from "../services/protocols";
import { secureLocal } from "../services/secureLocal";
import { runDeepAssessment as runDeepAssessmentRequest } from "../services/coachAssist";
import { generateCsvReport, buildTextReport, generatePdfBlob, saveReport } from "../services/exportReport";
import { computeRetention } from "../services/retentionMetrics";
import { computeUsageSummary } from "../services/usageAnalytics";
import { buildWeeklyReport } from "../services/weeklyReport";
import { isPilotEnrolled, computePilotSummary } from "../services/pilotStudy";
import CrisisCard from "./CrisisCard";
import { stripProvenance } from "../services/emotionParse";
import {
  emotionDistribution, derivedObservations, episodePatterns, quickNoteTags,
  moodTrend, contextTrend,
} from "../services/dashboardInsights";
import { getRecentSnapshots } from "../db/behaviourDb";
import type { CheckInEntry, DiaryCardEntry, EpisodeRecord } from "../types";
import { DAY_MS } from "../services/storageUtils";

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

// The USER's own private analytics. Local sections never leave the device.
export default function DashboardScreen({ onManageData }: { onManageData?: () => void }) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("30d");
  const [chartTab, setChartTab] = useState<"emotion" | "context">("emotion");
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<string | null>(null);
  const [assessmentCrisis, setAssessmentCrisis] = useState(false);
  const [behaviourInsights, setBehaviourInsights] = useState<Insight[]>([]);
  const [behaviourDays, setBehaviourDays] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  const data = useMemo(() => {
    const mood = loadMoodHistory().sort((a, b) => a.date.localeCompare(b.date));
    const assessments = loadAssessments();
    const streak = computeStreak();
    const compassionateStreak = computeCompassionateStreak();
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
        const lo = today.getTime() - end * DAY_MS, hi = today.getTime() - start * DAY_MS;
        return t >= lo && t < hi && m.intensity != null;
      }).map((m) => m.intensity as number);
    const thisWk = wk(0, 7), lastWk = wk(7, 14);
    const thisAvg = avg(thisWk), lastAvg = avg(lastWk);

    const activeSet = new Set(mood.filter((m) => m.intensity != null || m.shame != null).map((m) => m.date));
    let freq14 = 0;
    for (let i = 0; i < 14; i++) if (activeSet.has(ymd(new Date(today.getTime() - i * DAY_MS)))) freq14++;

    const trajectories = assessmentInsights(assessments, mood);
    const medSummary = adherenceSummary();
    const circadian = computeCircadianInsight(mood);
    const nOf1 = computeNof1Ranking();
    const usageSummary = computeUsageSummary();
    const rhythmReg = computeRhythmRegularity();
    const circadianFeedback = circadian ? computeCircadianFeedback({
      sleeps: mood.filter((m) => typeof m.sleepHours === "number" && m.sleepHours > 0).map((m) => m.sleepHours as number),
      rhythmVariabilityMin: rhythmReg.overallVariabilityMin,
    }) : null;

    return { mood, streak, compassionateStreak, nila, thisAvg, lastAvg, freq14, assessments, trajectories, checkins, diaryEntries, episodes, medSummary, circadian, nOf1, usageSummary, circadianFeedback, rhythmReg };
  }, []);

  const { mood, streak, compassionateStreak, nila, thisAvg, lastAvg, freq14, assessments, trajectories, checkins, diaryEntries, episodes, medSummary, circadian, nOf1, usageSummary, circadianFeedback, rhythmReg } = data;

  // Load behaviour snapshots async and compute daily-behaviour insights
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snaps = await getRecentSnapshots(30);
        if (cancelled) return;
        setBehaviourInsights(generateInsights(snaps, mood));
        setBehaviourDays(daysOfData(snaps, mood));
      } catch { /* fresh db or no permission */ }
    })();
    return () => { cancelled = true; };
  }, [mood]);

  const emoBars = useMemo(() => emotionDistribution(checkins, stripProvenance), [checkins]);
  const observations = useMemo(() => derivedObservations(checkins, diaryEntries), [checkins, diaryEntries]);
  const typingSignal = useMemo(() => {
    const metrics = getRecentMetrics("chat", 7);
    if (metrics.length < 3) return null;
    const avgSpeed = metrics.reduce((s, m) => s + m.typingSpeed, 0) / metrics.length;
    const avgPauses = metrics.reduce((s, m) => s + m.pauseCount, 0) / metrics.length;
    const combined = {
      ...metrics[metrics.length - 1],
      typingSpeed: avgSpeed,
      pauseCount: avgPauses,
    };
    return detectMoodSignal(combined);
  }, []);
  const voiceSignal = useMemo(() => voiceMoodSignal(), []);
  const epPatterns = useMemo(() => episodePatterns(episodes), [episodes]);
  const topTags = useMemo(() => quickNoteTags(diaryEntries), [diaryEntries]);
  const emotionTrend = useMemo(() => moodTrend(mood, timeRange), [mood, timeRange]);
  const ctxTrend = useMemo(() => contextTrend(mood, timeRange), [mood, timeRange]);
  const emaPoints = useMemo(() => {
    const entries = loadEmaEntries();
    const dateSet = new Set(emotionTrend.map(p => p.date));
    return entries
      .filter(e => dateSet.has(e.date.slice(5)))
      .map(e => ({
        date: e.date.slice(5),
        intensity: Math.round(((e.valence + 3) / 6) * 9) + 1, // map -3..+3 to 1..10 roughly
      }));
  }, [emotionTrend]);
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

  // Monthly narrative — "your month in a word"
  const monthlyNarrative = (() => {
    if (mood.length < 7) return null;
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthMood = mood.filter((m) => new Date(m.date + "T00:00:00") >= monthStart && m.intensity != null);
    if (monthMood.length < 7) return null;
    const intensities = monthMood.map((m) => m.intensity!);
    const avgIntensity = r1(avg(intensities)!);
    const minIntensity = Math.min(...intensities);
    const maxIntensity = Math.max(...intensities);
    
    // Determine the "word" based on average
    let word = "steady";
    if (avgIntensity <= 3) word = "calm";
    else if (avgIntensity <= 5) word = "steady";
    else if (avgIntensity <= 7) word = "choppy";
    else word = "rough";
    
    // Emotion variety
    const checkins = readArr<CheckInEntry>("nilamind_checkins");
    const monthCheckins = checkins.filter((c) => {
      const d = new Date(c.date + "T00:00:00");
      return d >= monthStart && d <= today;
    });
    const emotions: Record<string, number> = {};
    for (const c of monthCheckins) {
      const em = (c.emotion || "").replace(/\s*\(Nila\)/g, "").toLowerCase().trim();
      if (em) emotions[em] = (emotions[em] || 0) + 1;
    }
    let topEmotion = "";
    let topCount = 0;
    for (const [em, count] of Object.entries(emotions)) {
      if (count > topCount) { topCount = count; topEmotion = em; }
    }
    
    const daysLogged = monthCheckins.length;
    const totalDays = today.getDate();
    
    return {
      word,
      avgIntensity,
      minIntensity,
      maxIntensity,
      topEmotion: topEmotion || null,
      daysLogged,
      totalDays,
      checkinCount: monthCheckins.length,
    };
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

  const handleExportCsv = async () => {
    setExportBusy(true);
    setShowExportMenu(false);
    try {
      const csv = generateCsvReport(checkins);
      if (!csv) return;
      await saveReport(csv, "nilamind-report.csv", "text/csv");
    } finally {
      setExportBusy(false);
    }
  };

  const handleExportPdf = async () => {
    setExportBusy(true);
    setShowExportMenu(false);
    try {
      const text = buildTextReport(checkins, assessments.length, computeRetention(), isPilotEnrolled() ? computePilotSummary() ?? undefined : undefined, assessments);
      const blob = generatePdfBlob(text);
      if (!blob) return;
      await saveReport(blob, "nilamind-report.pdf", "application/pdf");
    } finally {
      setExportBusy(false);
    }
  };

  const handleWeeklyReport = async () => {
    setExportBusy(true);
    setShowExportMenu(false);
    try {
      const weekEnding = new Date();
      const weekEndingStr = weekEnding.toISOString().split("T")[0];
      const oneWeekAgo = new Date(weekEnding.getTime() - 7 * 86400000);
      const weekCheckins = checkins.filter((c) => {
        const d = new Date(c.date + "T00:00:00");
        return d >= oneWeekAgo && d <= weekEnding;
      });
      const intensities = weekCheckins.map((c) => c.intensity).filter((n): n is number => typeof n === "number" && n > 0);
      const sleepHours = weekCheckins.map((c) => c.sleepHours).filter((n): n is number => typeof n === "number" && n > 0);
      const activeDays = new Set(weekCheckins.map((c) => c.date)).size;
      const emotionFreq: Record<string, number> = {};
      for (const c of weekCheckins) {
        const em = (c.emotion || "").replace(/\s*\(Nila\)/g, "").toLowerCase().trim();
        if (em) emotionFreq[em] = (emotionFreq[em] || 0) + 1;
      }
      let topEmotion: string | null = null;
      let topCount = 0;
      for (const [em, count] of Object.entries(emotionFreq)) {
        if (count > topCount) { topCount = count; topEmotion = em; }
      }

      const text = buildWeeklyReport({
        weekEnding: weekEndingStr,
        totalCheckins: weekCheckins.length,
        daysActive: activeDays,
        avgIntensity: intensities.length ? intensities.reduce((a, b) => a + b, 0) / intensities.length : null,
        minIntensity: intensities.length ? Math.min(...intensities) : null,
        maxIntensity: intensities.length ? Math.max(...intensities) : null,
        topEmotion,
        avgSleepHours: sleepHours.length ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : null,
        protocolsCompleted: usageSummary.protocols.completed,
        nilaSessions: nila.last7,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        featuresUsed: usageSummary.features,
        circadianScore: circadianFeedback?.combinedScore ?? null,
      });
      const blob = generatePdfBlob(text);
      if (!blob) return;
      await saveReport(blob, `nilamind-weekly-${weekEndingStr}.pdf`, "application/pdf");
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="dashboard-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" /> {t("dashboard")}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exportBusy || checkins.length === 0}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              aria-label={t("exportTitle")}
              id="dashboard-export-btn"
            >
              {exportBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                <button onClick={handleExportCsv} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 text-left">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{t("exportCsv")}</span>
                </button>
                <button onClick={handleExportPdf} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 text-left">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>{t("exportPdf")}</span>
                </button>
                <button onClick={handleWeeklyReport} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 text-left">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Weekly report</span>
                </button>
              </div>
            )}
          </div>
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">Your local sections stay only on your device. A picture of how you're doing over time.</p>
      </header>

{/* This-week summary */}
       <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
         <div className="text-[10px] uppercase font-mono tracking-widest text-blue-400 mb-1">This week</div>
         <p className="text-sm text-slate-200 leading-relaxed">{moodSummary}</p>
       </div>

       {/* Monthly narrative */}
       {monthlyNarrative && (
         <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
           <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 mb-1">Your month</div>
           <p className="text-sm text-slate-200 leading-relaxed">
             This month has been <span className="font-semibold text-slate-100">{monthlyNarrative.word}</span>{" "}
             with mood averaging <span className="font-semibold text-slate-100">{monthlyNarrative.avgIntensity}/10</span> (
             {monthlyNarrative.minIntensity}-{monthlyNarrative.maxIntensity}).{" "}
             {monthlyNarrative.topEmotion && (
               <>
                 You've felt most often <span className="font-semibold text-slate-100">{monthlyNarrative.topEmotion}</span>{" "}
                 ({monthlyNarrative.topEmotion === "calm" ? "peaceful moments" :
                   monthlyNarrative.topEmotion === "anxious" ? "worried thoughts" :
                   monthlyNarrative.topEmotion === "sad" ? "low feelings" :
                   monthlyNarrative.topEmotion === "angry" ? "frustrated moments" :
                   monthlyNarrative.topEmotion === "hopeful" ? "optimistic sparks" :
                   monthlyNarrative.topEmotion}).
               </>
             )}
             You've checked in {monthlyNarrative.daysLogged}/{monthlyNarrative.totalDays} days — {" "}
             {monthlyNarrative.daysLogged >= 15
               ? "strong consistency this month!"
               : monthlyNarrative.daysLogged >= 8
               ? "good momentum building."
               : "every check-in adds clarity — keep going."}
           </p>
         </div>
       )}

       {/* Compassionate streak — leads with the warm message, not the raw number. Gamification
           elements show no measurable depression-outcome/adherence benefit, and a prominent
           breakable-looking count is exactly the loss-aversion mechanism the forgiving-streak logic
           in streaks.ts (freeze budget, never-zero-reset) was already built to defuse, per Six,
           Byrne, Tibbett & Pericot-Valverde (2021), JMIR Mental Health; Kahneman & Tversky (1979),
           Econometrica. The raw count is still shown, just demoted to small muted caption text
           below rather than a big Flame+number stat tile. */}
      <div className="glass rounded-2xl py-3 px-4 text-center flex items-center justify-center gap-2">
        <span aria-hidden="true">{compassionateStreak.emoji}</span>
        <p className="text-sm text-slate-200">{compassionateStreak.message}</p>
      </div>

       {/* Top stats */}
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<CalendarCheck className="w-4 h-4 text-emerald-400" />} value={`${freq14}/14`} label="days logged" />
        <Stat icon={<MessageSquare className="w-4 h-4 text-purple-400" />} value={String(nila.last7)} label="Nila chats (7d)" />
      </div>
      {streak.longest > 0 && (
        <p className="text-[11px] text-slate-500 -mt-2 text-center flex items-center justify-center gap-1">
          <Flame className="w-3 h-3 text-amber-400/70" aria-hidden="true" />
          {streak.current}-day streak · Longest: {streak.longest} days · {streak.totalActiveDays} active days all-time
        </p>
      )}

      {/* Usage Analytics — on-device summary of all engagement */}
      {usageSummary.totalCheckins > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Your usage
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-page p-2.5 rounded-xl text-center border border-slate-850">
              <p className="text-lg font-bold text-slate-100 font-mono">{usageSummary.totalCheckins}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wide">check-ins</p>
            </div>
            <div className="bg-page p-2.5 rounded-xl text-center border border-slate-850">
              <p className="text-lg font-bold text-slate-100 font-mono">{usageSummary.protocols.completed}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wide">programs done</p>
            </div>
            <div className="bg-page p-2.5 rounded-xl text-center border border-slate-850">
              <p className="text-lg font-bold text-slate-100 font-mono">{Object.keys(usageSummary.assessments).length}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wide">assessments</p>
            </div>
            <div className="bg-page p-2.5 rounded-xl text-center border border-slate-850">
              <p className="text-lg font-bold text-slate-100 font-mono">{usageSummary.features.length}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wide">features used</p>
            </div>
          </div>
          {usageSummary.avgMood != null && (
            <p className="text-[10px] text-slate-400 text-center">
              Avg mood: <span className="font-mono text-slate-300">{usageSummary.avgMood.toFixed(1)}/10</span>
              {usageSummary.topEmotion && <> · Top: <span className="text-slate-300 capitalize">{usageSummary.topEmotion}</span></>}
              {usageSummary.features.includes("values_snapshot") && <> · <span className="text-emerald-400">Values set ✓</span></>}
            </p>
          )}
          {usageSummary.moodSleepCorrelation && (
            <p className="text-[10px] text-slate-500 text-center">
              Sleep: {usageSummary.moodSleepCorrelation.highSleepMood.toFixed(1)}/10 with ≥7h sleep · {usageSummary.moodSleepCorrelation.lowSleepMood.toFixed(1)}/10 with &lt;7h
              {usageSummary.sleepTrend && (
                <> · Last 3-check-in avg: <span className={usageSummary.sleepTrend.recentAvg >= usageSummary.sleepTrend.olderAvg ? "text-emerald-400" : "text-amber-400"}>{usageSummary.sleepTrend.recentAvg.toFixed(1)}h</span></>
              )}
            </p>
          )}
        </div>
      )}

      {/* Medication adherence summary */}
      {medSummary.activeMeds > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">Medication adherence</p>
              <p className="text-[11px] text-slate-400">{medSummary.activeMeds} active medication{medSummary.activeMeds === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-100">{medSummary.avgAdherence}%</p>
            <p className="text-[10px] text-slate-500">last 7 days</p>
          </div>
        </div>
      )}

      {/* Typing pattern signal */}
      {typingSignal && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Typing pattern note</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {typingSignal === "mania" && "Your recent typing has been unusually fast and bursty — sometimes a sign of elevated energy. A quick check-in might help."}
              {typingSignal === "depression" && "Your recent typing has been slower with more pauses — a gentle check-in could be worth it."}
              {typingSignal === "anxiety" && "Your recent typing shows a lot of starts and stops — maybe take a slow breath when you're ready."}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Private: only timing is stored, never what you typed.</p>
          </div>
        </div>
      )}

      {/* Voice pattern signal */}
      {voiceSignal && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Voice pattern note</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {voiceSignal === "mania" && "Your recent speech patterns have been faster than usual — sometimes a sign of elevated energy. A quick check-in might help."}
              {voiceSignal === "depression" && "Your recent speech has been slower with shorter responses — a gentle check-in could be worth it."}
              {voiceSignal === "anxiety" && "Your recent speech pattern shows some variability — maybe take a slow breath when you're ready."}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Opt-in: only speaking rate is stored locally, never what you said.</p>
          </div>
        </div>
      )}

      {/* Circadian rhythm regularity */}
      {circadian && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Sleep regularity</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${circadian.irregular ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                {circadian.regularityScore}/100
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{circadian.note}</p>
            <p className="text-[10px] text-slate-500 mt-1">From {circadian.nights} nights of self-reported sleep. Avg {circadian.avgSleep}h.</p>
          </div>
        </div>
      )}

      {/* Fused circadian + social rhythm feedback loop */}
      {circadianFeedback && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-start gap-3">
          <div className={`p-2 rounded-xl ${circadianFeedback.needsAttention ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Rhythm stability</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${circadianFeedback.needsAttention ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                {circadianFeedback.combinedScore}/100
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{circadianFeedback.guidance}</p>
          </div>
        </div>
      )}

      {/* Social rhythm per-anchor breakdown (Phase 10) */}
      {rhythmReg && rhythmReg.daysLogged >= 3 && rhythmReg.anchors.some((a) => a.meanTime) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-blue-400" /> Anchor timing
          </p>
          <div className="space-y-1">
            {rhythmReg.anchors.filter((a) => a.meanTime).map((a) => (
              <div key={a.key} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{a.label}</span>
                <span className="text-slate-300 tabular-nums">
                  ~{a.meanTime}
                  {a.variabilityMin !== null && a.daysLogged >= 5 && (
                    <span className="text-slate-500"> · ±{a.variabilityMin}m</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">
            Over {rhythmReg.daysLogged} days · <span className="italic">Smaller ± is steadier</span>
          </p>
        </div>
      )}

      {/* N-of-1: what helps THIS person */}
      {nOf1.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> What's been helping you
          </p>
          {nOf1.slice(0, 3).map((r) => {
            const title = PROTOCOLS.find((p) => p.id === r.protocolId)?.title ?? r.protocolId;
            return (
              <div key={r.protocolId} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{title}</span>
                <span className={r.avgDelta < 0 ? "text-emerald-300" : "text-slate-400"}>
                  {r.avgDelta < 0 ? "↘ steadier after" : "↗ more distress after"} · {r.completions}×
                </span>
              </div>
            );
          })}
          <p className="text-[10px] text-slate-500">Your own pattern, from completed programs. Not a diagnosis.</p>
        </div>
      )}

      {/* ONE trend chart (7D/30D + Emotion/Context), fed by loadMoodHistory() */}
      {trendLength >= 2 ? (
        <div className="glass rounded-2xl p-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5"><TrendUpIcon className="w-3.5 h-3.5" /> Trend</h2>
              <div className="flex bg-page border border-slate-800 rounded-lg overflow-hidden p-0.5">
                {(["7d", "30d"] as const).map((r) => (
                  <button key={r} onClick={() => setTimeRange(r)} aria-label={`Show ${r === "7d" ? "7 day" : "30 day"} trend`} aria-pressed={timeRange === r}
                    className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${timeRange === r ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex bg-page border border-slate-800 rounded-lg overflow-hidden p-0.5 self-start">
              <button onClick={() => setChartTab("emotion")} aria-label="Show emotion trend" aria-pressed={chartTab === "emotion"}
                className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${chartTab === "emotion" ? "bg-purple-500/20 text-purple-400" : "text-slate-500 hover:text-slate-300"}`}>Emotion</button>
              <button onClick={() => setChartTab("context")} aria-label="Show sleep and social context" aria-pressed={chartTab === "context"}
                className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${chartTab === "context" ? "bg-blue-500/20 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}>Context</button>
            </div>
          </div>
          <div className="w-full h-48" role="img" aria-label={chartTab === "emotion" ? "Line chart showing emotional intensity trend over time. Lower values indicate calmer states." : "Line chart showing sleep hours and social connection over time."}>
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === "emotion" ? (
                <ComposedChart data={emotionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                  <XAxis dataKey="date" stroke="#948A7E" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#948A7E" fontSize={10} domain={[1, 10]} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px" }} labelStyle={{ color: "#ECE5DA" }} itemStyle={{ color: "#9479B0" }} />
                  <Line type="monotone" dataKey="intensity" name="Intensity" stroke="#9479B0" strokeWidth={3} activeDot={{ r: 6, fill: "#D8B4FE", stroke: "#9479B0" }} dot={{ r: 4, fill: "#211C17" }} />
                  {/* EMA micro-check-in dots (re-audit #4): Scatter belongs in a ComposedChart — inside a
                      LineChart recharts silently drops it. dataKey ties each dot to the shared date axis. */}
                  <Scatter data={emaPoints} dataKey="intensity" name="Quick check-in" fill="#D8A657" />
                </ComposedChart>
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
        <div className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Emotion log frequency</h2>
          <div className="w-full h-44" role="img" aria-label="Bar chart showing frequency of each emotion logged. Taller bars indicate more frequent emotions.">
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
              <div key={id} className="glass rounded-xl p-3">
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
        <div className="glass p-5 rounded-2xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Patterns from your data
          </h2>
          <ul className="space-y-3">
            {observations.map((ins, i) => (
              <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2 bg-page p-3 rounded-xl border border-slate-850">
                <span className="text-emerald-400 font-bold">●</span><span>{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Daily-behaviour insights (sleep, screen time, steps, etc.) */}
      {behaviourInsights.length > 0 && (
        <div className="glass p-5 rounded-2xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Behaviour insights
            {behaviourDays > 0 && <span className="text-[10px] text-slate-600 normal-case tracking-normal ml-1">({behaviourDays} days of paired data)</span>}
          </h2>
          <ul className="space-y-3">
            {behaviourInsights.map((ins) => (
              <li key={ins.id} className={`text-xs leading-relaxed flex items-start gap-2 bg-page p-3 rounded-xl border ${
                ins.direction === "risk" ? "border-amber-500/30" : ins.direction === "protective" ? "border-emerald-500/30" : "border-slate-850"
              }`}>
                <span className={`font-bold ${ins.direction === "risk" ? "text-amber-400" : ins.direction === "protective" ? "text-emerald-400" : "text-slate-400"}`}>●</span>
                <span className="text-slate-300">{ins.finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick-note tag cloud */}
      {topTags.length > 0 && (
        <div className="glass p-5 rounded-2xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-400" /> Frequent quick-note subjects
          </h2>
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
          <h2 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> Episode insights
          </h2>
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
            <div key={t.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2">
              <span className="text-[11px] text-slate-300 italic min-w-0">"{t.snippet}{t.snippet.length >= 80 ? "…" : ""}"</span>
              <span className="text-[10px] text-slate-600 shrink-0">{t.surface === "episode" ? "episode" : "coach"} · {t.date.slice(5)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Nila's Deep Evaluation — runs fully on-device via the same local AI that powers your conversations.
          User-initiated + disclosed. */}
      <div className="bg-card border border-purple-500/20 p-5 rounded-2xl space-y-4 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1.5 mb-1">
            <BrainCircuit className="w-4 h-4" /> Nila's Deep Evaluation ✨
          </h2>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This asks Nila to analyze your recent check-ins, diary notes, and episode records — all on your device, using the same local AI that powers your conversations. Nothing leaves your phone.
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

      {onManageData && (
        <button onClick={onManageData} id="dashboard-manage-data" className="w-full glass hover:bg-raised text-slate-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
          <Database className="w-3.5 h-3.5" /> Manage, export or delete your data
        </button>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass rounded-2xl py-3 px-2 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-black text-slate-100 font-mono leading-none">{value}</div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="glass rounded-2xl p-4 text-center text-[11px] text-slate-500 leading-relaxed">{text}</div>;
}
