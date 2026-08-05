import { Activity, Clock, BrainCircuit, MessageSquare, Pill, Moon, Mic, Clock3, Sparkles } from "lucide-react";
import { type I18nKey, type SupportedLang } from "../services/i18n";
import type { AdherenceSummary } from "../services/medicationAdherence";
import type { DisengagementRisk } from "../services/disengagementPredictor";
import type { CircadianInsight } from "../services/circadian";
import type { CircadianFeedback } from "../services/circadianFeedback";
import type { RhythmRegularity } from "../services/socialRhythm";
import type { No1RankingEntry } from "../services/nOf1";
import CollapsibleSection from "./CollapsibleSection";
import BandNarrative from "./BandNarrative";
import Card from "./Card";
import EmptyState from "./EmptyState";
import { PROTOCOLS } from "../services/protocols";

export interface SignalsBandProps {
  t: (key: I18nKey, lang?: SupportedLang) => string;
  openSignals: boolean;
  summary: string;
  showDisengagement: boolean;
  showDependency: boolean;
  showCeiling: boolean;
  showConnection: boolean;
  showTyping: boolean;
  showVoice: boolean;
  showCircadian: boolean;
  showCircadianFeedback: boolean;
  disengagementRisk: DisengagementRisk | null;
  depLevel: string | null;
  depReason: string;
  ceilingStatus: string | null;
  ceilingMessage: string;
  connLevel: string | null;
  connReason: string;
  medSummary: AdherenceSummary;
  typingSignal: "mania" | "depression" | "anxiety" | null;
  voiceSignal: "mania" | "depression" | "anxiety" | null;
  circadian: CircadianInsight | null;
  circadianFeedback: CircadianFeedback | null;
  rhythmReg: RhythmRegularity | null;
  nOf1: No1RankingEntry[];
}

/**
 * The "Signals & patterns" band. Self-contained so the dashboard's main screen stays readable.
 * Every card's visibility is driven by the `show*` booleans passed in — they are the single source
 * of truth also used to compute `signalCount` upstream, so the rendered cards and the band's
 * narrative count can never drift apart.
 */
