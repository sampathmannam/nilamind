import React, { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { useLanguage } from "../services/i18n";
import ConfettiBurst from "./ConfettiBurst";
import Card from "./Card";
import { hapticCelebration } from "../hooks/useHaptics";

interface Props {
  current: number;
  longest: number;
  totalActiveDays: number;
  celebrate?: boolean;
}

const MILESTONES = [3, 7, 14, 30, 100];

export default function StreakCounter({ current, longest, totalActiveDays, celebrate = false }: Props) {
  useLanguage();
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (celebrate && MILESTONES.includes(current)) {
      setShowCelebration(true);
      hapticCelebration();
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [celebrate, current]);

  if (current === 0 && longest === 0) return null;

  const milestone = MILESTONES.includes(current);
  const progress = current >= 100 ? 1 : (current % (MILESTONES.find((m) => m > current) ?? current + 1)) / (MILESTONES.find((m) => m > current) ?? current + 1);

  return (
    <div className="relative">
      <ConfettiBurst active={showCelebration} count={15} duration={1500} onComplete={() => setShowCelebration(false)} />
      <Card className={`transition-all ${showCelebration ? "ring-2 ring-amber-400/50" : ""}`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Flame className={`w-5 h-5 transition-all ${current > 0 ? "text-amber-400" : "text-slate-600"} ${showCelebration ? "scale-125" : ""}`} />
            {showCelebration && (
              <div className="absolute inset-0 animate-ping">
                <Flame className="w-5 h-5 text-amber-400/50" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">
              {current > 0 ? `${current}-day streak` : "Start your streak"}
            </p>
            {current > 0 && (
              <p className="text-xs text-ink-muted">
                Longest: {longest} · {totalActiveDays} active days all-time
              </p>
            )}
          </div>
          {milestone && (
            <span className="text-lg" title={`Milestone: ${current} days!`}>
              {current >= 100 ? "💯" : current >= 30 ? "⭐" : current >= 14 ? "🌟" : current >= 7 ? "🔥" : "✨"}
            </span>
          )}
        </div>

        {current > 0 && current < 100 && (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-ink-muted text-right">
              Next: {MILESTONES.find((m) => m > current) ?? "∞"} days
            </p>
          </div>
        )}
      </Card>

      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-4xl animate-bounce">🎉</div>
        </div>
      )}
    </div>
  );
}
