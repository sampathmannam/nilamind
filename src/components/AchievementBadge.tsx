import React from "react";
import { useLanguage } from "../services/i18n";
import type { Achievement } from "../services/achievements";

interface Props {
  achievement: Achievement;
  /** Show as locked (grayed out) or unlocked (colored). */
  locked?: boolean;
  /** Compact mode for inline display. */
  compact?: boolean;
  onClick?: () => void;
}

/**
 * AchievementBadge — a warm, celebratory badge showing an achievement.
 * Inspired by Finch's achievement system: emoji icon + title + description.
 * Locked achievements are grayed out with a subtle lock indicator.
 */
function AchievementBadge({ achievement, locked = false, compact = false, onClick }: Props) {
  useLanguage();

  const Wrapper = onClick ? "button" : "div";
  const wrapperProps = onClick
    ? { onClick, className: "text-left cursor-pointer" }
    : { className: "" };

  if (compact) {
    return (
      <Wrapper {...wrapperProps}>
        <div
          /* Matching the non-compact variant's own glass + locked/unlocked pattern below,
             instead of the two ad-hoc flat opacities this used before. */
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all glass ${
            locked ? "text-ink-faint opacity-60" : "text-ink-2"
          }`}
          title={locked ? `Locked: ${achievement.description}` : achievement.description}
        >
          <span className={locked ? "opacity-40 grayscale" : ""}>{achievement.icon}</span>
          <span>{achievement.title}</span>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper {...wrapperProps}>
      <div
        className={`glass rounded-2xl p-4 space-y-2 transition-all ${
          locked ? "opacity-50" : "hover:brightness-110"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-2xl ${locked ? "opacity-40 grayscale" : ""}`}>
            {achievement.icon}
          </span>
          <div className="space-y-0.5 min-w-0">
            <p className={`text-sm font-semibold ${locked ? "text-ink-faint" : "text-ink-2"}`}>
              {achievement.title}
            </p>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              {achievement.description}
            </p>
          </div>
        </div>
        {achievement.unlockedAt && !locked && (
          <p className="text-xs text-ink-faint">
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        )}
        {locked && (
          <p className="text-xs text-slate-600 italic">Keep going to unlock</p>
        )}
      </div>
    </Wrapper>
  );
}

export default React.memo(AchievementBadge);