export default function SignalsBand({
  t,
  openSignals,
  summary,
  showDisengagement,
  showDependency,
  showCeiling,
  showConnection,
  showTyping,
  showVoice,
  showCircadian,
  showCircadianFeedback,
  disengagementRisk,
  depLevel,
  depReason,
  ceilingStatus,
  ceilingMessage,
  connLevel,
  connReason,
  medSummary,
  typingSignal,
  voiceSignal,
  circadian,
  circadianFeedback,
  rhythmReg,
  nOf1,
}: SignalsBandProps) {
  const hasAnySignal =
    showDisengagement ||
    showDependency ||
    showCeiling ||
    showConnection ||
    showTyping ||
    showVoice ||
    showCircadian ||
    showCircadianFeedback ||
    medSummary.activeMeds > 0 ||
    (rhythmReg && rhythmReg.daysLogged >= 3 && rhythmReg.anchors.some((a) => a.meanTime)) ||
    nOf1.length > 0;

  return (
    <CollapsibleSection title={t("signals_patterns")} summary={summary} defaultOpen={openSignals}>
      <BandNarrative text={t("signals_summary")} />
      {!hasAnySignal && (
        <EmptyState
          nilaState="calm"
          title={t("no_signals_title")}
          body={t("no_signals_yet")}
        />
      )}
      {/* Engagement disengagement risk — early warning when usage declines */}
      {showDisengagement && (
        <Card variant="raised" gap="none" className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${disengagementRisk!.riskLevel === "high" ? "bg-danger/10 text-danger" : disengagementRisk!.riskLevel === "elevated" ? "bg-warn/10 text-warn" : "bg-accent/10 text-accent"}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Engagement trend</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${disengagementRisk!.riskLevel === "high" ? "bg-danger/20 text-rose-300" : disengagementRisk!.riskLevel === "elevated" ? "bg-warn/20 text-warn-hi" : "bg-accent/20 text-accent-hi"}`}>
                {disengagementRisk!.score}/100
              </span>
            </div>
            <p className="text-base text-slate-400 leading-relaxed mt-1">
              {disengagementRisk!.daysSinceLastCheckin >= 3
                ? `It's been ${disengagementRisk!.daysSinceLastCheckin} days since your last check-in. `
                : ""}
              {disengagementRisk!.frequencyTrend === "declining"
                ? "Your check-in frequency has been tapering off — no pressure, just noticing."
                : "Your recent engagement has been lower — whenever you're ready."}
            </p>
            <p className="text-xs text-slate-500 mt-1">A gentle observation, not a measure of you.</p>
          </div>
        </Card>
      )}

      {/* Dependency signal — when usage suggests over-reliance */}
      {showDependency && (
        <Card variant="raised" gap="none" className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${depLevel === "severe" ? "bg-danger/10 text-danger" : depLevel === "moderate" ? "bg-warn/10 text-warn" : "bg-accent/10 text-accent"}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-100">Usage balance</p>
            <p className="text-base text-slate-400 leading-relaxed mt-1">{depReason}</p>
            <p className="text-xs text-slate-500 mt-1">Nila is here when you need her — real connections matter too.</p>
          </div>
        </Card>
      )}

      {/* Usage ceiling — daily turn limit reached */}
      {showCeiling && (
        <Card variant="raised" gap="none" className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-warn/10 text-warn">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-100">Take a breather</p>
            <p className="text-base text-slate-400 leading-relaxed mt-1">{ceilingMessage}</p>
            <p className="text-xs text-slate-500 mt-1">This resets tomorrow. No pressure.</p>
          </div>
        </Card>
      )}

      {/* Human connection — social interaction metric */}
      {showConnection && (
        <Card variant="raised" gap="none" className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-success/10 text-success">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-100">Social connection</p>
            <p className="text-base text-slate-400 leading-relaxed mt-1">{connReason}</p>
            <p className="text-xs text-slate-500 mt-1">Even a quick message counts.</p>
          </div>
        </Card>
      )}

      {/* Medication adherence summary */}
      {medSummary.activeMeds > 0 && (
        <Card variant="raised" gap="none" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">Medication adherence</p>
              <p className="text-[11px] text-slate-400">{medSummary.activeMeds} active medication{medSummary.activeMeds === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-100">{medSummary.avgAdherence}%</p>
            <p className="text-xs text-slate-500">last 7 days</p>
          </div>
        </Card>
      )}

      {/* Typing pattern signal */}
      {showTyping && (
        <Card variant="raised" gap="none" className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Typing pattern note</p>
            <p className="text-base text-slate-400 leading-relaxed">
              {typingSignal === "mania" && "Your recent typing has been unusually fast and bursty — sometimes a sign of elevated energy. A quick check-in might help."}
              {typingSignal === "depression" && "Your recent typing has been slower with more pauses — a gentle check-in could be worth it."}
              {typingSignal === "anxiety" && "Your recent typing shows a lot of starts and stops — maybe take a slow breath when you're ready."}
            </p>
            <p className="text-xs text-slate-500 mt-1">Private: only timing is stored, never what you typed.</p>
          </div>
        </Card>
      )}

      {/* Voice pattern signal */}
      {showVoice && (
        <Card variant="raised" gap="none" className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-danger/10 text-danger">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Voice pattern note</p>
            <p className="text-base text-slate-400 leading-relaxed">
              {voiceSignal === "mania" && "Your recent speech patterns have been faster than usual — sometimes a sign of elevated energy. A quick check-in might help."}
              {voiceSignal === "depression" && "Your recent speech has been slower with shorter responses — a gentle check-in could be worth it."}
              {voiceSignal === "anxiety" && "Your recent speech pattern shows some variability — maybe take a slow breath when you're ready."}
            </p>
            <p className="text-xs text-slate-500 mt-1">Opt-in: only speaking rate is stored locally, never what you said.</p>
          </div>
        </Card>
      )}

      {/* Circadian rhythm regularity */}
      {showCircadian && (
        <Card variant="raised" gap="none" className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Sleep regularity</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${circadian!.irregular ? "bg-warn/20 text-warn-hi" : "bg-success/20 text-success-hi"}`}>
                {circadian!.regularityScore}/100
              </span>
            </div>
            <p className="text-base text-slate-400 leading-relaxed mt-1">{circadian!.note}</p>
            <p className="text-xs text-slate-500 mt-1">From {circadian!.nights} nights of self-reported sleep. Avg {circadian!.avgSleep}h.</p>
          </div>
        </Card>
      )}

      {/* Fused circadian + social rhythm feedback loop */}
      {showCircadianFeedback && (
        <Card variant="raised" gap="none" className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${circadianFeedback!.needsAttention ? "bg-warn/10 text-warn" : "bg-success/10 text-success"}`}>
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Rhythm stability</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${circadianFeedback!.needsAttention ? "bg-warn/20 text-warn-hi" : "bg-success/20 text-success-hi"}`}>
                {circadianFeedback!.combinedScore}/100
              </span>
            </div>
            <p className="text-base text-slate-400 leading-relaxed mt-1">{circadianFeedback!.guidance}</p>
          </div>
        </Card>
      )}

      {/* Social rhythm per-anchor breakdown (Phase 10) */}
      {rhythmReg && rhythmReg.daysLogged >= 3 && rhythmReg.anchors.some((a) => a.meanTime) && (
        <Card variant="raised">
          <p className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-accent" /> Anchor timing
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
          <p className="text-xs text-slate-500">
            Over {rhythmReg.daysLogged} days · <span className="italic">Smaller ± is steadier</span>
          </p>
        </Card>
      )}

      {/* N-of-1: what helps THIS person */}
      {nOf1.length > 0 && (
        <Card variant="raised">
          <p className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warn" /> What's been helping you
          </p>
          {nOf1.slice(0, 3).map((r) => {
            const title = PROTOCOLS.find((p) => p.id === r.protocolId)?.title ?? r.protocolId;
            return (
              <div key={r.protocolId} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{title}</span>
                <span className={r.avgDelta < 0 ? "text-success-hi" : "text-slate-400"}>
                  {r.avgDelta < 0 ? "↘ steadier after" : "↗ more distress after"} · {r.completions}×
                </span>
              </div>
            );
          })}
          <p className="text-xs text-slate-500">Your own pattern, from completed programs. Not a diagnosis.</p>
        </Card>
      )}
    </CollapsibleSection>
  );
}
