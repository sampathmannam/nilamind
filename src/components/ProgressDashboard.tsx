import { useMemo } from "react";
import { ArrowLeft, Trophy, Flame } from "lucide-react";
import { t } from "../services/i18n";
import { computeStreak, computeCompassionateStreak } from "../services/streaks";
import { getAllAchievements, getAchievementCount } from "../services/achievements";
import StreakCounter from "./StreakCounter";
import AchievementBadge from "./AchievementBadge";
import Section from "./Section";

interface ProgressDashboardProps {
  onClose: () => void;
}

// Streak milestones that earn a celebration beat (mirrors StreakCounter's MILESTONES).
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

/**
 * Dedicated progress view (UX-8 Gamification): the home for streaks, milestones, and earned
 * achievements — surfaced from the "You" hub so the engagement layer has one clear home rather than
 * being scattered. Composes the existing StreakCounter + AchievementBadge primitives (no duplicate
 * logic); reads only local, on-device data. Locked achievements are shown grayed so the journey is
 * visible, never a wall of empties.
 */
export default function ProgressDashboard({ onClose }: ProgressDashboardProps) {
  const streak = useMemo(() => computeStreak(), []);
  const compassionate = useMemo(() => computeCompassionateStreak(), []);
  const achievements = useMemo(() => getAllAchievements(), []);
  const unlocked = getAchievementCount();
  const atMilestone = STREAK_MILESTONES.includes(streak.current);

  return (
    <div className="min-h-screen bg-page" id="progress-dashboard">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2" style={{ paddingTop: "var(--safe-top)" }}>
        <button
          onClick={onClose}
          aria-label={t("back")}
          className="p-2 -ml-2 rounded-full text-ink-2 hover:bg-fill transition-colors focus-ring"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="editorial text-2xl text-ink">{t("you_progress_label")}</h1>
      </header>

      <div className="space-y-5 max-w-md mx-auto px-4 pb-8">
        {/* Compassionate streak line */}
        <div className="glass rounded-2xl py-3 px-4 text-center flex items-center justify-center gap-2">
          <span aria-hidden="true">{compassionate.emoji}</span>
          <p className="text-sm text-ink">{compassionate.message}</p>
        </div>

        {/* Streak counter + milestone beat */}
        <StreakCounter
          current={streak.current}
          longest={streak.longest}
          totalActiveDays={streak.totalActiveDays}
          celebrate={atMilestone}
        />
        {atMilestone && (
          <div className="flex items-center justify-center gap-2 text-xs text-warn-hi">
            <Trophy className="w-4 h-4" aria-hidden="true" />
            <span>{t("streak_milestone_reached")}</span>
          </div>
        )}

        {/* Achievements — full grid, locked shown grayed */}
        <Section
          title={t("achievements_title")}
          action={<span className="text-ink-muted text-xs">{unlocked}/{achievements.length}</span>}
        >
          {unlocked === 0 ? (
            <p className="text-xs text-ink-muted leading-relaxed">{t("achievements_empty")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {achievements.map((a) => (
                <AchievementBadge key={a.id} achievement={a} locked={a.unlockedAt == null} />
              ))}
            </div>
          )}
        </Section>

        {/* Milestones legend */}
        <Section title={t("milestones_title")}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <Flame className="w-4 h-4 text-warn" aria-hidden="true" />
            <span>{t("milestones_body")}</span>
          </div>
        </Section>
      </div>
    </div>
  );
}
