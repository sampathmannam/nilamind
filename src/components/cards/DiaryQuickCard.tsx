// DiaryQuickCard — compact 3-tap mood entry rendered inline in the stream.
// Tap mood → tap intensity → done. Zero typing required.

import React, { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { secureLocal } from "../../services/secureLocal";

const MOODS = [
  { id: "calm", label: "Calm", emoji: "😌", color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-200" },
  { id: "okay", label: "Okay", emoji: "😐", color: "bg-slate-500/20 border-slate-500/30 text-slate-200" },
  { id: "low", label: "Low", emoji: "😔", color: "bg-blue-500/20 border-blue-500/30 text-blue-200" },
  { id: "anxious", label: "Anxious", emoji: "😰", color: "bg-amber-500/20 border-amber-500/30 text-amber-200" },
  { id: "angry", label: "Angry", emoji: "😤", color: "bg-rose-500/20 border-rose-500/30 text-rose-200" },
  { id: "overwhelmed", label: "Overwhelmed", emoji: "😵", color: "bg-violet-500/20 border-violet-500/30 text-violet-200" },
];

const INTENSITIES = [
  { value: 2, label: "Gentle" },
  { value: 4, label: "Noticeable" },
  { value: 6, label: "Strong" },
  { value: 8, label: "Intense" },
];

interface DiaryQuickCardProps {
  onComplete?: () => void;
}

export default function DiaryQuickCard({ onComplete }: DiaryQuickCardProps) {
  const [step, setStep] = useState<"mood" | "intensity" | "done">("mood");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedIntensity, setSelectedIntensity] = useState<number | null>(null);

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
    setStep("intensity");
  };

  const handleIntensitySelect = (value: number) => {
    setSelectedIntensity(value);
    // Save to encrypted storage
    const today = new Date().toISOString().split("T")[0];
    const entry = {
      date: today,
      emotion: selectedMood,
      intensity: value,
      timestamp: Date.now(),
    };
    try {
      const existing = secureLocal.getItem("nilamind_diary_" + today);
      const diary = existing ? JSON.parse(existing) : { entries: [] };
      diary.entries.push(entry);
      diary.mood = selectedMood;
      diary.intensity = value;
      diary.updatedAt = Date.now();
      secureLocal.setItem("nilamind_diary_" + today, JSON.stringify(diary));
    } catch { /* ignore */ }
    setStep("done");
    onComplete?.();
  };

  if (step === "done") {
    const mood = MOODS.find((m) => m.id === selectedMood);
    return (
      <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4 text-center" id="diary-quick-done">
        <Check className="w-6 h-6 text-blue-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-blue-200">Logged</p>
        <p className="text-xs text-blue-300/70 mt-1">
          {mood?.emoji} {mood?.label} at {selectedIntensity}/10
        </p>
      </div>
    );
  }

  return (
    <div className="bg-page border border-blue-500/25 rounded-2xl p-4" id="diary-quick-card">
      {step === "mood" && (
        <>
          <p className="text-sm font-semibold text-slate-100 mb-3">How are you feeling?</p>
          <div className="grid grid-cols-3 gap-2">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => handleMoodSelect(mood.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all cursor-pointer hover:scale-105 ${mood.color}`}
              >
                <span className="text-xl">{mood.emoji}</span>
                <span className="text-xs font-medium">{mood.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "intensity" && (
        <>
          <p className="text-sm font-semibold text-slate-100 mb-3">
            How {selectedMood}?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {INTENSITIES.map((intensity) => (
              <button
                key={intensity.value}
                onClick={() => handleIntensitySelect(intensity.value)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500/40 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
              >
                <span className="text-lg font-bold text-blue-400">{intensity.value}</span>
                <span>{intensity.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
