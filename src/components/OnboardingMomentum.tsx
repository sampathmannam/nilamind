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
            className="w-full rounded-lg border-(--gray-300) border p-3 focus:border-[var(--coral)] focus:outline-none dark:border-(--gray-400)"
          />
          <button
            onClick={handleStartGoal}
            disabled={!goal.trim()}
            className="w-full rounded-lg bg-[var(--coral)] py-3 text-white font-medium hover:bg-[var(--coral)]/90 disabled:opacity-50"
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
            className="w-full rounded-lg border-(--gray-300) border p-3 h-32 focus:border-[var(--coral)] focus:outline-none dark:border-(--gray-400)"
          />
          <button
            onClick={handleNext}
            disabled={!journalEntry.trim()}
            className="w-full rounded-lg bg-[var(--sky-blue)] py-3 text-white font-medium hover:bg-[var(--sky-blue)]/90 disabled:opacity-50"
          >
            Get Insight
          </button>
        </div>
      )}

      {step === "insight" && insight && (
        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--mint)] bg-opacity-30 p-4">
            <h4 className="font-semibold text-[var(--sage-green)] mb-2">💡 Your Personalized Insight</h4>
            <p className="text-[var(--text-main)] leading-relaxed">{insight}</p>
          </div>
          <button
            onClick={() => onComplete?.()}
            className="w-full rounded-lg bg-[var(--sage-green)] py-3 text-white font-medium hover:bg-[var(--sage-green)]/90"
          >
            Start Your Daily Journey
          </button>
        </div>
      )}
    </div>
  );
}
