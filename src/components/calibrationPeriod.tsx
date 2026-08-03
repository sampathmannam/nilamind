/**
 * Calibration period card — "I'm learning your patterns" for day 0-30.
 *
 * Shows a gentle, progress-based card during the first 30 days when the app
 * doesn't have enough personal data for personalized insights. Reassures
 * the user that the app is learning and encourages continued engagement.
 *
 * Research basis: Calibration-period transparency improves trust and retention
 * in adaptive health apps (Simoens et al., 2024). Showing progress reduces
 * uncertainty about whether the app is "working."
 */

import React from "react";
import { Sparkles } from "lucide-react";

const CALIBRATION_DAYS = 30;

export function daysSinceFirstCheckin(startDate: string): number {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
}

export function getCalibrationMessage(days: number): string {
  if (days <= 7) {
    return "I'm just getting to know you. The more you check in, the better I can understand your patterns.";
  }
  if (days <= 20) {
    return "I'm starting to notice your patterns. Keep checking in — I'm learning what helps you feel your best.";
  }
  return "I'm building a clearer picture of your patterns. Almost at the point where I can offer more personalized insights.";
}

interface CalibrationPeriodCardProps {
  startDate: string;
}

function CalibrationPeriodCard({ startDate }: CalibrationPeriodCardProps) {
  const days = daysSinceFirstCheckin(startDate);
  if (days >= CALIBRATION_DAYS) return null;

  const progress = Math.min(100, Math.round((days / CALIBRATION_DAYS) * 100));
  const message = getCalibrationMessage(days);
  const daysLeft = CALIBRATION_DAYS - days;

  return (
    <div className="glass rounded-2xl p-4 flex items-start gap-3">
      <div className="p-2 rounded-xl bg-accent/10 text-accent">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Learning your patterns</p>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent-hi">
            {progress}%
          </span>
        </div>
        <p className="text-[11px] text-ink-muted leading-relaxed mt-1">{message}</p>
        <div className="mt-2 w-full bg-line-strong rounded-full h-1.5">
          <div
            className="bg-accent h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-ink-faint mt-1">{daysLeft} days until full personalization.</p>
      </div>
    </div>
  );
}

export default React.memo(CalibrationPeriodCard);
