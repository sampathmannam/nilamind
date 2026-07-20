import React from "react";
import { Flame, CalendarCheck, MessageSquare } from "lucide-react";
import { t } from "../services/i18n";
import { getAllAchievements, getAchievementCount } from "../services/achievements";
import { computeStreak, computeCompassionateStreak } from "../services/streaks";
import Section from "./Section";
import StreakCounter from "./StreakCounter";
import StatCard from "./StatCard";
import AchievementBadge from "./AchievementBadge";
import type { UsageSummary } from "../services/usageAnalytics";
import type { ProtocolAdherenceSummary } from "../services/protocolAdherence";

interface ActivitySectionProps {
  streak: ReturnType<typeof computeStreak>;
  compassionateStreak: ReturnType<typeof computeCompassionateStreak>;
  freq14: number;
  nilaChats7d: number;
  usageSummary: UsageSummary;
  protocolAdherence: ProtocolAdherenceSummary;
  /** Localized streak line (defaults to the English message from computeCompassionateStreak). */
  streakMessage?: string;
}

function ActivitySection({
  streak,
  compassionateStreak,
  freq14,
  nilaChats7d,
  usageSummary,
  protocolAdherence,
  streakMessage,
}: ActivitySectionProps) {

  return (
    <>
      {/* Compassionate streak */}
      <div className="glass rounded-2xl py-3 px-4 text-center flex items-center justify-center gap-2">
        <span aria-hidden="true">{compassionateStreak.emoji}</span>
        <p className="text-sm text-ink">{streakMessage ?? compassionateStreak.message}</p>
      </div>

      {/* Streak counter */}
      <StreakCounter
        current={streak.current}
        longest={streak.longest}
        totalActiveDays={streak.totalActiveDays}
      />

      {/* Achievements */}
      {getAchievementCount() > 0 && (
        <Section title="Achievements" action={<span className="text-ink-muted text-xs">{getAchievementCount()}/{getAllAchievements().length}</span>}>
          <div className="flex flex-wrap gap-1.5">
            {getAllAchievements()
              .filter((a) => a.unlockedAt != null)
              .slice(0, 6)
              .map((a) => (
                <AchievementBadge key={a.id} achievement={a} compact />
              ))}
          </div>
        </Section>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={<CalendarCheck className="w-4 h-4 text-emerald-400" />} value={`${freq14}/14`} label={t("days_logged")} />
        <StatCard icon={<MessageSquare className="w-4 h-4 text-purple-400" />} value={String(nilaChats7d)} label={t("nila_chats_7d")} />
      </div>
      {streak.longest > 0 && (
        <p className="text-[11px] text-ink-muted -mt-2 text-center flex items-center justify-center gap-1">
          <Flame className="w-3 h-3 text-amber-400/70" aria-hidden="true" />
          {streak.current}-day streak · Longest: {streak.longest} days · {streak.totalActiveDays} active days all-time
        </p>
      )}

      {/* Usage Analytics */}
      {usageSummary.totalCheckins > 0 && (
        <Section title={t("your_usage")}>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-page p-2.5 rounded-xl text-center border border-slate-850">
              <p className="text-lg font-bold text-ink font-mono">{usageSummary.totalCheckins}</p>
              <p className="text-xs text-ink-muted uppercase tracking-wide">{t("usage_checkins")}</p>
            </div>
            <div className="bg-page p-2.5 rounded-xl text-center border border-slate-850">
              <p className="text-lg font-bold text-ink font-mono">{usageSummary.protocols.completed}</p>
              <p className="text-xs text-ink-muted uppercase tracking-wide">{t("usage_programs")}</p>
            </div>
            <div className="bg-page p-2.5 rounded-xl text-center border border-slate-850">
              <p className="text-lg font-bold text-ink font-mono">{Object.keys(usageSummary.assessments).length}</p>
              <p className="text-xs text-ink-muted uppercase tracking-wide">{t("usage_assessments")}</p>
            </div>
            <div className="bg-page p-2.5 rounded-xl text-center border border-slate-850">
              <p className="text-lg font-bold text-ink font-mono">{usageSummary.features.length}</p>
              <p className="text-xs text-ink-muted uppercase tracking-wide">{t("usage_features")}</p>
            </div>
          </div>
          {usageSummary.avgMood != null && (
            <p className="text-xs text-ink-muted text-center">
              Avg mood: <span className="font-mono text-ink">{usageSummary.avgMood.toFixed(1)}/10</span>
              {usageSummary.topEmotion && <> · Top: <span className="text-ink capitalize">{usageSummary.topEmotion}</span></>}
              {usageSummary.features.includes("values_snapshot") && <> · <span className="text-emerald-400">Values set ✓</span></>}
            </p>
          )}
          {usageSummary.moodSleepCorrelation && (
            <p className="text-xs text-ink-muted text-center">
              Sleep: {usageSummary.moodSleepCorrelation.highSleepMood.toFixed(1)}/10 with ≥7h sleep · {usageSummary.moodSleepCorrelation.lowSleepMood.toFixed(1)}/10 with &lt;7h
              {usageSummary.sleepTrend && (
                <> · Last 3-check-in avg: <span className={usageSummary.sleepTrend.recentAvg >= usageSummary.sleepTrend.olderAvg ? "text-emerald-400" : "text-amber-400"}>{usageSummary.sleepTrend.recentAvg.toFixed(1)}h</span></>
              )}
            </p>
          )}
        </Section>
      )}

      {/* Protocol Adherence */}
      {protocolAdherence.totalStarted > 0 && (
        <Section title="Your programs">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div>
                <p className="text-lg font-bold text-ink font-mono">{protocolAdherence.totalCompleted}</p>
                <p className="text-xs text-ink-muted uppercase tracking-wide">completed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-ink font-mono">{protocolAdherence.totalAbandoned}</p>
                <p className="text-xs text-ink-muted uppercase tracking-wide">incomplete</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-ink">{Math.round(protocolAdherence.adherenceRate * 100)}%</p>
              <p className="text-xs text-ink-muted uppercase tracking-wide">completion rate</p>
            </div>
          </div>
          {protocolAdherence.perProtocol.filter((p) => p.started > 0).length > 0 && (
            <div className="border-t border-line-strong/50 pt-2 mt-1 space-y-1">
              {protocolAdherence.perProtocol.filter((p) => p.started > 0).slice(0, 4).map((p) => (
                <div key={p.protocolId} className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted truncate max-w-[60%]">{p.title}</span>
                  <span className="text-ink-muted tabular-nums">
                    {p.completed}/{p.started}
                    {p.avgStepsCompleted > 0 && <span className="text-ink-muted"> · ~{p.avgStepsCompleted} steps</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-ink-muted">Programs you've started and completed. Not a measure of you.</p>
        </Section>
      )}
    </>
  );
}

export default React.memo(ActivitySection);
