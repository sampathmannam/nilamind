import React from "react";
import { useLanguage } from "../services/i18n";

interface Props {
  /** Illustration to show (emoji or SVG). */
  illustration: React.ReactNode;
  /** Primary message. */
  title: string;
  /** Supporting text. */
  body: string;
  /** Optional call-to-action button. */
  cta?: {
    label: string;
    onClick: () => void;
  };
  /** Optional secondary action. */
  secondary?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * EmptyState — a warm, illustrated empty state for screens with no data.
 * Shows an illustration, title, body, and optional CTA.
 * Designed to feel like a gentle invitation, not a blank wall.
 */
export default function EmptyState({ illustration, title, body, cta, secondary }: Props) {
  useLanguage();

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10 space-y-4">
      <div className="text-4xl">{illustration}</div>
      <div className="space-y-1.5 max-w-xs">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">{body}</p>
      </div>
      {cta && (
        <button
          onClick={cta.onClick}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors"
        >
          {cta.label}
        </button>
      )}
      {secondary && (
        <button
          onClick={secondary.onClick}
          className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
        >
          {secondary.label}
        </button>
      )}
    </div>
  );
}

/**
 * Pre-built empty states for common screens.
 * Each uses the warm companion voice and a relevant illustration.
 */
export const EMPTY_STATES = {
  noCheckins: {
    illustration: "🌱",
    title: "Your story starts here",
    body: "A quick check-in takes 30 seconds. Even one tap helps your patterns grow.",
  },
  noEpisodes: {
    illustration: "🌿",
    title: "No episodes yet",
    body: "That's a good sign. If you do log one, here's what we track: the phase, how long it lasted, and what helped.",
  },
  noMoodData: {
    illustration: "📊",
    title: "Your mood story starts with one check-in",
    body: "After a few days, you'll see patterns emerge — what helps, what triggers, and how you're trending.",
  },
  noCaregiverContacts: {
    illustration: "🤝",
    title: "Share with someone you trust",
    body: "Adding a trusted person means you can share a wellness snapshot when you need support.",
  },
  noWellbeingChecks: {
    illustration: "💚",
    title: "Track your wellbeing over time",
    body: "A fortnightly WHO-5 check takes 2 minutes and shows how your wellbeing trends over months.",
  },
  noAssessments: {
    illustration: "📝",
    title: "No screenings yet",
    body: "Complete a PHQ-9 or GAD-7 to see your scores trend over time. Research-backed, takes 2 minutes.",
  },
  noInsights: {
    illustration: "💡",
    title: "Insights emerge with data",
    body: "Keep checking in — after a few days, Nila will notice patterns and share what she finds.",
  },
  noMedications: {
    illustration: "💊",
    title: "No medications tracked",
    body: "Add your medications to get gentle reminders and track adherence over time.",
  },
  noProtocols: {
    illustration: "🧰",
    title: "No protocols started yet",
    body: "Protocols are research-backed skill programs. Start one to build a new habit.",
  },
  noDiaryEntries: {
    illustration: "📖",
    title: "Your diary is empty",
    body: "Write a few lines about your day. It helps you process and reflect.",
  },
  noSleepData: {
    illustration: "🌙",
    title: "No sleep data yet",
    body: "Log your sleep for a few days to see patterns and get personalized suggestions.",
  },
  noSocialRhythm: {
    illustration: "⏰",
    title: "Build your rhythm",
    body: "Track your daily anchors (wake, meals, sleep) to see how regular your rhythm is.",
  },
} as const;
