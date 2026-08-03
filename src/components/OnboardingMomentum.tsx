import { useState } from "react";

interface OnboardingMomentumProps {
  onComplete?: () => void;
}

/** Goal → Journal → Insight sequence – core onboarding flow that builds therapeutic investment */
export default function OnboardingMomentum({ onComplete }: OnboardingMomentumProps) {
  const [step, setStep] = useState<"goal" | "journal" | "insight">("goal");
  const [goal, setGoal] = useState<string>("");
  const [journalEntry, setJournalEntry] = useState<string>("");
  const [insight, setInsight] = useState<string | null>(null);

  const handleStartGoal = () => {
    if (!goal.trim()) return;
    setStep("journal");
  };

  const handleNext = () => {
    if (step === "journal") {
      if (!journalEntry.trim()) return;
      setInsight("Your mood pattern reveals you respond well to structured daily check-ins. Try 3-2-1 gratitude before each habit. Stay consistent.");
      setStep("insight");
    } else if (insight) {
      onComplete?.();
    }
  };

  return (
    <div className="space-y-6">
      {step === "goal" && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">What's your primary wellness goal this month?</h3>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Reduce anxiety, improve sleep, manage stress"
            className="w-full rounded-lg border-[var(--color-slate-300)] border p-3 focus:border-[var(--color-peach-400)] focus:outline-none dark:border-[var(--color-slate-400)]"
          />
          <button
            onClick={handleStartGoal}
            disabled={!goal.trim()}
            className="w-full rounded-lg bg-[var(--color-peach-400)] py-3 text-[var(--color-slate-900)] font-medium hover:bg-[var(--color-peach-500)] disabled:opacity-50"
          >
            Begin Journey
          </button>
        </div>
      )}

      {step === "journal" && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">How did you feel today?</h3>
          <textarea
            value={journalEntry}
            onChange={(e) => setJournalEntry(e.target.value)}
            placeholder="Describe your mood, energy, and any standout moments..."
            className="w-full rounded-lg border-[var(--color-slate-300)] border p-3 h-32 focus:border-[var(--color-peach-400)] focus:outline-none dark:border-[var(--color-slate-400)]"
          />
          <button
            onClick={handleNext}
            disabled={!journalEntry.trim()}
            className="w-full rounded-lg bg-[var(--color-blue-400)] py-3 text-[var(--color-slate-900)] font-medium hover:bg-[var(--color-blue-500)] disabled:opacity-50"
          >
            Get Insight
          </button>
        </div>
      )}

      {step === "insight" && insight && (
        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--color-emerald-300)]/10 p-4">
            <h4 className="font-semibold text-[var(--color-emerald-400)] mb-2">💡 Your Personalized Insight</h4>
            <p className="text-[var(--color-ink)] leading-relaxed">{insight}</p>
          </div>
          <button
            onClick={() => onComplete?.()}
            className="w-full rounded-lg bg-[var(--color-emerald-400)] py-3 text-white font-medium hover:bg-[var(--color-emerald-500)]"
          >
            Start Your Daily Journey
          </button>
        </div>
      )}
    </div>
  );
}
