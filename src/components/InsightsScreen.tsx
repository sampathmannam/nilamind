import React, { useState, useEffect } from "react";
import { Sparkles, Shield, TrendingUp, TrendingDown, Minus, HelpCircle, Activity, Moon, Smartphone, Heart, Footprints, Users, ShieldCheck } from "lucide-react";
import { secureLocal } from "../services/secureLocal";
import { generateInsights, assessmentInsights, daysOfData, type Insight } from "../services/patternInsights";
import { getRecentSnapshots } from "../db/behaviourDb";
import EmptyStateShared, { EMPTY_STATES } from "./EmptyState";
import { loadMoodHistory } from "../services/moodHistory";
import { loadAssessments, type AssessmentEntry } from "../services/assessments";
import { getNo1Insights, type No1Insight } from "../services/nOf1";

interface InsightsScreenProps {
  onClose?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'sleep-short': <Moon className="w-5 h-5 text-rose-400" />,
  'sleep-long': <Moon className="w-5 h-5 text-indigo-400" />,
  'night-phone': <Smartphone className="w-5 h-5 text-orange-400" />,
  'screen-time': <Activity className="w-5 h-5 text-amber-400" />,
  'social-shame': <Heart className="w-5 h-5 text-violet-400" />,
  'movement': <Footprints className="w-5 h-5 text-emerald-400" />,
  'left-home': <Footprints className="w-5 h-5 text-sky-400" />,
  'steps': <Activity className="w-5 h-5 text-lime-400" />,
  'social-connection': <Users className="w-5 h-5 text-rose-400" />,
};

const DIRECTION_COLORS = {
  risk: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-300", icon: "text-rose-400" },
  protective: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", icon: "text-emerald-400" },
  neutral: { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-300", icon: "text-slate-400" },
};

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const colors = DIRECTION_COLORS[insight.direction];
  const Icon = ICON_MAP[insight.id] || <Sparkles className="w-5 h-5" />;

  return (
    <div
      key={insight.id}
      className={`glass rounded-2xl p-4 border ${colors.border} ${colors.bg}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} ${colors.icon}`}>
          {Icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">{insight.title}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {insight.direction === 'risk' ? 'Risk factor' : insight.direction === 'protective' ? 'Protective' : 'Neutral'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{insight.finding}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> {insight.dataPoints} days of data
            </span>
            <button
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 underline"
              aria-label={`View research basis for ${insight.title}`}
            >
              <HelpCircle className="w-3 h-3" /> Research
            </button>
          </div>
        </div>
      </div>

      {/* Research basis expandable */}
      <details className="mt-3">
        <summary className="text-xs text-slate-500 hover:text-slate-400 cursor-pointer flex items-center gap-1">
          Show research citation
        </summary>
        <div className="mt-2 p-3 bg-slate-900/50 rounded-xl text-xs text-slate-400 leading-relaxed border border-slate-800">
          {insight.basis}
        </div>
      </details>
    </div>
  );
}

function EmptyState() {
  return (
    <EmptyStateShared
      nilaState={EMPTY_STATES.noInsights.nilaState}
      title="No insights yet"
      body="Insights appear after you've checked in for several days and granted permission for phone behaviour signals (screen time, sleep, movement). Everything stays on your device — nothing leaves your phone. Minimum 5 paired days of check-ins + phone data needed per pattern."
    />
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass rounded-2xl p-4 animate-pulse">
          <div className="h-4 w-1/3 bg-slate-700 rounded mb-3" />
          <div className="h-3 w-full bg-slate-700 rounded" />
          <div className="h-3 w-2/3 bg-slate-700 rounded mt-2" />
        </div>
      ))}
    </div>
  );
}

