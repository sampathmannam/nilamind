import { useMemo, useState, useEffect, lazy, Suspense } from "react";
import { loadEmaEntries } from "../services/ema";
import {
  Flame, TrendingUp as TrendUpIcon, TrendingDown, Minus, Activity,
  ClipboardCheck, Sparkles, BrainCircuit,
  Loader2, Tag, Lightbulb, Download, FileText,
} from "lucide-react";
import Markdown from "react-markdown";
import { loadMoodHistory } from "../services/moodHistory";
import { readEpisodeMarkers, type EpisodeMarker } from "../services/episodeMarker";
import { t, tn, useLanguage, type I18nKey } from "../services/i18n";
import { loadAssessments, latestFor, INSTRUMENTS, type InstrumentId } from "../services/assessments";
import { assessmentInsights, generateInsights, daysOfData, medicationMoodInsight, type Insight } from "../services/patternInsights";
import { computeStreak, computeCompassionateStreak } from "../services/streaks";
import { nilaStats } from "../services/nilaSessions";
import { adherenceSummary, loadMedicationLogs } from "../services/medicationAdherence";
import { getRecentMetrics, detectMoodSignal } from "../services/typingPatterns";
import { voiceMoodSignal } from "../services/voicePatterns";
import { computeCircadianInsight } from "../services/circadian";
import { computeCircadianFeedback } from "../services/circadianFeedback";
import { computeRhythmRegularity } from "../services/socialRhythm";
import { computeNof1Ranking } from "../services/nOf1";
import { secureLocal } from "../services/secureLocal";
import { loadDiaryEntries } from "../services/diary";
import { runDeepAssessment as runDeepAssessmentRequest } from "../services/coachAssist";
import { generateCsvReport, buildTextReport, generatePdfBlob, saveReport } from "../services/exportReport";
import { computeRetention } from "../services/retentionMetrics";
import { computeUsageSummary } from "../services/usageAnalytics";
import { getAdherenceSummary } from "../services/protocolAdherence";
import { assessDisengagementRisk } from "../services/disengagementPredictor";
import { assessDependency, loadSessions } from "../services/dependencyTracker";
import { checkUsageCeiling, getTodayTurns } from "../services/usageCeilings";
import { assessConnection, loadConnections } from "../services/humanConnection";
import { buildWeeklyReport } from "../services/weeklyReport";
import { isPilotEnrolled, computePilotSummary } from "../services/pilotStudy";
import { selectProactiveCards, markCardShown, markCardClicked, markCardDismissed } from "../services/proactiveSurfaceRouter";
import { detectCompoundSignals } from "../services/compoundDetector";
import { getUserState } from "../services/modeEngine";
import { detectPhaseShift } from "../services/episodeSuggester";
import { getFeatureWindow } from "../services/signalStore";
import { getPassiveSensingEnabled } from "../services/passiveSensingPrefs";
import CrisisCard from "./CrisisCard";
import SignalsBand from "./SignalsBand";
import ActivityBand from "./ActivityBand";
import TrackingBand from "./TrackingBand";
import EpisodesBand from "./EpisodesBand";
import Card from "./Card";
import { stripProvenance } from "../services/emotionParse";
import {
  emotionDistribution, derivedObservations, episodePatterns, quickNoteTags,
  moodTrend, contextTrend, sleepMoodTrend, weeklyRhythmBars, mergeEmaIntoTrend,
} from "../services/dashboardInsights";
import { getRecentSnapshots } from "../db/behaviourDb";
import type { CheckInEntry, DiaryCardEntry, EpisodeRecord } from "../types";
import { DAY_MS, localDateKey} from "../services/storageUtils";
import EmptyStateShared, { EMPTY_STATES } from "./EmptyState";
import CollapsibleSection, { CollapsibleGroup } from "./CollapsibleSection";
import HeroCard from "./HeroCard";
import HeroMetric from "./HeroMetric";
import StatPill, { StatPillRow } from "./StatPill";
import AnimatedCard from "./AnimatedCard";
import BandNarrative from "./BandNarrative";
import { buildBandNarratives } from "../services/bandNarratives";
import { buildBandConfig } from "../services/bandConfig";
import { generateDashboardNarrative } from "../services/dashboardNarrative";
const LazyDashboardCharts = lazy(() => import("./DashboardCharts"));

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
export default function DashboardScreen({ onOpenView }: { onOpenView?: (target: string) => void }) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("30d");
  const [chartTab, setChartTab] = useState<"emotion" | "context" | "energy" | "sleep-mood">("emotion");
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<string | null>(null);
  const [assessmentCrisis, setAssessmentCrisis] = useState(false);
  const [behaviourInsights, setBehaviourInsights] = useState<Insight[]>([]);
  const [behaviourDays, setBehaviourDays] = useState(0);
  const [behaviourLoading, setBehaviourLoading] = useState(true);
  const [proactiveCards, setProactiveCards] = useState<ReturnType<typeof selectProactiveCards>>([]);
  const lang = useLanguage();
  const [showAllObservations, setShowAllObservations] = useState(false);
  const [showAllBehaviour, setShowAllBehaviour] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  const data = useMemo(() => {
    const mood = loadMoodHistory().sort((a, b) => a.date.localeCompare(b.date));
    const assessments = loadAssessments();
    const episodeMarkers: EpisodeMarker[] = readEpisodeMarkers();
    const streak = computeStreak();
    const compassionateStreak = computeCompassionateStreak();
    const nila = nilaStats();

    const checkins = readArr<CheckInEntry>("nilamind_checkins");
    const diaryEntries: DiaryCardEntry[] = loadDiaryEntries();
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
    const protocolAdherence = getAdherenceSummary();
    let disengagementRisk = null;
    try {
      const checkinDates = readArr<{ date: string }>("nilamind_checkins").map((c) => c.date).filter(Boolean);
      const appOpenRaw = secureLocal.getItem("nilamind_app_opens");
      const appOpenDays: string[] = appOpenRaw ? (JSON.parse(appOpenRaw).days ?? []) : [];
      const lastCheckin = mood[mood.length - 1];
      const daysSinceLastCheckin = lastCheckin ? Math.max(0, Math.floor((Date.now() - new Date(lastCheckin.date).getTime()) / 86400000)) : 999;
      const lastOpenDay = appOpenDays.length > 0 ? appOpenDays[appOpenDays.length - 1] : null;
      const daysSinceLastAppOpen = lastOpenDay ? Math.max(0, Math.floor((Date.now() - new Date(lastOpenDay + "T00:00:00").getTime()) / 86400000)) : 999;
      disengagementRisk = assessDisengagementRisk({
        checkinDates,
        appOpenDays,
        protocolAdherenceRate: protocolAdherence.adherenceRate,
        allianceTrend: "insufficient_data",
        daysSinceLastCheckin,
        daysSinceLastAppOpen,
        protocolCount: protocolAdherence.totalStarted,
        featureCount: usageSummary.features.length,
      });
    } catch { /* best-effort */ }
    const rhythmReg = computeRhythmRegularity();
    const circadianFeedback = circadian ? computeCircadianFeedback({
      sleeps: mood.filter((m) => typeof m.sleepHours === "number" && m.sleepHours > 0).map((m) => m.sleepHours as number),
      rhythmVariabilityMin: rhythmReg.overallVariabilityMin,
    }) : null;

    // Dependency tracking
    let depLevel: string | null = null;
    let depReason = "";
    try {
      const sessions = loadSessions();
      const dep = assessDependency(sessions);
      if (dep.level !== "none") {
        depLevel = dep.level;
        depReason = dep.reason;
      }
    } catch { /* best-effort */ }

    // Usage ceiling
    let ceilingStatus: string | null = null;
    let ceilingMessage = "";
    try {
      const ceiling = checkUsageCeiling(getTodayTurns());
      if (ceiling.status === "ceiling_reached") {
        ceilingStatus = ceiling.status;
        ceilingMessage = ceiling.message;
      }
    } catch { /* best-effort */ }

    // Human connection
    let connLevel: string | null = null;
    let connReason = "";
    let connTotal = 0;
    try {
      const connections = loadConnections();
      const conn = assessConnection(connections);
      connLevel = conn.level;
      connReason = conn.reason;
      connTotal = conn.totalConnections;
    } catch { /* best-effort */ }

    return { mood, streak, compassionateStreak, nila, thisAvg, lastAvg, freq14, assessments, trajectories, checkins, diaryEntries, episodes, medSummary, circadian, nOf1, usageSummary, circadianFeedback, rhythmReg, protocolAdherence, disengagementRisk, episodeMarkers, depLevel, depReason, ceilingStatus, ceilingMessage, connLevel, connReason, connTotal };
  }, []);

  const { mood, streak, compassionateStreak, nila, thisAvg, lastAvg, freq14, assessments, trajectories, checkins, diaryEntries, episodes, medSummary, circadian, nOf1, usageSummary, circadianFeedback, rhythmReg, protocolAdherence, disengagementRisk, episodeMarkers, depLevel, depReason, ceilingStatus, ceilingMessage, connLevel, connReason, connTotal } = data;

  // Single source of truth for which background signal cards are visible.
  // Both the rendered cards and `signalCount` read these — never tally by hand.
  const showDisengagement = !!(
    disengagementRisk &&
    disengagementRisk.riskLevel !== "low" &&
    disengagementRisk.frequencyTrend !== "insufficient_data"
  );
  const showDependency = !!depLevel && depLevel !== "none";
  const showCeiling = !!ceilingStatus;
  const showConnection = connLevel === "low";
  const showCircadian = !!circadian;
  const showCircadianFeedback = !!circadianFeedback;

  // Load behaviour snapshots async and compute daily-behaviour insights
  useEffect(() => {
    let cancelled = false;
    setBehaviourLoading(true);
    void (async () => {
      try {
        const snaps = await getRecentSnapshots(30);
        if (cancelled) return;
        const insights = generateInsights(snaps, mood);
        const medLogs = loadMedicationLogs();
        const medInsight = medicationMoodInsight(medLogs, mood);
        if (medInsight) insights.push(medInsight);
        setBehaviourInsights(insights);
        setBehaviourDays(daysOfData(snaps, mood));
      } catch { /* fresh db or no permission */ }
      if (!cancelled) setBehaviourLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mood]);

  // Load proactive surface cards from compound detection
  useEffect(() => {
    if (!getPassiveSensingEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const window = getFeatureWindow(30);
        const signals = detectCompoundSignals(window);
        const phaseShift = detectPhaseShift(window);
        const cards = selectProactiveCards(signals, phaseShift, getUserState());
        if (!cancelled) {
          setProactiveCards(cards);
          // Record what we're showing so the anti-fatigue cooldown actually starts — previously nothing
          // called markCardShown, so identical cards reappeared on every dashboard open.
          for (const c of cards) markCardShown(c);
        }
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const energyScatter = useMemo(() => {
    const range = timeRange === "7d" ? 7 : 30;
    const cutoff = localDateKey(new Date(Date.now() - range * DAY_MS));
    return checkins
      .filter((c) => c.date >= cutoff && typeof c.intensity === "number" && typeof c.energy === "number")
      .map((c) => ({
        intensity: c.intensity,
        energy: c.energy as number,
        emotion: (c.emotion || "").replace(/\s*\(.*\)$/, ""),
        date: c.date,
      }));
  }, [checkins, timeRange]);
  const emoBars = useMemo(() => emotionDistribution(checkins, stripProvenance), [checkins]);
  const weeklyBars = useMemo(() => weeklyRhythmBars(checkins), [checkins]);
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
  const showTyping = !!typingSignal;
  const showVoice = !!voiceSignal;
  const signalCount = [
    showDisengagement,
    showDependency,
    showCeiling,
    showConnection,
    showTyping,
    showVoice,
    showCircadian,
    showCircadianFeedback,
  ].filter(Boolean).length;
  const epPatterns = useMemo(() => episodePatterns(episodes), [episodes]);
  const topTags = useMemo(() => quickNoteTags(diaryEntries), [diaryEntries]);
  const emotionTrend = useMemo(() => moodTrend(mood, timeRange), [mood, timeRange]);
  const ctxTrend = useMemo(() => contextTrend(mood, timeRange), [mood, timeRange]);
  const sleepMoodTrendData = useMemo(() => sleepMoodTrend(mood, timeRange), [mood, timeRange]);
  const emotionTrendWithEma = useMemo(
    () => mergeEmaIntoTrend(emotionTrend, loadEmaEntries()),
    [emotionTrend],
  );
  const trendLength = chartTab === "emotion" ? emotionTrend.length : chartTab === "energy" ? energyScatter.length : chartTab === "sleep-mood" ? sleepMoodTrendData.length : ctxTrend.length;

  const moodSummary = (() => {
    if (thisAvg == null) return tn("narr_mood_none", lang, {});
    const avgStr = r1(thisAvg);
    if (lastAvg == null) return tn("narr_mood_base_only", lang, { avg: avgStr });
    const delta = thisAvg - lastAvg;
    if (Math.abs(delta) < 0.5) return tn("narr_mood_same", lang, { avg: avgStr });
    return delta < 0
      ? tn("narr_mood_down", lang, { avg: avgStr, delta: r1(Math.abs(delta)) })
      : tn("narr_mood_up", lang, { avg: avgStr, delta: r1(delta) });
  })();

  // Localized activity (streak) line — mirrors the English branches in computeCompassionateStreak
  // so the Activity band's narrative is fully translated instead of carrying the raw English message.
  const activityMessage = (() => {
    const s = compassionateStreak;
    if (s.totalActiveDays === 0 || s.daysSinceLast === -1) return tn("narr_streak_first", lang, {});
    if (s.lapsed) return tn("narr_streak_welcome", lang, {});
    if (s.milestone) return tn("narr_streak_milestone", lang, { milestone: s.milestone });
    if (s.activeToday) {
      return s.current > 1 ? tn("narr_streak_active_multi", lang, { current: s.current }) : tn("narr_streak_active_one", lang, {});
    }
    return s.current > 0 ? tn("narr_streak_safe", lang, {}) : tn("narr_streak_small", lang, {});
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
      const weekEndingStr = localDateKey(weekEnding);
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

  // Narrative-first summaries (Phase 1.2) — a calm 1–2 sentence gist per band.
  const narrativeInput = {
    activityMessage,
    monthlyWord: monthlyNarrative?.word ?? null,
    behaviourCount: behaviourInsights.length,
    proactiveCount: proactiveCards.length,
    moodSummary,
    signalCount,
    episodeCount: episodes.length,
    sessionCount: nila.last7,
    lang,
  };
  const narratives = buildBandNarratives(narrativeInput);

  // Phase 4: upgrade the trends narrative with a short on-device LLM sentence when the model is ready.
  // The static gist stays on screen until/unless the model returns something safe (see dashboardNarrative.ts).
  const [trendsNarrative, setTrendsNarrative] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    generateDashboardNarrative(narrativeInput).then((text) => {
      if (!cancelled && text && text !== narratives.trends) setTrendsNarrative(text);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capacity-aware band config (Phase 3): low-capacity states keep every band collapsed and engage
  // a soft visual register; a calm user gets the lightest band gently opened.
  // Derived once from the loaded dashboard data (data is stable for the screen's lifetime), so a
  // user's capacity state is read at mount and stays consistent with the band-open defaults it seeds.
  const bandConfig = useMemo(() => buildBandConfig(getUserState()), [data]);

  // #12 — Quiet-hours / "too much screen" awareness. Removed ( paternalistic — UI simplification via capacity-aware bands is sufficient).
  const userCapacity = getUserState();

  return (
    <div className="space-y-5 max-w-md mx-auto" id="dashboard-screen">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" /> {t("dashboard")}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exportBusy || checkins.length === 0}
              className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 disabled:opacity-30"
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
                  <span>{t("weekly_report")}</span>
                </button>
              </div>
            )}
          </div>
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">{t("dash_privacy")}</p>
      </header>

      {/* Level 1: Hero metric + stat pills — answers "How am I doing?" in 2 seconds */}
      <HeroMetric
        value={thisAvg != null ? r1(thisAvg) : "—"}
        label={t("mood_avg_7d")}
        sparkData={mood.slice(-7).map((m) => m.intensity ?? 0).filter((v) => v > 0)}
        sparkMin={0}
        sparkMax={10}
        trend={lastAvg != null && thisAvg != null ? Math.round(((thisAvg - lastAvg) / lastAvg) * 100) : undefined}
        trendLabel={t("from_last_week")}
        ariaLabel={`${t("mood_avg_7d")}: ${thisAvg != null ? r1(thisAvg) : "no data"}`}
      />

      <StatPillRow>
        <StatPill
          icon="😴"
          value={(() => { const recent = mood.filter((m) => typeof m.sleepHours === "number" && m.sleepHours > 0).slice(-7); return recent.length > 0 ? `${r1(recent.reduce((s, m) => s + (m.sleepHours as number), 0) / recent.length)}h` : "—"; })()}
          label={t("avg_sleep")}
        />
        <StatPill
          icon="🧘"
          value={freq14 > 0 ? `${freq14}/14` : "—"}
          label={t("days_active")}
        />
        <StatPill
          icon="🔥"
          value={streak.current > 0 ? `${streak.current}d` : "—"}
          label={t("streak")}
        />
      </StatPillRow>

      {/* State-aware "what now" hero — ONE contextual action (Smashing Mag: Nonori/Teeni
          single-action pattern). Picks a CTA from the user's current derived state so a
          distressed user is never faced with a wall of choices. */}
      <HeroCard onOpenView={onOpenView} />

{/* This-week summary */}
       <div className="bg-blue-500/5 border border-accent/20 rounded-2xl p-4">
          <div className="text-xs uppercase font-mono tracking-widest text-blue-400 mb-1">{t("this_week")}</div>
         <p className="text-sm text-slate-200 leading-relaxed">{moodSummary}</p>
       </div>

        {/* Monthly narrative */}
        {monthlyNarrative && (() => {
          const wordText = t(`monthly_word_${monthlyNarrative.word}` as I18nKey, lang);
          const knownEmotions = ["calm", "anxious", "sad", "angry", "hopeful"] as const;
          const emotionText = monthlyNarrative.topEmotion
            ? (knownEmotions as readonly string[]).includes(monthlyNarrative.topEmotion)
              ? t(`emotion_${monthlyNarrative.topEmotion}` as I18nKey, lang)
              : monthlyNarrative.topEmotion
            : "";
          const pacing = monthlyNarrative.daysLogged >= 15 ? t("pacing_strong", lang) : monthlyNarrative.daysLogged >= 8 ? t("pacing_good", lang) : t("pacing_keep", lang);
          return (
           <Card variant="raised">
             <div className="text-xs uppercase tracking-wider text-ink-muted mb-1">{t("your_month")}</div>
             <p className="text-sm text-ink leading-relaxed">
              {tn("narr_tracking_body", lang, {
                word: wordText,
                avg: monthlyNarrative.avgIntensity,
                min: monthlyNarrative.minIntensity,
                max: monthlyNarrative.maxIntensity,
                emotion: emotionText,
                days: monthlyNarrative.daysLogged,
                total: monthlyNarrative.totalDays,
                pacing,
              })}
             </p>
           </Card>
          );
        })()}

        {/* Compassionate streak — leads with the warm message, not the raw number. Gamification
           elements show no measurable depression-outcome/adherence benefit, and a prominent
           breakable-looking count is exactly the loss-aversion mechanism the forgiving-streak logic
           in streaks.ts (freeze budget, never-zero-reset) was already built to defuse, per Six,
           Byrne, Tibbett & Pericot-Valverde (2021), JMIR Mental Health; Kahneman & Tversky (1979),
           Econometrica. The raw count is still shown, just demoted to small muted caption text
           below rather than a big Flame+number stat tile. */}
          <CollapsibleGroup className={bandConfig.softRegister ? "soft-register" : ""}>
           <AnimatedCard delayMs={0}>
           <ActivityBand
             openActivity={bandConfig.openActivity}
             summary={activityMessage}
             narrative={narratives.activity}
             streak={streak}
             compassionateStreak={compassionateStreak}
             freq14={freq14}
             nilaChats7d={nila.last7}
             usageSummary={usageSummary}
             protocolAdherence={protocolAdherence}
             streakMessage={activityMessage}
           />
           </AnimatedCard>

          <AnimatedCard delayMs={60}>
          <TrackingBand
           openTracking={bandConfig.openTracking}
           summary={monthlyNarrative ? tn("narr_tracking_month", lang, { word: t(`monthly_word_${monthlyNarrative.word}` as I18nKey, lang) }) : t("tracking_summary")}
           narrative={narratives.tracking}
           checkins={checkins}
           mood={mood}
           assessments={assessments}
           episodeMarkers={episodeMarkers}
           onOpenView={onOpenView}
           behaviourInsights={behaviourInsights}
           proactiveCards={proactiveCards}
           onProactiveAction={(card) => {
             const action = card.action;
             if (action) {
               markCardClicked(card);
               onOpenView?.(action.route);
             }
           }}
           onProactiveDismiss={(cardId) => {
             const card = proactiveCards.find((c) => c.id === cardId);
             if (card) markCardDismissed(card);
             setProactiveCards((cs) => cs.filter((c) => c.id !== cardId)); // hide immediately, not on remount
            }}
          />
          </AnimatedCard>

       <AnimatedCard delayMs={120}>
       <SignalsBand
        t={t}
        openSignals={bandConfig.openSignals}
        summary={t("signals_summary")}
        showDisengagement={showDisengagement}
        showDependency={showDependency}
        showCeiling={showCeiling}
        showConnection={showConnection}
        showTyping={showTyping}
        showVoice={showVoice}
        showCircadian={showCircadian}
        showCircadianFeedback={showCircadianFeedback}
        disengagementRisk={disengagementRisk}
        depLevel={depLevel}
        depReason={depReason}
        ceilingStatus={ceilingStatus}
        ceilingMessage={ceilingMessage}
        connLevel={connLevel}
        connReason={connReason}
        medSummary={medSummary}
        typingSignal={typingSignal}
        voiceSignal={voiceSignal}
        circadian={circadian}
        circadianFeedback={circadianFeedback}
        rhythmReg={rhythmReg}
         nOf1={nOf1}
       />
       </AnimatedCard>

       <AnimatedCard delayMs={180}>
       <CollapsibleSection title={t("trends_measures")} summary={t("trends_summary")} defaultOpen={bandConfig.openTrends}>
      <BandNarrative text={trendsNarrative ?? narratives.trends} />

      {/* ONE trend chart (7D/30D + Emotion/Context), fed by loadMoodHistory().
          Deliberately still Recharts: this is the app's only interactive multi-series chart
          (axes, tooltips, EMA-dot overlay, audit-hardened positioning). The lightweight Sparkline
          primitive replaced Recharts only where it was safe — the single-series WHO-5 sparkline in
          WellbeingTrendCard. MiniBar was deleted as orphaned (no consumer). See AGENTS.md "wire what
          you build". */}
      <Suspense fallback={<div className="glass rounded-2xl p-8 text-center text-slate-500 text-sm">Loading charts…</div>}>
        <LazyDashboardCharts
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          chartTab={chartTab}
          setChartTab={setChartTab}
          emotionTrendWithEma={emotionTrendWithEma}
          energyScatter={energyScatter}
          sleepMoodTrendData={sleepMoodTrendData}
          ctxTrend={ctxTrend}
          emoBars={emoBars}
          weeklyBars={weeklyBars}
          trendLength={trendLength}
        />
      </Suspense>

      {/* Validated assessments (unchanged Dashboard section) */}
      <div className="space-y-2">
        <div className="text-xs uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Validated check-ins</div>
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
                  <span className="text-xs font-bold text-slate-100">{inst.measures.split(" ")[0]} · <span className="text-slate-500 font-normal">{id}</span></span>
                  <span className="text-xs text-slate-300">{last.total}/{inst.maxScore} <span className="text-slate-500">{last.severity}</span></span>
                </div>
                {traj && <p className="text-[11px] text-slate-400 mt-1 flex items-start gap-1">{dirIcon}<span>{traj.finding.split(" — ").slice(1).join(" — ") || traj.finding}</span></p>}
              </div>
            );
          })
        ) : (
          <EmptyCard illustration="📝" text="Take a screening (PHQ-9 or GAD-7) to track depression and anxiety over time." />
        )}
      </div>

      {/* Derived observations */}
      {observations.length > 0 && (
        <div className="glass p-5 rounded-2xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Patterns from your data
          </h2>
          <ul className="space-y-3">
            {observations.slice(0, showAllObservations ? observations.length : 3).map((ins, i) => (
              <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2 bg-page p-3 rounded-xl border border-line">
                <span className="text-emerald-400 font-bold">●</span><span>{ins}</span>
              </li>
            ))}
          </ul>
          {observations.length > 3 && (
            <button
              onClick={() => setShowAllObservations((v) => !v)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
            >
              {showAllObservations ? `Show less` : `See all ${observations.length} patterns`}
            </button>
          )}
        </div>
      )}

      {/* Daily-behaviour insights (sleep, screen time, steps, etc.) */}
      {behaviourLoading && behaviourInsights.length === 0 && (
        <div className="glass p-5 rounded-2xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Behaviour insights
          </h2>
          <p className="text-xs text-ink-faint italic">Analysing your patterns…</p>
        </div>
      )}
      {behaviourInsights.length > 0 && (
        <div className="glass p-5 rounded-2xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Behaviour insights
            {behaviourDays > 0 && <span className="text-xs text-slate-600 normal-case tracking-normal ml-1">({behaviourDays} days of paired data)</span>}
          </h2>
          <ul className="space-y-3">
            {behaviourInsights.slice(0, showAllBehaviour ? behaviourInsights.length : 3).map((ins) => (
              <li key={ins.id} className={`text-xs leading-relaxed flex items-start gap-2 bg-page p-3 rounded-xl border ${
                ins.direction === "risk" ? "border-amber-500/30" : ins.direction === "protective" ? "border-emerald-500/30" : "border-line"
              }`}>
                <span className={`font-bold ${ins.direction === "risk" ? "text-amber-400" : ins.direction === "protective" ? "text-emerald-400" : "text-slate-400"}`}>●</span>
                <span className="text-slate-300">{ins.finding}</span>
              </li>
            ))}
          </ul>
          {behaviourInsights.length > 3 && (
            <button
              onClick={() => setShowAllBehaviour((v) => !v)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
            >
              {showAllBehaviour ? `Show less` : `See all ${behaviourInsights.length} insights`}
            </button>
          )}
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
              <div key={tag} className="flex items-center bg-page border border-accent/30 rounded-lg px-2.5 py-1.5 overflow-hidden">
                <span className="text-xs font-medium text-blue-300 mr-2">{tag}</span>
                <span className="text-xs text-slate-500 font-mono bg-card px-1.5 rounded">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
       </CollapsibleSection>
       </AnimatedCard>

        <AnimatedCard delayMs={240}>
        <EpisodesBand
         openEpisodes={bandConfig.openEpisodes}
         narrative={narratives.episodes}
         epPatterns={epPatterns}
         nilaRecent={nila.recent}
         lang={lang}
         t={t}
       >
        {/* Nila's Deep Evaluation — runs fully on-device via the same local AI that powers your conversations.
            User-initiated + disclosed. Kept in the dashboard because it owns the crisis-gated state. */}
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
      </EpisodesBand>
      </AnimatedCard>
      </CollapsibleGroup>
    </div>
  );
}

/** A full-width section divider that breaks the long dashboard scroll into labeled bands. */
function EmptyCard({ text }: { text: string; illustration?: string }) {
  return (
    <EmptyStateShared
      nilaState={EMPTY_STATES.noMoodData.nilaState}
      title=""
      body={text}
    />
  );
}
