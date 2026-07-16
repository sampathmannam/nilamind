/**
 * Welcome-back card — gap-aware re-entry component.
 *
 * Shows a warm, non-judgmental welcome-back message when the user returns
 * after a gap of 1+ days. No guilt, no streak punishment — just a warm
 * acknowledgment. The message adapts to the gap length.
 *
 * Research basis: Punitive streak mechanics drive 95% Day-30 abandonment.
 * Bear Room's "forgiving streak" approach (3-day window) and Skye's
 * constellation metaphor (no streaks) both show gentleness improves retention.
 */

import React from "react";
import { MessageCircle } from "lucide-react";

export function daysSinceLastVisit(lastVisitDate: string): number {
  const last = new Date(lastVisitDate);
  if (isNaN(last.getTime())) return 0;
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - last.getTime()) / 86_400_000));
}

export function getWelcomeMessage(days: number): string {
  if (days <= 2) {
    return "Good to see you again. I'm here whenever you're ready to talk.";
  }
  if (days <= 6) {
    return "It's been a little while — I'm glad you're back. No pressure, just here when you need me.";
  }
  if (days <= 29) {
    return "I've missed you. Whatever brought you back, I'm glad you're here. Let's pick up wherever you left off.";
  }
  return "Welcome back — it's been a while, and I'm really glad you're here. Everything starts fresh whenever you're ready.";
}

interface WelcomeBackCardProps {
  lastVisitDate: string;
  onDismiss: () => void;
}

export default function WelcomeBackCard({ lastVisitDate, onDismiss }: WelcomeBackCardProps) {
  const days = daysSinceLastVisit(lastVisitDate);
  if (days < 1) return null;

  const message = getWelcomeMessage(days);

  return (
    <div className="w-full px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
      <div className="flex items-start gap-2">
        <MessageCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[13px] text-slate-200 leading-relaxed">{message}</p>
          <p className="text-[11px] text-slate-400 mt-1">Welcome back — {days} day{days === 1 ? "" : "s"} away.</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onDismiss}
              className="text-[11px] px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