export default function InsightsScreen({ onClose }: InsightsScreenProps) {
  const [behaviourInsights, setBehaviourInsights] = useState<Insight[]>([]);
  const [assessmentInsightsList, setAssessmentInsights] = useState<Insight[]>([]);
  const [no1Insights, setNo1Insights] = useState<No1Insight[]>([]);
  const [dataDays, setDataDays] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // Load behaviour snapshots from IndexedDB (behaviourDb)
        const snaps = await getRecentSnapshots(30);

        // Load mood history
        const mood = await loadMoodHistory();

        // Load assessments for PHQ-9/GAD-7 trajectory
        let assessments: AssessmentEntry[] = [];
        try {
          const raw = secureLocal.getItem("nilamind_assessments");
          if (raw) assessments = JSON.parse(raw);
        } catch { /* ignore */ }

        if (!mounted) return;

        // Generate insights
        const bInsights = generateInsights(snaps, mood);
        const aInsights = assessmentInsights(assessments, mood);
        const dDays = daysOfData(snaps, mood);
        const n1 = getNo1Insights();

        setBehaviourInsights(bInsights);
        setAssessmentInsights(aInsights);
        setNo1Insights(n1);
        setDataDays(dDays);
      } catch (e) {
        console.error("[InsightsScreen] Failed to load insights:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Re-check for phone behaviour permission
  const [phoneDataAvailable, setPhoneDataAvailable] = useState(false);
  useEffect(() => {
    import("../services/phoneBehaviour").then(({ isPhoneDataAvailable }) => {
      setPhoneDataAvailable(isPhoneDataAvailable());
    });
  }, []);

  return (
    <div className="space-y-5 max-w-md mx-auto" id="insights-screen">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="editorial text-xl text-slate-100">Your patterns</h1>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Evidence-based patterns from your check-ins and phone behaviour. Everything stays on this device.
        </p>
      </header>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Phone behaviour insights */}
          {(behaviourInsights.length > 0 || assessmentInsightsList.length > 0) ? (
            <>
              {behaviourInsights.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Phone behaviour patterns
                  </h2>
                  <div className="space-y-3">
                    {behaviourInsights.map((insight, i) => (
                      <InsightCard insight={insight} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {assessmentInsightsList.length > 0 && (
                <section className="space-y-2 pt-2 border-t border-slate-800/50">
                  <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Assessment trends
                  </h2>
                  <div className="space-y-3">
                    {assessmentInsightsList.map((insight, i) => (
                      <InsightCard insight={insight} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {/* N-of-1 personal correlations */}
              {no1Insights.length > 0 && (
                <section className="space-y-2 pt-2 border-t border-slate-800/50">
                  <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> What affects you most
                  </h2>
                  <p className="text-[11px] text-slate-500 italic px-1">
                    Patterns from your protocol completions — may not always hold, but worth noticing.
                  </p>
                  <div className="space-y-3">
                    {no1Insights.map((insight, i) => (
                      <div key={insight.protocolId} className="glass rounded-2xl p-4 border border-amber-500/20 space-y-1.5">
                        <p className="text-xs font-medium text-amber-300">{insight.protocolName}</p>
                        <p className="text-xs text-slate-300">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {dataDays > 0 && behaviourInsights.length === 0 && assessmentInsightsList.length === 0 && no1Insights.length === 0 && (
                <div className="glass rounded-2xl p-4 border border-slate-700/50">
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    You have <span className="text-slate-200 font-medium">{dataDays}</span> paired day{dataDays > 1 ? 's' : ''} of data.
                    Need at least <span className="text-slate-200 font-medium">5 days</span> per pattern for an insight to appear.
                    Keep checking in — patterns take time.
                  </p>
                </div>
              )}
            </>
          ) : (
            <EmptyState />
          )}

          {/* Phone data permission hint */}
          {!phoneDataAvailable && (
            <div className="glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">Phone behaviour insights unavailable</span>
              </div>
              <p className="text-xs text-slate-400">
                Android usage-stats permission is needed for screen-time, sleep, and movement patterns.
                <br />This only runs on Android; web/iOS shows self-reported data only.
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center leading-relaxed px-4">
            NilaMind is a support alongside — not a substitute for — professional care.
          </p>
        </>
      )}
    </div>
  );
}