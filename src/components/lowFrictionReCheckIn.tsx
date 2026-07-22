/**
 * Low-friction re-check-in — one-tap mood log for returning users.
 *
 * When a user returns to TodayScreen and hasn't checked in today, this component
 * shows 4 large mood buttons (good/okay/low/struggling) for a frictionless
 * mood log. Reduces the cognitive cost of a full check-in after a gap.
 *
 * Research basis: Bear Room's "tap-in" (single tap replaces full check-in).
 * Skye's "pause" (minimal friction for logging). High friction check-ins
 * cause 60%+ dropout after Day 3.
 */

import { Sparkle } from "lucide-react";
import { buildCheckinEntry, appendCheckin } from "../services/checkin";

// Design review 2026-07-18: this "one-tap" card was a false affordance three ways — it wrote a malformed
// entry ({date,mood,source}, no `emotion`/`intensity`) so the mood card then showed "Feeling " blank; the
// tap then STILL opened the full form (one tap → four); and "Skip" also opened the form. Now a tap writes a
// real check-in and finishes; skip dismisses.
const MOOD_TO_CHECKIN: Record<string, [string, number]> = {
  good: ["good", 3],
  okay: ["okay", 3],
  low: ["low", 5],
  struggling: ["overwhelmed", 7],
};

const MOOD_OPTIONS = [
  { label: "Good", emoji: "😊", value: "good", color: "bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30" },
  { label: "Okay", emoji: "😐", value: "okay", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30" },
  { label: "Low", emoji: "😔", value: "low", color: "bg-blue-500/20 text-blue-300 border-accent/30 hover:bg-blue-500/30" },
  // Fable review (2026-07-19): this was raw Tailwind bg-red-500/text-red-300 — unmapped, the one color
  // in this exact 4-chip array that hadn't been folded into the warm palette (green/blue/yellow all
  // were). Rose is this app's actual "warm red" family (muted terracotta, never bright red) — using its
  // ramp values (not the --color-danger role token itself) matches how "Low" uses blue ramp values
  // without claiming to be --color-accent.
  { label: "Struggling", emoji: "😰", value: "struggling", color: "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30" },
] as const;

export function getReCheckInMessage(daysSinceLast: number): string {
  if (daysSinceLast <= 3) {
    return "A quick check-in can help you reconnect with how you're doing.";
  }
  if (daysSinceLast <= 7) {
    return "Welcome back — a quick check-in helps us pick up where you left off.";
  }
  return "It's been a while. A quick mood check helps me understand where you're at right now.";
}

interface LowFrictionReCheckInProps {
  onMoodSelect: (mood: string) => void;
  onSkip: () => void;
  daysSinceLast?: number;
}

export default function LowFrictionReCheckIn({ onMoodSelect, onSkip, daysSinceLast = 2 }: LowFrictionReCheckInProps) {
  const handleMood = (mood: string) => {
    try {
      const [label, intensity] = MOOD_TO_CHECKIN[mood] ?? ["okay", 3];
      appendCheckin(buildCheckinEntry(label, intensity, null)); // well-formed — Today reads emotion/intensity
    } catch { /* best-effort */ }
    onMoodSelect(mood); // parent just refreshes now — it must NOT re-open the full form
  };

  return (
    <div className="glass p-4 rounded-2xl space-y-3 border border-blue-400/10">
      <div className="flex items-center gap-2">
        <Sparkle className="w-4 h-4 text-blue-400" />
        <p className="text-sm font-semibold text-ink-2">How are you right now?</p>
      </div>
      <p className="text-[11px] text-ink-muted leading-relaxed">
        {getReCheckInMessage(daysSinceLast)}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MOOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleMood(opt.value)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium transition cursor-pointer min-h-[44px] ${opt.color}`}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="w-full text-[11px] text-ink-faint hover:text-ink-2 transition py-1 cursor-pointer"
      >
        Skip for now
      </button>
    </div>
  );
}
